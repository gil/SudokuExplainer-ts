import { Settings } from '../../Settings.js';
import type { Cell } from '../../Cell.js';
import type { Grid, Region } from '../../Grid.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { DirectHint } from '../DirectHint.js';
import type { DirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';

// Ported from diuf.sudoku.solver.rules.NakedSingleHint. revisedRating frozen 0,
// so the original rating (2.3) is returned.
export class NakedSingleHint extends DirectHint implements Rule {
  constructor(rule: DirectHintProducer, region: Region | null, cell: Cell, value: number) {
    super(rule, region, cell, value);
  }

  getDifficulty(): number {
    if (Settings.getInstance().getRevisedRating() === 1) return 1.6; // New rating
    return 2.3; // Original rating
  }

  getName(): string {
    return 'Naked Single';
  }

  getShortName(): string {
    return 'NS';
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' in the cell <b>' + this.getCell().toString() + '</b>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    return this.getName() + ': ' + super.toString();
  }

  override toHtml(grid: Grid): string {
    return format(templates.NakedSingleHint, String(this.getValue()), this.getCell().toString());
  }
}
