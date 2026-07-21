import type { Grid } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Cell } from '../../../Cell.js';
import { IndirectHint } from '../../IndirectHint.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import type { Rule } from '../../Rule.js';

// Ported from diuf.sudoku.solver.rules.unique.BugHint.
export abstract class BugHint extends IndirectHint implements Rule {
  constructor(rule: IndirectHintProducer, removablePotentials: Map<Cell, BitSet32>) {
    super(rule, removablePotentials);
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) return 'Look for a ' + this.getName();
    return 'Look for a Bivalue Universal Grave (BUG)';
  }

  abstract getName(): string;
  abstract getShortName(): string;
  abstract getDifficulty(): number;
}
