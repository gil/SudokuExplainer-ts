import type { Cell } from '../Cell.js';
import { Grid, type Region } from '../Grid.js';
import { Hint } from './Hint.js';
import type { DirectHintProducer } from './HintProducer.js';

// Ported from diuf.sudoku.solver.DirectHint.
export abstract class DirectHint extends Hint {
  private readonly rule: DirectHintProducer;
  private readonly region: Region | null;
  private readonly cell: Cell;
  private readonly value: number;

  constructor(rule: DirectHintProducer, region: Region | null, cell: Cell, value: number) {
    super();
    this.rule = rule;
    this.region = region;
    this.cell = cell;
    this.value = value;
  }

  override getRule(): DirectHintProducer {
    return this.rule;
  }

  protected getRegion(): Region | null {
    return this.region;
  }

  override getRegions(): Region[] {
    return [this.region] as Region[];
  }

  override getCell(): Cell {
    return this.cell;
  }

  override getValue(): number {
    return this.value;
  }

  override apply(targetGrid: Grid): void {
    // Java: cell.setValueAndCancel(value, targetGrid). Vanilla path inlined
    // (the isForbiddenPairs block is dropped under the frozen baseline).
    const index = this.cell.getIndex();
    targetGrid.setCellValue(index, this.value);
    targetGrid.clearCellPotentialValues(index);
    for (const visible of Grid.visibleCellIndex[index]) {
      targetGrid.removeCellPotentialValue(visible, this.value);
    }
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof DirectHint)) return false;
    const other = o;
    // Java: this.rule.equals(other.rule); producers use Object identity.
    return this.value === other.value && this.cell.equals(other.cell) && this.rule === other.rule;
  }

  override toString(): string {
    let result = this.cell.toString() + ': ' + this.value;
    if (this.region !== null) result += ' in ' + this.region.toString();
    return result;
  }
}
