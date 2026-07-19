# Step 10: `Fisherman` and `StrongLinks`

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-009 (replay harness and rule-porting conventions)

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/`): `Fisherman.java`, `StrongLinks.java` (920 lines), `StrongLinksHint.java`
- Create: `src/engine/solver/rules/Fisherman.ts`, `StrongLinks.ts`, `StrongLinksHint.ts`
- Modify: `test/differential/producers.ts` (splice into registration order, extend `PORTED_TECHNIQUE_NAMES`)

`TurbotFish.java` and `TurbotFishHint.java` are NOT ported. The frozen baseline registers `StrongLinks(2)` for the TurbotFish technique slot (see the overview table), and `StrongLinks.java` does not reference the TurbotFish classes.

**Interfaces:**

- Consumes: everything step-009 consumed, plus `Twomutations` (step-005) which `StrongLinks` uses.
- Produces:

```ts
export class Fisherman implements IndirectHintProducer { constructor(degree: number); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class StrongLinks implements IndirectHintProducer { constructor(degree: number); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class StrongLinksHint extends IndirectHint /* + Rule */ { /* per StrongLinksHint.java */ }
```

`Fisherman` produces its hint through an existing hint class. Open `Fisherman.java`, find which hint class it constructs (it reuses `LockingHint` in this codebase family), and wire the port to the already-ported class rather than inventing one.

**Port notes:**

- `StrongLinks.java` is the largest producer outside chaining. It scans grouped and ungrouped strong links with `Twomutations`, and its hint names vary with the link structure (Turbot Fish, Skyscraper, Two-string Kite, grouped variants, n-link fish names). Every `getName()`/`getShortName()` branch in `StrongLinksHint.java` matters for fixtures, transcribe the string-building logic exactly.
- Ratings in `StrongLinksHint.getDifficulty()` depend on degree and structure, transcribe exactly.
- Variant gating: any `Settings` checks inside these files resolve under the frozen baseline, keep only the surviving branches.
- `StrongLinksHint.toHtml` chooses between several templates (`StrongLinksHint`, `GroupedStrongLinksHint`, `GroupedStrongLinksLoopHint` and fish variants), all converted in step-006 under `src/templates/rules.ts`.

- [ ] **Action 1: splice producers into the registry (test first)**

Update `test/differential/producers.ts`: add `Fisherman(2)` at indirect 3, `Fisherman(3)` at indirect 6, `StrongLinks(2)` at indirect 8, `Fisherman(4)` at indirect 13, `StrongLinks(3)` at indirect 15 and `StrongLinks(4)` at indirect 18 (positions are commented in the file). Add every new `getName()` string to `PORTED_TECHNIQUE_NAMES` after reading `StrongLinksHint.java` (X-Wing, Swordfish and Jellyfish names come from the `Fisherman` path, strong-link names from `StrongLinksHint`).

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (modules not found).

- [ ] **Action 2: port `Fisherman`**

Translate `Fisherman.java`. Re-run the replay test, fixtures whose paths now reach X-Wing/Swordfish/Jellyfish steps must match.

- [ ] **Action 3: port StrongLinks and StrongLinksHint**

Translate both files. This is slow, methodical work, keep the Java file open side-by-side and preserve loop order and `Twomutations` usage exactly.

- [ ] **Action 4: run all tests, expect pass**

Run: `pnpm test`
Expected: all suites pass, replay prefixes now extend through strong-link steps.

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 5: commit**

```bash
git add src/engine/solver/rules test/differential/producers.ts
```

```bash
git commit -m "feat: port Fisherman and StrongLinks producers"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
