# Step 9: Singles, Locking, Hidden Sets, Naked Sets, plus the Replay Harness

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-008 (everything below the producers is in place)

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/`): `HiddenSingle.java`, `HiddenSingleHint.java`, `NakedSingle.java`, `NakedSingleHint.java`, `Locking.java`, `LockingHint.java`, `DirectLockingHint.java`, `HiddenSet.java`, `HiddenSetHint.java`, `DirectHiddenSetHint.java`, `NakedSet.java`, `NakedSetHint.java`
- Create: same names under `src/engine/solver/rules/` with `.ts`
- Create: `test/differential/replay.ts`, `test/differential/producers.ts`, `test/differential/replay.test.ts`

**Interfaces:**

- Consumes: hint base classes from step-007 and the Grid/regions/potentials layer from step-004, plus tools (step-005) and the templates in `src/templates/rules.ts` (step-006).
- Produces: the twelve producer/hint classes, each with the constructor signature from the overview's registration table (`Locking(isDirect: boolean)`, `HiddenSet(degree: number, isDirect: boolean)`, `NakedSet(degree: number)`, `HiddenSingle()`, `NakedSingle()`), plus the replay harness contract from the overview:

```ts
// test/differential/producers.ts
export function currentProducers(): HintProducer[];
export const PORTED_TECHNIQUE_NAMES: Set<string>;
// test/differential/replay.ts
export interface FixtureStep { gridBefore: string; technique: string; shortName: string; rating: number; cell: number; value: number; removals: { cell: number; values: number[] }[]; toString: string; }
export interface FixtureRating { er: number; ep: number; ed: number; erTechnique: string; epTechnique: string; edTechnique: string; erShort: string; epShort: string; edShort: string; }
export interface PuzzleFixture { id: string; puzzle: string; validity: { kind: string; message: string } | null; solution: string | null; rating: FixtureRating; steps: FixtureStep[]; }
export function loadFixtures(): PuzzleFixture[];
export function replayFixture(f: PuzzleFixture): void;
```

**Producer port notes:**

- Variant branches: `Locking.java` and friends test `Settings.getInstance().isBlocks()` and NC flags in places. `isBlocks` is frozen true, NC frozen off, drop the dead branches.
- Direct variants: `Locking(true)`, `HiddenSet(n, true)` produce the `Direct*Hint` classes with different names and ratings. The hint classes' `getName()` values are state-dependent (degree, region type). While porting each hint class, collect every string its `getName()` can return, you need the list for `PORTED_TECHNIQUE_NAMES`.
- `getDifficulty()` in each hint class returns the rating constants that drive ER, transcribe the numbers exactly.
- `toHtml` methods use template constants + `format` + `ValuesFormatter` helpers, port them now (they are cheap) so `explain()` works later without revisiting every class.
- `equals`/`hashCode` pairs on hints: port `equals` only (overview rule 3).

- [ ] **Action 1: write the replay harness**

`test/differential/replay.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { expect } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';
import { SingleHintAccumulator } from '../../src/engine/solver/SingleHintAccumulator.js';
import { InterruptedError } from '../../src/engine/util/InterruptedError.js';
import { IndirectHint } from '../../src/engine/solver/IndirectHint.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import type { Rule } from '../../src/engine/solver/Rule.js';
import { currentProducers, PORTED_TECHNIQUE_NAMES } from './producers.js';

export interface FixtureStep {
  gridBefore: string; technique: string; shortName: string; rating: number;
  cell: number; value: number;
  removals: { cell: number; values: number[] }[];
  toString: string;
}
export interface FixtureRating {
  er: number; ep: number; ed: number;
  erTechnique: string; epTechnique: string; edTechnique: string;
  erShort: string; epShort: string; edShort: string;
}
export interface PuzzleFixture {
  id: string; puzzle: string;
  validity: { kind: string; message: string } | null;
  solution: string | null;
  rating: FixtureRating;
  steps: FixtureStep[];
}

export function loadFixtures(): PuzzleFixture[] {
  return readdirSync('test/fixtures/puzzles')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`test/fixtures/puzzles/${f}`, 'utf8')));
}

function findHint(grid: Grid): Hint | null {
  const accu = new SingleHintAccumulator();
  try {
    for (const p of currentProducers()) p.getHints(grid, accu);
  } catch (e) {
    if (!(e instanceof InterruptedError)) throw e;
  }
  return accu.getHint();
}

function removalsOf(hint: Hint): { cell: number; values: number[] }[] {
  if (!(hint instanceof IndirectHint)) return [];
  const entries = [...hint.getRemovablePotentials().entries()]
    .map(([cell, values]) => ({ cell: cell.getIndex(), values: values.toArray() }))
    .sort((a, b) => a.cell - b.cell);
  return entries;
}

export function replayFixture(f: PuzzleFixture): void {
  const grid = new Grid();
  grid.fromString(f.puzzle);
  rebuildPotentialValues(grid);
  for (const [i, step] of f.steps.entries()) {
    if (!PORTED_TECHNIQUE_NAMES.has(step.technique)) return; // verified prefix ends here
    const hint = findHint(grid);
    const ctx = `${f.id} step ${i} (${step.technique})`;
    expect(hint, ctx).not.toBeNull();
    const rule = hint as unknown as Rule;
    expect(rule.getName(), ctx).toBe(step.technique);
    expect(rule.getShortName(), ctx).toBe(step.shortName);
    expect(rule.getDifficulty(), ctx).toBe(step.rating);
    expect(hint!.getCell()?.getIndex() ?? -1, ctx).toBe(step.cell);
    expect(hint!.getValue(), ctx).toBe(step.value);
    expect(removalsOf(hint!), ctx).toEqual(step.removals);
    expect(hint!.toString(), ctx).toBe(step.toString);
    expect(grid.toString81(), ctx).toBe(step.gridBefore);
    hint!.apply(grid);
  }
}
```

`test/differential/producers.ts` (this step's version):

```ts
import type { HintProducer } from '../../src/engine/solver/HintProducer.js';
import { HiddenSingle } from '../../src/engine/solver/rules/HiddenSingle.js';
import { NakedSingle } from '../../src/engine/solver/rules/NakedSingle.js';
import { Locking } from '../../src/engine/solver/rules/Locking.js';
import { HiddenSet } from '../../src/engine/solver/rules/HiddenSet.js';
import { NakedSet } from '../../src/engine/solver/rules/NakedSet.js';

// Registration order from step-000-overview.md. Entries for producers that are
// not ported yet are simply absent; steps 010-014 splice theirs in AT THE
// DOCUMENTED POSITION (keep the numbered comments).
export function currentProducers(): HintProducer[] {
  return [
    // direct tier
    new HiddenSingle(),          // direct 1
    new Locking(true),           // direct 2
    new HiddenSet(2, true),      // direct 3
    new NakedSingle(),           // direct 4
    new HiddenSet(3, true),      // direct 5
    // indirect tier
    new Locking(false),          // indirect 1
    new NakedSet(2),             // indirect 2
    // indirect 3: Fisherman(2)        (step-010)
    new HiddenSet(2, false),     // indirect 4
    new NakedSet(3),             // indirect 5
    // indirect 6: Fisherman(3)        (step-010)
    new HiddenSet(3, false),     // indirect 7
    // indirect 8: StrongLinks(2)      (step-010)
    // indirect 9-10: XYWing           (step-011)
    // indirect 11: UniqueLoops        (step-012)
    new NakedSet(4),             // indirect 12
    // indirect 13: Fisherman(4)       (step-010)
    new HiddenSet(4, false),     // indirect 14
    // indirect 15: StrongLinks(3)     (step-010)
    // indirect 16: WXYZWing           (step-011)
    // indirect 17: BivalueUniversalGrave (step-012)
    // indirect 18: StrongLinks(4)     (step-010)
    // indirect 19: VWXYZWing          (step-011)
    // indirect 20: AlignedPairExclusion (step-013)
    // indirect 21: StrongLinks(5) is DISABLED by default, never add it here
    // indirect 22: UVWXYZWing         (step-011)
    // indirect 23: StrongLinks(6) is DISABLED by default, never add it here
    // chaining tiers                  (step-014, except TUVWXYZWing in step-011
    //   and AlignedExclusion(3) in step-013; keep chaining1 order: Chaining,
    //   TUVWXYZWing, AlignedExclusion, Chaining x3, then chaining2/advanced/experimental)
  ];
}

// Every Rule.getName() string the ported hint classes can produce.
// Extend in later steps alongside currentProducers().
export const PORTED_TECHNIQUE_NAMES = new Set<string>([
  // fill from the ported hint classes' getName() implementations, e.g.:
  // 'Hidden Single', 'Naked Single', 'Direct Pointing', 'Direct Claiming',
  // 'Pointing', 'Claiming', 'Naked Pair', 'Naked Triplet', 'Naked Quad',
  // 'Hidden Pair', 'Hidden Triplet', 'Hidden Quad',
  // 'Direct Hidden Pair', 'Direct Hidden Triplet',
]);
```

Fill `PORTED_TECHNIQUE_NAMES` with the real strings you observed while porting `getName()` in Action 3 (the commented list above is a starting guess, trust the Java code and the fixtures over it). Cross-check with `pnpm exec tsx scripts/check-coverage.ts` output, which prints every technique string occurring in the corpus.

`test/differential/replay.test.ts`:

```ts
import { describe, it } from 'vitest';
import { loadFixtures, replayFixture } from './replay.js';

describe('differential prefix replay', () => {
  for (const f of loadFixtures()) {
    if (f.validity !== null) continue; // warning fixtures are covered in step-008/015 tests
    it(f.id, () => replayFixture(f));
  }
});
```

- [ ] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (producer modules not found).

- [ ] **Action 3: port the twelve rule classes**

Translate per the port notes. Suggested order inside the action: start with `HiddenSingle` and `NakedSingle` plus their hints, then run the replay test (many `easy` fixtures will fully pass already). Continue with `Locking` and both of its hint classes, and finish with `HiddenSet`/`NakedSet` plus their three hint classes, re-running the replay test after each pair. A mismatch report from `replayFixture` names the fixture, step index and field, diff against the Java source of the producer that emitted that step.

- [ ] **Action 4: run all tests, expect pass**

Run: `pnpm test`
Expected: all suites pass. The replay suite must show zero mismatches (prefix-only verification is expected on harder fixtures).

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 5: commit**

```bash
git add src/engine/solver/rules test/differential
```

```bash
git commit -m "feat: port singles, locking and set producers with differential replay harness"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
