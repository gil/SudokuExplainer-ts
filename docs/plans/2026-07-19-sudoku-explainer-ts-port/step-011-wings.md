# Step 11: Wing Producers (XY through TUVWXYZ)

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-009 (replay harness). Can run in parallel with steps 010, 012 and 013.

**Files:**

- Port from (`SukakuExplainer/diuf/sudoku/solver/rules/`): `XYWing.java`, `XYWingHint.java`, `WXYZWing.java`, `WXYZWingHint.java`, `VWXYZWing.java`, `VWXYZWingHint.java`, `UVWXYZWing.java`, `UVWXYZWingHint.java`, `TUVWXYZWing.java`, `TUVWXYZWingHint.java`
- Create: same names with `.ts` under `src/engine/solver/rules/`
- Modify: `test/differential/producers.ts`

**Interfaces:**

- Consumes: step-009's conventions plus `forwardVisibleCellIndex`/`forwardVisibleCellsSet` from `Grid` (the big wings scan forward-visible cells to avoid duplicates).
- Produces:

```ts
export class XYWing implements IndirectHintProducer { constructor(isXYZ: boolean); getHints(grid: Grid, accu: HintsAccumulator): void; toString(): string; }
export class WXYZWing implements IndirectHintProducer { constructor(); /* per Java */ }
export class VWXYZWing implements IndirectHintProducer { constructor(); /* per Java */ }
export class UVWXYZWing implements IndirectHintProducer { constructor(); /* per Java */ }
export class TUVWXYZWing implements IndirectHintProducer { constructor(); /* per Java */ }
// plus the matching *WingHint classes, each implements Rule
```

**Port notes:**

- `XYWing(false)` is XY-Wing and `XYWing(true)` is XYZ-Wing, a single class with a flag exactly like Java.
- The big wings (`WXYZWing` and up) each have hundreds of lines of candidate-combination scanning. Their hint classes have degree-dependent names/short names/ratings (`WXYZWingHint` distinguishes the 2-cell variants via the `...Wing2Hint` templates). Transcribe all rating constants and name logic exactly.
- `TUVWXYZWing` registers in the chaining1 tier (position 2, after the first `Chaining`), but the class itself is a plain producer with no chaining dependency. Splice it at its commented position. Running it before step-014 exists is still sound: the replay stops at the first fixture step whose technique is unported, so a missing `Chaining` ahead of it can never skew a compared step.
- `HasParentPotentialHint` (step-007) may be implemented by some wing hints, follow the Java `implements` list per class.

- [x] **Action 1: splice producers into the registry (test first)**

In `test/differential/producers.ts` add at the commented positions: `XYWing(false)` at indirect 9, `XYWing(true)` at indirect 10, `WXYZWing()` at indirect 16, `VWXYZWing()` at indirect 19, `UVWXYZWing()` at indirect 22 and `TUVWXYZWing()` at chaining1 position 2. Extend `PORTED_TECHNIQUE_NAMES` with every `getName()` string of the five hint classes (read each Java hint class, the names include "XY-Wing", "XYZ-Wing" and the longer wing names with structure-dependent suffixes).

Run: `pnpm vitest run test/differential/replay.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 2: port XYWing, then the big wings in ascending size**

After each producer + hint pair compiles, re-run the replay suite. Fixtures at fiendish level and above start matching further into their paths with each wing added.

- [x] **Action 3: run all tests, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 4: commit**

```bash
git add src/engine/solver/rules test/differential/producers.ts
```

```bash
git commit -m "feat: port wing producers (XY/XYZ/WXYZ/VWXYZ/UVWXYZ/TUVWXYZ)"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [x] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
