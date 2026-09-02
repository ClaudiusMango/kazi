'use client';

// State is already cleared by the time this renders. The button does a full
// document replace, which drops the JS heap as well and leaves no history
// entry pointing back at the previous session.
//
// Deliberately just a goodbye. The facility directory lives on the nurse's
// handoff screen, because referral is her decision and by this point she has
// already made it.

export default function SessionComplete({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="shell pad" style={{ justifyContent: 'center' }}>
      <h1>Session complete</h1>
      <p>Your summary has been shared with the nurse.</p>
      <p className="muted">
        All session data has been cleared. This tool is not intended to create a
        permanent medical record.
      </p>
      <button className="btn" onClick={onRestart} style={{ marginTop: 20 }}>
        Start new session
      </button>
    </div>
  );
}
