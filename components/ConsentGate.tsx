'use client';

// The first screen. Nothing is reachable behind it. Consent is held in React
// state only, so a reload returns here — which is the intended behaviour, not
// a limitation.

export default function ConsentGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="shell pad">
      <h1>Before we begin</h1>

      <div className="disclosure">
        <strong>AI is involved in this conversation</strong>
        Your words are sent to an AI model for processing. No human reads them
        during the session.
      </div>

      <div className="card">
        <p className="section-label">What this tool does</p>
        <p style={{ margin: 0 }}>
          Translates what you describe into a structured summary the nurse can
          read quickly. It organises your words — it does not interpret them.
        </p>
      </div>

      <div className="card">
        <p className="section-label">What it does not do</p>
        <p style={{ margin: 0 }}>
          No diagnosis. No medical advice. No guessing what you might have. The
          nurse makes all clinical decisions.
        </p>
      </div>

      <div className="card">
        <p className="section-label">Your information</p>
        <p style={{ margin: 0 }}>
          No name, ID, or phone number is collected. Nothing is saved after the
          session ends.
        </p>
      </div>

      <div className="card">
        <p className="section-label">Automated check</p>
        <p style={{ margin: 0 }}>
          A keyword detector checks for emergency danger signs. If triggered, it
          will stop the conversation and direct you to the nurse immediately.
        </p>
      </div>

      <button className="btn" onClick={onAccept}>
        I understand — continue
      </button>
    </div>
  );
}
