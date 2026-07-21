import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { Link } from '../../Link.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';
import { Potential } from './chaining/Potential.js';
import type { HasParentPotentialHint } from './HasParentPotentialHint.js';

// Ported from diuf.sudoku.solver.rules.TUVWXYZWingHint.
export class TUVWXYZWingHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly TUVWXYZCell: Cell;
  private readonly tzCell: Cell;
  private readonly uzCell: Cell;
  private readonly vzCell: Cell;
  private readonly wzCell: Cell;
  private readonly xzCell: Cell;
  private readonly yzCell: Cell;
  private readonly zValue: number;
  private readonly xValue: number;
  private readonly biggestCardinality: number;
  private readonly wingSize: number;
  private readonly doubleLink: boolean;
  private readonly wingSet: BitSet32;
  private readonly eliminationsTotal: number;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    TUVWXYZCell: Cell,
    tzCell: Cell,
    uzCell: Cell,
    vzCell: Cell,
    wzCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    zValue: number,
    xValue: number,
    biggestCardinality: number,
    wingSize: number,
    doubleLink: boolean,
    wingSet: BitSet32,
    eliminationsTotal: number,
  ) {
    super(rule, removablePotentials);
    this.TUVWXYZCell = TUVWXYZCell;
    this.tzCell = tzCell;
    this.uzCell = uzCell;
    this.vzCell = vzCell;
    this.wzCell = wzCell;
    this.xzCell = xzCell;
    this.yzCell = yzCell;
    this.zValue = zValue;
    this.xValue = xValue;
    this.biggestCardinality = biggestCardinality;
    this.wingSize = wingSize;
    this.doubleLink = doubleLink;
    this.wingSet = wingSet;
    this.eliminationsTotal = eliminationsTotal;
  }

  private getT(grid: Grid): number {
    const p = this.wingSet.clone();
    let t = p.nextSetBit(0);
    if (t === this.zValue || t === this.xValue) t = p.nextSetBit(t + 1);
    if (t === this.zValue || t === this.xValue) t = p.nextSetBit(t + 1);
    return t;
  }

  private getU(grid: Grid): number {
    const p = this.wingSet.clone();
    const t = this.getT(grid);
    let u = p.nextSetBit(t + 1);
    if (u === this.zValue || u === this.xValue) u = p.nextSetBit(u + 1);
    if (u === this.zValue || u === this.xValue) u = p.nextSetBit(u + 1);
    return u;
  }

  private getV(grid: Grid): number {
    const p = this.wingSet.clone();
    const u = this.getU(grid);
    let v = p.nextSetBit(u + 1);
    if (v === this.zValue || v === this.xValue) v = p.nextSetBit(v + 1);
    if (v === this.zValue || v === this.xValue) v = p.nextSetBit(v + 1);
    return v;
  }

  private getW(grid: Grid): number {
    const p = this.wingSet.clone();
    const v = this.getV(grid);
    let w = p.nextSetBit(v + 1);
    if (w === this.zValue || w === this.xValue) w = p.nextSetBit(w + 1);
    if (w === this.zValue || w === this.xValue) w = p.nextSetBit(w + 1);
    return w;
  }

  private getY(grid: Grid): number {
    const p = this.wingSet.clone();
    const w = this.getW(grid);
    let y = p.nextSetBit(w + 1);
    if (y === this.zValue || y === this.xValue) y = p.nextSetBit(y + 1);
    if (y === this.zValue || y === this.xValue) y = p.nextSetBit(y + 1);
    return y;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const zSet = SingletonBitSet.create(this.zValue);
    if (!this.doubleLink) {
      if (grid.hasCellPotentialValue(this.tzCell.getIndex(), this.zValue)) result.set(this.tzCell, zSet);
      if (grid.hasCellPotentialValue(this.uzCell.getIndex(), this.zValue)) result.set(this.uzCell, zSet);
      if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.zValue)) result.set(this.vzCell, zSet);
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.set(this.wzCell, zSet);
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.set(this.xzCell, zSet);
      if (grid.hasCellPotentialValue(this.TUVWXYZCell.getIndex(), this.zValue)) result.set(this.TUVWXYZCell, zSet);
      result.set(this.yzCell, zSet);
    } else {
      result.set(this.tzCell, grid.getCellPotentialValues(this.tzCell.getIndex()));
      result.set(this.uzCell, grid.getCellPotentialValues(this.uzCell.getIndex()));
      result.set(this.vzCell, grid.getCellPotentialValues(this.vzCell.getIndex()));
      result.set(this.wzCell, grid.getCellPotentialValues(this.wzCell.getIndex()));
      result.set(this.xzCell, grid.getCellPotentialValues(this.xzCell.getIndex()));
      result.set(this.TUVWXYZCell, grid.getCellPotentialValues(this.TUVWXYZCell.getIndex()));
      result.set(this.yzCell, grid.getCellPotentialValues(this.yzCell.getIndex()));
    }
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map(super.getRemovablePotentials());
  }

  getEliminationsTotal(): number {
    return this.eliminationsTotal;
  }

  getDifficulty(): number {
    return 7.5;
  }

  getSuffix(): string {
    return String(this.doubleLink ? 2 : 1) + '' + this.biggestCardinality + '' + this.wingSize;
  }

  getName(): string {
    return 'TUVWXYZ-Wing ' + this.getSuffix();
  }

  getShortName(): string {
    return 'TXY' + this.getSuffix();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    if (grid.hasCellPotentialValue(this.TUVWXYZCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.TUVWXYZCell, this.xValue));
    if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.xzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.wzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.vzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.uzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.uzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.tzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.tzCell, this.xValue));
    if (this.doubleLink) {
      if (grid.hasCellPotentialValue(this.TUVWXYZCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.TUVWXYZCell, this.zValue));
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.xzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.wzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.vzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.uzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.uzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.tzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.tzCell, this.zValue));
    }
    return result;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] {
    return [this.TUVWXYZCell, this.tzCell, this.uzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell];
  }

  override getViewCount(): number {
    return 1;
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const TUVWXYZCell = Grid.getCell(this.TUVWXYZCell.getIndex());
    const tzCell = Grid.getCell(this.tzCell.getIndex());
    const uzCell = Grid.getCell(this.uzCell.getIndex());
    const vzCell = Grid.getCell(this.vzCell.getIndex());
    const wzCell = Grid.getCell(this.wzCell.getIndex());
    const xzCell = Grid.getCell(this.xzCell.getIndex());
    const yzCell = Grid.getCell(this.yzCell.getIndex());
    for (let p = 1; p <= 9; p++) {
      if (initialGrid.hasCellPotentialValue(TUVWXYZCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.TUVWXYZCell.getIndex(), p))
        result.push(new Potential(this.TUVWXYZCell, p, false));
      if (initialGrid.hasCellPotentialValue(tzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.tzCell.getIndex(), p))
        result.push(new Potential(this.tzCell, p, false));
      if (initialGrid.hasCellPotentialValue(uzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.uzCell.getIndex(), p))
        result.push(new Potential(this.uzCell, p, false));
      if (initialGrid.hasCellPotentialValue(vzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.vzCell.getIndex(), p))
        result.push(new Potential(this.vzCell, p, false));
      if (initialGrid.hasCellPotentialValue(wzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.wzCell.getIndex(), p))
        result.push(new Potential(this.wzCell, p, false));
      if (initialGrid.hasCellPotentialValue(xzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.xzCell.getIndex(), p))
        result.push(new Potential(this.xzCell, p, false));
      if (initialGrid.hasCellPotentialValue(yzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.yzCell.getIndex(), p))
        result.push(new Potential(this.yzCell, p, false));
    }
    return result;
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof TUVWXYZWingHint)) return false;
    if (this.TUVWXYZCell !== o.TUVWXYZCell || this.zValue !== o.zValue) return false;
    return this.tzCell === o.tzCell && this.uzCell === o.uzCell && this.vzCell === o.vzCell && this.wzCell === o.wzCell && this.xzCell === o.xzCell && this.yzCell === o.yzCell;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the values ' + this.getT(grid) + ', ' + this.getU(grid) + ', ' + this.getV(grid) + ', ' + this.getW(grid) + ', ' + this.getY(grid) + ' and <b>' + this.xValue + this.zValue + '</b>';
    }
    return 'Look for a ' + this.getName();
  }

  override toString(): string {
    if (!this.doubleLink) return this.getName() + ': ' + Cell.toFullString(this.TUVWXYZCell, this.tzCell, this.uzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell) + ' on value ' + this.zValue;
    return this.getName() + ': ' + Cell.toFullString(this.TUVWXYZCell, this.tzCell, this.uzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell) + ' on values ' + this.xValue + ',' + this.zValue;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (!this.doubleLink) result = templates.TUVWXYZWingHint;
    else result = templates.TUVWXYZWing2Hint;
    const cell1 = this.TUVWXYZCell.toString();
    const cell2 = this.tzCell.toString();
    const cell3 = this.uzCell.toString();
    const cell4 = this.vzCell.toString();
    const cell5 = this.wzCell.toString();
    const cell6 = this.xzCell.toString();
    const cell7 = this.yzCell.toString();
    result = format(
      result,
      cell1,
      cell4,
      cell5,
      cell6,
      cell7,
      this.zValue,
      this.getW(grid),
      this.getY(grid),
      this.getV(grid),
      this.xValue,
      this.biggestCardinality,
      this.wingSize,
      this.doubleLink ? 2 : 1,
      this.sharedRegions(),
      cell3,
      cell2,
    );
    return result;
  }
}
