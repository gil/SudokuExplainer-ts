import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { WarningHintProducer } from '../HintProducer.js';
import { WarningHint } from '../WarningHint.js';
import * as templates from '../../../templates/checks.js';

// Ported from diuf.sudoku.solver.checks.SolutionHint.
export class SolutionHint extends WarningHint {
  private readonly solution: Grid;

  constructor(rule: WarningHintProducer, grid: Grid, solution: Grid) {
    super(rule);
    this.solution = solution;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const value = this.solution.getCellValue(x, y);
        const cell = Grid.getCellXY(x, y);
        result.set(cell, SingletonBitSet.create(value));
      }
    }
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.getGreenPotentials(grid, viewNum);
  }

  override toString(): string {
    return 'Solution';
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override toHtml(grid: Grid): string {
    return templates.Solution;
  }

  override apply(targetGrid: Grid): void {
    this.solution.copyTo(targetGrid);
  }
}
