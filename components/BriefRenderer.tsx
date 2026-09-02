'use client';

import { BRIEF_FOOTER } from '@/lib/constants';
import type { BriefItem, NurseBrief } from '@/lib/types';

// Dual column on every line: the standardised term beside the patient's exact
// words. Mistranslation — not diagnosis — is the real clinical risk here, and
// the verbatim column is the control for it.

function Item({ item }: { item: BriefItem }) {
  const unclear = item.confidence === 'sijui';
  const uncertain = item.confidence === 'uncertain';

  return (
    <div className="brief-item">
      <div>
        {unclear && <span className="flag flag-unclear">UNCLEAR</span>}
        {uncertain && <span className="flag">UNCERTAIN</span>}
        <div className="brief-standard">
          {item.standardised ?? 'See patient’s words →'}
        </div>
      </div>
      <div className="brief-verbatim">“{item.verbatim}”</div>
    </div>
  );
}

function Section({
  title,
  items,
  concern = false,
}: {
  title: string;
  items: BriefItem[];
  concern?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 20 }} className={concern ? 'concern' : undefined}>
      <p className="section-label">{title}</p>
      {items.map((item, i) => (
        <Item key={i} item={item} />
      ))}
      {concern && (
        <p className="meta" style={{ marginTop: 8 }}>
          Recorded as the patient’s own worry, not as a clinical possibility.
        </p>
      )}
    </section>
  );
}

export default function BriefRenderer({
  brief,
  generatedAt,
}: {
  brief: NurseBrief;
  generatedAt: string;
}) {
  return (
    <div>
      <p className="meta" style={{ marginBottom: 16 }}>Generated {generatedAt}</p>

      <Section title="Chief complaint" items={brief.chief_complaint} />
      <Section title="Onset and duration" items={brief.onset_duration} />
      <Section title="Context and exposures" items={brief.context_exposures} />
      <Section title="Patient’s stated concern" items={brief.patient_concerns} concern />

      {/* Always present, even on a complete brief: silence must never read as
          a negative finding. */}
      <section style={{ marginBottom: 20 }}>
        <p className="section-label">Not asked about</p>
        {brief.not_asked_about.length === 0 ? (
          <p style={{ margin: 0 }} className="muted">
            All intake areas were addressed.
          </p>
        ) : (
          <div className="chips">
            {brief.not_asked_about.map((entry, i) => (
              <span className="chip" key={i}>
                {entry}
              </span>
            ))}
          </div>
        )}
      </section>

      <p className="footer-note">{BRIEF_FOOTER}</p>
    </div>
  );
}
