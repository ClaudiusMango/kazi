'use client';

import BriefRenderer from './BriefRenderer';
import QrHandoff from './QrHandoff';
import type { NurseBrief } from '@/lib/types';

// Full-screen, large-print, for reading at arm's length across a desk. Same
// data as the patient-facing brief — this is a formatting change, not a
// content change.

export default function NurseHandoff({
  brief,
  fallbackText,
  generatedAt,
  onDone,
}: {
  brief: NurseBrief | null;
  fallbackText: string | null;
  generatedAt: string;
  onDone: () => void;
}) {
  return (
    <div className="handoff">
      <div className="handoff-bar">
        <span>KAZI INTAKE BRIEF</span>
        <span className="badge">AI-assisted</span>
      </div>

      <div className="pad">
        {brief ? (
          <BriefRenderer brief={brief} generatedAt={generatedAt} />
        ) : (
          <div>
            <p className="section-label">Unprocessed patient text</p>
            <p className="muted" style={{ fontSize: 16 }}>
              AI processing was unavailable. This is the patient’s own text,
              exactly as they typed it, with no structure applied.
            </p>
            <div
              className="card"
              style={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}
            >
              {fallbackText}
            </div>
          </div>
        )}

        {/* Accelerator only. The screen above is the handoff; if the QR fails
            to encode or scan, nothing is lost. */}
        {brief && (
          <div style={{ marginTop: 24 }}>
            <QrHandoff brief={brief} />
          </div>
        )}

        <p className="no-diagnosis" style={{ marginTop: 24 }}>
          No diagnosis was generated.
        </p>

        <button className="btn" onClick={onDone} style={{ marginTop: 16 }}>
          Done — clear session
        </button>
      </div>
    </div>
  );
}
