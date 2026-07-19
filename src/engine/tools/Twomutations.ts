// Port of tools/Twomutations.java. Enumerates all unordered pairs (n1, n2) with
// 0 <= n1 < n2 < countBits, in the same order as the Java class.
export class Twomutations {
  private readonly countBits: number;
  private readonly countOnes: number;
  private n1: number;
  private n2: number;
  private isLast: boolean;

  constructor(countOnes: number, countBits: number) {
    if (countOnes < 0) throw new Error('countOnes < 0');
    if (countBits < 0) throw new Error('countBits < 0');
    if (countOnes > countBits) throw new Error('countOnes > countBits');
    if (countBits > 81) throw new Error('countBits > 81');
    this.countBits = countBits;
    this.countOnes = countOnes;
    this.n1 = 0;
    this.n2 = 1;
    this.isLast = countBits === this.n2;
  }

  hasNext(): boolean {
    return !this.isLast;
  }

  next(): void {
    this.n1++;
    if (this.n1 === this.n2) {
      this.n1 = 0;
      this.n2++;
    }
    this.isLast = this.countBits === this.n2;
  }

  nextBitNums(): number[] {
    const result = new Array<number>(this.countOnes);
    result[0] = this.n1;
    result[1] = this.n2;
    this.next();
    return result;
  }
}
