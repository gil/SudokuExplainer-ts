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
