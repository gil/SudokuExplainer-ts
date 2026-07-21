import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopType3NakedHint.
export class UniqueLoopType3NakedHint extends UniqueLoopHint {
  private readonly c1: Cell;
  private readonly c2: Cell;
  private readonly otherValues: number[];
  private readonly region: Region;
  private readonly cells: Cell[]; // other cells of the naked set
  private readonly nakedValues: number[]; // values of the naked set

  constructor(
    rule: IndirectHintProducer,
    loop: Cell[],
    v1: number,
    v2: number,
    removablePotentials: Map<Cell, BitSet32>,
    c1: Cell,
    c2: Cell,
    otherValues: number[],
    region: Region,
    cells: Cell[],
    values: number[],
  ) {
    super(rule, loop, v1, v2, removablePotentials);
    this.c1 = c1;
    this.c2 = c2;
    this.otherValues = otherValues;
    this.region = region;
    this.cells = cells;
    this.nakedValues = values;
  }

  override getDifficulty(): number {
    const toAdd = (this.nakedValues.length - 1) * 0.1; // Pair=0.1, Quad=0.3
    return super.getDifficulty() + toAdd;
  }

  private appendOrangePotentials(potentials: Map<Cell, BitSet32>): Map<Cell, BitSet32> {
    const nakedSet = new BitSet32();
    for (let i = 0; i < this.nakedValues.length; i++) nakedSet.set(this.nakedValues[i]);
    for (const cell of this.cells) potentials.set(cell, nakedSet);

    const otherSet = new BitSet32();
    for (let i = 0; i < this.otherValues.length; i++) otherSet.set(this.otherValues[i]);
    let prevSet = potentials.get(this.c1);
    if (prevSet === undefined) prevSet = otherSet;
    else prevSet.or(otherSet);
    potentials.set(this.c1, prevSet);
    prevSet = potentials.get(this.c2);
    if (prevSet === undefined) prevSet = otherSet;
    else prevSet.or(otherSet);
    potentials.set(this.c2, prevSet);
    return potentials;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.appendOrangePotentials(super.getGreenPotentials(grid, viewNum));
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(super.getRemovablePotentials());
    return this.appendOrangePotentials(result);
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  override getType(): number {
    return 3;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result = templates.UniqueLoopType3Naked;
    const type = this.getTypeName();
    const allCells = Cell.toString(...this.loop);
    const cell1 = this.c1.toString();
    const cell2 = this.c2.toString();
    const valuesOrName = ValuesFormatter.formatValues(this.otherValues, ' or ');
    const setNames = ['Pair', 'Triplet', 'Quad', 'Quintuplet', 'Sextuplet', 'Septuplet'];
    const setName = setNames[this.nakedValues.length - 2];
    const otherCells = ValuesFormatter.formatCells(this.cells, ' and ');
    const valuesAndName = ValuesFormatter.formatValues(this.nakedValues, ' and ');
    const regionName = this.region.toString();
    result = format(result, type, this.v1, this.v2, allCells, cell1, cell2, valuesOrName, setName, otherCells, valuesAndName, regionName, this.sharedRegions());
    return result;
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof UniqueLoopType3NakedHint)) return false;
    if (!super.equals(o)) return false;
    const other = o;
    if (this.region !== other.region) return false;
    if (this.nakedValues.length !== other.nakedValues.length) return false;
    for (let i = 0; i < this.nakedValues.length; i++) {
      if (this.nakedValues[i] !== other.nakedValues[i]) return false;
    }
    for (let i = 0; i < this.cells.length; i++) {
      if (!this.cells[i].equals(other.cells[i])) return false;
    }
    return true;
  }
}
