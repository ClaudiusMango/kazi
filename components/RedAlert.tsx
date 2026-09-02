'use client';

import { EMERGENCY_NUMBERS, WHILE_YOU_WAIT } from '@/lib/constants';
import type { InterceptorResult } from '@/lib/types';

// Interceptor returned category 'red'.
//
// No brief is generated and no further API call is made. The only exit is a
// new session.
//
// This screen has two readers. The patient needs one instruction, at the top,
// in the largest type on it. The nurse needs to know why it fired, and she is
// reading it over the patient's shoulder in a corridor — so she gets the
// clinical grouping and the patient's own words, and nothing else to wade
// through.

const MAX_QUOTE = 180;

export default function RedAlert({
  danger,
  onRestart,
}: {
  danger: InterceptorResult | null;
  onRestart: () => void;
}) {
  const quote = danger?.source
    ? danger.source.length > MAX_QUOTE
      ? `${danger.source.slice(0, MAX_QUOTE)}…`
      : danger.source
    : null;

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
          <p className="alert-panel-label">Show this to the nurse</p>
          {danger?.group && <p className="alert-term">{danger.group}</p>}
          {quote && <p className="alert-quote">“{quote}”</p>}
          <p className="alert-small">
            Automatic keyword check. Not a diagnosis, and not clinically
            validated.
          </p>
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

        <p className="alert-small">While you wait: {WHILE_YOU_WAIT.join(' ')}</p>

        <button className="btn btn-ghost" onClick={onRestart}>
          Start new session
        </button>
      </div>
    </div>
  );
}
