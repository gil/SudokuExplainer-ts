# Step 7: Hint Framework (Hint hierarchy, producers, accumulators, Potential)

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-004 (Grid model), step-006 (templates, only for type imports in `Rule`)

**Files:**

- Port from: `SukakuExplainer/diuf/sudoku/solver/Hint.java`, `Rule.java`, `DirectHint.java`, `IndirectHint.java`, `WarningHint.java`, `HintProducer.java`, `DirectHintProducer.java`, `IndirectHintProducer.java`, `WarningHintProducer.java`, `HintsAccumulator.java`, `SingleHintAccumulator.java`, plus `solver/rules/HasParentPotentialHint.java` and `solver/rules/chaining/Potential.java`
- Create (under `src/engine/solver/`): `Hint.ts`, `Rule.ts`, `DirectHint.ts`, `IndirectHint.ts`, `WarningHint.ts`, `HintProducer.ts`, `SingleHintAccumulator.ts`, and under `src/engine/solver/rules/`: `HasParentPotentialHint.ts`, plus `src/engine/solver/rules/chaining/Potential.ts`
- Test: `test/unit/hintFramework.test.ts`

**Interfaces:**

- Consumes: `Grid`, `Cell`, `Link`, `BitSet32`, `InterruptedError`.
- Produces (exact TS surface, every hint class in steps 008-014 extends these):

```ts
// Hint.ts
export abstract class Hint {
  abstract getRule(): HintProducer;
  getCell(): Cell | null;            // base returns null
  getValue(): number;                // base returns 0
  abstract apply(targetGrid: Grid): void;
  abstract getRegions(): Region[] | null;
  abstract toString(): string;
  abstract toHtml(grid: Grid): string;  // returns markdown in the port, name kept for fidelity
}

// Rule.ts (interface)
export interface Rule {
  getName(): string;
  getShortName(): string;
  getDifficulty(): number;
  getClueHtml(grid: Grid, isBig: boolean): string;
}
export function isRule(h: unknown): h is Rule;

// DirectHint.ts: port fields (region, cell, value) and apply()/getters/equals per Java.
export abstract class DirectHint extends Hint { /* per DirectHint.java */ }

// IndirectHint.ts: port removablePotentials handling, isWorth(), apply(),
// getRemovablePotentials(): Map<Cell, BitSet32> (keep Java's map, insertion order),
// abstract getViewCount/getSelectedCells/getGreenPotentials/getRedPotentials/getLinks,
// getBluePotentials default.
export abstract class IndirectHint extends Hint { /* per IndirectHint.java */ }

// WarningHint.ts per WarningHint.java (subclass of IndirectHint in Java; check and mirror).
export abstract class WarningHint extends /* per Java */ { /* ... */ }

// HintProducer.ts (all producer interfaces in one file)
export interface HintProducer { getHints(grid: Grid, accu: HintsAccumulator): void; }
export interface DirectHintProducer extends HintProducer { toString(): string; }
export interface IndirectHintProducer extends HintProducer { toString(): string; }
export interface WarningHintProducer extends HintProducer { isValidity(): boolean; }
export interface HintsAccumulator { add(hint: Hint): void; }

// SingleHintAccumulator.ts
export class SingleHintAccumulator implements HintsAccumulator {
  add(hint: Hint): void;             // stores hint, throws InterruptedError (Java: InterruptedException)
  getHint(): Hint | null;
}

// rules/chaining/Potential.ts: port of Potential.java (fields cell, value, isOn,
// parents list, cause enum, nestedChain, plus equals/hashCode -> equals only).
export class Potential { /* per Potential.java */ }
export namespace Potential { /* Cause enum per Java, or export enum PotentialCause */ }

// rules/HasParentPotentialHint.ts
export interface HasParentPotentialHint { getRuleParents(initialGrid: Grid, currentGrid: Grid): Collection-of-Potential; }
```

Where a comment says "per X.java", the Java file is the body spec. Port every method, keep names. `Potential.Cause` is a Java enum, port as a TS string or numeric enum matching the Java constant order.

- [x] **Action 1: write the failing test**

`test/unit/hintFramework.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SingleHintAccumulator } from '../../src/engine/solver/SingleHintAccumulator.js';
import { InterruptedError } from '../../src/engine/util/InterruptedError.js';
import { Hint } from '../../src/engine/solver/Hint.js';

class FakeHint extends Hint {
  getRule() { return { getHints() {} }; }
  apply() {}
  getRegions() { return null; }
  toString() { return 'fake'; }
  toHtml() { return ''; }
}

describe('SingleHintAccumulator', () => {
  it('keeps the first hint and interrupts', () => {
    const accu = new SingleHintAccumulator();
    const h = new FakeHint();
    expect(() => accu.add(h)).toThrow(InterruptedError);
    expect(accu.getHint()).toBe(h);
  });
  it('returns null when nothing was added', () => {
    expect(new SingleHintAccumulator().getHint()).toBeNull();
  });
});
```

- [x] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/hintFramework.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 3: port the base classes**

Translate the eleven Java files per the interface block. Points needing care:

- `IndirectHint.apply()` iterates `getRemovablePotentials()` and removes candidates from the grid. Keep the Java iteration order (the map is built by each hint class, insertion-ordered).
- `IndirectHint.isWorth()` semantics gate hint emission in several producers, port exactly.
- `DirectHint.apply()` sets the cell value and then calls the Java equivalent of candidate cancellation. Read what `DirectHint.java` actually calls and mirror it using `cancelPotentialValues` or per-cell updates exactly as written.
- `WarningHint` in Java extends `IndirectHint` with empty removals. Confirm in the source and mirror the hierarchy.

- [x] **Action 4: run the tests, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 5: commit**

```bash
git add src/engine/solver test/unit/hintFramework.test.ts
```

```bash
git commit -m "feat: port hint hierarchy, producer interfaces and accumulators"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [x] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol (nothing deferred)
