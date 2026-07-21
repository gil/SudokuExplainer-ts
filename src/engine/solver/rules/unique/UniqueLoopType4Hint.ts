import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopType4Hint.
export class UniqueLoopType4Hint extends UniqueLoopHint {
  private readonly c1: Cell;
  private readonly c2: Cell;
  private readonly lockValue: number;
  private readonly remValue: number;
  private readonly region: Region;

  constructor(
    rule: IndirectHintProducer,
    loop: Cell[],
    lockValue: number,
    remValue: number,
    removablePotentials: Map<Cell, BitSet32>,
    c1: Cell,
    c2: Cell,
    region: Region,
  ) {
    super(rule, loop, lockValue, remValue, removablePotentials);
    this.c1 = c1;
    this.c2 = c2;
    this.lockValue = lockValue;
    this.remValue = remValue;
    this.region = region;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return super.getRemovablePotentials();
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  override getType(): number {
    return 4;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result = templates.UniqueLoopType4;
    const type = this.getTypeName();
    const allCells = Cell.toString(...this.loop);
    const cell1 = this.c1.toString();
    const cell2 = this.c2.toString();
    result = format(result, type, this.lockValue, this.remValue, allCells, cell1, cell2, this.region.toString(), this.sharedRegions());
    return result;
  }
}
