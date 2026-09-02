'use client';

import FacilityDirectory from './FacilityDirectory';

// State is already cleared by the time this renders. The button does a full
// document replace, which drops the JS heap as well and leaves no history
// entry pointing back at the previous session.

export default function SessionComplete({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="shell pad">
      <h1>Session complete</h1>
      <p>Your summary has been shared with the nurse.</p>
      <p className="muted" style={{ marginBottom: 24 }}>
        All session data has been cleared. This tool is not intended to create a
        permanent medical record.
      </p>

      <FacilityDirectory />

      <button className="btn" onClick={onRestart} style={{ marginTop: 8 }}>
        Start new session
      </button>
    </div>
  );
}
