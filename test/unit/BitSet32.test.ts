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
