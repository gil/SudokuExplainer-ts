import { describe, expect, it } from 'vitest';
import { SingleHintAccumulator } from '../../src/engine/solver/SingleHintAccumulator.js';
import { InterruptedError } from '../../src/engine/util/InterruptedError.js';
import { Hint } from '../../src/engine/solver/Hint.js';

class FakeHint extends Hint {
  getRule() {
    return { getHints() {} };
  }
  apply() {}
  getRegions() {
    return null;
  }
  toString() {
    return 'fake';
  }
  toHtml() {
    return '';
  }
}

describe('SingleHintAccumulator', () => {
  it('keeps the first hint and interrupts', () => {
    const accu = new SingleHintAccumulator();
    const h = new FakeHint();
    expect(() => accu.add(h)).toThrow(InterruptedError);
    expect(accu.getHint()).toBe(h);
  });
  it('returns null when nothing was added', () => {
    expect(new SingleHintAccumulator().getHint()).toBeNull();
  });
});
