import type { Cell } from '../Cell.js';
import { Grid } from '../Grid.js';
import type { Link } from '../Link.js';
import type { BitSet32 } from '../util/BitSet32.js';
import { Hint } from './Hint.js';
import type { IndirectHintProducer } from './HintProducer.js';

// Ported from diuf.sudoku.solver.IndirectHint.
export abstract class IndirectHint extends Hint {
  private readonly rule: IndirectHintProducer;
  private readonly removablePotentials: Map<Cell, BitSet32>;

  protected constructor(rule: IndirectHintProducer, removablePotentials: Map<Cell, BitSet32>) {
    super();
    this.rule = rule;
    this.removablePotentials = removablePotentials;
  }

  override getRule(): IndirectHintProducer {
    return this.rule;
  }

  getRemovablePotentials(): Map<Cell, BitSet32> {
    return this.removablePotentials;
  }

  isWorth(): boolean {
    return this.removablePotentials.size !== 0;
  }

  override apply(targetGrid: Grid): void {
    for (const [cell, cellRemovablePotentials] of this.removablePotentials) {
      targetGrid.removeCellPotentialValues(cell.getIndex(), cellRemovablePotentials);
    }
    const cell = this.getCell();
    if (cell !== null) {
      // Java: cell.setValueAndCancel(getValue(), targetGrid). Vanilla path inlined.
      const index = cell.getIndex();
      const value = this.getValue();
      targetGrid.setCellValue(index, value);
      targetGrid.clearCellPotentialValues(index);
      for (const visible of Grid.visibleCellIndex[index]) {
        targetGrid.removeCellPotentialValue(visible, value);
      }
    }
  }

  abstract getViewCount(): number;

  abstract getSelectedCells(): Cell[] | null;

  abstract getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32>;

  abstract getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32>;

  getBluePotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map();
  }

  abstract getLinks(grid: Grid, viewNum: number): Link[] | null;
}
