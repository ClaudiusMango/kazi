'use client';

import { EMERGENCY_NUMBERS, WHILE_YOU_WAIT } from '@/lib/constants';

// Interceptor returned category 'red'.
//
// No brief is generated and no further API call is made. The only exit is a
// new session.
//
// Written for someone frightened enough to read the top of the screen and
// nothing else. The instruction is the whole message; everything below it
// earns its place by being something the instruction cannot cover — why it
// is not a diagnosis, what to show the nurse, and what to do if the desk is
// empty. Anything longer than that is an essay nobody in an emergency reads.

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
          <span className="badge badge-inverse">Safety check</span>
        </header>

        <h1>STOP</h1>

        <p className="alert-lead">
          Go to the nurse or the front desk now.
          <br />
          Show them this screen.
        </p>

        <section className="alert-panel">
          <p className="alert-panel-label">Why</p>
          <p>
            An automatic check found an emergency danger sign.{' '}
            <strong>It is not a diagnosis.</strong>
          </p>
          {matchedTerm && <p className="alert-term">{matchedTerm}</p>}
        </section>

        {EMERGENCY_NUMBERS && (
          <section className="alert-panel">
            <p className="alert-panel-label">{EMERGENCY_NUMBERS.label}</p>
            <p className="alert-numbers">
              {EMERGENCY_NUMBERS.numbers.map((number) => (
                <a key={number} href={`tel:${number}`}>
                  {number}
                </a>
              ))}
            </p>
          </section>
        )}

        <p className="alert-small">
          While you wait: {WHILE_YOU_WAIT.join(' ')}
        </p>

        <button className="btn btn-ghost" onClick={onRestart}>
          Start new session
        </button>
      </div>
    </div>
  );
}
