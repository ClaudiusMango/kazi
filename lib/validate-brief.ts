import type { BriefItem, Confidence, NurseBrief } from './types';

// Runtime shape guard. `strict: true` on the tool means the API already
// validated the model's arguments, but nothing renders unvalidated data:
// the response could also be an error body, a proxy fault, or a future
// schema change.

const CONFIDENCES: Confidence[] = ['clear', 'uncertain', 'sijui'];

function isItem(value: unknown): value is BriefItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.verbatim === 'string' &&
    (typeof item.standardised === 'string' || item.standardised === null) &&
    CONFIDENCES.includes(item.confidence as Confidence)
  );
}

function isItemArray(value: unknown): value is BriefItem[] {
  return Array.isArray(value) && value.every(isItem);
}

export function isNurseBrief(value: unknown): value is NurseBrief {
  if (typeof value !== 'object' || value === null) return false;
  const brief = value as Record<string, unknown>;
  return (
    isItemArray(brief.chief_complaint) &&
    isItemArray(brief.onset_duration) &&
    isItemArray(brief.context_exposures) &&
    isItemArray(brief.patient_concerns) &&
    Array.isArray(brief.not_asked_about) &&
    brief.not_asked_about.every((entry) => typeof entry === 'string')
  );
}

/** True when the model returned a well-formed but entirely empty brief. */
export function isEmptyBrief(brief: NurseBrief): boolean {
  return (
    brief.chief_complaint.length === 0 &&
    brief.onset_duration.length === 0 &&
    brief.context_exposures.length === 0 &&
    brief.patient_concerns.length === 0
  );
}
