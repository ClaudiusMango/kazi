// Conversational turn.
//
// Forced tool call here too, across two tools. This is the only turn where the
// model addresses the patient directly, and it is the obvious place for a
// prompt injection to land — so there is no free-text path out of it. Either
// the model asks a question through a schema, or it flags the sijui boundary
// and the application supplies the refusal wording itself.

import { callClaude, guardMessages, isSameOrigin, json } from '@/lib/claude-client';
import { CHAT_TIMEOUT_MS, MODEL_PRIMARY } from '@/lib/constants';
import { KAZI_CHAT_PROMPT } from '@/lib/system-prompt';
import { ASK_NEXT_QUESTION_TOOL, FLAG_DIAGNOSTIC_REQUEST_TOOL } from '@/lib/tool-schema';

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
    system: KAZI_CHAT_PROMPT,
    tools: [ASK_NEXT_QUESTION_TOOL, FLAG_DIAGNOSTIC_REQUEST_TOOL],
    toolChoice: { type: 'any' },
    messages: guard.messages,
    maxTokens: 300,
    timeoutMs: CHAT_TIMEOUT_MS,
  });

  if (!result.ok) {
    const status = result.code === 'CONFIG' ? 500 : 502;
    return json({ error: result.code }, status);
  }

  if (result.toolName === FLAG_DIAGNOSTIC_REQUEST_TOOL.name) {
    // No text travels back from the model here. The client renders the fixed
    // refusal string.
    return json({ type: 'boundary' });
  }

  const { question, enough_information } = result.input as {
    question?: unknown;
    enough_information?: unknown;
  };

  if (typeof question !== 'string' || question.trim().length === 0) {
    return json({ error: 'NO_QUESTION' }, 502);
  }

  return json({
    type: 'question',
    question,
    enough_information: enough_information === true,
  });
}
