import { Grid } from '../../Grid.js';
import type { DirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { NakedSingleHint } from './NakedSingleHint.js';

// Ported from diuf.sudoku.solver.rules.NakedSingle.
export class NakedSingle implements DirectHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    for (let i = 0; i < 81; i++) {
      if (grid.getCellValue(i) !== 0) continue;
      const potentialValues = grid.getCellPotentialValues(i);
      if (potentialValues.cardinality() === 1) {
        const uniqueValue = potentialValues.nextSetBit(0);
        const cell = Grid.getCell(i);
        accu.add(new NakedSingleHint(this, null, cell, uniqueValue));
      }
    }
  }

  toString(): string {
    return 'Naked Singles';
  }
}
