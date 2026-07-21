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

// Ported from diuf.sudoku.solver.rules.VWXYZWingHint.
export class VWXYZWingHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly vwxyzCell: Cell;
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
    vwxyzCell: Cell,
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
    this.vwxyzCell = vwxyzCell;
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

  private getV(grid: Grid): number {
    const vwxyzPotentials = this.wingSet.clone();
    let v = vwxyzPotentials.nextSetBit(0);
    if (v === this.zValue || v === this.xValue) v = vwxyzPotentials.nextSetBit(v + 1);
    if (v === this.zValue || v === this.xValue) v = vwxyzPotentials.nextSetBit(v + 1);
    return v;
  }

  private getW(grid: Grid): number {
    const vwxyzPotentials = this.wingSet.clone();
    const v = this.getV(grid);
    let w = vwxyzPotentials.nextSetBit(v + 1);
    if (w === this.zValue || w === this.xValue) w = vwxyzPotentials.nextSetBit(w + 1);
    if (w === this.zValue || w === this.xValue) w = vwxyzPotentials.nextSetBit(w + 1);
    return w;
  }

  private getY(grid: Grid): number {
    const vwxyzPotentials = this.wingSet.clone();
    const w = this.getW(grid);
    let y = vwxyzPotentials.nextSetBit(w + 1);
    if (y === this.zValue || y === this.xValue) y = vwxyzPotentials.nextSetBit(y + 1);
    if (y === this.zValue || y === this.xValue) y = vwxyzPotentials.nextSetBit(y + 1);
    return y;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const zSet = SingletonBitSet.create(this.zValue);
    if (!this.doubleLink) {
      if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.zValue)) result.set(this.vzCell, zSet);
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.set(this.wzCell, zSet);
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.set(this.xzCell, zSet);
      if (grid.hasCellPotentialValue(this.vwxyzCell.getIndex(), this.zValue)) result.set(this.vwxyzCell, zSet);
      result.set(this.yzCell, zSet);
    } else {
      result.set(this.vzCell, grid.getCellPotentialValues(this.vzCell.getIndex()));
      result.set(this.wzCell, grid.getCellPotentialValues(this.wzCell.getIndex()));
      result.set(this.xzCell, grid.getCellPotentialValues(this.xzCell.getIndex()));
      result.set(this.vwxyzCell, grid.getCellPotentialValues(this.vwxyzCell.getIndex()));
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
    let result = 6.2;
    const sizeDif = Math.trunc((5 + 2) / 2);
    result += (5 - sizeDif - Math.abs(sizeDif - this.biggestCardinality)) * 0.1;
    return result;
  }

  getSuffix(): string {
    return String(this.doubleLink ? 2 : 1) + '' + this.biggestCardinality + '' + this.wingSize;
  }

  getName(): string {
    return 'VWXYZ-Wing ' + this.getSuffix();
  }

  getShortName(): string {
    return 'VXY' + this.getSuffix();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    if (grid.hasCellPotentialValue(this.vwxyzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.vwxyzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.xzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.wzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.vzCell, this.xValue));
    if (this.doubleLink) {
      if (grid.hasCellPotentialValue(this.vwxyzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.vwxyzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.xzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.wzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.vzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.vzCell, this.zValue));
    }
    return result;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] {
    return [this.vwxyzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell];
  }

  override getViewCount(): number {
    return 1;
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const vwxyzCell = Grid.getCell(this.vwxyzCell.getIndex());
    const vzCell = Grid.getCell(this.vzCell.getIndex());
    const wzCell = Grid.getCell(this.wzCell.getIndex());
    const xzCell = Grid.getCell(this.xzCell.getIndex());
    const yzCell = Grid.getCell(this.yzCell.getIndex());
    for (let p = 1; p <= 9; p++) {
      if (initialGrid.hasCellPotentialValue(vwxyzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.vwxyzCell.getIndex(), p))
        result.push(new Potential(this.vwxyzCell, p, false));
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
    if (!(o instanceof VWXYZWingHint)) return false;
    if (this.vwxyzCell !== o.vwxyzCell || this.zValue !== o.zValue) return false;
    // Transcribed from Java as-is (the vzCell/wzCell comparison mirrors the source).
    return this.vzCell === o.wzCell && this.wzCell === o.wzCell && this.xzCell === o.xzCell && this.yzCell === o.yzCell;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the values ' + this.getV(grid) + ', ' + this.getW(grid) + ', ' + this.getY(grid) + ' and <b>' + this.xValue + this.zValue + '</b>';
    }
    return 'Look for a ' + this.getName();
  }

  override toString(): string {
    if (!this.doubleLink) return this.getName() + ': ' + Cell.toFullString(this.vwxyzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell) + ' on value ' + this.zValue;
    return this.getName() + ': ' + Cell.toFullString(this.vwxyzCell, this.vzCell, this.wzCell, this.xzCell, this.yzCell) + ' on values ' + this.xValue + ',' + this.zValue;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (!this.doubleLink) result = templates.VWXYZWingHint;
    else result = templates.VWXYZWing2Hint;
    const cell1 = this.vwxyzCell.toString();
    const cell2 = this.vzCell.toString();
    const cell3 = this.wzCell.toString();
    const cell4 = this.xzCell.toString();
    const cell5 = this.yzCell.toString();
    result = format(
      result,
      cell1,
      cell2,
      cell3,
      cell4,
      cell5,
      this.zValue,
      this.getW(grid),
      this.getY(grid),
      this.getV(grid),
      this.xValue,
      this.biggestCardinality,
      this.wingSize,
      this.doubleLink ? 2 : 1,
      this.sharedRegions(),
    );
    return result;
  }
}
