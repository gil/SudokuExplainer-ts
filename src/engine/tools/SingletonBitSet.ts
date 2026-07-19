import { BitSet32 } from '../util/BitSet32.js';

// Port of tools/SingletonBitSet.java.
export class SingletonBitSet {
  static create(value: number): BitSet32 {
    const result = new BitSet32();
    result.set(value);
    return result;
  }
}
