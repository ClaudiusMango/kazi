// Shared constants. No secrets here — the API key is read server-side only.

/** Verified available on the key before demo via GET /v1/models. */
export const MODEL_PRIMARY = 'claude-haiku-4-5';

/**
 * Fallback if Haiku's extraction quality proves insufficient.
 * Sonnet 5 rather than Sonnet 4.6: newer, cheaper, and it supports strict
 * tool use — 4.6 does not, which would silently drop our schema guarantee.
 */
export const MODEL_FALLBACK = 'claude-sonnet-5';

/**
 * `temperature` is rejected with a 400 on Claude 4.6 and later, Sonnet 5
 * included — the sampling parameters were removed from that family. Haiku 4.5
 * still accepts it, and temperature 0 matters for translation fidelity, so it
 * is sent only where it is accepted rather than dropped everywhere.
 *
 * The fallback therefore runs at default sampling. Acceptable: it is a
 * degraded path, and extraction correctness is held by the schema, not by
 * temperature.
 */
export function acceptsTemperature(model: string): boolean {
  return model.startsWith('claude-haiku-4-5');
}

/**
 * Fixed refusal for the sijui boundary. Rendered by the application, never
 * written by the model, so it cannot be softened, qualified, or continued.
 */
export const SIJUI_REFUSAL =
  'I am an intake assistant preparing your timeline for the nurse. I cannot ' +
  'evaluate health conditions or guess diagnoses. Let’s focus on what you ' +
  'are feeling, so the nurse can review it with you.';

/**
 * AMBER screen helpline.
 *
 * Left null until a current number has been verified on the day. A dead or
 * wrong number shown to someone disclosing self-harm is the worst failure this
 * product can produce, so no number is the safe default — the screen sends
 * them to the nurse at the desk either way.
 *
 * To enable: { label: 'Kenya crisis helpline', number: '0800 000 000' }
 */
export const CRISIS_HELPLINE: { label: string; number: string } | null = null;

/**
 * National emergency numbers, shown on the RED screen for the case the screen
 * cannot solve on its own: nobody at the desk.
 *
 * These are stable national numbers rather than a charity line, which is why
 * they ship enabled where the crisis helpline does not — but verify them on
 * the day like everything else, and replace with whatever the facility uses.
 */
export const EMERGENCY_NUMBERS: { label: string; numbers: string[] } | null = {
  label: 'If there is no one at the desk',
  numbers: ['999', '112'],
};

/**
 * Static safety guidance for the RED screen.
 *
 * NOT first aid and not treatment. Every line is non-conditional — safe
 * whatever is actually wrong — because the system does not know the condition
 * and must not act as though it does. Deliberately excluded: aspirin or any
 * medication, positioning advice ("lie down" harms someone in respiratory
 * distress), and "do not eat or drink" (which harms a diabetic hypo). This is
 * human-authored screen text, identical every time. The model never writes it
 * and never sees it.
 */
export const WHILE_YOU_WAIT: string[] = [
  'Sit down and rest where you are. Do not walk far, and do not drive yourself anywhere.',
  'Tell the person next to you what is happening, so someone knows.',
  'Loosen anything tight around your neck or chest.',
  'If you feel worse, call out for help straight away — do not wait quietly.',
];

// Failure copy lives with the notices in ChatInterface, not here: each one is
// paired with the actions that remedy it, and a message without an action is
// the dead end this replaced. The patient still never sees a technical detail.

export const OPENING_MESSAGE =
  'Karibu. What brought you here today? Describe what you are feeling, in your ' +
  'own words.';

/**
 * Minimum before "Generate my summary" is offered at all.
 *
 * Message count alone is too weak a gate — two turns of "hi" and "ok" would
 * pass it. Character count is the better proxy for whether there is anything
 * to translate. Note that a thin brief is not itself a safety failure: the
 * not_asked_about list fills up honestly. The gate exists so the patient is
 * not invited to submit nothing, not to hold them hostage until the model is
 * satisfied — which is why the model's enough_information flag changes the
 * button's prominence rather than its existence.
 */
export const MIN_INTAKE_TURNS = 2;
export const MIN_INTAKE_CHARS = 60;

/**
 * Hard ceiling on patient turns, enforced client-side and independent of the
 * model. close_intake is the model's way out of the conversation; this is the
 * one that does not depend on it behaving. Someone queuing to see a nurse
 * should never be held in an interrogation by a loop we control.
 */
export const MAX_INTAKE_TURNS = 8;

export const INTAKE_CAP_MESSAGE =
  'Thank you — that is plenty for the nurse to work with. Tap “Generate my ' +
  'summary” whenever you are ready.';

/**
 * Origin the QR handoff link points at.
 *
 * Needed when the patient's device is on http://localhost — a QR encoding
 * "localhost" resolves to the *scanning* phone, not to this machine. Set it to
 * the LAN address for a local demo. Leave unset in a real deployment, where
 * window.location.origin is already correct.
 *
 * NEXT_PUBLIC_ is inlined into the client bundle by design: it is a URL, not
 * a secret.
 */
export const HANDOFF_ORIGIN =
  process.env.NEXT_PUBLIC_HANDOFF_ORIGIN?.trim() || null;

/** Shared-tablet inactivity handling. */
export const INACTIVITY_WARN_MS = 90_000;
export const INACTIVITY_PURGE_MS = 120_000;

// Abuse limits on the proxy. It holds our key and has no auth in front of it.
export const MAX_INPUT_CHARS = 4000;
export const MAX_TOTAL_CHARS = 12000;
export const MAX_MESSAGES = 40;

/**
 * Spec says >10s is a timeout. 20s in practice: a 1500-token structured brief
 * on a cold connection can legitimately exceed 10s, and a slow brief beats a
 * spuriously failed one. The chat turn is short, so it keeps a tighter bound.
 */
// These are budgets for the whole retry sequence (primary twice, then the
// fallback model), not for a single request.
export const BRIEF_TIMEOUT_MS = 25_000;
export const CHAT_TIMEOUT_MS = 15_000;

export const COLORS = {
  accent: '#1d9e75',
  accentLight: '#e1f5ee',
  redBg: '#a32d2d',
  redText: '#f7c1c1',
  amberBg: '#3a3528',
  amberAccent: '#fac775',
  surface: '#f7f6f3',
  card: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#6b6b6b',
  textMuted: '#9a9a9a',
  border: '#e5e3de',
} as const;

/** Non-removable footer on every rendered brief. */
export const BRIEF_FOOTER =
  'This sheet contains only what the patient volunteered, translated into ' +
  'standard terms. It is not an assessment. It rules nothing in and nothing ' +
  'out. Items marked UNCLEAR were not understood and were deliberately not ' +
  'guessed.';
