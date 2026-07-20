import type { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';

// Ported from diuf.sudoku.solver.checks.NumberOfValues. The too-few-values
// warning is disabled in Java (to allow Sukaku puzzles), so getHints only
// computes the value set and produces nothing.
export class NumberOfValues implements WarningHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    const values = new BitSet32();
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const value = grid.getCellValue(x, y);
        if (value !== 0) values.set(value);
      }
    }
  }

  toString(): string {
    return 'Number of different values';
  }
}
