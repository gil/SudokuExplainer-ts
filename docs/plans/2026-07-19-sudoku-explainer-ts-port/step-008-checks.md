# Step 8: Validity Checks and Brute Force

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-007 (hint base classes), step-003 (`JavaRandom`), step-006 (checks templates)

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/checks/`): `BruteForceAnalysis.java`, `NoDoubles.java`, `NumberOfFilledCells.java`, `NumberOfValues.java`, `Solution.java`, `SolutionHint.java`, `DoubleSolutionWarning.java`, `WarningMessage.java`
- Create (under `src/engine/solver/checks/`): `BruteForceAnalysis.ts`, `NoDoubles.ts`, `NumberOfFilledCells.ts`, `NumberOfValues.ts`, `Solution.ts`, `SolutionHint.ts`, `DoubleSolutionWarning.ts`, `WarningMessage.ts`
- Test: `test/unit/checks.test.ts`

`Analyser.java` and `AnalysisInfo.java` are NOT in this step, they need the full Solver and arrive in step-015.

**Interfaces:**

- Consumes: hint base classes and producer interfaces (step-007), `Grid` + `potentials` (step-004), `JavaRandom` (step-003), `checks` templates (step-006).
- Produces:

```ts
// BruteForceAnalysis.ts
export class BruteForceAnalysis implements WarningHintProducer {
  constructor(includeSolution: boolean);
  getHints(grid: Grid, accu: HintsAccumulator): void;   // throws InterruptedError via accu
  getCountSolutions(grid: Grid): number;                // 0, 1 or 2 semantics per Java
  solveRandom(grid: Grid, rnd: JavaRandom): boolean;    // fills grid with a random solution
  isValidity(): boolean;
  toString(): string;
}
// NoDoubles.ts, NumberOfFilledCells.ts, NumberOfValues.ts: WarningHintProducer ports.
// Solution.ts: producer that emits SolutionHint (used by API solve()).
// SolutionHint.ts, DoubleSolutionWarning.ts, WarningMessage.ts: WarningHint subclasses,
// each wired to its template constant from src/templates/checks.ts via format().
```

Port notes:

- `BruteForceAnalysis` contains the recursive solver used by validity checks, the generator and `Solution`. The Java file is 273 lines, port it whole (minus any variant-flag branches). Its cell/value scan order and the `rnd.nextInt` call sites define generator determinism, keep them byte-accurate.
- The `WarningHint` subclasses' `toHtml` methods load HTML via `HtmlLoader.loadHtml(this, "X.html")`. Replace each with the imported template constant of the same name and the ported `format()`.
- `toString()` of each warning hint feeds the fixtures' `validity.message`, port exactly.

- [x] **Action 1: write the failing checks test**

`test/unit/checks.test.ts` (fixture-driven, no handcrafted expectations):

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';
import { BruteForceAnalysis } from '../../src/engine/solver/checks/BruteForceAnalysis.js';

interface Fixture {
  id: string; puzzle: string;
  validity: { kind: string; message: string } | null;
  solution: string | null;
}

const fixtures: Fixture[] = readdirSync('test/fixtures/puzzles')
  .map((f) => JSON.parse(readFileSync(`test/fixtures/puzzles/${f}`, 'utf8')));

const load = (puzzle: string) => {
  const g = new Grid();
  g.fromString(puzzle);
  rebuildPotentialValues(g);
  return g;
};

describe('BruteForceAnalysis.getCountSolutions', () => {
  for (const f of fixtures) {
    it(`${f.id}: solution count matches validity`, () => {
      const count = new BruteForceAnalysis(false).getCountSolutions(load(f.puzzle));
      if (f.validity === null) expect(count).toBe(1);
      else if (f.validity.kind.includes('DoubleSolution')) expect(count).toBeGreaterThan(1);
    });
  }
});

describe('brute-force solution', () => {
  for (const f of fixtures.filter((f) => f.solution !== null)) {
    it(`${f.id}: solves to the Java solution`, () => {
      const g = load(f.puzzle);
      // use the same public path the API will use; adapt to the ported names:
      // Solution producer -> SolutionHint -> apply
      // (write a small helper here once the port shows the exact call sequence)
      // assert g.toString81() === f.solution after applying
    });
  }
});
```

Complete the second describe block once the `Solution`/`SolutionHint` port shows the exact call sequence (fill in real, running code before this step ends). Also add three direct assertions using corpus entries by id: `invalid-double` must yield a `NoDoubles`-class warning from the ported `NoDoubles` producer, `invalid-fewclues` a `NumberOfFilledCells`/`NumberOfValues` warning matching its fixture `validity.kind`, and `invalid-nosol` whatever its fixture recorded. Compare `hint.constructor.name` against `validity.kind` and `hint.toString()` against `validity.message`.

- [x] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/checks.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 3: port the eight classes**

Mechanical translation per the notes. `getCountSolutions` timing matters later (it runs in the generator loop), do not add allocations inside the recursion that Java does not have.

- [x] **Action 4: run the tests, expect pass**

Run: `pnpm vitest run test/unit/checks.test.ts`
Expected: PASS, including every corpus fixture's solution-count check.

Run: `pnpm test`
Expected: all suites pass.

- [x] **Action 5: commit**

```bash
git add src/engine/solver/checks test/unit/checks.test.ts
```

```bash
git commit -m "feat: port brute-force analysis and validity checks"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
