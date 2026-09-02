import { describe, expect, it } from 'vitest';
import {
  MODEL_FALLBACK,
  MODEL_PRIMARY,
  acceptsTemperature,
  canOfferSummary,
} from './constants';

// Regression guard. `temperature` is accepted by Haiku 4.5 and rejected with a
// 400 on the 4.6+ family. Sending it unconditionally made the fallback model
// fail every single time it was reached — silently, because it only runs once
// the primary is already failing.
describe('model parameter compatibility', () => {
  it('sends temperature to the primary model', () => {
    expect(acceptsTemperature(MODEL_PRIMARY)).toBe(true);
  });

  it('does NOT send temperature to the fallback model', () => {
    expect(acceptsTemperature(MODEL_FALLBACK)).toBe(false);
  });

  it('rejects the whole 4.6+ family', () => {
    for (const model of [
      'claude-sonnet-5',
      'claude-sonnet-4-6',
      'claude-opus-5',
      'claude-opus-4-8',
      'claude-fable-5-1',
    ]) {
      expect(acceptsTemperature(model), model).toBe(false);
    }
  });
});

describe('offering the summary', () => {
  it('offers it the moment the model closes the intake', () => {
    // The regression: the model said it had enough after two short answers,
    // the character floor said no, and the patient had no way forward.
    expect(canOfferSummary({ turns: 2, chars: 25, ready: true })).toBe(true);
    expect(canOfferSummary({ turns: 1, chars: 5, ready: true })).toBe(true);
  });

  it('offers it for a substantial two-turn intake', () => {
    expect(canOfferSummary({ turns: 2, chars: 80, ready: false })).toBe(true);
  });

  it('offers it after enough turns however briefly they answered', () => {
    expect(canOfferSummary({ turns: 3, chars: 12, ready: false })).toBe(true);
  });

  it('withholds it only at the very start', () => {
    expect(canOfferSummary({ turns: 0, chars: 0, ready: false })).toBe(false);
    expect(canOfferSummary({ turns: 1, chars: 10, ready: false })).toBe(false);
  });

  it('never leaves a patient with no way forward', () => {
    // Any realistic conversation reaches an offer within three turns.
    for (let turns = 3; turns <= 8; turns++) {
      expect(canOfferSummary({ turns, chars: 1, ready: false }), `${turns} turns`).toBe(true);
    }
  });
});
