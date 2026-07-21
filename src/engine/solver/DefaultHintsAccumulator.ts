import type { Hint } from './Hint.js';
import type { HintsAccumulator } from './HintProducer.js';

// Ported from the inner class Solver.DefaultHintsAccumulator. Collects every
// distinct hint into the given result list (dedup via Hint.equals).
export class DefaultHintsAccumulator implements HintsAccumulator {
  private readonly result: Hint[];

  constructor(result: Hint[]) {
    this.result = result;
  }

  add(hint: Hint): void {
    if (!this.result.some((h) => h.equals(hint))) this.result.push(hint);
  }
}
