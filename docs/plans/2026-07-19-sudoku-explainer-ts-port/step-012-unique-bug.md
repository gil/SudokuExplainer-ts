# Step 12: Unique Loops and Bivalue Universal Grave

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-009 (replay harness). Can run in parallel with steps 010, 011 and 013.

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/unique/`): `UniqueLoops.java` (794 lines), `UniqueLoopHint.java`, `UniqueLoopType1Hint.java`, `UniqueLoopType2Hint.java`, `UniqueLoopType3HiddenHint.java`, `UniqueLoopType3NakedHint.java`, `UniqueLoopType4Hint.java`, `BivalueUniversalGrave.java` (619 lines), `BugHint.java`, `Bug1Hint.java`, `Bug2Hint.java`, `Bug3Hint.java`, `Bug4Hint.java`
- Create: same names with `.ts` under `src/engine/solver/rules/unique/`
- Modify: `test/differential/producers.ts`

**Interfaces:**

- Consumes: step-009's conventions plus `CommonTuples` and `Permutations` (step-005), templates from `src/templates/rulesUnique.ts` (step-006), and the frozen constants `islkSudokuURUL` / `islkSudokuBUG` from `src/engine/Options.ts` (both true).
- Produces:

```ts
export class UniqueLoops implements IndirectHintProducer { constructor(); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class BivalueUniversalGrave implements IndirectHintProducer { constructor(); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
// plus the abstract UniqueLoopHint / BugHint bases and the concrete hint classes, each implements Rule
```

**Port notes:**

- Both producers read the lkSudoku fix flags. `islkSudokuURUL` and `islkSudokuBUG` are frozen true, so keep the fixed branches and drop the legacy ones. Where a method interleaves both paths line-by-line, keep the structure and inline the flag as `true` so the surviving code is still traceable to the Java lines.
- `UniqueLoops` recursion order and the loop-type classification drive which hint appears first, preserve every ordering detail, including any use of insertion-ordered collections (`LinkedHashSet` -> `Set`).
- `BivalueUniversalGrave` uses region potential positions heavily and produces four hint types plus possible chaining-style parents in Bug hints. Follow the Java `implements` lists per hint class.
- Names/short names/ratings per hint type ("Unique Rectangle type 1", "Unique Loop type 2", BUG type ratings) come from the hint classes, transcribe exactly.

- [x] **Action 1: splice producers into the registry (test first)**

In `test/differential/producers.ts` add `UniqueLoops()` at indirect 11 and `BivalueUniversalGrave()` at indirect 17. Extend `PORTED_TECHNIQUE_NAMES` with every `getName()` string from the seven concrete hint classes (read them, the set includes rectangle and loop names per type plus the BUG names).

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 2: port UniqueLoops and its five hint classes**

Re-run the replay suite after the port compiles.

- [x] **Action 3: port BivalueUniversalGrave and its five hint classes**

Re-run the replay suite.

- [x] **Action 4: run all tests, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 5: commit**

```bash
git add src/engine/solver/rules/unique test/differential/producers.ts
```

```bash
git commit -m "feat: port UniqueLoops and BivalueUniversalGrave"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
