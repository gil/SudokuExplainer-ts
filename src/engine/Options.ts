import { SolvingTechnique } from './SolvingTechnique.js';

// Replaces the Java Settings singleton. The frozen baseline flags that engine
// code actually reads become module constants. Sanctioned deviation: the Solver
// (step-015) takes the enabled technique set as a constructor argument instead
// of reading a global singleton.
export const islkSudokuBUG = true;
export const islkSudokuURUL = true;
export const FCPlus = 0;

// Java Settings.init() default under the frozen baseline: every in-scope
// technique except FiveStrongLinks and SixStrongLinks.
export function defaultTechniques(): Set<SolvingTechnique> {
  const set = new Set<SolvingTechnique>();
  for (const t of Object.values(SolvingTechnique)) {
    if (t === SolvingTechnique.FiveStrongLinks || t === SolvingTechnique.SixStrongLinks) continue;
    set.add(t);
  }
  return set;
}
