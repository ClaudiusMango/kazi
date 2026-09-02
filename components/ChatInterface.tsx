'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GENERIC_ERROR,
  MIN_INTAKE_CHARS,
  MIN_INTAKE_TURNS,
  OFFLINE_ERROR,
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
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  async function send() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please describe what you’re feeling.');
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
    setError(null);

    // Client-side sijui pre-filter: answer instantly, spend no tokens, and
    // work with the network down.
    if (isDiagnosticRequest(trimmed)) {
      setMessages([...next, { role: 'assistant', content: SIJUI_REFUSAL }]);
      return;
    }

    setMessages(next);
    setIsLoading(true);

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setError(OFFLINE_ERROR);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error('chat failed');

      const data = await res.json();

      if (data.type === 'boundary') {
        setMessages([...next, { role: 'assistant', content: SIJUI_REFUSAL }]);
        return;
      }

      if (typeof data.question !== 'string') throw new Error('malformed');

      setMessages([...next, { role: 'assistant', content: data.question }]);
      if (data.enough_information) setReady(true);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  async function generate() {
    setError(null);
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
      // Degrade to unformatted, never to nothing. The nurse gets the
      // patient's own words even when the model is unreachable.
      onFallback(
        messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .join('\n\n')
      );
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
              onClick={generate}
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

        {error && <p className="inline-error">{error}</p>}
      </div>
    </div>
  );
}
