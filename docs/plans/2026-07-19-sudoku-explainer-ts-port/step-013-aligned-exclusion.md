# Step 13: Aligned Pair and Aligned Triplet Exclusion

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-009 (replay harness). Can run in parallel with steps 010, 011 and 012.

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/`): `AlignedPairExclusion.java`, `AlignedExclusion.java`, `AlignedExclusionHint.java`
- Create: same names with `.ts` under `src/engine/solver/rules/`
- Modify: `test/differential/producers.ts`

**Interfaces:**

- Consumes: step-009's conventions plus `CellSet` and `Permutations` (step-005), and `Potential` from step-007 (`AlignedExclusionHint` is a `HasParentPotentialHint`).
- Produces:

```ts
export class AlignedPairExclusion implements IndirectHintProducer { constructor(); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class AlignedExclusion implements IndirectHintProducer { constructor(degree: number); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class AlignedExclusionHint extends IndirectHint /* + Rule + HasParentPotentialHint */ { /* per Java */ }
```

**Port notes:**

- `AlignedPairExclusion` is the specialized degree-2 scanner, `AlignedExclusion(3)` the general one registered as Aligned Triplet Exclusion. Both emit `AlignedExclusionHint`.
- The combination enumeration order (cell pair/triplet selection and the candidate-combination vetting loop) decides which exclusion is found first, transcribe loops verbatim.
- `AlignedExclusionHint.getName()` depends on degree ("Aligned Pair Exclusion", "Aligned Triplet Exclusion"), and its `equals` matters for accumulator dedup in `getAllHints`, port both.

- [ ] **Action 1: splice producers into the registry (test first)**

In `test/differential/producers.ts` add `AlignedPairExclusion()` at indirect 20 and `AlignedExclusion(3)` at chaining1 position 3 (after `TUVWXYZWing` if step-011 already ran, otherwise leave the documented comment slots intact). Extend `PORTED_TECHNIQUE_NAMES` with the two names above after confirming them in `AlignedExclusionHint.java`.

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (modules not found).

- [ ] **Action 2: port the three classes**

Re-run the replay suite once they compile.

- [ ] **Action 3: run all tests, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 4: commit**

```bash
git add src/engine/solver/rules test/differential/producers.ts
```

```bash
git commit -m "feat: port aligned pair/triplet exclusion"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
