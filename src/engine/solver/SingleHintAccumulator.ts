import { InterruptedError } from '../util/InterruptedError.js';
import type { Hint } from './Hint.js';
import type { HintsAccumulator } from './HintProducer.js';

// Ported from diuf.sudoku.solver.SingleHintAccumulator: keeps the first hint
// received and stops by throwing InterruptedError (Java: InterruptedException).
export class SingleHintAccumulator implements HintsAccumulator {
  private result: Hint | null = null;

  add(hint: Hint): void {
    if (!hint.equals(this.result)) {
      this.result = hint;
      throw new InterruptedError();
    }
  }

  getHint(): Hint | null {
    return this.result;
  }
}
