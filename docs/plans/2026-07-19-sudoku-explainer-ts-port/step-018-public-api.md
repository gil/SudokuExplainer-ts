# Step 18: Public API, Errors and Packaging

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** steps 015-017

**Files:**

- Create: `src/api/errors.ts`, `src/api/refs.ts`, `src/api/hint.ts`, `src/api/engine.ts`, `src/api/generate.ts`, `README.md`
- Modify: `src/index.ts`
- Test: `test/unit/api.test.ts`

**Interfaces:**

- Consumes: `Solver` and `CancelledError` (step-015), `Generator`/`Symmetry`/`DEFAULT_SYMMETRIES` (step-017), `BeyondSolverInternalError`, warning hint classes (step-008), `SolvingTechnique` and `defaultTechniques()`.
- Produces: the exact public API from the spec's "Public API" section (`docs/specs/2026-07-19-sudoku-explainer-ts-port-design.md` lines 106-194). Copy the type declarations from the spec verbatim into the files below. The spec is the contract, do not rename its fields.

File responsibilities:

```ts
// src/api/errors.ts
export class InvalidGridError extends Error {}
export class BeyondSolverError extends Error {}
export { CancelledError } from '../engine/solver/Solver.js';

// src/api/refs.ts: CellRef, CandidateRef, RegionRef types plus builders
export function toCellRef(index: number): CellRef;   // { index, row, column, name: "R5C7" }
export function toRegionRef(region: Region): RegionRef;
export function parseGrid(input: GridInput): number[]; // 81 values, throws InvalidGridError
// parseGrid accepts an 81-char string (digits, '.', '0', whitespace tolerated) or number[81];
// anything else (bad length, bad chars, out-of-range) throws InvalidGridError.

// src/api/hint.ts
export function toPublicHint(hint: EngineHint, grid: Grid): Hint;
// Maps an engine hint to the spec's Hint shape:
// - technique: reverse-map the producer to SolvingTechnique (build the map from the
//   registration table in Solver.ts)
// - name/shortName/difficulty from Rule methods, isDirect via instanceof DirectHint
// - cell/value/removals via getCell/getValue/getRemovablePotentials (removals sorted
//   by cell index, values ascending, same canonical form as the fixtures)
// - highlights from getSelectedCells (greenCells), getGreenPotentials/getRedPotentials/
//   getBluePotentials at viewNum 0 (green/red/orangeCandidates), getRegions (regions),
//   getLinks at viewNum 0 (links)
// - explain() calls the engine hint's toHtml(grid) (markdown after step-006)
// - toString() delegates to the engine hint

// src/api/engine.ts: createEngine + the Engine methods rate/solvePath/getHint/
// getAllHints/solve/analyze/checkValidity/generate, each stateless per call:
// parse input -> fresh Grid -> fresh Solver(techniques) -> run -> map results.
// EngineOptions.techniques (SolvingTechnique[]) is converted to a Set once in
// createEngine and passed to every Solver constructor; omitted -> defaultTechniques().
// - rate: getDifficulty(hooks) -> Rating (map ERtN et al. onto the spec field names)
// - solvePath: loop getSingleHint like getDifficulty does, collecting Steps
//   { hint, gridBefore } and complete = grid.isSolved(); shouldCancel -> CancelledError
// - getHint: first getSingleHint result mapped, or null
// - getAllHints: Solver.getAllHints mapped (tiering already inside the Solver port)
// - solve: bruteForceSolve; warning hint -> InvalidGridError? NO: spec says solve
//   returns number[81]; on warning, throw InvalidGridError with the warning message
// - analyze: Solver.solve() + toNamedList -> Analysis; BeyondSolverInternalError -> BeyondSolverError
// - checkValidity: warning hint -> ValidityWarning | null (kind per warning class:
//   NoDoubles -> 'duplicateValue', NumberOfFilledCells -> 'tooFewCells',
//   NumberOfValues -> 'tooFewValues', BruteForceAnalysis/no-solution -> 'noSolution',
//   DoubleSolutionWarning -> 'multipleSolutions'; verify each mapping against the
//   ported class that actually fires and the fixtures)

// src/api/generate.ts: GenerateOptions/GeneratedPuzzle per spec.
// - difficulty: named level -> ER bounds table (easy 1.0-1.2, medium 1.3-1.6,
//   hard 1.7-2.5, fiendish 2.6-6.0, diabolical 6.1-11.0), or {min,max} passthrough;
//   default 'easy'
// - symmetries default DEFAULT_SYMMETRIES; seed -> new JavaRandom(seed), omitted ->
//   new JavaRandom() (time-based)
// - returns { puzzle, solution, rating } or null iff cancelled; solution via
//   brute-force on the generated grid; rating via rate()

// src/index.ts: export the whole public surface plus top-level convenience
// functions (rate, generate, solvePath, getHint, solve, checkValidity) that wrap
// a lazily created default engine.
```

- [ ] **Action 1: write the failing API test**

`test/unit/api.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEngine, InvalidGridError, rate } from '../../src/index.js';

const fx = (id: string) =>
  JSON.parse(readFileSync(`test/fixtures/puzzles/${id}.json`, 'utf8'));

const engine = createEngine();

describe('rate', () => {
  it('matches the fixture rating and technique names', () => {
    const f = fx('easy-s1');
    const r = engine.rate(f.puzzle);
    expect(r.er).toBe(f.rating.er);
    expect(r.ep).toBe(f.rating.ep);
    expect(r.ed).toBe(f.rating.ed);
    expect(r.erTechnique).toBe(f.rating.erTechnique);
    expect(r.erTechniqueShort).toBe(f.rating.erShort);
  });
  it('is exposed as a top-level convenience function', () => {
    expect(rate(fx('easy-s1').puzzle).er).toBe(fx('easy-s1').rating.er);
  });
});

describe('solvePath', () => {
  it('walks the fixture path and completes', () => {
    const f = fx('easy-s1');
    const { steps, complete } = engine.solvePath(f.puzzle);
    expect(complete).toBe(true);
    expect(steps).toHaveLength(f.steps.length);
    expect(steps[0].hint.name).toBe(f.steps[0].technique);
    expect(steps[0].hint.toString()).toBe(f.steps[0].toString);
    expect(steps[0].gridBefore).toHaveLength(81);
  });
});

describe('hints', () => {
  it('getHint returns the first fixture step', () => {
    const f = fx('easy-s1');
    const h = engine.getHint(f.puzzle);
    expect(h).not.toBeNull();
    expect(h!.name).toBe(f.steps[0].technique);
    expect(h!.removals[0]?.values ?? []).toEqual(f.steps[0].removals[0]?.values ?? []);
    expect(h!.explain()).toContain(h!.name.split(' ')[0]); // markdown resolved, no {0} left
    expect(h!.explain()).not.toMatch(/\{\d+\}/);
  });
  it('getAllHints returns multiple structured hints', () => {
    expect(engine.getAllHints(fx('easy-s1').puzzle).length).toBeGreaterThan(1);
  });
});

describe('solve and validity', () => {
  it('solve returns the brute-force solution', () => {
    const f = fx('easy-s1');
    expect(engine.solve(f.puzzle).join('')).toBe(f.solution);
  });
  it('checkValidity maps warning kinds', () => {
    expect(engine.checkValidity(fx('easy-s1').puzzle)).toBeNull();
    const w = engine.checkValidity(fx('invalid-double').puzzle)!;
    expect(w.kind).toBe('duplicateValue');
    expect(w.message.length).toBeGreaterThan(0);
    expect(w.explain().length).toBeGreaterThan(0);
  });
  it('rejects malformed input', () => {
    expect(() => engine.rate('123')).toThrow(InvalidGridError);
    expect(() => engine.rate('x'.repeat(81))).toThrow(InvalidGridError);
    expect(() => engine.rate(new Array(81).fill(10) as number[])).toThrow(InvalidGridError);
  });
});

describe('generate', () => {
  it('reproduces the seeded generator fixture', () => {
    const gf = JSON.parse(readFileSync('test/fixtures/generator/easy-s1.json', 'utf8'));
    const out = engine.generate({ difficulty: 'easy', seed: gf.seed })!;
    expect(out.puzzle.map((v) => (v === 0 ? '.' : v)).join('')).toBe(gf.puzzle);
    expect(out.rating.er).toBe(gf.er);
    expect(out.solution).toHaveLength(81);
  });
  it('returns null when cancelled', () => {
    expect(engine.generate({ shouldCancel: () => true })).toBeNull();
  });
});
```

Adjust the `checkValidity` kind expectation if the fixture's warning class maps to a different spec kind (the mapping table in `src/api/engine.ts` is the source of truth, and it must be consistent with what `invalid-double` actually triggers).

- [ ] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/api.test.ts`
Expected: FAIL (exports missing).

- [ ] **Action 3: write the API layer**

Build the five `src/api/` files per the responsibilities block, then rewrite `src/index.ts` to export the public surface (delete the placeholder `VERSION` or keep it exported alongside). Type declarations come verbatim from the spec.

- [ ] **Action 4: run everything, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm build`
Expected: `dist/index.js` + `dist/index.d.ts`. Then spot-check the package surface:

```bash
node -e "import('./dist/index.js').then(m => console.log(Object.keys(m).sort().join('\n')))"
```

Expected: the spec's exports are all present (createEngine, rate, generate, solvePath, getHint, solve, checkValidity, error classes, SolvingTechnique).

- [ ] **Action 5: write README.md**

Short: what the library is (SukakuExplainer port, vanilla Sudoku, LGPL-2.1), install, one `rate`/`getHint`/`generate` example each, a fidelity note pointing at the differential suite, and the Node >= 20 + ESM-only requirement.

- [ ] **Action 6: commit**

```bash
git add src README.md
```

```bash
git commit -m "feat: public API (rate, solvePath, hints, generate) and packaging"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
