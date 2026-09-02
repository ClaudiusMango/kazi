import { describe, expect, it } from 'vitest';
import { MODEL_FALLBACK, MODEL_PRIMARY, acceptsTemperature } from './constants';

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
