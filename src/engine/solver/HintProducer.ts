import type { Grid } from '../Grid.js';
import type { Hint } from './Hint.js';

// Ported from diuf.sudoku.solver.HintProducer and its sub-interfaces, plus
// HintsAccumulator. getHints may throw InterruptedError (Java: InterruptedException).
export interface HintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void;
}

export interface DirectHintProducer extends HintProducer {
  toString(): string;
}

export interface IndirectHintProducer extends HintProducer {
  toString(): string;
}

export interface WarningHintProducer extends IndirectHintProducer {
  toString(): string;
}

export interface HintsAccumulator {
  add(hint: Hint): void;
}
