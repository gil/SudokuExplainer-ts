import { Settings } from '../../Settings.js';
import { Cell } from '../../Cell.js';
import type { Grid, Region } from '../../Grid.js';
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

// Ported from diuf.sudoku.solver.rules.HiddenSetHint. revisedRating frozen 0.
export class HiddenSetHint extends IndirectHint implements Rule, HasParentPotentialHint {
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
    if (Settings.getInstance().getRevisedRating() === 1) {
      if (degree === 2) return 2.9; // New rating
      else if (degree === 3) return 3.8; // New rating
      else return 5.2; // New rating
    } else {
      if (degree === 2) return 3.4;
      else if (degree === 3) return 4.0;
      else return 5.4;
    }
  }

  getName(): string {
    const groupNames = ['Pair', 'Triplet', 'Quad'];
    return 'Hidden ' + groupNames[this.values.length - 2];
  }

  getShortName(): string {
    const groupNames = ['P', 'T', 'Q'];
    return 'H' + groupNames[this.values.length - 2];
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const myPositions = new BitSet32();
    for (let i = 0; i < this.values.length; i++)
      myPositions.or(this.region.getPotentialPositions(currentGrid, this.values[i]));
    for (let i = 0; i < 9; i++) {
      if (!myPositions.get(i)) {
        const cell = this.region.getCell(i);
        for (let j = 0; j < this.values.length; j++) {
          if (initialGrid.hasCellPotentialValue(cell.getIndex(), this.values[j]))
            result.push(new Potential(cell, this.values[j], false));
        }
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
      templates.HiddenSetHint,
      numberNames[this.values.length - 2],
      ValuesFormatter.formatCells(this.cells, ' and '),
      ValuesFormatter.formatValues(this.values, ' and '),
      this.region.toString(),
      this.getName(),
    );
  }
}
