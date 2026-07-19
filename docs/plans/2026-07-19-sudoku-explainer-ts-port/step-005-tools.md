# Step 5: Tools (CellSet, Permutations, CommonTuples, ValuesFormatter and friends)

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-004 (`Grid`, `Cell`)

**Files:**

- Port from: `SukakuExplainer/diuf/sudoku/tools/CellSet.java`, `Permutations.java`, `Twomutations.java`, `CommonTuples.java`, `ValuesFormatter.java`, `SingletonBitSet.java`, `Pair.java`, `StrongReference.java`, `LinkedSet.java`
- Create: `src/engine/tools/CellSet.ts`, `Permutations.ts`, `Twomutations.ts`, `CommonTuples.ts`, `ValuesFormatter.ts`, `SingletonBitSet.ts`, `Pair.ts`, `StrongReference.ts`
- Modify: `src/engine/Grid.ts` (complete `initCellSets()` left open in step-004)
- Test: `test/unit/tools.test.ts`

**Interfaces:**

- Consumes: `Grid`, `Cell` (step-004) and `BitSet32` (step-003).
- Produces:

```ts
// CellSet.ts: port of tools/CellSet.java (a set of cells backed by two 64-bit words in Java).
// Back it with two 32-bit ints or one bigint, but preserve ASCENDING cell-index iteration
// and the exact method set from the Java class: add, remove, contains, containsAll,
// retainAll (and), addAll (or), removeAll (andNot), size, isEmpty, iterator/[Symbol.iterator],
// clone, equals, plus any constructors the Java file has (from Cell[], from CellSet).
export class CellSet { /* per Java */ }

// Permutations.ts: port of tools/Permutations.java
// Java exposes a constructor (int k, int n) plus hasNext/next()->long bitmask semantics.
// Port method-for-method; the 'long' becomes number (n <= 16 in all engine uses, safe).
export class Permutations { constructor(k: number, n: number); hasNext(): boolean; next(): number; nextBitNums(): number[]; }

// Twomutations.ts: same treatment as Permutations (used by StrongLinks).
export class Twomutations { /* per Java */ }

// CommonTuples.ts: port of tools/CommonTuples.java
export class CommonTuples {
  static searchCommonTuple(candidates: BitSet32[], degree: number): BitSet32 | null;
  /* plus any other static helpers present in the Java file */
}

// ValuesFormatter.ts: port of tools/ValuesFormatter.java
export class ValuesFormatter {
  static formatValues(values: number[], finalSep: string): string;
  static formatCells(cells: Cell[], finalSep: string): string;
  /* exact set of static methods from the Java file */
}

// SingletonBitSet.ts
export class SingletonBitSet { static create(value: number): BitSet32; }

// Pair.ts and StrongReference.ts: trivial generic holders, 1:1.
export class Pair<A, B> { /* per Java */ }
export class StrongReference<T> { /* per Java */ }
```

`LinkedSet.java`: read it first. If it is a plain insertion-ordered set wrapper, do not port it, use `Set` at call sites and note that in the step's commit message. If it has extra behavior (peek/first/last), port it to `src/engine/tools/LinkedSet.ts`.

- [ ] **Action 1: write the failing tools test**

`test/unit/tools.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BitSet32 } from '../../src/engine/util/BitSet32.js';
import { CellSet } from '../../src/engine/tools/CellSet.js';
import { CommonTuples } from '../../src/engine/tools/CommonTuples.js';
import { Permutations } from '../../src/engine/tools/Permutations.js';
import { SingletonBitSet } from '../../src/engine/tools/SingletonBitSet.js';
import { ValuesFormatter } from '../../src/engine/tools/ValuesFormatter.js';
import { Grid } from '../../src/engine/Grid.js';

const bits = (...v: number[]) => {
  const b = new BitSet32();
  for (const x of v) b.set(x);
  return b;
};

describe('Permutations', () => {
  it('enumerates C(4,2) masks in Java order', () => {
    const p = new Permutations(2, 4);
    const out: number[] = [];
    while (p.hasNext()) out.push(p.next());
    expect(out).toHaveLength(6);
    expect(new Set(out).size).toBe(6);
    for (const mask of out) {
      let n = mask, count = 0;
      while (n) { n &= n - 1; count++; }
      expect(count).toBe(2);
    }
  });
});

describe('CommonTuples', () => {
  it('finds a naked pair tuple', () => {
    const result = CommonTuples.searchCommonTuple([bits(2, 5), bits(2, 5)], 2);
    expect(result).not.toBeNull();
    expect(result!.toArray()).toEqual([2, 5]);
  });
  it('rejects a spread of 3 values over degree 2', () => {
    expect(CommonTuples.searchCommonTuple([bits(2, 5), bits(2, 7)], 2)).toBeNull();
  });
});

describe('CellSet', () => {
  it('iterates ascending regardless of insertion order', () => {
    const s = new CellSet();
    s.add(Grid.getCell(50));
    s.add(Grid.getCell(3));
    s.add(Grid.getCell(77));
    expect([...s].map((c) => c.getIndex())).toEqual([3, 50, 77]);
    expect(s.size()).toBe(3);
    expect(s.contains(Grid.getCell(50))).toBe(true);
  });
});

describe('formatting helpers', () => {
  it('SingletonBitSet has exactly one bit', () => {
    expect(SingletonBitSet.create(7).toArray()).toEqual([7]);
  });
  it('ValuesFormatter joins with a final separator', () => {
    expect(ValuesFormatter.formatValues([1, 2, 3], ' and ')).toBe('1, 2 and 3');
  });
});
```

Check each expectation against the Java code while porting. If the Java behavior differs from an assumption baked into a test above (say, the exact `formatValues` separator handling), fix the TEST to match Java, never the reverse. Note the CommonTuples degenerate behaviors too (cells with a single candidate, empty sets) and mirror them exactly, since NakedSet relies on them.

- [ ] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/tools.test.ts`
Expected: FAIL (modules not found).

- [ ] **Action 3: port the tools**

Translate each Java file per the interface block. `Permutations.java` uses `long` masks and `Long.bitCount`-style helpers, translate to `number` and the counting loop already used in `BitSet32.cardinality`. Keep the Java iteration order exactly (differential tests depend on producer scan order).

- [ ] **Action 4: complete Grid.initCellSets()**

Fill `Grid.visibleCellsSet` and `Grid.forwardVisibleCellsSet` from the static tables like the `Grid.java` static block does, now that `CellSet` exists. Run `pnpm vitest run test/unit/Grid.test.ts` to confirm nothing regressed.

- [ ] **Action 5: run tests and typecheck, expect pass**

Run: `pnpm test`
Expected: all suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 6: commit**

```bash
git add src/engine test/unit/tools.test.ts
```

```bash
git commit -m "feat: port tools (CellSet, Permutations, CommonTuples, formatters)"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
