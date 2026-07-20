import { Grid } from '../../Grid.js';
import type { DirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { HiddenSingleHint } from './HiddenSingleHint.js';

// Ported from diuf.sudoku.solver.rules.HiddenSingle. Variant region branches
// (DG, Windows, X, Girandola, Asterisk, CD) are dropped: isVLatin/etc frozen.
export class HiddenSingle implements DirectHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    // First alone cells (last empty cell in a region)
    this.getHintsForType(grid, 0, accu, true); // block
    this.getHintsForType(grid, 2, accu, true); // column
    this.getHintsForType(grid, 1, accu, true); // row
    // Then hidden cells
    this.getHintsForType(grid, 0, accu, false); // block
    this.getHintsForType(grid, 2, accu, false); // column
    this.getHintsForType(grid, 1, accu, false); // row
  }

  private getHintsForType(
    grid: Grid,
    regionTypeIndex: number,
    accu: HintsAccumulator,
    aloneOnly: boolean,
  ): void {
    const regions = Grid.getRegions(regionTypeIndex);
    for (const region of regions) {
      for (let value = 1; value <= 9; value++) {
        const potentialIndexes = region.getPotentialPositions(grid, value);
        if (potentialIndexes.cardinality() === 1) {
          const uniqueIndex = potentialIndexes.nextSetBit(0);
          const cell = region.getCell(uniqueIndex);
          const isAlone = region.getEmptyCellCount(grid) === 1;
          if (isAlone === aloneOnly) accu.add(new HiddenSingleHint(this, region, cell, value, isAlone));
        }
      }
    }
  }

  toString(): string {
    return 'Hidden Singles';
  }
}
