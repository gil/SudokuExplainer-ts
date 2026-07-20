import type { Cell } from '../../Cell.js';
import type { Grid, Region } from '../../Grid.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { DirectHint } from '../DirectHint.js';
import type { DirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';

// Ported from diuf.sudoku.solver.rules.HiddenSingleHint.
export class HiddenSingleHint extends DirectHint implements Rule {
  private readonly isAlone: boolean; // Last empty cell in a region

  constructor(rule: DirectHintProducer, region: Region, cell: Cell, value: number, isAlone: boolean) {
    super(rule, region, cell, value);
    this.isAlone = isAlone;
  }

  getDifficulty(): number {
    if (this.isAlone) return 1.0;
    else if (this.getRegion()!.getRegionTypeIndex() === 0) return 1.2; // block
    else return 1.5;
  }

  getName(): string {
    return 'Hidden Single';
  }

  getShortName(): string {
    return 'HS';
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' in the <b1>' + this.getRegion()!.toFullString() + '</b1>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    return this.getName() + ': ' + super.toString();
  }

  override toHtml(grid: Grid): string {
    const result = this.isAlone ? templates.Single : templates.HiddenSingleHint;
    return format(result, this.getCell().toString(), String(this.getValue()), this.getRegions()[0].toString());
  }
}
