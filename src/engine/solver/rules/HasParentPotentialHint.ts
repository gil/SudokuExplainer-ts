import type { Grid } from '../../Grid.js';
import type { Potential } from './chaining/Potential.js';

// Ported from diuf.sudoku.solver.rules.HasParentPotentialHint. Implemented by
// indirect hints that can report the Potentials set off before the rule
// applies. Used for chaining only.
export interface HasParentPotentialHint {
  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[];
}
