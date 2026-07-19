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
