'use client';

import { CRISIS_HELPLINE } from '@/lib/constants';

// Interceptor returned category 'amber'.
//
// Deliberately unlike the RED screen: no red, no capitals, no alarm. It stops
// the intake, does not counsel, does not offer coping advice, and hands over
// to a person immediately.
//
// It does NOT repeat back what triggered it. On the RED screen naming the
// trigger helps the nurse; here it would mean quoting someone's disclosure
// back at them on a screen anyone nearby might see.

export default function AmberAlert({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="alert alert-amber">
      <div className="alert-inner">
        <header className="alert-head">
          <strong>Kazi intake</strong>
        </header>

        <h1>Thank you for telling us this.</h1>

        <p className="alert-lead">
          Please speak to the nurse at the desk now — someone is there for you.
        </p>

        <section className="alert-panel">
          <p className="alert-panel-label">Why the form stopped</p>
          <p>
            What you wrote is something a person should hear, not a form. We
            have stopped the questions here so you can talk to someone instead.
          </p>
          <p>Nothing you typed was sent anywhere, and no summary was created.</p>
        </section>

        {/* Rendered only once a current number has been verified. An
            out-of-date helpline number on this screen is the worst failure in
            the product, so the absence of a number is the safe default. */}
        {CRISIS_HELPLINE && (
          <section className="alert-panel">
            <p className="alert-panel-label">{CRISIS_HELPLINE.label}</p>
            <p className="helpline">{CRISIS_HELPLINE.number}</p>
          </section>
        )}

        <button className="btn btn-ghost" onClick={onRestart}>
          Start new session
        </button>
      </div>
    </div>
  );
}
