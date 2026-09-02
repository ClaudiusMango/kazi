'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MIN_INTAKE_CHARS,
  MIN_INTAKE_TURNS,
  OPENING_MESSAGE,
  SIJUI_REFUSAL,
} from '@/lib/constants';
import { checkBriefForDangerSigns, checkDangerSigns } from '@/lib/interceptor';
import { isDiagnosticRequest } from '@/lib/sijui-filter';
import type { ChatMessage, DangerCategory, NurseBrief } from '@/lib/types';
import { isNurseBrief } from '@/lib/validate-brief';
import MessageBubble from './ui/MessageBubble';

interface Props {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onDanger: (category: DangerCategory) => void;
  onBrief: (brief: NurseBrief) => void;
  onFallback: (rawText: string) => void;
}

interface NoticeAction {
  label: string;
  primary?: boolean;
  run: () => void;
}

/**
 * A failure notice inside the conversation.
 *
 * Deliberately not a chat bubble: an error is the application speaking, not
 * the assistant, and it must not read as something the model said. Every
 * notice carries at least one action, because a failure the patient cannot
 * act on is just a dead end.
 */
interface Notice {
  title: string;
  body: string;
  actions: NoticeAction[];
}

export default function ChatInterface({
  messages,
  setMessages,
  onDanger,
  onBrief,
  onFallback,
}: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [ready, setReady] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, notice]);

  const busy = isLoading || isGenerating;

  // Gate on substance, not on turn count. `ready` (the model's
  // enough_information flag) promotes the button rather than unlocking it, so
  // a patient who has finished talking is never trapped in the conversation.
  const patientMessages = messages.filter((m) => m.role === 'user');
  const patientChars = patientMessages.reduce(
    (total, m) => total + m.content.trim().length,
    0
  );
  const hasMinimum =
    patientMessages.length >= MIN_INTAKE_TURNS && patientChars >= MIN_INTAKE_CHARS;
  const canGenerate = !busy && hasMinimum;

  const rawPatientText = () =>
    patientMessages.map((m) => m.content).join('\n\n');

  /** Ask for the next question. Separated so a notice can retry it. */
  async function requestQuestion(history: ChatMessage[]) {
    setNotice(null);
    setIsLoading(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setNotice({
          title: 'You appear to be offline',
          body:
            'The emergency safety check is still running on this device, so it is safe to keep typing. Reconnect and try again, or speak to the nurse at the desk directly.',
          actions: [
            { label: 'Try again', primary: true, run: () => void requestQuestion(history) },
          ],
        });
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error('chat failed');

      const data = await res.json();

      if (data.type === 'boundary') {
        setMessages([...history, { role: 'assistant', content: SIJUI_REFUSAL }]);
        return;
      }
      if (typeof data.question !== 'string') throw new Error('malformed');

      setMessages([...history, { role: 'assistant', content: data.question }]);
      if (data.enough_information) setReady(true);
    } catch {
      setNotice({
        title: 'I could not reach the assistant',
        body:
          'Nothing you typed has been lost — it is all still on this screen. You can try again, or simply keep describing what you feel and prepare your summary when you are ready.',
        actions: [
          { label: 'Try again', primary: true, run: () => void requestQuestion(history) },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed) {
      setInputError('Please describe what you’re feeling.');
      return;
    }

    // Checkpoint 1: before anything leaves the device.
    const danger = checkDangerSigns(trimmed);
    if (danger.triggered && danger.category) {
      onDanger(danger.category);
      return;
    }

    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setInput('');
    setInputError(null);
    setNotice(null);

    // Client-side sijui pre-filter: answers instantly, spends no tokens, and
    // works with the network down.
    if (isDiagnosticRequest(trimmed)) {
      setMessages([...next, { role: 'assistant', content: SIJUI_REFUSAL }]);
      return;
    }

    setMessages(next);
    await requestQuestion(next);
  }

  async function generate() {
    setNotice(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error('brief failed');

      const data = await res.json();
      if (!isNurseBrief(data)) throw new Error('invalid brief');

      // Checkpoint 3: danger signs that only surfaced once the model had
      // translated the patient's words into intake terms.
      const danger = checkBriefForDangerSigns(data);
      if (danger.triggered && danger.category) {
        onDanger(danger.category);
        return;
      }

      onBrief(data);
    } catch {
      // Degrade to unformatted, never to nothing — but let the patient choose
      // when to do it, rather than ending their session on their behalf.
      setNotice({
        title: 'I could not prepare your structured summary',
        body:
          'The service did not respond. You can try again, or take your own words to the nurse now — she will still receive everything you typed, just without the standard terms beside it.',
        actions: [
          { label: 'Try again', primary: true, run: () => void generate() },
          { label: 'Show my words to the nurse', run: () => onFallback(rawPatientText()) },
        ],
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="shell">
      <header className="chat-header">
        <strong>Kazi intake</strong>
        <span className="badge">AI-assisted</span>
      </header>

      <div className="chat-log">
        <MessageBubble role="assistant">{OPENING_MESSAGE}</MessageBubble>

        {messages.map((message, i) => (
          <MessageBubble key={i} role={message.role}>
            {message.content}
          </MessageBubble>
        ))}

        {isLoading && <div className="typing">Typing…</div>}
        {isGenerating && <div className="typing">Preparing your summary…</div>}

        {notice && (
          <div className="notice" role="status">
            <p className="notice-title">{notice.title}</p>
            <p className="notice-body">{notice.body}</p>
            <div className="notice-actions">
              {notice.actions.map((action) => (
                <button
                  key={action.label}
                  className={action.primary ? 'btn' : 'btn btn-secondary'}
                  onClick={action.run}
                  disabled={busy}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={logEnd} />
      </div>

      <div className="chat-composer">
        {canGenerate && (
          <>
            {ready && (
              <p className="ready-note">
                That’s enough for me to prepare your summary. Add anything else
                you want the nurse to know, or generate it now.
              </p>
            )}
            <button
              className={ready ? 'btn' : 'btn btn-secondary'}
              onClick={() => void generate()}
              disabled={busy}
              style={{ marginBottom: 10 }}
            >
              Generate my summary
            </button>
          </>
        )}

        <div className="composer-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Describe what you're feeling..."
            rows={1}
            disabled={busy}
            aria-label="Describe what you're feeling"
          />
          <button className="btn" onClick={() => void send()} disabled={busy}>
            Send
          </button>
        </div>

        {inputError && <p className="inline-error">{inputError}</p>}
      </div>
    </div>
  );
}
