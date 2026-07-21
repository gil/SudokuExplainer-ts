import { Cell } from '../../../Cell.js';
import type { Grid } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesUnique.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoopType1Hint.
export class UniqueLoopType1Hint extends UniqueLoopHint {
  private readonly target: Cell;

  constructor(rule: IndirectHintProducer, loop: Cell[], v1: number, v2: number, removablePotentials: Map<Cell, BitSet32>, target: Cell) {
    super(rule, loop, v1, v2, removablePotentials);
    this.target = target;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const removable = new BitSet32();
    removable.set(this.v1);
    removable.set(this.v2);
    return new Map([[this.target, removable]]);
  }

  override getType(): number {
    return 1;
  }

  private sharedRegions(): string {
    // Settings.isVanilla() frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result = templates.UniqueLoopType1;
    const type = this.getTypeName();
    const cellName = this.target.toString();
    const allCells = Cell.toString(...this.loop);
    result = format(result, type, this.v1, this.v2, allCells, cellName, this.sharedRegions());
    return result;
  }
}
