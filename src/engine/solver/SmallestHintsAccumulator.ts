import { Settings } from '../Settings.js';
import { InterruptedError } from '../util/InterruptedError.js';
import type { Hint } from './Hint.js';
import type { HintsAccumulator } from './HintProducer.js';
import type { Rule } from './Rule.js';

/**
 * Ported from Solver.SmallestHintsAccumulator (lksudoku's batch mode). Collects
 * hints until one of a higher rating shows up, then stops.
 *
 * `difficulty` is the solver's running ER, which batch mode 2 compares against;
 * Java reads the enclosing Solver's field directly, so it is passed in here.
 */
export class SmallestHintsAccumulator implements HintsAccumulator {
  private readonly result: Hint[];
  private readonly difficulty: number;
  // 0.0 at start, then the first added rating
  private dif = 0.0;

  constructor(result: Hint[], difficulty: number) {
    this.result = result;
    this.difficulty = difficulty;
  }

  add(hint: Hint): void {
    const newDifficulty = (hint as unknown as Rule).getDifficulty();
    const batchMode = Settings.getInstance().batchSolving();
    if (this.dif === 0.0) {
      this.dif = newDifficulty;
    } else if (
      (newDifficulty !== this.dif && batchMode === 1) ||
      (newDifficulty > this.difficulty && newDifficulty !== this.dif && batchMode === 2)
    ) {
      // assumes calls are ordered strictly ascending by difficulty
      throw new InterruptedError();
    }
    // Java's List.contains uses Hint.equals, not identity.
    if (!this.result.some((h) => h.equals(hint))) this.result.push(hint);
  }
}
