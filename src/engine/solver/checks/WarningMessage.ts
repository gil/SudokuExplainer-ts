import type { Grid, Region } from '../../Grid.js';
import type { WarningHintProducer } from '../HintProducer.js';
import { WarningHint } from '../WarningHint.js';
import * as templates from '../../../templates/checks.js';
import { format } from '../../../templates/format.js';

// Ported from diuf.sudoku.solver.checks.WarningMessage. toHtml loads the
// template constant matching htmlFile instead of HtmlLoader.loadHtml.
export class WarningMessage extends WarningHint {
  private readonly message: string;
  private readonly htmlFile: string;
  private readonly args: Array<string | number>;

  constructor(rule: WarningHintProducer, message: string, htmlFile: string, ...args: Array<string | number>) {
    super(rule);
    this.message = message;
    this.htmlFile = htmlFile;
    this.args = args;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override toString(): string {
    return this.message;
  }

  override toHtml(grid: Grid): string {
    const key = this.htmlFile.replace(/\.html$/, '');
    const template = (templates as Record<string, string>)[key];
    return format(template, ...this.args);
  }
}
