import type { Cell } from '../Cell.js';
import type { Grid } from '../Grid.js';
import type { Link } from '../Link.js';
import type { BitSet32 } from '../util/BitSet32.js';
import { IndirectHint } from './IndirectHint.js';
import type { WarningHintProducer } from './HintProducer.js';

// Ported from diuf.sudoku.solver.WarningHint (subclass of IndirectHint with
// empty removals).
export abstract class WarningHint extends IndirectHint {
  constructor(rule: WarningHintProducer) {
    super(rule, new Map<Cell, BitSet32>());
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map();
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map();
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getSelectedCells(): Cell[] | null {
    return null;
  }

  getRedCells(): Cell[] {
    return [];
  }

  override getViewCount(): number {
    return 1;
  }

  override isWorth(): boolean {
    return true;
  }
}
