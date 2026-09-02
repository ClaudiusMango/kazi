// Client-side pre-filter for diagnostic requests.
//
// This is the first of two levels. It catches the common phrasings without a
// round trip so the refusal is instant and works offline. The real boundary is
// the sijui protocol in the system prompt plus flag_diagnostic_request, which
// has no free-text field.
//
// Deliberately narrow: a false positive here refuses a legitimate symptom
// description, which costs the nurse information. When in doubt, let it
// through — the prompt-level boundary catches what this misses.

import { normalise } from './interceptor';

const PATTERNS: RegExp[] = [
  /\bdo i have\b/,
  /\bhave i got\b/,
  /\bwhats wrong with me\b/,
  /\bwhat is wrong with me\b/,
  /\bwhat do i have\b/,
  /\bwhat could (it|this) be\b/,
  /\bcould (it|this) be\b/,
  /\bis (it|this) (cancer|malaria|typhoid|tb|covid|serious|dangerous|an emergency)\b/,
  /\bwhat do you think (it |this )?(is|could be)\b/,
  /\bcan you (confirm|rule out|tell me what)\b/,
  /\brule out\b/,
  /\bdiagnos(e|is|ing)\b/,
  /\bwhat should i take\b/,
  /\bwhat medicine\b/,
  /\bwhich (test|tests|medicine|drug)\b/,
  /\bhow serious\b/,
  /\brate (how serious|this|it)\b/,
  /\bam i (going to )?(die|dying|ok|okay|fine)\b/,
  /\bmost likely condition\b/,
  /\blikely conditions?\b/,
  /\bas a doctor\b/,
  /\byoure a doctor\b/,
  /\bpretend (you are|youre) a doctor\b/,
  /\bignore (your|the) (instructions|rules|prompt)\b/,
];

/**
 * True when the patient is asking for a diagnosis, prognosis, treatment, or
 * severity judgement rather than describing what they feel.
 */
export function isDiagnosticRequest(input: string): boolean {
  const text = normalise(input);
  if (!text) return false;
  return PATTERNS.some((pattern) => pattern.test(text));
}
