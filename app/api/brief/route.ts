// Final brief generation. Forced tool call — the model has no prose path.
//
// This route and app/api/chat/route.ts are the only server-side code in the
// project. No database client, no logging of patient text, no disk writes.
//
// Default Node runtime, deliberately not `edge`: the route uses nothing edge
// provides, and Node deploys identically across hosts.

import { callClaude, guardMessages, isSameOrigin, json } from '@/lib/claude-client';
import { BRIEF_TIMEOUT_MS, MODEL_PRIMARY } from '@/lib/constants';
import { KAZI_BRIEF_PROMPT } from '@/lib/system-prompt';
import { EMIT_NURSE_BRIEF_TOOL } from '@/lib/tool-schema';
import { isNurseBrief } from '@/lib/validate-brief';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  const body = await req.json().catch(() => null);
  const guard = guardMessages(body);
  if (!guard.ok) {
    return json({ error: 'INVALID_INPUT', message: guard.reason }, 400);
  }

  const result = await callClaude({
    model: MODEL_PRIMARY,
    system: KAZI_BRIEF_PROMPT,
    tools: [EMIT_NURSE_BRIEF_TOOL],
    toolChoice: { type: 'tool', name: EMIT_NURSE_BRIEF_TOOL.name },
    messages: guard.messages,
    maxTokens: 1500,
    timeoutMs: BRIEF_TIMEOUT_MS,
  });

  if (!result.ok) {
    const status = result.code === 'CONFIG' ? 500 : 502;
    return json({ error: result.code }, status);
  }

  // Validate before returning. `strict: true` means the API already checked
  // the model's arguments, but nothing leaves this route unvalidated.
  if (!isNurseBrief(result.input)) {
    return json({ error: 'NO_BRIEF' }, 502);
  }

  return json(result.input);
}
