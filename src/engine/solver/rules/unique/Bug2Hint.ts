import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { BugHint } from './BugHint.js';

// Ported from diuf.sudoku.solver.rules.unique.Bug2Hint.
export class Bug2Hint extends BugHint {
  private readonly bugCells: Cell[];
  private readonly bugValue: number;

  constructor(rule: IndirectHintProducer, removablePotentials: Map<Cell, BitSet32>, bugCells: Cell[], bugValue: number) {
    super(rule, removablePotentials);
    this.bugCells = bugCells;
    this.bugValue = bugValue;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    for (const cell of this.bugCells) result.set(cell, SingletonBitSet.create(this.bugValue));
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return super.getRemovablePotentials();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] {
    return this.bugCells;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getViewCount(): number {
    return 1;
  }

  getDifficulty(): number {
    return 5.7;
  }

  getName(): string {
    return 'BUG type 2';
  }

  getShortName(): string {
    return 'BUG2';
  }

  override toString(): string {
    return 'BUG type 2: ' + Cell.toString(...this.bugCells) + ' on ' + this.bugValue;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    const result = templates.BivalueUniversalGrave2;
    const andBugCells = ValuesFormatter.formatCells(this.bugCells, ' and ');
    return format(result, this.bugValue, andBugCells, this.sharedRegions());
  }
}
