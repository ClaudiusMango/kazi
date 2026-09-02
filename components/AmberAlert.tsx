'use client';

import { CRISIS_HELPLINE } from '@/lib/constants';

// Interceptor returned category 'amber'.
//
// Deliberately unlike the RED screen: no red, no capitals, no alarm. It stops
// the intake, does not counsel, does not offer coping advice, and hands over to
// a person immediately.

export default function AmberAlert({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="alert alert-amber">
      <h1>Thank you for telling us this.</h1>
      <p>
        Please speak to the nurse at the desk now — someone is there for you.
      </p>

      {/* Rendered only once a current number has been verified. An out-of-date
          helpline number on this screen is the worst failure in the product,
          so the absence of a number is the safe default. */}
      {CRISIS_HELPLINE && (
        <>
          <hr className="rule" />
          <p style={{ margin: 0 }}>{CRISIS_HELPLINE.label}</p>
          <p className="helpline" style={{ margin: 0 }}>
            {CRISIS_HELPLINE.number}
          </p>
        </>
      )}

      <button className="btn btn-ghost" onClick={onRestart} style={{ marginTop: 12 }}>
        Start new session
      </button>
    </div>
  );
}
