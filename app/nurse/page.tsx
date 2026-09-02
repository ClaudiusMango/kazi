'use client';

import { useEffect, useState } from 'react';
import BriefRenderer from '@/components/BriefRenderer';
import PrintableBrief from '@/components/PrintableBrief';
import { decodeBrief } from '@/lib/qr-payload';
import type { NurseBrief } from '@/lib/types';

// Nurse-side viewer. Pure decode-and-render: zero API calls, no server round
// trip for the content. The brief arrives in the URL fragment, which the
// browser never transmits — so this page's prerendered HTML cannot contain it,
// by construction.

type State =
  | { kind: 'pending' }
  | { kind: 'empty' }
  | { kind: 'corrupt' }
  | { kind: 'ready'; brief: NurseBrief; reduced: boolean };

export default function NurseViewer() {
  // 'pending' is also what someone sees if JavaScript never runs, so it must
  // read as useful guidance rather than a spinner that hangs forever.
  const [state, setState] = useState<State>({ kind: 'pending' });

  useEffect(() => {
    // Every path below reaches a terminal state. Nothing can leave this on
    // 'pending' once the effect has run.
    try {
      const payload = window.location.hash.replace(/^#/, '').trim();
      if (!payload) {
        setState({ kind: 'empty' });
        return;
      }
      const decoded = decodeBrief(payload);
      setState(
        decoded
          ? { kind: 'ready', brief: decoded.brief, reduced: decoded.reduced }
          : { kind: 'corrupt' }
      );
    } catch {
      setState({ kind: 'corrupt' });
    }
  }, []);

  if (state.kind !== 'ready') {
    const message =
      state.kind === 'corrupt'
        ? 'That code could not be read. It may have been cut off while scanning. Ask the patient to show you the summary on their own screen.'
        : 'Scan the code on the patient’s screen to open their summary here. If this message stays after scanning, ask the patient to show you their screen instead.';

    return (
      <div className="handoff">
        <div className="handoff-bar">
          <span>KAZI INTAKE BRIEF</span>
          <span className="badge">AI-assisted</span>
        </div>
        <div className="pad">
          <h1>No summary loaded</h1>
          <p className="muted">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrintableBrief brief={state.brief} fallbackText={null} generatedAt="from scanned code" />

      <div className="handoff screen-only">
      <div className="handoff-bar">
        <span>KAZI INTAKE BRIEF</span>
        <span className="badge">AI-assisted</span>
      </div>

      <div className="pad">
        {state.reduced && (
          <p className="meta" style={{ marginBottom: 16 }}>
            Standard terms only — this code was too large to carry the patient’s
            exact words. Ask them to show you their screen for the full brief.
          </p>
        )}

        <BriefRenderer brief={state.brief} generatedAt="from scanned code" />

        <p className="no-diagnosis" style={{ marginTop: 24 }}>
          No diagnosis was generated.
        </p>

        <button
          className="btn btn-secondary"
          onClick={() => window.print()}
          style={{ marginTop: 16 }}
        >
          Save as PDF
        </button>
      </div>
      </div>
    </>
  );
}
