# Step 15: Solver, Analyser and the Rating Loop

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-014 (all producers exist)

**Files:**

- Port from: `SukakuExplainer/diuf/sudoku/solver/Solver.java`, `solver/checks/Analyser.java`, `solver/checks/AnalysisInfo.java`
- Create: `src/engine/solver/Solver.ts`, `src/engine/solver/checks/Analyser.ts`, `src/engine/solver/checks/AnalysisInfo.ts`, `src/engine/solver/BeyondSolverInternalError.ts`
- Test: `test/unit/solver.test.ts`

**Interfaces:**

- Consumes: every ported producer and check, plus the accumulators and `defaultTechniques()` from `Options.ts`.
- Produces (steps 016-018 build on this exact surface):

```ts
// src/engine/solver/Solver.ts
export interface SolverHooks {
  shouldCancel?: () => boolean;                                  // checked once per rating step
  onProgress?: (info: { step: number; difficulty: number }) => void;
  onStep?: (hint: Hint, gridBefore: number[]) => void;           // used by the API solvePath
}
export class CancelledError extends Error {}

export class Solver {
  difficulty: number; pearl: number; diamond: number;
  ERtN: string; EPtN: string; EDtN: string;
  shortERtN: string; shortEPtN: string; shortEDtN: string;
  want: number;                                                  // stays 0, kept for fidelity

  constructor(grid: Grid, techniques?: Set<SolvingTechnique>);   // default: defaultTechniques()
  getGrid(): Grid;
  rebuildPotentialValues(): void;                                // delegates to potentials.ts
  cancelPotentialValues(): void;
  checkValidity(): Hint | null;
  getAllHints(): Hint[];                                         // Asker dropped, always proceed
  solve(hooks?: SolverHooks): Map<Rule, number>;                 // throws BeyondSolverInternalError like Java's UnsupportedOperationException, CancelledError on shouldCancel
  toNamedList(rules: Map<Rule, number>): Map<string, number>;
  analyseDifficulty(min: number, max: number,
    include1: number, include2: number, include3: number,
    exclude1: number, exclude2: number, exclude3: number,
    notMax1: number, notMax2: number, notMax3: number,
    excludeT1: string, excludeT2: string, excludeT3: string,
    includeT1: string, includeT2: string, includeT3: string,
    notMaxT1: string, notMaxT2: string, notMaxT3: string,
    oneOf3_1: string, oneOf3_2: string, oneOf3_3: string): number;
  getDifficulty(hooks?: SolverHooks): void;                      // fills the public rating fields
  getSingleHint(): Hint | null;                                  // public in the port (replay + API need it)
  bruteForceSolve(): Hint | null;
}

// src/engine/solver/BeyondSolverInternalError.ts
export class BeyondSolverInternalError extends Error {}          // Java UnsupportedOperationException stand-in

// src/engine/solver/checks/Analyser.ts + AnalysisInfo.ts per the Java files
// (Analyser drops the Asker constructor argument, always proceeds)
```

**Port notes:**

- Constructor: port ONLY the `revisedRating == 0` else-branch (Solver.java lines 211-280), filtered by the technique set through `addIfWorth` and with variant-gated entries dropped. The result must equal the overview's registration table when called with `defaultTechniques()`.
- `getDifficulty(hooks)`: port the no-formatter `getDifficulty()` (Solver.java lines 753-832) with logging dropped. Insert `hooks.onStep` where the formatter variant calls `afterHint` (right after `hint.apply`), `hooks.onProgress` next to it, and a `shouldCancel` check at the top of each loop iteration that throws `CancelledError`. Keep the pearl/diamond bookkeeping byte-for-byte, including the `want` branches.
- `solve(hooks)`: port `solve(Asker)` minus the Asker (always use advanced), with a `shouldCancel` check per loop iteration throwing `CancelledError` (the API `analyze` passes hooks through). The `TreeMap<Rule,Integer>` with `RuleComparer` becomes an array of `[Rule, count]` kept sorted by the ported comparator (difficulty, then `getName()` with JS string compare), materialized as an insertion-ordered `Map` on return. Port `toNamedList` on top of it.
- `getAllHints()`: port the Java method including its inner `DefaultHintsAccumulator` (dedup via `result.some(h => h.equals(hint))`, per overview rule 3). Port it as `src/engine/solver/DefaultHintsAccumulator.ts`.
- `analyseDifficulty`: full 24-parameter port including the counters, the `contains("")` behavior (JS `String.includes('')` is also always true) and the two break conditions. Its producer loop skips advanced/experimental tiers exactly like Java.
- `gatherHints`/`gatherProducer` (the previous-hints replay for the GUI) are NOT needed by the public API. Skip them, and note the omission in a comment at the class top.
- `getBatchDifficulty` and `SmallestHintsAccumulator` are out of scope, skip.
- `Analyser` wraps `solve()` into an `AnalysisInfo` warning hint, port both files (they are small). `AnalysisInfo.toHtml` uses the `Analysis` template from `src/templates/checks.ts`.

- [ ] **Action 1: write the failing solver test**

`test/unit/solver.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { Solver } from '../../src/engine/solver/Solver.js';
import { CancelledError } from '../../src/engine/solver/Solver.js';

const fx = (id: string) =>
  JSON.parse(readFileSync(`test/fixtures/puzzles/${id}.json`, 'utf8'));

const solverFor = (puzzle: string) => {
  const g = new Grid();
  g.fromString(puzzle);
  const s = new Solver(g);
  s.rebuildPotentialValues();
  return s;
};

describe('Solver.getDifficulty', () => {
  it('reproduces the easy-s1 fixture rating', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    s.getDifficulty();
    expect(s.difficulty).toBe(f.rating.er);
    expect(s.pearl).toBe(f.rating.ep);
    expect(s.diamond).toBe(f.rating.ed);
    expect(s.ERtN).toBe(f.rating.erTechnique);
    expect(s.shortERtN).toBe(f.rating.erShort);
  });

  it('restores the grid afterwards (backup semantics)', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    s.getDifficulty();
    expect(s.getGrid().toString81()).toBe(f.puzzle);
  });

  it('honors shouldCancel', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    expect(() => s.getDifficulty({ shouldCancel: () => true })).toThrow(CancelledError);
  });
});

describe('Solver.checkValidity', () => {
  it('flags the double-value fixture', () => {
    const f = fx('invalid-double');
    const hint = solverFor(f.puzzle).checkValidity();
    expect(hint).not.toBeNull();
    expect(hint!.constructor.name).toBe(f.validity.kind);
    expect(hint!.toString()).toBe(f.validity.message);
  });
  it('returns null for a valid puzzle', () => {
    expect(solverFor(fx('easy-s1').puzzle).checkValidity()).toBeNull();
  });
});

describe('Solver.solve / toNamedList', () => {
  it('solves easy-s1 and counts rules sorted by difficulty then name', () => {
    const s = solverFor(fx('easy-s1').puzzle);
    const named = s.toNamedList(s.solve());
    const counts = [...named.values()];
    expect(counts.reduce((a, b) => a + b, 0)).toBe(fx('easy-s1').steps.length);
  });
});
```

- [ ] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/solver.test.ts`
Expected: FAIL (module not found).

- [ ] **Action 3: port Solver.ts, then Analyser and AnalysisInfo**

Per the port notes. While here, switch `test/differential/producers.ts` to delegate: `currentProducers()` now returns the producer list of a `new Solver(grid)` equivalent. Simplest faithful form: export a `buildProducerTiers(techniques)` helper FROM `Solver.ts` (the constructor uses it), and have both the Solver and the replay harness consume it so the registration order lives in exactly one place.

- [ ] **Action 4: run everything, expect pass**

Run: `pnpm test`
Expected: all suites pass, including the whole replay suite now backed by the real registration list.

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 5: commit**

```bash
git add src/engine/solver test/unit/solver.test.ts test/differential/producers.ts
```

```bash
git commit -m "feat: port Solver rating loop, Analyser and technique registration"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
