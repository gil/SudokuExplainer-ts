import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { BugHint } from './BugHint.js';

// Ported from diuf.sudoku.solver.rules.unique.Bug3Hint.
export class Bug3Hint extends BugHint {
  private readonly bugCells: Cell[];
  private readonly nakedCells: Cell[];
  private readonly extraValues: Map<Cell, BitSet32>;
  private readonly allExtraValues: BitSet32;
  private readonly nakedSet: BitSet32;
  private readonly region: Region;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    bugCells: Cell[],
    nakedCells: Cell[],
    extraValues: Map<Cell, BitSet32>,
    allExtraValues: BitSet32,
    nakedSet: BitSet32,
    region: Region,
  ) {
    super(rule, removablePotentials);
    this.bugCells = bugCells;
    this.extraValues = extraValues;
    this.allExtraValues = allExtraValues;
    this.nakedCells = nakedCells;
    this.nakedSet = nakedSet;
    this.region = region;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return this.bugCells;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    for (const cell of this.bugCells) {
      const innerNaked = this.nakedSet.clone();
      innerNaked.and(this.extraValues.get(cell)!);
      result.set(cell, innerNaked); // green
    }
    for (const cell of this.nakedCells) result.set(cell, this.nakedSet); // orange
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(super.getRemovablePotentials());
    for (const cell of this.nakedCells) result.set(cell, this.nakedSet); // orange
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  getName(): string {
    return 'BUG type 3';
  }

  getShortName(): string {
    return 'BUG3';
  }

  getDifficulty(): number {
    const toAdd = (this.nakedSet.cardinality() - 1) * 0.1; // Pair=0.1, Quad=0.3
    return 5.7 + toAdd;
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  override toString(): string {
    return 'BUG type 3: ' + Cell.toString(...this.bugCells) + ' on ' + ValuesFormatter.formatValues(this.nakedSet, ', ');
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    const result = templates.BivalueUniversalGrave3;
    const andExtraValues = ValuesFormatter.formatValues(this.allExtraValues, ' and ');
    const andBugCells = ValuesFormatter.formatCells(this.bugCells, ' and ');
    const orBugCells = ValuesFormatter.formatCells(this.bugCells, ' or ');
    const orExtraValues = ValuesFormatter.formatValues(this.allExtraValues, ' or ');
    const setNames = ['Pair', 'Triplet', 'Quad', 'Set (5)', 'Set (6)', 'Set (7)'];
    const setName = setNames[this.nakedSet.cardinality() - 2];
    const andOtherCells = ValuesFormatter.formatCells(this.nakedCells, ' and ');
    const andNakedValues = ValuesFormatter.formatValues(this.nakedSet, ' and ');
    const regionName = this.region.toString();
    return format(result, andExtraValues, andBugCells, orBugCells, orExtraValues, setName, andOtherCells, andNakedValues, regionName, this.sharedRegions());
  }
}
