import type { Grid } from '../../Grid.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';
import type { Solver, SolverHooks } from '../Solver.js';
import { AnalysisInfo } from './AnalysisInfo.js';

// Ported from diuf.sudoku.solver.checks.Analyser. Fully solves the sudoku with
// logical rules and produces a single AnalysisInfo hint carrying the rating and
// the used-rules list. The Asker constructor argument is dropped (always
// proceed); solve hooks are threaded through instead.
export class Analyser implements WarningHintProducer {
  private readonly solver: Solver;
  private readonly hooks?: SolverHooks;

  constructor(solver: Solver, hooks?: SolverHooks) {
    this.solver = solver;
    this.hooks = hooks;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    const rules = this.solver.solve(this.hooks);
    const ruleNames = this.solver.toNamedList(rules);
    const hint = new AnalysisInfo(this, rules, ruleNames);
    accu.add(hint);
  }

  toString(): string {
    return 'Analysis';
  }
}
