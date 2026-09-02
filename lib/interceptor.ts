// Danger-sign interceptor.
//
// PURE. No network, no state, no side effects. Must work with the network
// unplugged. This file has no imports beyond types and must never gain any.
//
// NOT CLINICALLY VALIDATED. Assembled from published danger signs by
// non-clinicians. It will have gaps. Every path out of it leads to a human
// faster; no path reduces urgency or reassures.

import type { DangerCategory, InterceptorResult, NurseBrief } from './types';

const NO_MATCH: InterceptorResult = {
  triggered: false,
  category: null,
  matched_term: null,
};

/**
 * lowercase, strip diacritics, drop apostrophes ("can't" -> "cant"),
 * reduce every other non-alphanumeric run to a single space.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['‘’`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * A pattern is exact ("neck") unless it ends in `*`, which makes it a stem:
 * "breath*" matches breath, breathe, breathing, breathless.
 */
function tokenMatches(token: string, pattern: string): boolean {
  return pattern.endsWith('*')
    ? token.startsWith(pattern.slice(0, -1))
    : token === pattern;
}

type Rule =
  /**
   * Multi-word phrases, matched as substrings of the normalised text.
   * `label` overrides what the patient is shown, for triggers that should not
   * be quoted back at them.
   */
  | {
      kind: 'phrase';
      category: DangerCategory;
      terms: string[];
      label?: string;
      suppress?: string[];
    }
  /**
   * Single words matched as whole tokens only. This is what keeps "burn" from
   * firing on "burning when I pass urine" or on "heartburn".
   */
  | {
      kind: 'word';
      category: DangerCategory;
      terms: string[];
      label?: string;
      suppress?: string[];
    }
  /**
   * Every group must appear inside a window of N consecutive tokens. This is
   * what catches "my chest hurts" and "pain in my chest", which no fixed
   * phrase list can enumerate.
   */
  | {
      kind: 'near';
      category: DangerCategory;
      label: string;
      groups: string[][];
      window: number;
      suppress?: string[];
    };

function nearMatch(tokens: string[], groups: string[][], window: number): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const slice = tokens.slice(i, i + window);
    if (slice.length < groups.length) break;
    const all = groups.every((group) =>
      slice.some((token) => group.some((p) => tokenMatches(token, p)))
    );
    if (all) return true;
  }
  return false;
}

const RULES: Rule[] = [
  // ------------------------------------------- EMERGENCY SELF-DECLARATION
  // Someone saying "I'm having a heart attack" is not asking a question, they
  // are raising an alarm. This must never reach the model to be answered — it
  // is checked first, and the label deliberately does not repeat the condition
  // back at them, because "what the check noticed: heart attack" would read as
  // the system agreeing with a diagnosis it is in no position to make.
  {
    kind: 'phrase',
    category: 'red',
    label: 'you told us this may be an emergency',
    terms: [
      'heart attack', 'cardiac arrest', 'having a stroke', 'im having a stroke',
      'i am dying', 'im dying', 'think im dying', 'think i am dying',
      'call an ambulance', 'need an ambulance', 'get an ambulance',
      'this is an emergency', 'its an emergency', 'it is an emergency',
      'is an emergency', 'i need help now', 'i need help right now',
      'something is very wrong', 'i might die', 'i could die',
    ],
  },

  // ------------------------------------------------------------------ CARDIAC
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'chest pain', 'chest pains', 'crushing chest', 'tight chest',
      'chest tightness', 'tightness in my chest', 'pressure in my chest',
      'pain in my chest', 'pain in the chest', 'heart racing',
      'racing heart', 'heart is racing', 'palpitations',
    ],
  },
  {
    kind: 'near',
    category: 'red',
    label: 'chest pain or tightness',
    groups: [
      ['chest'],
      ['pain*', 'hurt*', 'ach*', 'tight*', 'crush*', 'pressure', 'heavy', 'heaviness', 'squeez*'],
    ],
    window: 5,
    suppress: ['chest infection', 'chest cold', 'chest x ray', 'chest xray'],
  },

  // ---------------------------------------------------------------- BREATHING
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'cant breathe', 'cannot breathe', 'not breathing', 'stopped breathing',
      'shortness of breath', 'short of breath', 'out of breath',
      'difficulty breathing', 'trouble breathing', 'hard to breathe',
      'struggling to breathe', 'struggle to breathe', 'fighting for breath',
      'cant catch my breath', 'cant get air', 'gasping for air',
    ],
  },
  {
    kind: 'word',
    category: 'red',
    terms: ['gasping', 'wheezing', 'breathless', 'suffocating'],
  },
  {
    kind: 'near',
    category: 'red',
    label: 'difficulty breathing',
    groups: [
      ['breath*'],
      ['cant', 'cannot', 'hard', 'difficult*', 'struggl*', 'short', 'trouble',
       'unable', 'fast', 'rapid*', 'heavy', 'heavily'],
    ],
    window: 5,
  },

  // ------------------------------------------------------------- NEUROLOGICAL
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'sudden weakness', 'face drooping', 'face is drooping', 'slurred speech',
      'slurring my words', 'cant speak properly', 'worst headache',
      'sudden confusion', 'cant move my arm', 'cant move my leg',
      'cant move one side',
    ],
  },
  {
    kind: 'word',
    category: 'red',
    terms: ['paralysis', 'paralysed', 'paralyzed', 'stroke'],
    suppress: ['stroke of luck'],
  },
  {
    kind: 'near',
    category: 'red',
    label: 'numbness or weakness on one side',
    groups: [
      ['numb*', 'weak*', 'tingl*'],
      ['one', 'side', 'left', 'right', 'arm', 'leg', 'face', 'hand'],
    ],
    window: 4,
  },
  {
    kind: 'near',
    category: 'red',
    label: 'a sudden or severe headache',
    groups: [
      ['headache', 'head'],
      ['worst', 'sudden', 'suddenly', 'thunderclap', 'explod*'],
    ],
    window: 4,
  },

  // ----------------------------------------------------------------- BLEEDING
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'coughing blood', 'coughing up blood', 'cough up blood', 'coughed up blood',
      'vomiting blood', 'vomited blood', 'throwing up blood', 'threw up blood',
      'heavy bleeding', 'bleeding heavily', 'bleeding a lot', 'wont stop bleeding',
      'cant stop the bleeding', 'blood in my stool', 'blood in stool',
      'blood in my urine', 'blood in urine', 'blood in my vomit',
      'passing blood', 'losing a lot of blood',
    ],
  },
  {
    kind: 'near',
    category: 'red',
    label: 'bleeding',
    groups: [
      ['blood', 'bleed*', 'bled'],
      ['cough*', 'vomit*', 'threw', 'throw*', 'stool*', 'urine', 'pee*',
       'rectum', 'heavy', 'heavily', 'soak*'],
    ],
    window: 5,
    suppress: [
      'blood pressure', 'blood test', 'blood sugar', 'blood work',
      'blood group', 'blood count',
    ],
  },

  // ------------------------------------------------------------ CONSCIOUSNESS
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'passed out', 'blacked out', 'wont wake', 'wont wake up', 'not waking up',
      'cant wake him', 'cant wake her', 'cant wake them', 'not responding to me',
      'lost consciousness',
    ],
  },
  {
    kind: 'word',
    category: 'red',
    terms: ['fainted', 'fainting', 'faint', 'unconscious', 'unresponsive', 'collapsed'],
  },

  // ---------------------------------------------------------------- OBSTETRIC
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'water broke', 'waters broke', 'baby not moving', 'baby stopped moving',
      'baby isnt moving', 'not felt the baby move',
    ],
  },
  {
    kind: 'near',
    category: 'red',
    label: 'a danger sign during pregnancy',
    groups: [
      ['pregnant', 'pregnancy', 'expecting'],
      ['bleed*', 'blood', 'fit', 'fits', 'seizure*', 'convuls*', 'severe',
       'headache', 'swell*', 'swollen', 'blurred', 'contractions'],
    ],
    window: 8,
  },

  // --------------------------------------------------------------- PAEDIATRIC
  {
    kind: 'near',
    category: 'red',
    label: 'a child not feeding or waking',
    groups: [
      ['child', 'baby', 'infant', 'son', 'daughter', 'newborn', 'toddler'],
      ['not', 'wont', 'cant', 'cannot', 'isnt', 'hasnt', 'refus*', 'stopped',
       'barely', 'hardly'],
      ['feed*', 'eat*', 'drink*', 'wake*', 'waking', 'respond*', 'mov*'],
    ],
    window: 8,
  },
  {
    kind: 'near',
    category: 'red',
    label: 'a child who may be very unwell',
    groups: [
      ['child', 'baby', 'infant', 'son', 'daughter', 'newborn', 'toddler'],
      ['convuls*', 'seizure*', 'fitting', 'floppy', 'limp', 'unresponsive', 'blue'],
    ],
    window: 6,
  },
  {
    kind: 'word',
    category: 'red',
    terms: ['convulsions', 'convulsion', 'convulsing', 'seizure', 'seizures', 'fitting'],
  },
  {
    kind: 'phrase',
    category: 'red',
    terms: ['having fits', 'had a fit', 'having a fit'],
  },

  // -------------------------------------------------------------------- SEPSIS
  {
    kind: 'near',
    category: 'red',
    label: 'a stiff neck with fever',
    groups: [
      ['stiff', 'stiffness'],
      ['neck'],
      ['fever', 'temperature', 'feverish', 'hot'],
    ],
    window: 8,
  },
  {
    kind: 'phrase',
    category: 'red',
    terms: ['non blanching rash', 'rash that doesnt fade', 'rash that does not fade'],
  },

  // -------------------------------------------------------------------- TRAUMA
  {
    kind: 'word',
    category: 'red',
    // Whole-token only: "burn" must not fire on "burning" or "heartburn".
    terms: ['accident', 'burn', 'burns', 'burnt', 'burned', 'scalded', 'fracture', 'fractured'],
    suppress: ['by accident', 'accidentally'],
  },
  {
    kind: 'phrase',
    category: 'red',
    terms: [
      'deep wound', 'broken bone', 'broken arm', 'broken leg', 'broke my arm',
      'broke my leg', 'head injury', 'hit my head', 'hit by a car',
      'hit by a motorbike', 'knocked down', 'road accident', 'stabbed',
    ],
  },

  // ----------------------------------------------------------------- SELF-HARM
  // AMBER. Different screen, different tone. Intent-marked phrases only — a
  // bare "hurt myself" is how people describe falling off a boda.
  {
    kind: 'phrase',
    category: 'amber',
    terms: [
      'kill myself', 'killing myself', 'end my life', 'ending my life',
      'end it all', 'take my own life', 'want to die', 'wanna die',
      'wish i was dead', 'wish i were dead', 'better off dead',
      'no reason to live', 'nothing to live for', 'cant go on living',
      'dont want to live', 'dont want to be here anymore',
      'self harm', 'selfharm', 'cutting myself', 'harm myself', 'harming myself',
    ],
  },
  {
    kind: 'word',
    category: 'amber',
    terms: ['suicide', 'suicidal'],
  },
  {
    kind: 'near',
    category: 'amber',
    label: 'intent + hurt myself',
    groups: [
      ['hurt*', 'harm*'],
      ['myself'],
      ['want', 'wanna', 'thinking', 'thought*', 'plan*', 'urge*', 'tempt*',
       'tried', 'trying'],
    ],
    window: 8,
  },
];

/**
 * Check a single piece of text. Red rules are evaluated before amber: an
 * immediate physical emergency takes the faster screen.
 */
export function checkDangerSigns(input: string): InterceptorResult {
  const text = normalise(input);
  if (!text) return NO_MATCH;

  const tokens = text.split(' ');

  for (const rule of RULES) {
    if (rule.suppress?.some((s) => text.includes(s))) continue;

    if (rule.kind === 'phrase') {
      const hit = rule.terms.find((t) => text.includes(t));
      if (hit) {
        return { triggered: true, category: rule.category, matched_term: rule.label ?? hit };
      }
    } else if (rule.kind === 'word') {
      const hit = rule.terms.find((t) => tokens.includes(t));
      if (hit) {
        return { triggered: true, category: rule.category, matched_term: rule.label ?? hit };
      }
    } else if (nearMatch(tokens, rule.groups, rule.window)) {
      return { triggered: true, category: rule.category, matched_term: rule.label };
    }
  }

  return NO_MATCH;
}

/**
 * Checkpoint 3: run over the model's returned brief.
 *
 * Scans BOTH `standardised` and `verbatim`. An item the model marked 'sijui'
 * has a null `standardised`, so a danger sign sitting in the patient's own
 * words would otherwise be invisible at this checkpoint.
 */
export function checkBriefForDangerSigns(brief: NurseBrief): InterceptorResult {
  const buckets = [
    brief.chief_complaint,
    brief.onset_duration,
    brief.context_exposures,
    brief.patient_concerns,
  ];

  for (const bucket of buckets) {
    for (const item of bucket ?? []) {
      for (const field of [item.standardised, item.verbatim]) {
        if (!field) continue;
        const result = checkDangerSigns(field);
        if (result.triggered) return result;
      }
    }
  }

  return NO_MATCH;
}
