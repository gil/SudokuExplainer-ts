import { Grid } from '../engine/Grid.js';
import { SolvingTechnique } from '../engine/SolvingTechnique.js';
import { Settings, snapshotSettings, restoreSettings } from '../engine/Settings.js';
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
import {
  parseGrid,
  parseCandidates,
  toCellRef,
  type CandidateInput,
  type GridInput,
} from './refs.js';
import { toPublicHint, type Hint } from './hint.js';
import { InvalidGridError, BeyondSolverError } from './errors.js';
import { resolveDifficulty, type GenerateOptions, type GeneratedPuzzle } from './generate.js';

/**
 * Java Settings flags that change solving behaviour. Defaults match the Java
 * defaults, which is what serate uses when the corresponding flag is absent.
 */
export interface EngineSettings {
  /** serate -r. 0: fork rule order and ratings. 1: revised order and ratings. */
  revisedRating?: number;
  /** serate -b. 0: off. 1, 2: lkSudoku revised batch solving. */
  batchSolving?: number;
  /** serate -F. 0: as SE 1.2.1. 1, 2: more non-trivial implications in FC+. */
  FCPlus?: number;
  /** lkSudoku's BUG fix. Java default true. */
  islkSudokuBUG?: boolean;
  /** lkSudoku's UR/UL fix. Java default true. */
  islkSudokuURUL?: boolean;
  /** SE 1.2.1 technique set. Java default false. */
  isBringBackSE121?: boolean;
  /**
   * Cell notation in hint text. Java default true: `r1c1` and `column 1`.
   * False switches to chess notation, `A1` and `column A`. Structured refs
   * (`CellRef.name`, `RegionRef.name`) are unaffected.
   */
  isRCNotation?: boolean;
}

export interface EngineOptions {
  techniques?: SolvingTechnique[]; // default: all in-scope techniques
  settings?: EngineSettings;
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

export interface HintOptions {
  /**
   * Player pencil marks to solve from, instead of the candidates derived from
   * the placed digits. Placed digits still come from the grid argument.
   */
  candidates?: CandidateInput;
}

export interface Engine {
  rate(grid: GridInput, hooks?: Hooks): Rating;
  solvePath(grid: GridInput, hooks?: Hooks): { steps: Step[]; complete: boolean };
  getHint(grid: GridInput, options?: HintOptions): Hint | null;
  getAllHints(grid: GridInput, options?: HintOptions): Hint[];
  solve(grid: GridInput): number[];
  analyze(grid: GridInput, hooks?: Hooks): Analysis;
  checkValidity(grid: GridInput): ValidityWarning | null;
  generate(options?: GenerateOptions): GeneratedPuzzle | null;
}

function makeGrid(input: GridInput, candidates?: CandidateInput): Grid {
  const values = parseGrid(input);
  const grid = new Grid();
  grid.fromString(values.map((v) => (v === 0 ? '.' : String(v))).join(''));
  if (candidates !== undefined) loadCandidates(grid, parseCandidates(candidates));
  return grid;
}

/**
 * Sukaku load: the supplied marks become the potentials of every empty cell,
 * replacing the 1..9 set rebuildPotentialValues would lay down. A cell that
 * holds a digit keeps no potentials, whatever its mask says. Marks the grid as
 * Sukaku so newSolver knows not to rebuild over them.
 */
function loadCandidates(grid: Grid, masks: number[]): void {
  for (let i = 0; i < 81; i++) {
    grid.clearCellPotentialValues(i);
    if (grid.getCellValue(i) !== 0) continue;
    for (let value = 1; value <= 9; value++) {
      if (masks[i] & (1 << (value - 1))) grid.addCellPotentialValue(i, value);
    }
  }
  grid.setSukaku();
}

// An empty cell with no candidate left is a contradiction, not a puzzle. Runs
// after cancelPotentialValues, so it also catches a mark a placed peer kills.
function checkCandidates(grid: Grid): void {
  for (let i = 0; i < 81; i++) {
    if (grid.getCellValue(i) === 0 && grid.getCellPotentialValues(i).isEmpty()) {
      throw new InvalidGridError(`Cell ${toCellRef(i).name} is empty but has no candidates`);
    }
  }
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
  /** undefined means "whatever Settings holds", so isBringBackSE121 can drive it. */
  private readonly techniques: Set<SolvingTechnique> | undefined;
  private readonly settings: EngineSettings;

  constructor(techniques: Set<SolvingTechnique> | undefined, settings: EngineSettings) {
    this.techniques = techniques;
    this.settings = settings;
  }

  /**
   * The engine reads Settings.getInstance() the way Java does, so this applies
   * the engine's config to the singleton and restores the previous values on
   * the way out. Nesting is safe: each call restores what it saw. The engine is
   * not safe for concurrent use with differing settings, same as Java.
   */
  private withSettings<T>(fn: () => T): T {
    const snap = snapshotSettings();
    const s = Settings.getInstance();
    const cfg = this.settings;
    if (cfg.revisedRating !== undefined) s.setRevisedRating(cfg.revisedRating);
    if (cfg.batchSolving !== undefined) s.setBatchSolving(cfg.batchSolving);
    if (cfg.FCPlus !== undefined) s.setFCPlus(cfg.FCPlus);
    if (cfg.islkSudokuBUG !== undefined) s.setlkSudokuBUG(cfg.islkSudokuBUG);
    if (cfg.islkSudokuURUL !== undefined) s.setlkSudokuURUL(cfg.islkSudokuURUL);
    if (cfg.isRCNotation !== undefined) s.setRCNotation(cfg.isRCNotation);
    if (cfg.isBringBackSE121 !== undefined) {
      s.setBringBackSE121(cfg.isBringBackSE121);
      if (cfg.isBringBackSE121) s.settingsBBSE121();
    }
    try {
      return fn();
    } finally {
      restoreSettings(snap);
    }
  }

  private newSolver(grid: Grid): Solver {
    const solver = new Solver(grid, this.techniques ?? Settings.getInstance().getTechniques());
    if (grid.isSudoku() === 0) {
      // Loaded pencil marks ARE the potentials, so rebuilding would erase them.
      // Cancelling can only shrink a mark set, which keeps the grid sound and
      // forgives a stale mark a placed peer already rules out.
      solver.cancelPotentialValues();
      checkCandidates(grid);
    } else {
      solver.rebuildPotentialValues();
    }
    return solver;
  }

  private toHint(hint: EngineHint, grid: Grid, solver: Solver): Hint {
    const technique = solver.getTechnique(hint.getRule()) as SolvingTechnique;
    return toPublicHint(hint, grid, technique);
  }

  rate(grid: GridInput, hooks?: Hooks): Rating {
    return this.withSettings(() => {
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
    });
  }

  solvePath(grid: GridInput, hooks?: Hooks): { steps: Step[]; complete: boolean } {
    return this.withSettings(() => {
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
    });
  }

  getHint(grid: GridInput, options?: HintOptions): Hint | null {
    return this.withSettings(() => {
      const g = makeGrid(grid, options?.candidates);
      const solver = this.newSolver(g);
      const hint = solver.getSingleHint();
      return hint === null ? null : this.toHint(hint, g, solver);
    });
  }

  getAllHints(grid: GridInput, options?: HintOptions): Hint[] {
    return this.withSettings(() => {
      const g = makeGrid(grid, options?.candidates);
      const solver = this.newSolver(g);
      // Warning/validator hints carry no technique; keep only solving hints.
      return solver
        .getAllHints()
        .filter((h) => solver.getTechnique(h.getRule()) !== undefined)
        .map((h) => this.toHint(h, g, solver));
    });
  }

  solve(grid: GridInput): number[] {
    return this.withSettings(() => {
      const g = makeGrid(grid);
      const solver = this.newSolver(g);
      const hint = solver.bruteForceSolve();
      if (!(hint instanceof SolutionHint)) {
        throw new InvalidGridError(hint?.toString() ?? 'The Sudoku has no solution');
      }
      hint.apply(g);
      return gridValues(g);
    });
  }

  analyze(grid: GridInput, hooks?: Hooks): Analysis {
    return this.withSettings(() => {
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
    });
  }

  checkValidity(grid: GridInput): ValidityWarning | null {
    return this.withSettings(() => {
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
    });
  }

  generate(options?: GenerateOptions): GeneratedPuzzle | null {
    return this.withSettings(() => {
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
    });
  }
}

export function createEngine(options?: EngineOptions): Engine {
  const techniques = options?.techniques ? new Set(options.techniques) : undefined;
  return new EngineImpl(techniques, options?.settings ?? {});
}
