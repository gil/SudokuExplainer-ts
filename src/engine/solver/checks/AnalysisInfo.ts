import type { Grid, Region } from '../../Grid.js';
import { variantString, isBlocks } from '../../Options.js';
import type { Rule } from '../Rule.js';
import type { WarningHintProducer } from '../HintProducer.js';
import { WarningHint } from '../WarningHint.js';
import * as templates from '../../../templates/checks.js';
import { format } from '../../../templates/format.js';

// Ported from diuf.sudoku.solver.checks.AnalysisInfo. Carries an approximate
// rating of the sudoku and the list of used rules; applying it does not modify
// the grid.
export class AnalysisInfo extends WarningHint {
  private readonly rules: Map<Rule, number>;
  private readonly ruleNames: Map<string, number>;

  constructor(rule: WarningHintProducer, rules: Map<Rule, number>, ruleNames: Map<string, number>) {
    super(rule);
    this.rules = rules;
    this.ruleNames = ruleNames;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override toHtml(grid: Grid): string {
    const difficulty = this.getDifficulty();
    const difficultRuleName = this.getDifficultyRuleName();
    let details = '';
    for (const [ruleName, count] of this.ruleNames) {
      details += String(count);
      details += ' x ';
      details += ruleName;
      details += '<br>\n';
    }
    details += 'The most difficult technique (ER): ' + difficultRuleName + '<br>\n';
    const result = templates.Analysis;
    return format(
      result,
      decimalFormat(difficulty) + ' (' + difficultRuleName + ')',
      details,
      variantString + (isBlocks ? ' Sudoku' : ''),
    );
  }

  getDifficulty(): number {
    let difficulty = 0;
    for (const rule of this.rules.keys()) {
      if (rule.getDifficulty() > difficulty) difficulty = rule.getDifficulty();
    }
    return difficulty;
  }

  getDifficultyRuleName(): string {
    let difficulty = 0;
    let ruleName = '';
    for (const rule of this.rules.keys()) {
      if (rule.getDifficulty() > difficulty) difficulty = rule.getDifficulty();
      ruleName = rule.getName();
    }
    return ruleName;
  }

  override toString(): string {
    return 'Sudoku Rating';
  }
}

// java.text.DecimalFormat("#0.0"): at least one integer digit, exactly one
// fraction digit. Ratings are multiples of 0.1, so one fixed decimal suffices.
function decimalFormat(value: number): string {
  return value.toFixed(1);
}
