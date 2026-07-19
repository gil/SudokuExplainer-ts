import { BitSet32 } from '../util/BitSet32.js';

// Port of tools/CommonTuples.java. Heart engine for Naked/Hidden sets and fishes.
export class CommonTuples {
  static searchCommonTuple(candidates: BitSet32[], degree: number): BitSet32 | null {
    const result = new BitSet32();
    for (const candidate of candidates) {
      if (candidate.cardinality() <= 1) return null;
      result.or(candidate);
    }
    if (result.cardinality() === degree) return result;
    return null;
  }

  static searchCommonTupleLight(candidates: BitSet32[], degree: number): BitSet32 | null {
    const result = new BitSet32();
    for (const candidate of candidates) {
      result.or(candidate);
      if (candidate.cardinality() === 0) return null;
    }
    if (result.cardinality() === degree) return result;
    return null;
  }
}
