import { Settings } from '../../../Settings.js';
import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopType3HiddenHint.
export class UniqueLoopType3HiddenHint extends UniqueLoopHint {
  private readonly c1: Cell;
  private readonly c2: Cell;
  private readonly otherValues: number[];
  private readonly region: Region;
  private readonly hiddenValues: BitSet32;
  private readonly hiddenIndexes: number[]; // indexes of the hidden set

  constructor(
    rule: IndirectHintProducer,
    loop: Cell[],
    v1: number,
    v2: number,
    removablePotentials: Map<Cell, BitSet32>,
    c1: Cell,
    c2: Cell,
    otherValues: number[],
    hiddenValues: BitSet32,
    region: Region,
    indexes: number[],
  ) {
    super(rule, loop, v1, v2, removablePotentials);
    this.c1 = c1;
    this.c2 = c2;
    this.otherValues = otherValues;
    this.hiddenValues = hiddenValues;
    this.region = region;
    this.hiddenIndexes = indexes;
  }

  override getDifficulty(): number {
    let toAdd = this.hiddenIndexes.length;
    if (Settings.getInstance().getRevisedRating() === 1) toAdd = toAdd * 0.1; // Pair=0.1, Quad=0.3
    else toAdd = (toAdd - 1) * 0.1; // Original rating Pair=0.0, Quad=0.2
    return super.getDifficulty() + toAdd;
  }

  private appendOrangePotentials(potentials: Map<Cell, BitSet32>): Map<Cell, BitSet32> {
    for (let i = 0; i < this.hiddenIndexes.length; i++) {
      const index = this.hiddenIndexes[i];
      const cell = this.region.getCell(index);
      let values = potentials.get(cell);
      if (values === undefined) {
        values = new BitSet32();
        potentials.set(cell, values);
      }
      values.or(this.hiddenValues);
    }
    // Add the two cells of the loop
    let values = potentials.get(this.c1);
    if (values === undefined) potentials.set(this.c1, this.hiddenValues);
    else values.or(this.hiddenValues);
    values = potentials.get(this.c2);
    if (values === undefined) potentials.set(this.c2, this.hiddenValues);
    else values.or(this.hiddenValues);
    return potentials;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.appendOrangePotentials(super.getGreenPotentials(grid, viewNum));
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const removables = super.getRemovablePotentials();
    const result = new Map<Cell, BitSet32>();
    for (const [key, value] of removables) {
      result.set(key, value.clone());
    }
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
    let result = templates.UniqueLoopType3Hidden;
    const type = this.getTypeName();
    const allCells = Cell.toString(...this.loop);
    const cell1 = this.c1.toString();
    const cell2 = this.c2.toString();
    const valuesOrName = ValuesFormatter.formatValues(this.otherValues, ' or ');
    const setNames = ['Pair', 'Triplet', 'Quad', 'Quintuplet', 'Sextuplet', 'Septuplet'];
    const setName = setNames[this.hiddenValues.cardinality() - 2];
    const cells = new Array<Cell>(this.hiddenIndexes.length);
    for (let i = 0; i < cells.length; i++) cells[i] = this.region.getCell(this.hiddenIndexes[i]);
    const otherCells = ValuesFormatter.formatCells(cells, ' and ');
    const valuesAndName = ValuesFormatter.formatValues(this.hiddenValues, ' and ');
    const regionName = this.region.toString();
    result = format(result, type, this.v1, this.v2, allCells, cell1, cell2, valuesOrName, setName, otherCells, valuesAndName, regionName, this.sharedRegions());
    return result;
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof UniqueLoopType3HiddenHint)) return false;
    if (!super.equals(o)) return false;
    const other = o;
    if (this.region !== other.region) return false;
    if (!this.hiddenValues.equals(other.hiddenValues)) return false;
    if (this.hiddenIndexes.length !== other.hiddenIndexes.length) return false;
    for (let i = 0; i < this.hiddenIndexes.length; i++) {
      if (this.hiddenIndexes[i] !== other.hiddenIndexes[i]) return false;
    }
    return true;
  }
}
