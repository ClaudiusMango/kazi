'use client';

import { BRIEF_FOOTER } from '@/lib/constants';
import type { BriefItem, NurseBrief } from '@/lib/types';

// A purpose-built document, not the app page with a print stylesheet over it.
// Hidden on screen; the only thing that renders when printing.
//
// It is laid out as a clinical form: a ruled header, tight sections, the
// patient's words beside every term, and the limitations where a reader
// reaches them rather than after they have stopped reading.

function Row({ item }: { item: BriefItem }) {
  const tag =
    item.confidence === 'sijui'
      ? 'UNCLEAR'
      : item.confidence === 'uncertain'
        ? 'UNCERTAIN'
        : null;

  return (
    <div className="print-row">
      <div className="print-term">
        {tag && <span className="print-tag">{tag}</span>}
        {item.standardised ?? '— see patient’s words'}
      </div>
      <div className="print-verbatim">“{item.verbatim}”</div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: BriefItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="print-section">
      <h2>{title}</h2>
      {items.map((item, i) => (
        <Row key={i} item={item} />
      ))}
    </section>
  );
}

export default function PrintableBrief({
  brief,
  fallbackText,
  generatedAt,
}: {
  brief: NurseBrief | null;
  fallbackText: string | null;
  generatedAt: string;
}) {
  return (
    <article className="printable">
      <header className="print-head">
        <div>
          <p className="print-title">KAZI INTAKE BRIEF</p>
          <p className="print-sub">
            Pre-consultation intake summary · AI-assisted · Patient’s own words
            preserved
          </p>
        </div>
        <div className="print-meta">
          <p>Generated {generatedAt}</p>
          <p>Not a clinical assessment</p>
        </div>
      </header>

      {brief ? (
        <>
          <Section title="Chief complaint" items={brief.chief_complaint} />
          <Section title="Onset and duration" items={brief.onset_duration} />
          <Section title="Context and exposures" items={brief.context_exposures} />

          {brief.patient_concerns.length > 0 && (
            <section className="print-section">
              <h2>Patient’s stated concern</h2>
              {brief.patient_concerns.map((item, i) => (
                <Row key={i} item={item} />
              ))}
              <p className="print-note">
                Recorded as the patient’s own worry, not as a clinical
                possibility.
              </p>
            </section>
          )}

          <section className="print-section">
            <h2>Not asked about</h2>
            <p className="print-chips">
              {brief.not_asked_about.length === 0
                ? 'All intake areas were addressed.'
                : brief.not_asked_about.join(' · ')}
            </p>
          </section>
        </>
      ) : (
        <section className="print-section">
          <h2>Unprocessed patient text</h2>
          <p className="print-note">
            AI processing was unavailable. This is the patient’s own text,
            exactly as they typed it, with no structure applied.
          </p>
          <p className="print-verbatim print-raw">{fallbackText}</p>
        </section>
      )}

      <p className="print-nodx">NO DIAGNOSIS WAS GENERATED</p>

      <p className="print-footer">{BRIEF_FOOTER}</p>

      <p className="print-colophon">
        Kazi: Kabla ya Daktari · Hackathon prototype · Not clinically validated
        · Not for use with real patients
      </p>
    </article>
  );
}
