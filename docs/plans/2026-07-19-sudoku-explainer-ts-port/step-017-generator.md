# Step 17: Generator, Symmetry and Seeded Determinism

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-015 (`Solver.analyseDifficulty`), step-008 (`BruteForceAnalysis.solveRandom`)

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/generator/`): `Point.java`, `Symmetry.java`, `Generator.java`
- Create: `src/engine/generator/Point.ts`, `src/engine/generator/Symmetry.ts`, `src/engine/generator/Generator.ts`
- Test: `test/unit/generator.test.ts`

**Interfaces:**

- Consumes: `JavaRandom` (step-003), `BruteForceAnalysis` (step-008) and `Solver.analyseDifficulty` (step-015).
- Produces:

```ts
// Point.ts
export class Point { constructor(readonly x: number, readonly y: number); }

// Symmetry.ts: all 11 Java enum members (Vertical, Horizontal, Diagonal, AntiDiagonal,
// BiDiagonal, Orthogonal, Rotational180, Rotational90, None, Full, Full32),
// each with getPoints(x, y): Point[] transcribed from Symmetry.java.
export class Symmetry {
  static readonly Vertical: Symmetry; /* ... all 11 ... */
  static values(): Symmetry[];               // Java declaration order
  readonly name: string;
  getPoints(x: number, y: number): Point[];
  toString(): string;                        // Java overrides, e.g. "Bi-diagonal"
}
export const DEFAULT_SYMMETRIES: Symmetry[]; // [BiDiagonal, Orthogonal, Rotational180, Rotational90, Full]
// This is the GenerateDialog default selection in EnumSet (declaration) order.

// Generator.ts
export interface GeneratorCallbacks {
  shouldCancel?: () => boolean;              // maps to Java isInterrupted
  onAttempt?: (attempt: number) => void;
}
export class Generator {
  // Port of Generator.generate(List<Symmetry>, min, max, ...) with two sanctioned changes:
  // the Random is injected (rnd) instead of created inside, and the include/exclude/notMax
  // parameters are fixed to the no-op defaults (0 and "") since the public API never sets them.
  generate(symmetries: Symmetry[], minDifficulty: number, maxDifficulty: number,
           rnd: JavaRandom, callbacks?: GeneratorCallbacks): Grid | null;
  // Exact port of Generator.generate(Random, Symmetry) (the inner single-grid builder).
  generateOne(rnd: JavaRandom, symmetry: Symmetry): Grid;
}
```

**Port notes:**

- `generateOne` must be byte-accurate against `Generator.java` lines 67-151. That covers `solveRandom` plus the 81-swap shuffle, followed by the clue-removal loop (`attempts < 6` with `getCountSolutions` and restore-on-non-unique) and a final `fixGivens()`. The variant block inside (`isAntiFerz || ...`) never runs under the frozen baseline, drop it.
- Outer loop order: pick `symmetryIndex = rnd.nextInt(symmetries.length)` ONCE before the loop. Each iteration then takes the current symmetry and advances the index modulo the list length, builds a grid, copies it, rates the copy with `analyseDifficulty(min, max, no-op defaults)` and accepts when `min <= d <= max`. This matches the driver's `generate` mode (step-002) exactly, which is the reference for the determinism test.
- `shouldCancel` is checked where Java checks `isInterrupted` (after generating and after rating), returning `null`.
- The `Solver` used for rating inside the loop is built with default techniques, mirroring the driver.

- [x] **Action 1: write the failing determinism test**

`test/unit/generator.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JavaRandom } from '../../src/engine/util/JavaRandom.js';
import { Generator } from '../../src/engine/generator/Generator.js';
import { DEFAULT_SYMMETRIES, Symmetry } from '../../src/engine/generator/Symmetry.js';

interface GenFixture { seed: number; minEr: number; maxEr: number; symmetries: string[]; puzzle: string; er: number; }

const fixtures: GenFixture[] = readdirSync('test/fixtures/generator')
  .map((f) => JSON.parse(readFileSync(`test/fixtures/generator/${f}`, 'utf8')));

describe('Symmetry', () => {
  it('default selection matches the Java GenerateDialog set in declaration order', () => {
    expect(DEFAULT_SYMMETRIES.map((s) => s.name))
      .toEqual(['BiDiagonal', 'Orthogonal', 'Rotational180', 'Rotational90', 'Full']);
  });
  it('Rotational180 mirrors through the center', () => {
    const pts = Symmetry.Rotational180.getPoints(1, 2).map((p) => [p.x, p.y]);
    expect(pts).toEqual([[1, 2], [7, 6]]);
  });
});

describe('Generator determinism vs Java', () => {
  for (const f of fixtures) {
    it(`seed ${f.seed} in [${f.minEr}, ${f.maxEr}]`, () => {
      const grid = new Generator().generate(
        DEFAULT_SYMMETRIES, f.minEr, f.maxEr, new JavaRandom(BigInt(f.seed)),
      );
      expect(grid).not.toBeNull();
      expect(grid!.toString81()).toBe(f.puzzle);
    });
  }

  it('returns null when cancelled', () => {
    const grid = new Generator().generate(
      DEFAULT_SYMMETRIES, 1.0, 1.2, new JavaRandom(1n), { shouldCancel: () => true },
    );
    expect(grid).toBeNull();
  });
});
```

- [x] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/generator.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 3: port the three files**

Per the port notes. A determinism mismatch means a `rnd.nextInt` call site differs in count or order from Java. Diff `generateOne` against `Generator.java` call-by-call, then check `solveRandom` in `BruteForceAnalysis` the same way.

- [x] **Action 4: run everything, expect pass**

Run: `pnpm test`
Expected: all suites pass. The `hard-s1` determinism case takes the longest (it rates every attempt), still well under the 120 s timeout.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 5: commit**

```bash
git add src/engine/generator test/unit/generator.test.ts
```

```bash
git commit -m "feat: port Generator and Symmetry with seeded determinism"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
