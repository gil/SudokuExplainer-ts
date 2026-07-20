import type { Cell } from '../Cell.js';
import type { Grid, Region } from '../Grid.js';
import type { HintProducer } from './HintProducer.js';

// Ported from diuf.sudoku.solver.Hint.
export abstract class Hint {
  abstract getRule(): HintProducer;

  getCell(): Cell | null {
    return null;
  }

  getValue(): number {
    return 0;
  }

  abstract apply(targetGrid: Grid): void;

  abstract getRegions(): Region[] | null;

  abstract toString(): string;

  // Java: toHtml(Grid). Returns markdown in the port; name kept for fidelity.
  abstract toHtml(grid: Grid): string;

  // Java hints inherit Object.equals (identity) unless a subclass overrides it.
  equals(o: unknown): boolean {
    return this === o;
  }
}
