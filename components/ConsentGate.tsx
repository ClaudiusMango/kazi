'use client';

// The first screen. Nothing is reachable behind it. Consent is held in React
// state only, so a reload returns here — which is the intended behaviour, not
// a limitation.
//
// Every disclosure the compliance position depends on is still here — AI
// involvement, what it does and does not do, that text goes to a model, that
// no identifiers are collected or kept, and the one automated behaviour. They
// are just no longer wrapped in four headed cards: a wall of text before the
// first input is a consent gate people tap past without reading, which
// defeats the point of having one.

export default function ConsentGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="shell pad">
      <h1>Before we begin</h1>

      <div className="disclosure">
        <strong>AI is involved in this conversation</strong>
        Your words go to an AI model. No human reads them during the session.
      </div>

      <div className="card consent-points">
        <p>
          It organises your words into a summary for the nurse. It does not
          interpret them.
        </p>
        <p>
          No diagnosis. No advice. No guessing. The nurse makes every clinical
          decision.
        </p>
        <p>
          No name, ID or phone number is collected. Nothing is saved after this
          session.
        </p>
        <p>
          An automatic check watches for emergency danger signs. If it finds
          one, it stops the conversation and sends you to the nurse.
        </p>
      </div>

      <button className="btn" onClick={onAccept}>
        I understand — continue
      </button>
    </div>
  );
}
