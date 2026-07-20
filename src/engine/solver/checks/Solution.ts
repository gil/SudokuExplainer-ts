import type { Grid } from '../../Grid.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';
import { BruteForceAnalysis } from './BruteForceAnalysis.js';

// Ported from diuf.sudoku.solver.checks.Solution.
export class Solution implements WarningHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    // First check for no, or multiple solution
    const analyser = new BruteForceAnalysis(true);
    analyser.getHints(grid, accu);
  }

  toString(): string {
    return 'Brute force analysis';
  }
}
