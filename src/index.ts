export const VERSION = '0.2.0';

export { SolvingTechnique } from './engine/SolvingTechnique.js';
export { Symmetry, DEFAULT_SYMMETRIES } from './engine/generator/Symmetry.js';

export { InvalidGridError, BeyondSolverError, CancelledError } from './api/errors.js';

export type {
  CellRef,
  CandidateRef,
  RegionRef,
  GridInput,
  CandidateInput,
} from './api/refs.js';
export {
  toCellRef,
  toCandidateRef,
  toRegionRef,
  parseGrid,
  parseCandidates,
} from './api/refs.js';

export type { Hint, Highlights, HighlightLink } from './api/hint.js';

export type {
  Engine,
  EngineOptions,
  HintOptions,
  Hooks,
  Rating,
  Step,
  Analysis,
  ValidityWarning,
} from './api/engine.js';
export { createEngine } from './api/engine.js';

export type {
  DifficultyLevel,
  GenerateOptions,
  GeneratedPuzzle,
} from './api/generate.js';

import {
  createEngine,
  type Engine,
  type HintOptions,
  type Hooks,
  type Rating,
  type Step,
  type ValidityWarning,
} from './api/engine.js';
import type { Hint } from './api/hint.js';
import type { GridInput } from './api/refs.js';
import type { GenerateOptions, GeneratedPuzzle } from './api/generate.js';

// Lazily created default engine backing the top-level convenience functions.
let defaultEngine: Engine | undefined;
function engine(): Engine {
  return (defaultEngine ??= createEngine());
}

export function rate(grid: GridInput, hooks?: Hooks): Rating {
  return engine().rate(grid, hooks);
}

export function solvePath(grid: GridInput, hooks?: Hooks): { steps: Step[]; complete: boolean } {
  return engine().solvePath(grid, hooks);
}

export function getHint(grid: GridInput, options?: HintOptions): Hint | null {
  return engine().getHint(grid, options);
}

export function getAllHints(grid: GridInput, options?: HintOptions): Hint[] {
  return engine().getAllHints(grid, options);
}

export function solve(grid: GridInput): number[] {
  return engine().solve(grid);
}

export function checkValidity(grid: GridInput): ValidityWarning | null {
  return engine().checkValidity(grid);
}

export function generate(options?: GenerateOptions): GeneratedPuzzle | null {
  return engine().generate(options);
}
