// Tool definitions.
//
// The schema is the real guardrail: there is no field here that can hold a
// diagnosis, a probability, or a triage priority, so a misbehaving or
// prompt-injected model has nowhere to put one.
//
// `strict: true` makes that enforced rather than advisory — the API validates
// the model's arguments against the schema instead of merely showing it to the
// model. It requires `additionalProperties: false` on every object and is
// supported on Haiku 4.5 and Sonnet 5.

const ITEM_DEF = {
  type: 'object' as const,
  properties: {
    verbatim: {
      type: 'string' as const,
      description: "The patient's exact words.",
    },
    standardised: {
      anyOf: [{ type: 'string' as const }, { type: 'null' as const }],
      description: 'Standard intake term. Null if confidence is sijui.',
    },
    confidence: {
      enum: ['clear', 'uncertain', 'sijui'] as const,
    },
  },
  required: ['verbatim', 'standardised', 'confidence'],
  additionalProperties: false,
};

const itemArray = (description: string) => ({
  type: 'array' as const,
  description,
  items: { $ref: '#/$defs/item' },
});

export const EMIT_NURSE_BRIEF_TOOL = {
  name: 'emit_nurse_brief',
  description:
    'Emit the structured intake brief. Every standardised term must be ' +
    "traceable to the patient's own words.",
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      chief_complaint: itemArray('What the patient physically feels.'),
      onset_duration: itemArray('When it started and how it has changed.'),
      context_exposures: itemArray(
        'Recent travel, current medications, known allergies, and relevant ' +
          'recent events the patient raised.'
      ),
      patient_concerns: itemArray(
        'What the patient says they are worried about, recorded as their ' +
          'stated worry and never reframed as a clinical possibility.'
      ),
      not_asked_about: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          'Intake areas with no information gathered. The nurse must not read ' +
          'silence as a negative finding.',
      },
    },
    required: [
      'chief_complaint',
      'onset_duration',
      'context_exposures',
      'patient_concerns',
      'not_asked_about',
    ],
    additionalProperties: false,
    $defs: { item: ITEM_DEF },
  },
};

/** Conversational turn: the only way the model can address the patient. */
export const ASK_NEXT_QUESTION_TOOL = {
  name: 'ask_next_question',
  description:
    'Ask the patient one short follow-up question to fill the most important ' +
    'gap across the four intake buckets.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string' as const,
        description:
          'One short, warm question about what the patient feels, when it ' +
          'started, or what worries them. Never about what it might mean.',
      },
    },
    required: ['question'],
    additionalProperties: false,
  },
};

/**
 * The way out of the conversation.
 *
 * Without this the model has no move except to ask another question, because
 * every turn forces a tool call. A boolean "that was enough" flag on
 * ask_next_question did not solve it: the model still had to supply a
 * question, so the interrogation continued regardless of the flag.
 */
export const CLOSE_INTAKE_TOOL = {
  name: 'close_intake',
  description:
    'Call this once enough has been gathered. It tells the patient you have ' +
    'what the nurse needs and invites anything they still want to add. Never ' +
    'ask a further probing question after calling it.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      closing_message: {
        type: 'string' as const,
        description:
          'One or two warm sentences: you have enough for the nurse, and is ' +
          'there anything else they want her to know.',
      },
    },
    required: ['closing_message'],
    additionalProperties: false,
  },
};

/**
 * The sijui boundary. Deliberately has no fields at all: the refusal text
 * lives in the application, so the model cannot hedge it, qualify it, or
 * continue the sentence into diagnostic territory.
 */
export const FLAG_DIAGNOSTIC_REQUEST_TOOL = {
  name: 'flag_diagnostic_request',
  description:
    'Call this when the patient asks what they have, asks you to confirm or ' +
    'rule out a condition, or demands medical validation. It takes no ' +
    'arguments; the refusal shown to the patient is fixed application text.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
    additionalProperties: false,
  },
};
