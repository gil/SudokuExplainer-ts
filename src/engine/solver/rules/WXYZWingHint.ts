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

// Ported from diuf.sudoku.solver.rules.WXYZWingHint.
export class WXYZWingHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly wxyzCell: Cell;
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
    wxyzCell: Cell,
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
    this.wxyzCell = wxyzCell;
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

  private getX(grid: Grid): number {
    const wxyzPotentials = this.wingSet.clone();
    let x = wxyzPotentials.nextSetBit(0);
    if (x === this.zValue) x = wxyzPotentials.nextSetBit(x + 1);
    return x;
  }

  private getY(grid: Grid): number {
    const wxyzPotentials = this.wingSet.clone();
    const x = this.getX(grid);
    let y = wxyzPotentials.nextSetBit(x + 1);
    if (y === this.zValue) y = wxyzPotentials.nextSetBit(y + 1);
    return y;
  }

  private getZ(grid: Grid): number {
    const wxyzPotentials = this.wingSet.clone();
    const y = this.getY(grid);
    let z = wxyzPotentials.nextSetBit(y + 1);
    if (z === this.zValue) z = wxyzPotentials.nextSetBit(z + 1);
    return z;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const zSet = SingletonBitSet.create(this.zValue);
    if (!this.doubleLink) {
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.set(this.wzCell, zSet);
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.set(this.xzCell, zSet);
      if (grid.hasCellPotentialValue(this.wxyzCell.getIndex(), this.zValue)) result.set(this.wxyzCell, zSet);
      result.set(this.yzCell, zSet);
    } else {
      result.set(this.wzCell, grid.getCellPotentialValues(this.wzCell.getIndex()));
      result.set(this.xzCell, grid.getCellPotentialValues(this.xzCell.getIndex()));
      result.set(this.wxyzCell, grid.getCellPotentialValues(this.wxyzCell.getIndex()));
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
    let result = 5.5;
    const sizeDif = Math.trunc((4 + 2) / 2);
    result += (4 - sizeDif - Math.abs(sizeDif - this.biggestCardinality)) * 0.1;
    return result;
  }

  getSuffix(): string {
    return String(this.doubleLink ? 2 : 1) + '' + this.biggestCardinality + '' + this.wingSize;
  }

  getName(): string {
    return 'WXYZ-Wing ' + this.getSuffix();
  }

  getShortName(): string {
    return 'WXY' + this.getSuffix();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    if (grid.hasCellPotentialValue(this.wxyzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.wxyzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.xzCell, this.xValue));
    if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.xValue)) result.push(new Link(this.yzCell, this.xValue, this.wzCell, this.xValue));
    if (this.doubleLink) {
      if (grid.hasCellPotentialValue(this.wxyzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.wxyzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.xzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.xzCell, this.zValue));
      if (grid.hasCellPotentialValue(this.wzCell.getIndex(), this.zValue)) result.push(new Link(this.yzCell, this.zValue, this.wzCell, this.zValue));
    }
    return result;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] {
    return [this.wxyzCell, this.wzCell, this.xzCell, this.yzCell];
  }

  override getViewCount(): number {
    return 1;
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const wxyzCell = Grid.getCell(this.wxyzCell.getIndex());
    const wzCell = Grid.getCell(this.wzCell.getIndex());
    const xzCell = Grid.getCell(this.xzCell.getIndex());
    const yzCell = Grid.getCell(this.yzCell.getIndex());
    for (let p = 1; p <= 9; p++) {
      if (initialGrid.hasCellPotentialValue(wxyzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.wxyzCell.getIndex(), p))
        result.push(new Potential(this.wxyzCell, p, false));
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
    if (!(o instanceof WXYZWingHint)) return false;
    if (this.wxyzCell !== o.wxyzCell || this.zValue !== o.zValue) return false;
    return this.wzCell === o.wzCell && this.xzCell === o.xzCell && this.yzCell === o.yzCell;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the values ' + this.getX(grid) + ', ' + this.getY(grid) + ', ' + this.getZ(grid) + ' and <b>' + this.zValue + '</b>';
    }
    return 'Look for a ' + this.getName();
  }

  override toString(): string {
    if (!this.doubleLink) return this.getName() + ': ' + Cell.toFullString(this.wxyzCell, this.wzCell, this.xzCell, this.yzCell) + ' on value ' + this.zValue;
    return this.getName() + ': ' + Cell.toFullString(this.wxyzCell, this.wzCell, this.xzCell, this.yzCell) + ' on values ' + this.xValue + ',' + this.zValue;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (!this.doubleLink) result = templates.WXYZWingHint;
    else result = templates.WXYZWing2Hint;
    const cell1 = this.wxyzCell.toString();
    const cell2 = this.wzCell.toString();
    const cell3 = this.xzCell.toString();
    const cell4 = this.yzCell.toString();
    result = format(
      result,
      cell1,
      cell2,
      cell3,
      cell4,
      this.zValue,
      this.getX(grid),
      this.getY(grid),
      this.getZ(grid),
      this.xValue,
      this.biggestCardinality,
      this.wingSize,
      this.doubleLink ? 2 : 1,
      this.sharedRegions(),
    );
    return result;
  }
}
