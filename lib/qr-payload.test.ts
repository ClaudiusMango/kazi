import { describe, expect, it } from 'vitest';
import { MAX_PAYLOAD_CHARS, decodeBrief, encodeBrief } from './qr-payload';
import type { NurseBrief } from './types';

const brief: NurseBrief = {
  chief_complaint: [
    { verbatim: 'my head has been pounding', standardised: 'throbbing headache', confidence: 'clear' },
    { verbatim: 'I threw up twice yesterday', standardised: 'vomiting', confidence: 'clear' },
  ],
  onset_duration: [
    { verbatim: 'since Tuesday', standardised: 'onset Tuesday', confidence: 'clear' },
    { verbatim: 'it comes and goes the same way', standardised: null, confidence: 'sijui' },
  ],
  context_exposures: [
    { verbatim: 'I was in Kisumu last week', standardised: 'recent travel to Kisumu', confidence: 'clear' },
  ],
  patient_concerns: [
    {
      verbatim: 'I am worried it is something serious in my brain',
      standardised: 'patient worried about serious brain condition',
      confidence: 'clear',
    },
  ],
  not_asked_about: ['allergies', 'pregnancy status', 'prior episodes'],
};

describe('qr payload', () => {
  it('round-trips a realistic brief without reduction', () => {
    const encoded = encodeBrief(brief);
    expect(encoded.reduced).toBe(false);
    expect(encoded.tooLarge).toBe(false);
    expect(encoded.payload.length).toBeLessThanOrEqual(MAX_PAYLOAD_CHARS);

    const decoded = decodeBrief(encoded.payload);
    expect(decoded).not.toBeNull();
    expect(decoded!.brief).toEqual(brief);
  });

  it('preserves null standardised and sijui confidence', () => {
    const decoded = decodeBrief(encodeBrief(brief).payload)!;
    const unclear = decoded.brief.onset_duration[1];
    expect(unclear.standardised).toBeNull();
    expect(unclear.confidence).toBe('sijui');
  });

  it('drops verbatim rather than failing when a brief is oversized', () => {
    const big: NurseBrief = {
      ...brief,
      chief_complaint: Array.from({ length: 60 }, (_, i) => ({
        verbatim: `a long stretch of what the patient actually said, entry ${i}, with plenty of unique words to defeat compression ${Math.random()}`,
        standardised: `standard term ${i}`,
        confidence: 'clear' as const,
      })),
    };

    const encoded = encodeBrief(big);
    expect(encoded.reduced).toBe(true);

    const decoded = decodeBrief(encoded.payload)!;
    expect(decoded.reduced).toBe(true);
    expect(decoded.brief.chief_complaint[0].verbatim).toBe('');
    expect(decoded.brief.chief_complaint[0].standardised).toBe('standard term 0');
  });

  it('returns null on a corrupt payload rather than throwing', () => {
    expect(decodeBrief('not-a-real-payload')).toBeNull();
    expect(decodeBrief('')).toBeNull();
  });
});
