'use client';

import { useCallback, useState } from 'react';
import AmberAlert from '@/components/AmberAlert';
import BriefRenderer from '@/components/BriefRenderer';
import ChatInterface from '@/components/ChatInterface';
import ConsentGate from '@/components/ConsentGate';
import NurseHandoff from '@/components/NurseHandoff';
import PatientConfirm from '@/components/PatientConfirm';
import RedAlert from '@/components/RedAlert';
import SessionComplete from '@/components/SessionComplete';
import { useInactivityPurge } from '@/lib/use-inactivity';
import type {
  ChatMessage,
  InterceptorResult,
  NurseBrief,
  ScreenState,
} from '@/lib/types';

// All session state lives here, in React state and nowhere else. There is no
// localStorage, sessionStorage, IndexedDB, or cookie anywhere in this project.

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Page() {
  const [screen, setScreen] = useState<ScreenState>('consent');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [brief, setBrief] = useState<NurseBrief | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');
  const [danger, setDanger] = useState<InterceptorResult | null>(null);

  /** Drop everything held in memory. */
  const clearState = useCallback(() => {
    setMessages([]);
    setBrief(null);
    setFallbackText(null);
    setGeneratedAt('');
    setDanger(null);
  }, []);

  /**
   * Full purge. A document replace drops the JS heap along with the state and
   * leaves no history entry pointing back at the previous session — the back
   * button cannot recover anything.
   */
  const restart = useCallback(() => {
    clearState();
    window.location.replace('/');
  }, [clearState]);

  // Armed only where patient content is on screen. The alert screens are
  // excluded: they hold no patient data and exist to be carried to a person.
  const guarded = screen === 'chat' || screen === 'brief' || screen === 'handoff';
  const { warning, reset } = useInactivityPurge(guarded, restart);

  const handleDanger = useCallback((result: InterceptorResult) => {
    setDanger(result);
    setScreen(result.category === 'amber' ? 'amber_alert' : 'red_alert');
  }, []);

  const handleBrief = useCallback((next: NurseBrief) => {
    setBrief(next);
    setFallbackText(null);
    setGeneratedAt(timestamp());
    setScreen('brief');
  }, []);

  const handleFallback = useCallback((rawText: string) => {
    setBrief(null);
    setFallbackText(rawText);
    setGeneratedAt(timestamp());
    setScreen('handoff');
  }, []);

  function content() {
    switch (screen) {
      case 'consent':
        return <ConsentGate onAccept={() => setScreen('chat')} />;

      case 'chat':
        return (
          <ChatInterface
            messages={messages}
            setMessages={setMessages}
            onDanger={handleDanger}
            onBrief={handleBrief}
            onFallback={handleFallback}
          />
        );

      case 'red_alert':
        return <RedAlert matchedTerm={danger?.matched_term ?? null} onRestart={restart} />;

      case 'amber_alert':
        return <AmberAlert onRestart={restart} />;

      case 'brief':
        return (
          <div className="shell pad">
            <h1>Your summary for the nurse</h1>
            {brief && <BriefRenderer brief={brief} generatedAt={generatedAt} />}
            <PatientConfirm
              onConfirm={() => setScreen('handoff')}
              onEdit={() => setScreen('chat')}
            />
          </div>
        );

      case 'handoff':
        return (
          <NurseHandoff
            brief={brief}
            fallbackText={fallbackText}
            generatedAt={generatedAt}
            onDone={() => {
              clearState();
              setScreen('complete');
            }}
          />
        );

      case 'complete':
        return <SessionComplete onRestart={restart} />;
    }
  }

  return (
    <>
      {content()}
      {warning && (
        <div className="overlay" role="alertdialog" aria-live="assertive">
          <div className="overlay-card">
            <h2>Are you still here?</h2>
            <p className="muted">
              This session will clear in 30 seconds so the next person cannot
              see your information.
            </p>
            <button className="btn" onClick={reset}>
              I’m still here
            </button>
          </div>
        </div>
      )}
    </>
  );
}
