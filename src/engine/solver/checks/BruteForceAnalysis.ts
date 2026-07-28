import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { variantString, isBlocks } from '../../Settings.js';
import { JavaRandom } from '../../util/JavaRandom.js';
import { rebuildPotentialValues } from '../potentials.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';
import { DoubleSolutionWarning } from './DoubleSolutionWarning.js';
import { SolutionHint } from './SolutionHint.js';
import { WarningMessage } from './WarningMessage.js';

const VARIANT = variantString + (isBlocks ? ' Sudoku' : '');

// Ported from diuf.sudoku.solver.checks.BruteForceAnalysis. The singles-filling
// optimisation inside analyse (Java: new HiddenSingle()/new NakedSingle() driven
// through a SingleHintAccumulator) is inlined here as applySingles, reproducing
// the exact Java scan order so recursion depth and rnd.nextInt call sites stay
// byte-accurate. The variant-flag branches (isVLatin, isDG, ...) are dropped.
export class BruteForceAnalysis implements WarningHintProducer {
  private readonly grid1 = new Grid();
  private readonly grid2 = new Grid();
  private readonly includeSolution: boolean;

  constructor(includeSolution: boolean) {
    this.includeSolution = includeSolution;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    grid.copyTo(this.grid1);
    let hasSolution = this.analyse(this.grid1, false);
    if (!hasSolution) {
      grid.copyTo(this.grid1);
      rebuildPotentialValues(this.grid1);
      let message: WarningMessage;
      if (grid.equals(this.grid1)) {
        // All potential values correct - No solution
        message = new WarningMessage(this, 'The ' + VARIANT + ' has no solution', 'NoSolution.html', VARIANT);
      } else {
        // Some potential values missing. Check with all
        hasSolution = this.analyse(this.grid1, false);
        if (!hasSolution)
          message = new WarningMessage(this, 'The ' + VARIANT + ' has no solution', 'NoSolution.html', VARIANT);
        else
          message = new WarningMessage(this, 'The ' + VARIANT + ' has no solution', 'MissingCandidates.html', VARIANT);
      }
      accu.add(message);
      return;
    }
    grid.copyTo(this.grid2);
    this.analyse(this.grid2, true);
    if (!this.grid1.equals(this.grid2)) {
      const message = new DoubleSolutionWarning(this, grid, this.grid1, this.grid2);
      accu.add(message);
    } else if (this.includeSolution) {
      const hint = new SolutionHint(this, grid, this.grid1);
      accu.add(hint);
    }
  }

  getCountSolutions(grid: Grid): number {
    rebuildPotentialValues(grid);
    grid.copyTo(this.grid1);
    if (!this.analyse(this.grid1, false)) return 0; // no solution
    grid.copyTo(this.grid2);
    this.analyse(this.grid2, true);
    if (this.grid1.equals(this.grid2)) return 1; // one unique solution
    return 2; // more than one solution
  }

  private analyse(grid: Grid, isReverse: boolean, rnd: JavaRandom | null = null): boolean {
    /*
     * Quick check if every number can be placed in every row, column and block.
     * This is not necessary in theory, but in practice, some invalid sudoku
     * may require a too huge number of iterations without this check
     */
    if (!this.isFillable(grid)) return false;

    // (1) Fill all naked single and hidden single.
    while (this.applySingle(grid)) {
      // keep filling forced singles
    }
    if (grid.isSolved()) return true;
    /*
     * (2) Look for the cell with the least number of potentials.
     */
    let leastCell: Cell | null = null;
    let leastCardinality = 10;
    for (let i = 0; i < 81; i++) {
      if (grid.getCellValue(i) === 0) {
        const cardinality = grid.getCellPotentialValues(i).cardinality();
        if (cardinality < leastCardinality) {
          leastCardinality = cardinality;
          leastCell = Grid.getCell(i);
        }
      }
    }
    // (3) Try each possible value for that cell
    const savePoint = new Grid();
    const startValue = isReverse ? 8 : 0;
    const stopValue = isReverse ? -1 : 9;
    const delta = isReverse ? -1 : 1;
    let firstValue = 0;
    if (rnd !== null) firstValue = rnd.nextInt(9);
    for (let value0 = startValue; value0 !== stopValue; value0 += delta) {
      let value = value0 + 1;
      if (rnd !== null) value = ((value0 + firstValue) % 9) + 1;
      if (grid.hasCellPotentialValue(leastCell!.getIndex(), value)) {
        grid.copyTo(savePoint);
        this.setValueAndCancel(leastCell!, value, grid);
        const result = this.analyse(grid, isReverse, rnd);
        if (result) return true;
        // Restore savepoint and continue with next value, if any
        savePoint.copyTo(grid);
      }
    }
    // Failed
    return false;
  }

  // Java: cell.setValueAndCancel(value, grid), vanilla path.
  private setValueAndCancel(cell: Cell, value: number, grid: Grid): void {
    const index = cell.getIndex();
    grid.setCellValue(index, value);
    grid.clearCellPotentialValues(index);
    for (const visible of Grid.visibleCellIndex[index]) {
      grid.removeCellPotentialValue(visible, value);
    }
  }

  // Fill one forced single, matching Java's SingleHintAccumulator order:
  // NakedSingle (cell index 0..80) wins over HiddenSingle; HiddenSingle scans
  // aloneOnly then hidden, over region types block(0), column(2), row(1).
  private applySingle(grid: Grid): boolean {
    for (let i = 0; i < 81; i++) {
      if (grid.getCellValue(i) !== 0) continue;
      const potentialValues = grid.getCellPotentialValues(i);
      if (potentialValues.cardinality() === 1) {
        this.setValueAndCancel(Grid.getCell(i), potentialValues.nextSetBit(0), grid);
        return true;
      }
    }
    for (const aloneOnly of [true, false]) {
      for (const regionTypeIndex of [0, 2, 1]) {
        const regions = Grid.getRegions(regionTypeIndex);
        for (const region of regions) {
          for (let value = 1; value <= 9; value++) {
            const potentialIndexes = region.getPotentialPositions(grid, value);
            if (potentialIndexes.cardinality() === 1) {
              const cell = region.getCell(potentialIndexes.nextSetBit(0));
              const isAlone = region.getEmptyCellCount(grid) === 1;
              if (isAlone === aloneOnly) {
                this.setValueAndCancel(cell, value, grid);
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  private isFillable(grid: Grid): boolean {
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const regions = Grid.getRegions(regionTypeIndex);
      for (const region of regions) {
        for (let value = 1; value <= 9; value++) {
          if (!region.contains(grid, value) && region.getPotentialPositions(grid, value).isEmpty())
            return false; // No room for the value in the region
        }
      }
    }
    return true;
  }

  solveRandom(grid: Grid, rnd: JavaRandom): boolean {
    rebuildPotentialValues(grid);
    return this.analyse(grid, false, rnd);
  }

  toString(): string {
    return 'Brute force analysis';
  }
}
