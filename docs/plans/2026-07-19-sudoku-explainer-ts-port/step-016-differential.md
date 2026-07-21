# Step 16: Full Differential Suite and Coverage Meta-Test

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-015 (real Solver)

**Files:**

- Create: `test/differential/full.test.ts`, `test/differential/coverage.test.ts`, `test/differential/slow/monsters.test.ts`
- Modify: `test/differential/replay.test.ts` (retire or repoint, see Action 1)

**Interfaces:**

- Consumes: `Solver` (step-015) and the fixture/replay types from `test/differential/replay.ts` (step-009).
- Produces: the acceptance-bar suite. From here on, any engine change must keep this suite green.

- [x] **Action 1: write the full differential test**

`test/differential/full.test.ts` replays every fixture through the REAL solver (not the harness producer list) and asserts complete paths and ratings:

```ts
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { Solver } from '../../src/engine/solver/Solver.js';
import { IndirectHint } from '../../src/engine/solver/IndirectHint.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import type { Rule } from '../../src/engine/solver/Rule.js';
import { loadFixtures, type PuzzleFixture, type FixtureStep } from './replay.js';

const SLOW_IDS = new Set(['hard-monster-1', 'hard-monster-2']);

function checkStep(hint: Hint, step: FixtureStep, ctx: string, grid: Grid): void {
  const rule = hint as unknown as Rule;
  expect(grid.toString81(), ctx).toBe(step.gridBefore);
  expect(rule.getName(), ctx).toBe(step.technique);
  expect(rule.getShortName(), ctx).toBe(step.shortName);
  expect(rule.getDifficulty(), ctx).toBe(step.rating);
  expect(hint.getCell()?.getIndex() ?? -1, ctx).toBe(step.cell);
  expect(hint.getValue(), ctx).toBe(step.value);
  const removals = hint instanceof IndirectHint
    ? [...hint.getRemovablePotentials().entries()]
        .map(([c, v]) => ({ cell: c.getIndex(), values: v.toArray() }))
        .sort((a, b) => a.cell - b.cell)
    : [];
  expect(removals, ctx).toEqual(step.removals);
  expect(hint.toString(), ctx).toBe(step.toString);
}

export function runFull(f: PuzzleFixture): void {
  const grid = new Grid();
  grid.fromString(f.puzzle);
  const solver = new Solver(grid);
  solver.rebuildPotentialValues();

  // step-by-step path via getSingleHint, mirroring getDifficulty's loop
  for (const [i, step] of f.steps.entries()) {
    const hint = solver.getSingleHint();
    expect(hint, `${f.id} step ${i}: hint expected`).not.toBeNull();
    checkStep(hint, step, `${f.id} step ${i} (${step.technique})`, grid);
    hint!.apply(grid);
  }
  if (f.rating.er !== 20) {
    // path complete unless Java itself gave up
    expect(grid.isSolved() || f.validity !== null, `${f.id} end state`).toBe(true);
  }

  // rating fields via a fresh solver (getDifficulty restores its grid itself)
  const grid2 = new Grid();
  grid2.fromString(f.puzzle);
  const solver2 = new Solver(grid2);
  solver2.rebuildPotentialValues();
  solver2.getDifficulty();
  const r = f.rating;
  expect(solver2.difficulty, f.id).toBe(r.er);
  expect(solver2.pearl, f.id).toBe(r.ep);
  expect(solver2.diamond, f.id).toBe(r.ed);
  expect(solver2.ERtN, f.id).toBe(r.erTechnique);
  expect(solver2.EPtN, f.id).toBe(r.epTechnique);
  expect(solver2.EDtN, f.id).toBe(r.edTechnique);
  expect(solver2.shortERtN, f.id).toBe(r.erShort);
  expect(solver2.shortEPtN, f.id).toBe(r.epShort);
  expect(solver2.shortEDtN, f.id).toBe(r.edShort);
}

describe('full differential', () => {
  for (const f of loadFixtures()) {
    if (SLOW_IDS.has(f.id)) continue;
    it(f.id, () => runFull(f));
  }
});
```

`test/differential/slow/monsters.test.ts` runs `runFull` for the ids in `SLOW_IDS`, importing `runFull` from `../full.test.js` (the code block already exports it). This directory only executes under `SLOW=1` (vitest config from step-001).

Retire `test/differential/replay.test.ts` by deleting it, the prefix harness is superseded (keep `replay.ts` for its fixture loader/types).

- [x] **Action 2: run the suite**

Run: `pnpm vitest run test/differential/full.test.ts`
Expected: PASS for the entire corpus. This is the spec's acceptance bar. Any mismatch is a port bug: locate the producer from the failing step's technique name and re-diff that class against its Java source. Do not weaken assertions to get to green.

- [x] **Action 3: write the coverage meta-test**

`test/differential/coverage.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SolvingTechnique } from '../../src/engine/SolvingTechnique.js';
import { loadFixtures } from './replay.js';

// Maps each SolvingTechnique to a predicate over fixture step technique names.
// Complete this from the real hint getName() strings (they differ from enum labels
// for chaining, strong links and direct variants).
const NAME_MATCHERS: Partial<Record<SolvingTechnique, (n: string) => boolean>> = {
  [SolvingTechnique.HiddenSingle]: (n) => n === 'Hidden Single',
  [SolvingTechnique.NakedSingle]: (n) => n === 'Naked Single',
  // ... one entry per in-scope technique ...
};

const allowlist = readFileSync('test/fixtures/corpus.txt', 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('# uncovered:'))
  .flatMap((l) => l.replace('# uncovered:', '').split(',').map((s) => s.trim()));

describe('every in-scope technique appears in the corpus', () => {
  const seen = new Set<string>();
  for (const f of loadFixtures()) for (const s of f.steps) seen.add(s.technique);
  for (const t of Object.values(SolvingTechnique)) {
    if (t === SolvingTechnique.FiveStrongLinks || t === SolvingTechnique.SixStrongLinks) continue; // disabled by default
    if (allowlist.includes(t)) continue;
    it(t, () => {
      const matcher = NAME_MATCHERS[t as SolvingTechnique];
      expect(matcher, `add a NAME_MATCHER entry for ${t}`).toBeDefined();
      expect([...seen].some(matcher!), `no corpus step exercises ${t}`).toBe(true);
    });
  }
});
```

Fill `NAME_MATCHERS` completely (one entry per in-scope technique) using the strings from `PORTED_TECHNIQUE_NAMES` in `test/differential/producers.ts`. If a technique fails coverage, first try mining more corpus puzzles (step-002 Action 7 workflow, then re-run fixtures + this suite). Only after that add it to the `# uncovered:` allowlist in `corpus.txt` with a reason next to it.

- [x] **Action 4: run everything including slow**

Run: `pnpm test`
Expected: all suites pass.

Run: `SLOW=1 pnpm vitest run test/differential/slow`
Expected: PASS if the monster fixtures exist (this can run for a long time). If a monster was dropped in step-002, this suite is empty and passes trivially.

- [x] **Action 5: commit**

```bash
git add test/differential
```

```bash
git commit -m "test: full differential suite, technique coverage meta-test, slow monsters"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
