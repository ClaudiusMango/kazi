'use client';

// Interceptor returned category 'red'.
//
// No brief is generated and no further API call is made. The only exit is a
// new session.
//
// The instruction comes first and largest, for the person who is frightened
// and only reads the top of the screen. The explanation follows for the one
// who wants to know what just happened — because a full-screen red STOP with
// no reason given is its own kind of harm, and a patient who does not
// understand why is more likely to dismiss it.

export default function RedAlert({
  matchedTerm,
  onRestart,
}: {
  matchedTerm: string | null;
  onRestart: () => void;
}) {
  return (
    <div className="alert alert-red">
      <div className="alert-inner">
        <header className="alert-head">
          <strong>Kazi intake</strong>
          <span className="badge badge-inverse">Automatic safety check</span>
        </header>

        <h1>STOP</h1>

        <p className="alert-lead">
          Go to the nurse or the front desk now, and show them this screen.
        </p>

        <section className="alert-panel">
          <p className="alert-panel-label">Why this appeared</p>
          <p>
            An automatic check reads what you type and looks for words that can
            mean an emergency. It found one.
          </p>
          <p>
            <strong>This is not a diagnosis.</strong> The check does not know
            what is wrong with you. It only knows this should not wait in a
            queue.
          </p>
        </section>

        {matchedTerm && (
          <section className="alert-panel">
            <p className="alert-panel-label">What the check noticed</p>
            <p className="alert-term">{matchedTerm}</p>
            <p className="alert-small">Show this to the nurse — it tells her why.</p>
          </section>
        )}

        <section className="alert-panel">
          <p className="alert-panel-label">What to do now</p>
          <ol className="alert-steps">
            <li>Stand up and go to the nurse or the front desk.</li>
            <li>Show them this screen.</li>
            <li>If no one is there, tell any member of staff.</li>
          </ol>
        </section>

        <p className="alert-small">
          You have not done anything wrong. Nothing you typed was sent anywhere,
          and no summary was created.
        </p>

        <button className="btn btn-ghost" onClick={onRestart}>
          Start new session
        </button>
      </div>
    </div>
  );
}
