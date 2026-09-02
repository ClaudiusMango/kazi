// Shared types for the Kazi intake flow.
// English-only build: no `language_detected` field.

export type Confidence = 'clear' | 'uncertain' | 'sijui';

export interface BriefItem {
  /** The patient's exact words. */
  verbatim: string;
  /** Standard intake term. null when confidence is 'sijui'. */
  standardised: string | null;
  confidence: Confidence;
}

export interface NurseBrief {
  chief_complaint: BriefItem[];
  onset_duration: BriefItem[];
  context_exposures: BriefItem[];
  patient_concerns: BriefItem[];
  /** Buckets with no information gathered. Silence is not a negative finding. */
  not_asked_about: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type DangerCategory = 'red' | 'amber';

export interface InterceptorResult {
  triggered: boolean;
  category: DangerCategory | null;
  /** Clinical grouping, e.g. "Cardiac / chest". What the nurse acts on. */
  group: string | null;
  matched_term: string | null;
  /** The text that tripped the check, so the nurse can read it herself. */
  source: string | null;
}

// Only the screens the app actually reaches. 'generating' is a state inside
// the chat, 'error' renders inline per spec B1.13, and the confirmation
// question sits under the brief rather than behind another tap.
export type ScreenState =
  | 'consent'
  | 'chat'
  | 'red_alert'
  | 'amber_alert'
  | 'brief'
  | 'handoff'
  | 'complete';
