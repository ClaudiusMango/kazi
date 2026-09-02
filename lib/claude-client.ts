// SERVER-ONLY. Never import this from a client component.
//
// The one place the API key is read. This module opens no database, writes no
// log line containing patient text, and touches no disk.

import type { ChatMessage } from './types';
import {
  acceptsTemperature,
  MAX_INPUT_CHARS,
  MAX_MESSAGES,
  MAX_TOTAL_CHARS,
  MODEL_FALLBACK,
} from './constants';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export type GuardResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; reason: string };

/**
 * The proxy holds our key and has no authentication in front of it. These caps
 * are what stand between a public URL and an unbounded bill. They are not auth.
 */
export function guardMessages(body: unknown): GuardResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, reason: 'Body must be an object.' };
  }

  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, reason: 'Messages array is required.' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, reason: 'Too many messages.' };
  }

  let total = 0;
  const clean: ChatMessage[] = [];

  for (const entry of messages) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, reason: 'Malformed message.' };
    }
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') {
      return { ok: false, reason: 'Invalid role.' };
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { ok: false, reason: 'Empty message content.' };
    }
    if (content.length > MAX_INPUT_CHARS) {
      return { ok: false, reason: 'Message too long.' };
    }
    total += content.length;
    if (total > MAX_TOTAL_CHARS) {
      return { ok: false, reason: 'Conversation too long.' };
    }
    clean.push({ role, content });
  }

  return { ok: true, messages: clean };
}

/**
 * Browser-originated cross-site abuse guard. Not real authentication — a
 * non-browser client can send anything — but it costs nothing and closes the
 * easiest path to someone else's page spending our key.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser or same-origin navigation
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export type ClaudeError = 'CONFIG' | 'TIMEOUT' | 'UPSTREAM' | 'NO_TOOL' | 'BUSY';

/** Transient. Worth another attempt, and worth a different model. */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 529]);

/** Capacity rather than fault — the patient should be told to wait, not that it broke. */
const BUSY_STATUS = new Set([429, 529]);

const RETRY_BACKOFF_MS = 400;

/** Below this, there is no point starting another attempt. */
const MIN_ATTEMPT_MS = 2_000;

export type ClaudeResult =
  | { ok: true; toolName: string; input: Record<string, unknown> }
  | { ok: false; code: ClaudeError };

interface CallOptions {
  model: string;
  system: string;
  tools: unknown[];
  toolChoice: unknown;
  messages: ChatMessage[];
  maxTokens: number;
  timeoutMs: number;
}

type Attempt = ClaudeResult & { retryable?: boolean };

/**
 * One request. Retries and model fallback are handled by the caller so the
 * whole sequence shares a single deadline.
 */
async function attempt(
  model: string,
  apiKey: string,
  options: CallOptions,
  budgetMs: number
): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens,
        ...(acceptsTemperature(model) ? { temperature: 0 } : {}),
        system: options.system,
        tools: options.tools,
        tool_choice: { ...(options.toolChoice as object), disable_parallel_tool_use: true },
        messages: options.messages,
      }),
    });

    if (!res.ok) {
      // Status only. The response body may echo patient text.
      console.error(`[kazi] upstream status ${res.status} (${model})`);
      return {
        ok: false,
        code: BUSY_STATUS.has(res.status) ? 'BUSY' : 'UPSTREAM',
        retryable: RETRYABLE_STATUS.has(res.status),
      };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const block = data.content?.find((b) => b.type === 'tool_use');
    if (!block?.name || typeof block.input !== 'object' || block.input === null) {
      return { ok: false, code: 'NO_TOOL', retryable: true };
    }

    return {
      ok: true,
      toolName: block.name,
      input: block.input as Record<string, unknown>,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, code: 'TIMEOUT' };
    }
    console.error('[kazi] upstream call failed');
    return { ok: false, code: 'UPSTREAM', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Primary model twice, then the fallback model once, all inside one deadline.
 *
 * A 529 from a busy API is the single most likely thing to break a live demo,
 * and it is entirely recoverable — it just needs someone to ask again.
 */
export async function callClaude(options: CallOptions): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, code: 'CONFIG' };

  const deadline = Date.now() + options.timeoutMs;
  const plan: string[] = [options.model, options.model];
  if (MODEL_FALLBACK !== options.model) plan.push(MODEL_FALLBACK);

  let last: ClaudeError = 'UPSTREAM';

  for (let i = 0; i < plan.length; i++) {
    const remaining = deadline - Date.now();
    // Not enough budget left for a meaningful attempt.
    if (remaining < MIN_ATTEMPT_MS) break;

    const result = await attempt(plan[i], apiKey, options, remaining);
    if (result.ok) return result;

    last = result.code;
    if (!result.retryable) return { ok: false, code: result.code };
    if (i < plan.length - 1) await wait(RETRY_BACKOFF_MS * (i + 1));
  }

  return { ok: false, code: last };
}

/** Every response from this proxy is uncacheable. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, no-cache, must-revalidate',
    },
  });
}
