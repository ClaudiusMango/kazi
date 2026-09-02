'use client';

// Interceptor returned category 'red'.
//
// No brief is generated and no further API call is made. The only exit is a
// new session. Every element here points at a human.

export default function RedAlert({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="alert alert-red">
      <h1>STOP</h1>
      <p>Please do not finish this form.</p>
      <p>
        Go to the nurse or the front desk now and show them this screen.
      </p>
      <hr className="rule" />
      <p className="alert-secondary" style={{ fontSize: 20 }}>
        This screen appeared because of something you typed. Show it to a member
        of staff.
      </p>
      <button className="btn btn-ghost" onClick={onRestart} style={{ marginTop: 12 }}>
        Start new session
      </button>
    </div>
  );
}
