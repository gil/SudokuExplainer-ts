import { Grid } from '../Grid.js';

// Ported from diuf.sudoku.solver.Solver.rebuildPotentialValues /
// cancelPotentialValues. Vanilla path only: the isForbiddenPairs() block is
// dropped (whichNC == 0 is frozen).

// Rebuild, for each empty cell, the set of potential values.
export function rebuildPotentialValues(grid: Grid): void {
  for (let i = 0; i < 81; i++) {
    if (grid.getCellValue(i) === 0) {
      for (let value = 1; value <= 9; value++) grid.addCellPotentialValue(i, value);
    }
  }
  cancelPotentialValues(grid);
}

// Remove all illegal potential values according to the current values of the
// cells. Can be invoked after a new cell gets a value.
export function cancelPotentialValues(grid: Grid): void {
  for (let i = 0; i < 81; i++) {
    const value = grid.getCellValue(i);
    if (value === 0) continue;
    grid.clearCellPotentialValues(i);
    for (const visible of Grid.visibleCellIndex[i]) {
      grid.removeCellPotentialValue(visible, value);
    }
  }
}
