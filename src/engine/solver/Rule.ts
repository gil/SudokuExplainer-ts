import type { Grid } from '../Grid.js';

// Ported from diuf.sudoku.solver.Rule. A "classified hint" usable to advance
// one step; warnings, analyses and informations do not implement this.
export interface Rule {
  getName(): string;
  getShortName(): string;
  getDifficulty(): number;
  getClueHtml(grid: Grid, isBig: boolean): string;
}

export function isRule(h: unknown): h is Rule {
  return (
    typeof h === 'object' &&
    h !== null &&
    typeof (h as Rule).getName === 'function' &&
    typeof (h as Rule).getShortName === 'function' &&
    typeof (h as Rule).getDifficulty === 'function' &&
    typeof (h as Rule).getClueHtml === 'function'
  );
}
