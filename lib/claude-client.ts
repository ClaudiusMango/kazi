// SERVER-ONLY. Never import this from a client component.
//
// The one place the API key is read. This module opens no database, writes no
// log line containing patient text, and touches no disk.

import type { ChatMessage } from './types';
import { MAX_INPUT_CHARS, MAX_MESSAGES, MAX_TOTAL_CHARS } from './constants';

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

export type ClaudeError = 'CONFIG' | 'TIMEOUT' | 'UPSTREAM' | 'NO_TOOL';

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

export async function callClaude(options: CallOptions): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, code: 'CONFIG' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

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
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: 0,
        system: options.system,
        tools: options.tools,
        tool_choice: { ...(options.toolChoice as object), disable_parallel_tool_use: true },
        messages: options.messages,
      }),
    });

    if (!res.ok) {
      // Status only. The response body may echo patient text.
      console.error(`[kazi] upstream status ${res.status}`);
      return { ok: false, code: 'UPSTREAM' };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>;
    };

    const block = data.content?.find((b) => b.type === 'tool_use');
    if (!block?.name || typeof block.input !== 'object' || block.input === null) {
      return { ok: false, code: 'NO_TOOL' };
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
    return { ok: false, code: 'UPSTREAM' };
  } finally {
    clearTimeout(timer);
  }
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
