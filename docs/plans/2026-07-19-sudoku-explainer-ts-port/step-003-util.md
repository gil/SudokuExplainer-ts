# Step 3: Utility Layer (JavaRandom, BitSet32, InterruptedError)

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-002 (needs `test/fixtures/random.json`)

**Files:**

- Create: `src/engine/util/JavaRandom.ts`, `src/engine/util/BitSet32.ts`, `src/engine/util/InterruptedError.ts`
- Test: `test/unit/JavaRandom.test.ts`, `test/unit/BitSet32.test.ts`

**Interfaces:**

- Consumes: `test/fixtures/random.json` (per seed: `nextInt`, `nextInt81`, `nextInt64`, `nextInt100`, 30 values each).
- Produces: the three classes exactly as declared in the overview's "Core shared interfaces" block. Every later engine file imports from these paths.

- [ ] **Action 1: write the failing JavaRandom test**

`test/unit/JavaRandom.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JavaRandom } from '../../src/engine/util/JavaRandom.js';

const fixtures: Record<string, Record<string, number[]>> = JSON.parse(
  readFileSync('test/fixtures/random.json', 'utf8'),
);

describe('JavaRandom', () => {
  for (const [seed, seqs] of Object.entries(fixtures)) {
    it(`matches java.util.Random(${seed})`, () => {
      const cases: Array<[string, (r: JavaRandom) => number]> = [
        ['nextInt', (r) => r.nextInt()],
        ['nextInt81', (r) => r.nextInt(81)],
        ['nextInt64', (r) => r.nextInt(64)],
        ['nextInt100', (r) => r.nextInt(100)],
      ];
      for (const [key, call] of cases) {
        const rnd = new JavaRandom(BigInt(seed));
        expect(seqs[key].map(() => call(rnd))).toEqual(seqs[key]);
      }
    });
  }

  it('rejects non-positive bounds', () => {
    expect(() => new JavaRandom(1).nextInt(0)).toThrow();
  });
});
```

- [ ] **Action 2: run it, expect failure**

Run: `pnpm vitest run test/unit/JavaRandom.test.ts`
Expected: FAIL (module not found).

- [ ] **Action 3: write JavaRandom**

`src/engine/util/JavaRandom.ts`, an exact port of the `java.util.Random` LCG (48-bit, BigInt multiply) including the `nextInt(bound)` rejection loop with 32-bit overflow semantics:

```ts
const MULTIPLIER = 0x5deece66dn;
const ADDEND = 0xbn;
const MASK = (1n << 48n) - 1n;

export class JavaRandom {
  private seed: bigint;

  constructor(seed?: number | bigint) {
    if (seed === undefined) {
      // Java uses a time-based seed; reproducibility is not required here.
      seed = BigInt(Date.now()) ^ (BigInt(Math.floor(Math.random() * 0x100000000)) << 16n);
    }
    this.seed = (BigInt(seed) ^ MULTIPLIER) & MASK;
  }

  protected next(bits: number): number {
    this.seed = (this.seed * MULTIPLIER + ADDEND) & MASK;
    return Number(BigInt.asIntN(32, this.seed >> BigInt(48 - bits)));
  }

  nextInt(bound?: number): number {
    if (bound === undefined) return this.next(32);
    if (bound <= 0) throw new Error('bound must be positive');
    if ((bound & -bound) === bound) {
      // power of two
      return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
    }
    let bits: number;
    let val: number;
    do {
      bits = this.next(31);
      val = bits % bound;
    } while (((bits - val + (bound - 1)) | 0) < 0);
    return val;
  }
}
```

- [ ] **Action 4: run the test, expect pass**

Run: `pnpm vitest run test/unit/JavaRandom.test.ts`
Expected: PASS for all five seeds. If a sequence diverges, the bug is almost always in `BigInt.asIntN` placement or the overflow check. Compare against `java.util.Random` source (JDK), not intuition.

- [ ] **Action 5: write the failing BitSet32 test**

`test/unit/BitSet32.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BitSet32 } from '../../src/engine/util/BitSet32.js';

describe('BitSet32', () => {
  it('mirrors java.util.BitSet basics', () => {
    const b = new BitSet32();
    expect(b.isEmpty()).toBe(true);
    b.set(3);
    b.set(9);
    expect(b.get(3)).toBe(true);
    expect(b.get(4)).toBe(false);
    expect(b.cardinality()).toBe(2);
    expect(b.length()).toBe(10); // Java: index of highest set bit + 1
    expect(b.nextSetBit(0)).toBe(3);
    expect(b.nextSetBit(4)).toBe(9);
    expect(b.nextSetBit(10)).toBe(-1);
  });

  it('supports set operations with Java semantics', () => {
    const a = new BitSet32();
    a.set(1); a.set(2); a.set(3);
    const b = new BitSet32();
    b.set(2); b.set(4);
    const and = a.clone(); and.and(b);
    expect(and.toArray()).toEqual([2]);
    const or = a.clone(); or.or(b);
    expect(or.toArray()).toEqual([1, 2, 3, 4]);
    const andNot = a.clone(); andNot.andNot(b);
    expect(andNot.toArray()).toEqual([1, 3]);
    const xor = a.clone(); xor.xor(b);
    expect(xor.toArray()).toEqual([1, 3, 4]);
    expect(a.equals(a.clone())).toBe(true);
    expect(a.equals(b)).toBe(false);
  });

  it('clear() with and without index', () => {
    const b = new BitSet32();
    b.set(5); b.set(6);
    b.clear(5);
    expect(b.toArray()).toEqual([6]);
    b.clear();
    expect(b.isEmpty()).toBe(true);
  });
});
```

- [ ] **Action 6: write BitSet32**

`src/engine/util/BitSet32.ts`:

```ts
export class BitSet32 {
  bits = 0;

  get(i: number): boolean { return (this.bits & (1 << i)) !== 0; }
  set(i: number): void { this.bits |= 1 << i; }
  clear(i?: number): void {
    if (i === undefined) this.bits = 0;
    else this.bits &= ~(1 << i);
  }
  and(o: BitSet32): void { this.bits &= o.bits; }
  or(o: BitSet32): void { this.bits |= o.bits; }
  andNot(o: BitSet32): void { this.bits &= ~o.bits; }
  xor(o: BitSet32): void { this.bits ^= o.bits; }
  cardinality(): number {
    let n = this.bits | 0;
    let count = 0;
    while (n !== 0) { n &= n - 1; count++; }
    return count;
  }
  nextSetBit(from: number): number {
    for (let i = from; i < 32; i++) if (this.get(i)) return i;
    return -1;
  }
  isEmpty(): boolean { return this.bits === 0; }
  length(): number { return 32 - Math.clz32(this.bits); }
  equals(o: BitSet32): boolean { return this.bits === o.bits; }
  clone(): BitSet32 {
    const c = new BitSet32();
    c.bits = this.bits;
    return c;
  }
  toArray(): number[] {
    const out: number[] = [];
    for (let i = this.nextSetBit(0); i >= 0; i = this.nextSetBit(i + 1)) out.push(i);
    return out;
  }
}
```

- [ ] **Action 7: write InterruptedError**

`src/engine/util/InterruptedError.ts`:

```ts
// Port of the control-flow role of java.lang.InterruptedException.
export class InterruptedError extends Error {
  constructor() {
    super('interrupted');
    this.name = 'InterruptedError';
  }
}
```

- [ ] **Action 8: run all tests plus typecheck**

Run: `pnpm test`
Expected: JavaRandom + BitSet32 + smoke suites pass.

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Action 9: commit**

```bash
git add src/engine/util test/unit
```

```bash
git commit -m "feat: JavaRandom, BitSet32 and InterruptedError utility layer"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
