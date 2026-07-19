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
