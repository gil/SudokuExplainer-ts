import { Settings } from '../../Settings.js';
import { Cell } from '../../Cell.js';
import { Block, Row, Column, type Region } from '../../Grid.js';
import type { Grid } from '../../Grid.js';
import type { Link } from '../../Link.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';
import { Potential } from './chaining/Potential.js';
import type { HasParentPotentialHint } from './HasParentPotentialHint.js';

// Ported from diuf.sudoku.solver.rules.LockingHint (Pointing, Claiming, X-Wing,
// Swordfish or Jellyfish). revisedRating frozen 0, so original ratings apply.
export class LockingHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly cells: Cell[];
  private readonly value: number;
  private readonly highlightPotentials: Map<Cell, BitSet32>;
  private readonly regions: Region[];

  constructor(
    rule: IndirectHintProducer,
    cells: Cell[],
    value: number,
    highlightPotentials: Map<Cell, BitSet32>,
    removePotentials: Map<Cell, BitSet32>,
    regions: Region[],
  ) {
    super(rule, removePotentials);
    this.cells = cells;
    this.value = value;
    this.highlightPotentials = highlightPotentials;
    this.regions = regions;
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
    return this.regions;
  }

  getDifficulty(): number {
    const degree = this.regions.length / 2;
    if (Settings.getInstance().getRevisedRating() === 1) {
      if (degree === 1) {
        if (this.regions[1] instanceof Column || this.regions[1] instanceof Row) return 2.6; // Pointing
        else return 2.8; // Claiming
      } else if (degree === 2) return 3.2; // X-Wing
      else if (degree === 3) return 4.0; // Swordfish, new rating
      else return 5.4; // Jellyfish, new rating
    } else {
      if (degree === 1) {
        if (this.regions[1] instanceof Column || this.regions[1] instanceof Row) return 2.6; // Pointing
        else return 2.8; // Claiming
      } else if (degree === 2) return 3.2; // X-Wing
      else if (degree === 3) return 3.8; // Swordfish
      else return 5.2; // Jellyfish
    }
  }

  getName(): string {
    const degree = this.regions.length / 2;
    if (degree === 1) {
      if (this.regions[1] instanceof Column || this.regions[1] instanceof Row) return 'Pointing';
      else return 'Claiming';
    } else if (degree === 2) {
      if (this.regions[0] instanceof Block || this.regions[1] instanceof Block) return 'Block X-Wing';
      else return 'X-Wing';
    } else if (degree === 3) {
      return 'Swordfish';
    } else if (degree === 4) {
      return 'Jellyfish';
    }
    return null as unknown as string;
  }

  getShortName(): string {
    const degree = this.regions.length / 2;
    if (degree === 1) {
      if (this.regions[1] instanceof Column || this.regions[1] instanceof Row) return 'Po';
      else return 'Cl';
    } else if (degree === 2) {
      if (this.regions[0] instanceof Block || this.regions[1] instanceof Block) return 'BXW';
      else return 'XW';
    } else if (degree === 3) {
      return 'SF';
    } else if (degree === 4) {
      return 'JF';
    }
    return null as unknown as string;
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    for (let i = 0; i < this.regions.length; i += 2) {
      for (let pos1 = 0; pos1 < 9; pos1++) {
        const cell = this.regions[i].getCell(pos1);
        if (
          initialGrid.hasCellPotentialValue(cell.getIndex(), this.value) &&
          !currentGrid.hasCellPotentialValue(cell.getIndex(), this.value)
        ) {
          let isInRegion2 = false;
          for (let j = 1; j < this.regions.length; j += 2) {
            for (let pos2 = 0; pos2 < 9; pos2++) {
              const other = this.regions[j].getCell(pos2);
              if (other.equals(cell)) isInRegion2 = true;
            }
          }
          if (!isInRegion2) result.push(new Potential(cell, this.value, false));
        }
      }
    }
    return result;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the value <b>' + this.value + '<b>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    let builder = this.getName() + ': ' + Cell.toFullString(...this.cells) + ': ' + this.value;
    if (this.regions !== null) {
      if (this.regions.length === 2) {
        builder += ' in ' + this.regions[0].toString() + ' and ' + this.regions[1].toString();
      } else if (this.regions.length >= 4 && this.regions.length % 2 === 0) {
        builder += ' in ' + this.regions.length / 2 + ' ' + this.regions[0].toString();
        builder += 's and ' + this.regions.length / 2 + ' ' + this.regions[1].toString() + 's';
      }
    }
    return builder;
  }

  private toHtml1(): string {
    return format(
      templates.SimpleLockingHint,
      String(this.value),
      this.regions[0].toString(),
      this.regions[1].toString(),
      this.getName(),
    );
  }

  override toHtml(grid: Grid): string {
    const degree = this.regions.length / 2;
    if (degree === 1) return this.toHtml1();
    const numberNames = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    return format(
      templates.LockingHint,
      this.getName(),
      String(this.value),
      numberNames[degree - 2],
      this.regions[0].toString(),
      this.regions[1].toString(),
    );
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof LockingHint)) return false;
    if (this.value !== o.value) return false;
    if (this.cells.length !== o.cells.length) return false;
    return o.cells.every((c) => this.cells.some((t) => t.equals(c)));
  }
}
