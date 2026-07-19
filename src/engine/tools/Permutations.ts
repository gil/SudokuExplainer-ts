// Port of tools/Permutations.java. Java uses `long` masks; every engine use has
// countBits <= 16, so `number` and 32-bit bit ops reproduce it exactly.
export class Permutations {
  private readonly countBits: number;
  private readonly countOnes: number;
  private readonly mask: number;
  private value: number;
  private isLast: boolean;

  constructor(countOnes: number, countBits: number) {
    if (countOnes < 0) throw new Error('countOnes < 0');
    if (countBits < 0) throw new Error('countBits < 0');
    if (countOnes > countBits) throw new Error('countOnes > countBits');
    if (countBits > 64) throw new Error('countBits > 64');
    this.countBits = countBits;
    this.countOnes = countOnes;
    this.value = (1 << countOnes) - 1;
    this.mask = (1 << (countBits - countOnes)) - 1;
    this.isLast = countBits === 0;
  }

  hasNext(): boolean {
    const result = !this.isLast;
    this.isLast = ((this.value & -this.value) & this.mask) === 0;
    return result;
  }

  next(): number {
    const result = this.value;
    if (!this.isLast) {
      const smallest = this.value & -this.value;
      const ripple = this.value + smallest;
      let ones = this.value ^ ripple;
      ones = Math.trunc((ones >>> 2) / smallest);
      this.value = ripple | ones;
    }
    return result;
  }

  nextBitNums(): number[] {
    const mask = this.next();
    const result = new Array<number>(this.countOnes);
    let dst = 0;
    for (let src = 0; src < this.countBits; src++) {
      if ((mask & (1 << src)) !== 0) result[dst++] = src;
    }
    return result;
  }
}
