import { Grid } from '../engine/Grid.js';
import { SolvingTechnique } from '../engine/SolvingTechnique.js';
import { defaultTechniques } from '../engine/Options.js';
import { Solver, CancelledError } from '../engine/solver/Solver.js';
import type { Hint as EngineHint } from '../engine/solver/Hint.js';
import type { Rule } from '../engine/solver/Rule.js';
import { IndirectHint } from '../engine/solver/IndirectHint.js';
import { BeyondSolverInternalError } from '../engine/solver/BeyondSolverInternalError.js';
import { SolutionHint } from '../engine/solver/checks/SolutionHint.js';
import { DoubleSolutionWarning } from '../engine/solver/checks/DoubleSolutionWarning.js';
import { NoDoubles } from '../engine/solver/checks/NoDoubles.js';
import { NumberOfFilledCells } from '../engine/solver/checks/NumberOfFilledCells.js';
import { NumberOfValues } from '../engine/solver/checks/NumberOfValues.js';
import { Generator } from '../engine/generator/Generator.js';
import { DEFAULT_SYMMETRIES } from '../engine/generator/Symmetry.js';
import { JavaRandom } from '../engine/util/JavaRandom.js';
import { parseGrid, type GridInput } from './refs.js';
import { toPublicHint, type Hint } from './hint.js';
import { InvalidGridError, BeyondSolverError } from './errors.js';
import { resolveDifficulty, type GenerateOptions, type GeneratedPuzzle } from './generate.js';

export interface EngineOptions {
  techniques?: SolvingTechnique[]; // default: all in-scope techniques
}

export interface Hooks {
  shouldCancel?: () => boolean;
  onProgress?: (info: { step: number; difficulty: number }) => void;
}

export interface Rating {
  er: number;
  ep: number;
  ed: number;
  erTechnique: string;
  epTechnique: string;
  edTechnique: string;
  erTechniqueShort: string;
  epTechniqueShort: string;
  edTechniqueShort: string;
}

export interface Step {
  hint: Hint;
  gridBefore: number[];
}

export interface Analysis {
  difficulty: number;
  steps: { technique: string; count: number }[];
}

export interface ValidityWarning {
  kind: 'noSolution' | 'multipleSolutions' | 'tooFewValues' | 'tooFewCells' | 'duplicateValue';
  message: string;
  explain(): string;
}

export interface Engine {
  rate(grid: GridInput, hooks?: Hooks): Rating;
  solvePath(grid: GridInput, hooks?: Hooks): { steps: Step[]; complete: boolean };
  getHint(grid: GridInput): Hint | null;
  getAllHints(grid: GridInput): Hint[];
  solve(grid: GridInput): number[];
  analyze(grid: GridInput, hooks?: Hooks): Analysis;
  checkValidity(grid: GridInput): ValidityWarning | null;
  generate(options?: GenerateOptions): GeneratedPuzzle | null;
}

function makeGrid(input: GridInput): Grid {
  const values = parseGrid(input);
  const grid = new Grid();
  grid.fromString(values.map((v) => (v === 0 ? '.' : String(v))).join(''));
  return grid;
}

function gridValues(grid: Grid): number[] {
  const out: number[] = [];
  for (let i = 0; i < 81; i++) out.push(grid.getCellValue(i));
  return out;
}

function validityKind(hint: EngineHint): ValidityWarning['kind'] {
  if (hint instanceof DoubleSolutionWarning) return 'multipleSolutions';
  const producer = (hint as IndirectHint).getRule();
  if (producer instanceof NoDoubles) return 'duplicateValue';
  if (producer instanceof NumberOfValues) return 'tooFewValues';
  if (producer instanceof NumberOfFilledCells) return 'tooFewCells';
  // BruteForceAnalysis no-solution WarningMessage.
  return 'noSolution';
}

class EngineImpl implements Engine {
  private readonly techniques: Set<SolvingTechnique>;

  constructor(techniques: Set<SolvingTechnique>) {
    this.techniques = techniques;
  }

  private newSolver(grid: Grid): Solver {
    const solver = new Solver(grid, this.techniques);
    solver.rebuildPotentialValues();
    return solver;
  }

  private toHint(hint: EngineHint, grid: Grid, solver: Solver): Hint {
    const technique = solver.getTechnique(hint.getRule()) as SolvingTechnique;
    return toPublicHint(hint, grid, technique);
  }

  rate(grid: GridInput, hooks?: Hooks): Rating {
    const solver = this.newSolver(makeGrid(grid));
    solver.getDifficulty(hooks);
    return {
      er: solver.difficulty,
      ep: solver.pearl,
      ed: solver.diamond,
      erTechnique: solver.ERtN,
      epTechnique: solver.EPtN,
      edTechnique: solver.EDtN,
      erTechniqueShort: solver.shortERtN,
      epTechniqueShort: solver.shortEPtN,
      edTechniqueShort: solver.shortEDtN,
    };
  }

  solvePath(grid: GridInput, hooks?: Hooks): { steps: Step[]; complete: boolean } {
    const g = makeGrid(grid);
    const solver = this.newSolver(g);
    const steps: Step[] = [];
    let stepCount = 0;
    while (!g.isSolved()) {
      if (hooks?.shouldCancel?.()) throw new CancelledError();
      const hint = solver.getSingleHint();
      if (hint === null) break; // beyond solver: stop with the path so far
      const gridBefore = gridValues(g);
      const publicHint = this.toHint(hint, g, solver);
      steps.push({ hint: publicHint, gridBefore });
      hint.apply(g);
      hooks?.onProgress?.({ step: ++stepCount, difficulty: (hint as unknown as Rule).getDifficulty() });
    }
    return { steps, complete: g.isSolved() };
  }

  getHint(grid: GridInput): Hint | null {
    const g = makeGrid(grid);
    const solver = this.newSolver(g);
    const hint = solver.getSingleHint();
    return hint === null ? null : this.toHint(hint, g, solver);
  }

  getAllHints(grid: GridInput): Hint[] {
    const g = makeGrid(grid);
    const solver = this.newSolver(g);
    // Warning/validator hints carry no technique; keep only solving hints.
    return solver
      .getAllHints()
      .filter((h) => solver.getTechnique(h.getRule()) !== undefined)
      .map((h) => this.toHint(h, g, solver));
  }

  solve(grid: GridInput): number[] {
    const g = makeGrid(grid);
    const solver = this.newSolver(g);
    const hint = solver.bruteForceSolve();
    if (!(hint instanceof SolutionHint)) {
      throw new InvalidGridError(hint?.toString() ?? 'The Sudoku has no solution');
    }
    hint.apply(g);
    return gridValues(g);
  }

  analyze(grid: GridInput, hooks?: Hooks): Analysis {
    const solver = this.newSolver(makeGrid(grid));
    let rules;
    try {
      rules = solver.solve(hooks);
    } catch (e) {
      if (e instanceof BeyondSolverInternalError) throw new BeyondSolverError(e.message);
      throw e;
    }
    let difficulty = 0;
    for (const rule of rules.keys()) {
      if (rule.getDifficulty() > difficulty) difficulty = rule.getDifficulty();
    }
    const named = solver.toNamedList(rules);
    const steps = [...named.entries()].map(([technique, count]) => ({ technique, count }));
    return { difficulty, steps };
  }

  checkValidity(grid: GridInput): ValidityWarning | null {
    const g = makeGrid(grid);
    const solver = this.newSolver(g);
    const hint = solver.checkValidity();
    if (hint === null) return null;
    const explanation = hint.toHtml(g);
    return {
      kind: validityKind(hint),
      message: hint.toString(),
      explain: () => explanation,
    };
  }

  generate(options?: GenerateOptions): GeneratedPuzzle | null {
    const { min, max } = resolveDifficulty(options?.difficulty);
    const symmetries = options?.symmetries ?? DEFAULT_SYMMETRIES;
    const rnd = options?.seed !== undefined ? new JavaRandom(options.seed) : new JavaRandom();
    const onProgress = options?.onProgress;
    const grid = new Generator().generate(symmetries, min, max, rnd, {
      shouldCancel: options?.shouldCancel,
      onAttempt: onProgress ? (attempt) => onProgress({ attempt }) : undefined,
    });
    if (grid === null) return null;
    const puzzle = gridValues(grid);
    return { puzzle, solution: this.solve(puzzle), rating: this.rate(puzzle) };
  }
}

export function createEngine(options?: EngineOptions): Engine {
  const techniques = options?.techniques ? new Set(options.techniques) : defaultTechniques();
  return new EngineImpl(techniques);
}
