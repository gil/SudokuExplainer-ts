import { Settings } from '../../../Settings.js';
import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { Link } from '../../../Link.js';
import { IndirectHint } from '../../IndirectHint.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import type { Rule } from '../../Rule.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopHint.
export abstract class UniqueLoopHint extends IndirectHint implements Rule {
  protected readonly loop: Cell[];
  protected readonly v1: number;
  protected readonly v2: number;

  constructor(rule: IndirectHintProducer, loop: Cell[], v1: number, v2: number, removablePotentials: Map<Cell, BitSet32>) {
    super(rule, removablePotentials);
    this.loop = loop;
    this.v1 = v1;
    this.v2 = v2;
  }

  override getSelectedCells(): Cell[] {
    return this.loop.slice();
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    for (const cell of this.loop) {
      const commonValues = new BitSet32();
      commonValues.set(this.v1);
      commonValues.set(this.v2);
      result.set(cell, commonValues);
    }
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    for (let i = 0; i < this.loop.length; i++) {
      const cell = this.loop[i];
      const next = this.loop[(i + 1) % this.loop.length];
      result.push(new Link(cell, 0, next, 0));
    }
    return result;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getViewCount(): number {
    return 1;
  }

  protected getTypeName(): string {
    return this.loop.length === 4 ? 'Rectangle' : 'Loop';
  }

  protected getShortTypeName(): string {
    return this.loop.length === 4 ? 'R' : 'L';
  }

  getName(): string {
    if (this.loop.length > 4) return 'Unique ' + this.getTypeName() + ' ' + this.loop.length + ' type ' + this.getType();
    return 'Unique ' + this.getTypeName() + ' type ' + this.getType();
  }

  getShortName(): string {
    if (this.loop.length > 4) return 'U' + this.getShortTypeName() + this.loop.length + this.getType();
    return 'U' + this.getShortTypeName() + this.getType();
  }

  getGroup(): string {
    return 'Uniqueness tests';
  }

  abstract getType(): number;

  getDifficulty(): number {
    let result = 4.5;
    if (Settings.getInstance().getRevisedRating() === 1) {
      result += (Math.trunc(this.loop.length / 2) - 2) * 0.1; // 4.5 for UR(UL4) to 5.0 for UL14
    } else {
      // Original rating: 4.5 UR, 4.6 UL6, 4.7 UL8, 5.0 UL10+.
      if (this.loop.length >= 10) result += 0.3;
      if (this.loop.length >= 8) result += 0.2;
      else if (this.loop.length >= 6) result += 0.1;
    }
    return result;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the values <b>' + this.v1 + '</b> and <b>' + this.v2 + '</b>';
    }
    return 'Look for a Unique Rectangle or Loop';
  }

  override toString(): string {
    return this.getName() + ': ' + Cell.toFullString(...this.loop) + ' on ' + this.v1 + ', ' + this.v2;
  }

  override equals(o: unknown): boolean {
    if (o === null || o === undefined) return false;
    if (!(o instanceof UniqueLoopHint)) return false;
    if ((o as object).constructor !== (this as object).constructor) return false;
    const other = o;
    if (this.loop.length !== other.loop.length) return false;
    return other.loop.every((c) => this.loop.some((x) => x.equals(c)));
  }
}
