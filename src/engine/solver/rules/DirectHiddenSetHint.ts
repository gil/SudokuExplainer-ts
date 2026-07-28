import { Settings } from '../../Settings.js';
import { Cell } from '../../Cell.js';
import type { Grid, Region } from '../../Grid.js';
import type { Link } from '../../Link.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { ValuesFormatter } from '../../tools/ValuesFormatter.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';

// Ported from diuf.sudoku.solver.rules.DirectHiddenSetHint (hidden set that
// induces a hidden single). No removable potentials: it places a value.
export class DirectHiddenSetHint extends IndirectHint implements Rule {
  private readonly cells: Cell[];
  private readonly values: number[];
  private readonly cell: Cell; // Hidden single cell
  private readonly value: number; // Hidden single value
  private readonly orangePotentials: Map<Cell, BitSet32>;
  private readonly redPotentials: Map<Cell, BitSet32>;
  private readonly region: Region;

  constructor(
    rule: IndirectHintProducer,
    cells: Cell[],
    values: number[],
    orangePotentials: Map<Cell, BitSet32>,
    removePotentials: Map<Cell, BitSet32>,
    region: Region,
    cell: Cell,
    value: number,
  ) {
    super(rule, new Map());
    this.cells = cells;
    this.values = values;
    this.cell = cell;
    this.value = value;
    this.orangePotentials = orangePotentials;
    this.redPotentials = removePotentials;
    this.region = region;
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

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return [this.cell];
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(this.orangePotentials);
    result.set(this.cell, SingletonBitSet.create(this.value));
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(this.orangePotentials);
    for (const [cell, values] of this.redPotentials) {
      if (result.has(cell)) {
        const nvalues = result.get(cell)!.clone();
        nvalues.or(values);
        result.set(cell, nvalues);
      } else {
        result.set(cell, values);
      }
    }
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  getDifficulty(): number {
    const degree = this.values.length;
    if (Settings.getInstance().getRevisedRating() === 1) {
      if (degree === 2) return 2.0;
      else if (degree === 3) return 3.1; // New rating
      else return 4.3;
    } else {
      if (degree === 2) return 2.0;
      else if (degree === 3) return 2.5;
      else return 4.3;
    }
  }

  getName(): string {
    const groupNames = ['Pair', 'Triplet', 'Quad'];
    return 'Direct Hidden ' + groupNames[this.values.length - 2];
  }

  getShortName(): string {
    const groupNames = ['P', 'T', 'Q'];
    return 'D' + groupNames[this.values.length - 2];
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' in the <b1>' + this.getRegions()[0].toFullString() + '</b1>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    let builder = this.getName() + ': ';
    if (this.cells.length <= 4) builder += Cell.toFullString(...this.cells);
    else builder += 'Cells [...]';
    builder += ': ';
    for (let i = 0; i < this.values.length; i++) {
      if (i > 0) builder += ',';
      builder += String(this.values[i]);
    }
    builder += ' in ' + this.region.toString();
    return builder;
  }

  override toHtml(grid: Grid): string {
    const numberNames = ['two', 'three', 'four'];
    return format(
      templates.DirectHiddenSetHint,
      numberNames[this.values.length - 2],
      ValuesFormatter.formatCells(this.cells, ' and '),
      ValuesFormatter.formatValues(this.values, ' and '),
      this.region.toString(),
      this.getName(),
      this.cell.toString(),
      String(this.value),
    );
  }
}
