import type { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { BugHint } from './BugHint.js';

// Ported from diuf.sudoku.solver.rules.unique.Bug1Hint.
export class Bug1Hint extends BugHint {
  protected readonly bugCell: Cell;
  protected readonly bugValues: BitSet32;

  constructor(rule: IndirectHintProducer, removablePotentials: Map<Cell, BitSet32>, bugCell: Cell, bugValues: BitSet32) {
    super(rule, removablePotentials);
    this.bugCell = bugCell;
    this.bugValues = bugValues;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getViewCount(): number {
    return 1;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    result.set(this.bugCell, this.bugValues);
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return super.getRemovablePotentials();
  }

  override getSelectedCells(): Cell[] {
    return [this.bugCell];
  }

  override getRegions(): Region[] | null {
    return null;
  }

  getDifficulty(): number {
    return 5.6;
  }

  getName(): string {
    return 'BUG type 1';
  }

  getShortName(): string {
    return 'BUG1';
  }

  override toString(): string {
    return 'BUG type 1: ' + this.bugCell.toString();
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result = templates.BivalueUniversalGrave1;
    const andExtra = ValuesFormatter.formatValues(this.bugValues, ' and ');
    const orExtra = ValuesFormatter.formatValues(this.bugValues, ' or ');
    const removable = super.getRemovablePotentials().get(this.bugCell)!;
    const remList = ValuesFormatter.formatValues(removable, ' and ');
    result = format(result, andExtra, this.bugCell.toString(), orExtra, remList, this.sharedRegions());
    return result;
  }
}
