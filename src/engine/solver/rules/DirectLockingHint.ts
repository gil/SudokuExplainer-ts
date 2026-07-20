import { Cell } from '../../Cell.js';
import { Block, type Grid, type Region } from '../../Grid.js';
import type { Link } from '../../Link.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';

// Ported from diuf.sudoku.solver.rules.DirectLockingHint (a pointing/claiming
// that induces a hidden single). No removable potentials: it places a value.
export class DirectLockingHint extends IndirectHint implements Rule {
  private readonly cells: Cell[];
  private readonly cell: Cell;
  private readonly value: number;
  private readonly redPotentials: Map<Cell, BitSet32>;
  private readonly orangePotentials: Map<Cell, BitSet32>;
  private readonly regions: Region[];

  constructor(
    rule: IndirectHintProducer,
    cells: Cell[],
    cell: Cell,
    value: number,
    highlightPotentials: Map<Cell, BitSet32>,
    removePotentials: Map<Cell, BitSet32>,
    regions: Region[],
  ) {
    super(rule, new Map());
    this.cells = cells;
    this.cell = cell;
    this.value = value;
    this.redPotentials = removePotentials;
    this.orangePotentials = highlightPotentials;
    this.regions = regions;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return [this.cell];
  }

  override getCell(): Cell {
    return this.cell;
  }

  override getValue(): number {
    return this.value;
  }

  override isWorth(): boolean {
    return true;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(this.orangePotentials);
    result.set(this.cell, SingletonBitSet.create(this.value));
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(this.redPotentials);
    for (const [cell, values] of this.orangePotentials) result.set(cell, values);
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getRegions(): Region[] {
    return this.regions;
  }

  getDifficulty(): number {
    if (this.regions[0] instanceof Block) return 1.7; // Pointing
    else return 1.9; // Claiming
  }

  getName(): string {
    if (this.regions[0] instanceof Block) return 'Direct Pointing';
    else return 'Direct Claiming';
  }

  getShortName(): string {
    if (this.regions[0] instanceof Block) return 'DP';
    else return 'DC';
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the value <b>' + this.value + '<b>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    return (
      this.getName() +
      ': ' +
      Cell.toFullString(...this.cells) +
      ': ' +
      this.value +
      ' of ' +
      this.regions[0].toString() +
      ' in ' +
      this.regions[1].toString()
    );
  }

  override toHtml(grid: Grid): string {
    return format(
      templates.DirectLockingHint,
      String(this.value),
      this.regions[0].toString(),
      this.regions[1].toString(),
      this.getName(),
      this.cell.toString(),
    );
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof DirectLockingHint)) return false;
    if (this.value !== o.value) return false;
    if (this.cells.length !== o.cells.length) return false;
    return o.cells.every((c) => this.cells.some((t) => t.equals(c)));
  }
}
