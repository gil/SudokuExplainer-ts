// Ported from diuf.sudoku.Cell. Cell notation is frozen to RC notation
// (Settings.isRCNotation defaults to true), so the letter-column branch is
// dropped.
function cellName(x: number, y: number): string {
  return 'r' + (y + 1) + 'c' + (x + 1);
}

export class Cell {
  private readonly index: number;

  constructor(index: number) {
    this.index = index;
  }

  getX(): number {
    return this.index % 9;
  }

  getY(): number {
    return Math.trunc(this.index / 9);
  }

  getB(): number {
    return Math.trunc((this.index % 9) / 3) + Math.trunc(this.index / 27) * 3;
  }

  getIndex(): number {
    return this.index;
  }

  toFullString(): string {
    return 'Cell ' + cellName(this.getX(), this.getY());
  }

  toString(): string {
    return cellName(this.getX(), this.getY());
  }

  equals(o: unknown): boolean {
    if (!(o instanceof Cell)) return false;
    if (this === o) return true;
    return this.index === o.getIndex();
  }
}
