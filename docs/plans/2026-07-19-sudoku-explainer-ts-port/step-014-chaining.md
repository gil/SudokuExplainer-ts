# Step 14: Chaining Engine and Chain Hints

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** steps 010-013 (chaining hints reference solved sub-hints of every earlier producer type via nested levels, and the replay suite only reaches chaining steps once earlier techniques match)

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/chaining/`): `Chaining.java` (1512 lines), `ChainingHint.java`, `BinaryChainingHint.java`, `CellChainingHint.java`, `RegionChainingHint.java`, `CycleHint.java`, `ForcingChainHint.java`, `FullChain.java`
- Create: same names with `.ts` under `src/engine/solver/rules/chaining/`
- Modify: `test/differential/producers.ts`

**Interfaces:**

- Consumes: `Potential` (step-007), every producer ported so far (nested chaining levels build inner Chaining instances and reuse the basic producers), templates from `src/templates/rulesChaining.ts`, `FCPlus = 0` from `Options.ts`.
- Produces:

```ts
export class Chaining implements IndirectHintProducer {
  constructor(isMultipleEnabled: boolean, isDynamic: boolean, isNishio: boolean,
              level: number, noParallel: boolean, nestingLimit: number);
  getHints(grid: Grid, accu: HintsAccumulator): void;
  toString(): string;
  /* every public/package method of Chaining.java that hint classes call back into */
}
export abstract class ChainingHint extends IndirectHint /* + Rule + HasParentPotentialHint */ { /* per Java */ }
export class BinaryChainingHint extends ChainingHint { /* per Java */ }
export class CellChainingHint extends ChainingHint { /* per Java */ }
export class RegionChainingHint extends ChainingHint { /* per Java */ }
export class CycleHint extends ChainingHint { /* per Java */ }
export class ForcingChainHint extends ChainingHint { /* per Java */ }
export class FullChain { /* per Java, used for hint equality/dedup */ }
```

Constructor parameter names above are provisional. Read the actual parameter names in `Chaining.java` and keep those. The six argument tuples used at registration are frozen in the overview table.

**Port notes (this is the fidelity-critical step, budget most of the session for `Chaining.java`):**

- Thread/parallel machinery: `Chaining.java` may reference `Settings.getNumThreads()` or parallel helpers. The frozen baseline is single-threaded (`numThreads = 1`), keep only the sequential path.
- `FCPlus` is frozen 0, drop the `FCPlus > 0` branches.
- Collections: the chaining core uses `LinkedHashSet`/`LinkedHashMap` for on/off potential sets, keep them as `Set`/`Map`. Where it uses plain `HashSet`/`HashMap`, translate to `Set`/`Map` and mark the site `// Java: HashSet` (overview rule 2). If a differential mismatch later traces to such a site, replicate the Java behavior more closely (fidelity rule 6 of the spec).
- Hint sorting: `Chaining.getHints` collects hints and sorts them with an explicit comparator before feeding the accumulator. Port the comparator exactly (it decides which chain hint wins a step).
- `Potential.equals` and `FullChain` equality feed dedup, port them exactly.
- Nested levels: `Chaining` at level >= 2 builds inner solver machinery. Follow the Java code precisely, including which producers the nested solver instantiates. If the Java nested path constructs a `Solver`, port that part after checking step-015 status, or inline the producer list construction the same way Java does it (read the code first, then decide, and keep it traceable).
- `getRuleParents` implementations on the hint classes matter for nested chains, port them.

- [x] **Action 1: splice chaining producers into the registry (test first)**

In `test/differential/producers.ts` complete the chaining tiers by copying the exact constructor tuples and ordering from the overview's registration table (chaining1 through experimental, with `TUVWXYZWing()` and `AlignedExclusion(3)` staying at chaining1 positions 2 and 3). Extend `PORTED_TECHNIQUE_NAMES` with every chain hint name (read the `getName()` implementations, names vary by chain kind and nesting, and the corpus scan from `scripts/check-coverage.ts` lists the strings that actually occur).

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 2: port FullChain, ChainingHint and the five concrete hint classes**

These compile without the producer (they reference `Chaining` only by type where Java does, use `import type` to break cycles).

- [x] **Action 3: port Chaining.java**

Work top to bottom, method by method. After it compiles, run the replay suite WITHOUT the slow fixtures first:

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: PASS. Fixtures with chaining steps (diabolical corpus entries) now replay to completion. Expect several minutes of runtime.

- [x] **Action 4: run everything, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 5: commit**

```bash
git add src/engine/solver/rules/chaining test/differential/producers.ts
```

```bash
git commit -m "feat: port chaining engine and chain hint classes"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
