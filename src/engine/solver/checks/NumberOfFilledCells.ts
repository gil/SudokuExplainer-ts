import type { Grid } from '../../Grid.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';
import { WarningMessage } from './WarningMessage.js';

// Ported from diuf.sudoku.solver.checks.NumberOfFilledCells. The too-few-clues
// branch is commented out in Java and stays out.
export class NumberOfFilledCells implements WarningHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    let countEmpty = 0;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (grid.getCellValue(x, y) === 0) countEmpty++;
      }
    }
    if (countEmpty === 0) {
      const message = new WarningMessage(this, 'The sudoku has been solved', 'SudokuSolved.html');
      accu.add(message);
    }
  }

  toString(): string {
    return 'Number of clues';
  }
}
