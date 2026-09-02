'use client';

import { useEffect, useState } from 'react';
import BriefRenderer from '@/components/BriefRenderer';
import { decodeBrief } from '@/lib/qr-payload';
import type { NurseBrief } from '@/lib/types';

// Nurse-side viewer. Pure decode-and-render: zero API calls, no server round
// trip for the content. The brief arrives in the URL fragment, which the
// browser never transmits.

export default function NurseViewer() {
  const [brief, setBrief] = useState<NurseBrief | null>(null);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const payload = window.location.hash.slice(1);
    if (!payload) {
      setFailed(true);
      return;
    }
    const decoded = decodeBrief(payload);
    if (!decoded) {
      setFailed(true);
      return;
    }
    setBrief(decoded.brief);
    setReduced(decoded.reduced);
  }, []);

  if (failed) {
    return (
      <div className="shell pad">
        <h1>Nothing to show</h1>
        <p className="muted">
          This page renders a brief from a scanned code. Scan the code on the
          patient’s screen, or ask them to show you the summary directly.
        </p>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="shell pad">
        <p className="muted">Decoding…</p>
      </div>
    );
  }

  return (
    <div className="handoff">
      <div className="handoff-bar">
        <span>KAZI INTAKE BRIEF</span>
        <span className="badge">AI-assisted</span>
      </div>

      <div className="pad">
        {reduced && (
          <p className="meta" style={{ marginBottom: 16 }}>
            Standard terms only — this code was too large to carry the patient’s
            exact words. Ask them to show you their screen for the full brief.
          </p>
        )}

        <BriefRenderer brief={brief} generatedAt="from scanned code" />

        <p className="no-diagnosis" style={{ marginTop: 24 }}>
          No diagnosis was generated.
        </p>
      </div>
    </div>
  );
}
