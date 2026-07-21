import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { BugHint } from './BugHint.js';

// Ported from diuf.sudoku.solver.rules.unique.Bug4Hint.
export class Bug4Hint extends BugHint {
  private readonly bugCell1: Cell;
  private readonly bugCell2: Cell;
  private readonly extraValues: Map<Cell, BitSet32>;
  private readonly allExtraValues: BitSet32;
  private readonly value: number; // removable value appearing on both cells
  private readonly region: Region;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    bugCell1: Cell,
    bugCell2: Cell,
    extraValues: Map<Cell, BitSet32>,
    allExtraValues: BitSet32,
    value: number,
    region: Region,
  ) {
    super(rule, removablePotentials);
    this.bugCell1 = bugCell1;
    this.bugCell2 = bugCell2;
    this.extraValues = extraValues;
    this.allExtraValues = allExtraValues;
    this.value = value;
    this.region = region;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return [this.bugCell1, this.bugCell2];
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const b1 = this.extraValues.get(this.bugCell1)!.clone();
    b1.set(this.value); // orange
    result.set(this.bugCell1, b1);
    const b2 = this.extraValues.get(this.bugCell2)!.clone();
    b2.set(this.value); // orange
    result.set(this.bugCell2, b2);
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const removable = super.getRemovablePotentials();
    const result = new Map<Cell, BitSet32>();
    for (const [cell, values] of removable) {
      const clone = values.clone();
      clone.set(this.value); // orange
      result.set(cell, clone);
    }
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  getName(): string {
    return 'BUG type 4';
  }

  getShortName(): string {
    return 'BUG4';
  }

  getDifficulty(): number {
    return 5.7;
  }

  override toString(): string {
    return 'BUG type 4: ' + this.bugCell1.toString() + ',' + this.bugCell2.toString() + ' on ' + this.value;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    const result = templates.BivalueUniversalGrave4;
    const bugValuesAnd = ValuesFormatter.formatValues(this.allExtraValues, ' and ');
    const bugCellsAnd = ValuesFormatter.formatCells([this.bugCell1, this.bugCell2], ' and ');
    const bugCellsOr = ValuesFormatter.formatCells([this.bugCell1, this.bugCell2], ' or ');
    const bugValuesOr = ValuesFormatter.formatValues(this.allExtraValues, ' or ');
    const lockedValue = String(this.value);
    const regionName = this.region.toString();
    const removable = new BitSet32();
    for (const r of this.getRemovablePotentials().values()) removable.or(r);
    const removableValues = ValuesFormatter.formatValues(removable, ' and ');
    return format(result, bugValuesAnd, bugCellsAnd, bugCellsOr, bugValuesOr, lockedValue, regionName, removableValues, this.sharedRegions());
  }
}
