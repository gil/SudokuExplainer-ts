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

// Ported from diuf.sudoku.solver.rules.XYWingHint.
export class XYWingHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly isXYZ: boolean;
  private readonly xyCell: Cell;
  private readonly xzCell: Cell;
  private readonly yzCell: Cell;
  private readonly value: number;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    isXYZ: boolean,
    xyCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    value: number,
  ) {
    super(rule, removablePotentials);
    this.isXYZ = isXYZ;
    this.xyCell = xyCell;
    this.xzCell = xzCell;
    this.yzCell = yzCell;
    this.value = value;
  }

  private getX(grid: Grid): number {
    const xyPotentials = grid.getCellPotentialValues(this.xyCell.getIndex());
    let x = xyPotentials.nextSetBit(0);
    if (x === this.value) x = xyPotentials.nextSetBit(x + 1);
    return x;
  }

  private getY(grid: Grid): number {
    const xyPotentials = grid.getCellPotentialValues(this.xyCell.getIndex());
    const x = this.getX(grid);
    let y = xyPotentials.nextSetBit(x + 1);
    if (y === this.value) y = xyPotentials.nextSetBit(y + 1);
    return y;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    result.set(this.xyCell, grid.getCellPotentialValues(this.xyCell.getIndex()));
    const zSet = SingletonBitSet.create(this.value);
    result.set(this.xzCell, zSet);
    result.set(this.yzCell, zSet);
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map(super.getRemovablePotentials());
    const xy = new BitSet32();
    xy.set(this.getX(grid));
    xy.set(this.getY(grid));
    result.set(this.xyCell, xy);
    return result;
  }

  getDifficulty(): number {
    if (this.isXYZ) return 4.4;
    return 4.2;
  }

  getName(): string {
    if (this.isXYZ) return 'XYZ-Wing';
    return 'XY-Wing';
  }

  getShortName(): string {
    if (this.isXYZ) return 'XYZW';
    return 'XYW';
  }

  private getRemainingValue(grid: Grid, c: Cell): number {
    const result = grid.getCellPotentialValues(c.getIndex()).clone();
    result.clear(this.value);
    return result.nextSetBit(0);
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    const xValue = this.getRemainingValue(grid, this.xzCell);
    result.push(new Link(this.xyCell, xValue, this.xzCell, xValue));
    const yValue = this.getRemainingValue(grid, this.yzCell);
    result.push(new Link(this.xyCell, yValue, this.yzCell, yValue));
    return result;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] {
    return [this.xyCell, this.xzCell, this.yzCell];
  }

  override getViewCount(): number {
    return 1;
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const xyCell = Grid.getCell(this.xyCell.getIndex());
    const xzCell = Grid.getCell(this.xzCell.getIndex());
    const yzCell = Grid.getCell(this.yzCell.getIndex());
    for (let p = 1; p <= 9; p++) {
      if (initialGrid.hasCellPotentialValue(xyCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.xyCell.getIndex(), p))
        result.push(new Potential(this.xyCell, p, false));
      if (initialGrid.hasCellPotentialValue(xzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.xzCell.getIndex(), p))
        result.push(new Potential(this.xzCell, p, false));
      if (initialGrid.hasCellPotentialValue(yzCell.getIndex(), p) && !currentGrid.hasCellPotentialValue(this.yzCell.getIndex(), p))
        result.push(new Potential(this.yzCell, p, false));
    }
    return result;
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof XYWingHint)) return false;
    if (this.isXYZ !== o.isXYZ) return false;
    if (this.xyCell !== o.xyCell || this.value !== o.value) return false;
    if (this.xzCell !== o.xzCell && this.xzCell !== o.yzCell) return false;
    if (this.yzCell !== o.xzCell && this.yzCell !== o.yzCell) return false;
    return true;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the values ' + this.getX(grid) + ', ' + this.getY(grid) + ' and <b>' + this.value + '</b>';
    }
    return 'Look for a ' + this.getName();
  }

  override toString(): string {
    let builder = '';
    builder += this.getName();
    builder += ': ';
    builder += Cell.toFullString(this.xyCell, this.xzCell, this.yzCell);
    builder += ' on value ';
    builder += this.value;
    return builder;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.isXYZ) result = templates.XYZWingHint;
    else result = templates.XYWingHint;
    const cell1 = this.xyCell.toString();
    const cell2 = this.xzCell.toString();
    const cell3 = this.yzCell.toString();
    result = format(result, cell1, cell2, cell3, this.value, this.getX(grid), this.getY(grid), this.sharedRegions());
    return result;
  }
}
