import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { variantString, isBlocks } from '../../Settings.js';
import type { WarningHintProducer } from '../HintProducer.js';
import { WarningHint } from '../WarningHint.js';
import * as templates from '../../../templates/checks.js';
import { format } from '../../../templates/format.js';

const VARIANT = variantString + (isBlocks ? ' Sudoku' : '');

// Ported from diuf.sudoku.solver.checks.DoubleSolutionWarning.
export class DoubleSolutionWarning extends WarningHint {
  private readonly solution1: Grid;
  private readonly solution2: Grid;

  constructor(rule: WarningHintProducer, source: Grid, solution1: Grid, solution2: Grid) {
    super(rule);
    this.solution1 = solution1;
    this.solution2 = solution2;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const solution = viewNum === 0 ? this.solution1 : this.solution2;
    const result = new Map<Cell, BitSet32>();
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const value = solution.getCellValue(x, y);
        const cell = Grid.getCellXY(x, y);
        result.set(cell, SingletonBitSet.create(value));
      }
    }
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.getGreenPotentials(grid, viewNum);
  }

  override getViewCount(): number {
    return 2;
  }

  override isWorth(): boolean {
    return true;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override toString(): string {
    return VARIANT + ' has multiple solutions';
  }

  override toHtml(grid: Grid): string {
    return format(templates.DoubleSolution, VARIANT);
  }
}
