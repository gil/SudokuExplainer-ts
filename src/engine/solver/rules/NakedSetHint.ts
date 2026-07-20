import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import type { Link } from '../../Link.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { ValuesFormatter } from '../../tools/ValuesFormatter.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';
import { Potential } from './chaining/Potential.js';
import type { HasParentPotentialHint } from './HasParentPotentialHint.js';

// Ported from diuf.sudoku.solver.rules.NakedSetHint.
export class NakedSetHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly cells: Cell[];
  private readonly values: number[];
  private readonly highlightPotentials: Map<Cell, BitSet32>;
  private readonly region: Region;

  constructor(
    rule: IndirectHintProducer,
    cells: Cell[],
    values: number[],
    highlightPotentials: Map<Cell, BitSet32>,
    removePotentials: Map<Cell, BitSet32>,
    region: Region,
  ) {
    super(rule, removePotentials);
    this.cells = cells;
    this.values = values;
    this.highlightPotentials = highlightPotentials;
    this.region = region;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return this.cells;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.highlightPotentials;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return super.getRemovablePotentials();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  getDifficulty(): number {
    const degree = this.values.length;
    if (degree === 2) return 3.0;
    else if (degree === 3) return 3.6;
    else return 5.0;
  }

  getName(): string {
    const groupNames = ['Pair', 'Triplet', 'Quad'];
    return 'Naked ' + groupNames[this.values.length - 2];
  }

  getShortName(): string {
    const groupNames = ['P', 'T', 'Q'];
    return 'N' + groupNames[this.values.length - 2];
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const myValues = new BitSet32();
    for (let i = 0; i < this.values.length; i++) myValues.set(this.values[i]);
    for (const cell of this.cells) {
      const initialCell = Grid.getCellXY(cell.getX(), cell.getY());
      for (let value = 1; value <= 9; value++) {
        if (initialGrid.hasCellPotentialValue(initialCell.getIndex(), value) && !myValues.get(value))
          result.push(new Potential(cell, value, false));
      }
    }
    return result;
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
      templates.NakedSetHint,
      numberNames[this.values.length - 2],
      ValuesFormatter.formatCells(this.cells, ' and '),
      ValuesFormatter.formatValues(this.values, ' and '),
      this.region.toString(),
      this.getName(),
    );
  }
}
