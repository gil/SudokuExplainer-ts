import { Cell } from '../Cell.js';
import { Grid } from '../Grid.js';

// Port of tools/CellSet.java. Java backs it with a java.util.BitSet over the 81
// cell indexes; here a bigint holds the 81 bits. Iteration is ascending by cell
// index, matching Java's BitSet.nextSetBit walk.
export class CellSet implements Iterable<Cell> {
  bits: bigint;

  constructor(source?: CellSet | Cell[] | number[] | Iterable<Cell>) {
    this.bits = 0n;
    if (source === undefined) return;
    if (source instanceof CellSet) {
      this.bits |= source.bits;
    } else if (Array.isArray(source)) {
      if (source.length > 0 && typeof source[0] === 'number') {
        for (const i of source as number[]) this.bits |= 1n << BigInt(i);
      } else {
        for (const cell of source as Cell[]) this.bits |= 1n << BigInt(cell.getIndex());
      }
    } else {
      for (const cell of source) this.bits |= 1n << BigInt(cell.getIndex());
    }
  }

  add(cell: Cell): boolean {
    this.bits |= 1n << BigInt(cell.getIndex());
    return false;
  }

  addAll(c: CellSet | Iterable<Cell>): boolean {
    if (c instanceof CellSet) {
      this.bits |= c.bits;
    } else {
      for (const cell of c) this.bits |= 1n << BigInt(cell.getIndex());
    }
    return false;
  }

  clear(): void {
    this.bits = 0n;
  }

  contains(o: Cell | CellSet): boolean {
    if (o instanceof CellSet) {
      return (o.bits & ~this.bits) === 0n;
    }
    return (this.bits & (1n << BigInt(o.getIndex()))) !== 0n;
  }

  containsCell(c: Cell): boolean {
    return (this.bits & (1n << BigInt(c.getIndex()))) !== 0n;
  }

  containsAll(c: CellSet | Iterable<Cell>): boolean {
    if (c instanceof CellSet) {
      return (c.bits & ~this.bits) === 0n;
    }
    for (const cell of c) {
      if ((this.bits & (1n << BigInt(cell.getIndex()))) === 0n) return false;
    }
    return true;
  }

  containsAny(c: CellSet): boolean {
    return (this.bits & c.bits) !== 0n;
  }

  isEmpty(): boolean {
    return this.bits === 0n;
  }

  remove(o: Cell | CellSet): boolean {
    if (o instanceof CellSet) {
      this.bits &= ~o.bits;
    } else {
      this.bits &= ~(1n << BigInt(o.getIndex()));
    }
    return false;
  }

  removeAll(c: CellSet | Iterable<Cell>): boolean {
    if (c instanceof CellSet) {
      this.bits &= ~c.bits;
    } else {
      for (const cell of c) this.bits &= ~(1n << BigInt(cell.getIndex()));
    }
    return false;
  }

  retainAll(c: CellSet | Iterable<Cell>): boolean {
    if (c instanceof CellSet) {
      this.bits &= c.bits;
    } else {
      this.bits &= new CellSet(c).bits;
    }
    return false;
  }

  // Java's CellSet.size() returns java.util.BitSet.size() (word capacity), a
  // value never read by the engine. The set's element count is what callers
  // and the plan's test expect, so this returns cardinality.
  size(): number {
    let n = this.bits;
    let count = 0;
    while (n !== 0n) {
      n &= n - 1n;
      count++;
    }
    return count;
  }

  toArray(): Cell[] {
    return [...this];
  }

  clone(): CellSet {
    return new CellSet(this);
  }

  equals(o: unknown): boolean {
    if (!(o instanceof CellSet)) return false;
    return this.bits === o.bits;
  }

  [Symbol.iterator](): Iterator<Cell> {
    let previous = -1;
    return {
      next: (): IteratorResult<Cell> => {
        let i = previous + 1;
        while (i <= 80) {
          if ((this.bits & (1n << BigInt(i))) !== 0n) {
            previous = i;
            return { value: Grid.getCell(i), done: false };
          }
          i++;
        }
        return { value: undefined, done: true };
      },
    };
  }
}
