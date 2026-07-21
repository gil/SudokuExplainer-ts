import { Cell } from '../../../Cell.js';
import type { Grid } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopType2Hint.
export class UniqueLoopType2Hint extends UniqueLoopHint {
  private readonly cells: Cell[];
  private readonly value: number;

  constructor(rule: IndirectHintProducer, loop: Cell[], v1: number, v2: number, removablePotentials: Map<Cell, BitSet32>, cells: Cell[], value: number) {
    super(rule, loop, v1, v2, removablePotentials);
    this.cells = cells;
    this.value = value;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(super.getRemovablePotentials());
    for (const c of this.cells) result.set(c, SingletonBitSet.create(this.value)); // orange
    return result;
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(super.getGreenPotentials(grid, viewNum));
    for (const c of this.cells) {
      const b = result.get(c)!;
      b.set(this.value); // orange
    }
    return result;
  }

  override getType(): number {
    return 2;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result = templates.UniqueLoopType2;
    const type = this.getTypeName();
    const allCells = Cell.toString(...this.loop);
    const extraCellsOr = ValuesFormatter.formatCells(this.cells, ' or ');
    const extraCellsAnd = ValuesFormatter.formatCells(this.cells, ' and ');
    result = format(result, type, this.v1, this.v2, allCells, extraCellsOr, extraCellsAnd, this.value, this.sharedRegions());
    return result;
  }
}
