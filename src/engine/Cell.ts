import type { Grid } from './Grid.js';
import type { CellSet } from './tools/CellSet.js';

// Grid and Cell reference each other. Cell only needs Grid at runtime (for
// getVisibleCells), so we keep this module free of value imports (a leaf) to
// preserve the eval order that lets Grid build its cells. Grid installs itself
// here after it finishes loading.
let gridRef: typeof Grid | null = null;
export function _setGridRef(g: typeof Grid): void {
  gridRef = g;
}

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

  getVisibleCells(): CellSet {
    return gridRef!.visibleCellsSet[this.index];
  }

  canSeeCell(other: Cell): boolean {
    return gridRef!.visibleCellsSet[this.index].contains(other);
  }

  getForwardVisibleCells(): CellSet {
    return gridRef!.forwardVisibleCellsSet[this.index];
  }

  getVisibleCellIndexes(): number[] {
    return gridRef!.visibleCellIndex[this.index];
  }

  getForwardVisibleCellIndexes(): number[] {
    return gridRef!.forwardVisibleCellIndex[this.index];
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

  static toFullString(...cells: Cell[]): string {
    let result = 'Cell';
    result += cells.length <= 1 ? ' ' : 's ';
    for (let i = 0; i < cells.length; i++) {
      if (i > 0) result += ',';
      result += cells[i].toString();
    }
    return result;
  }

  static toString(...cells: Cell[]): string {
    let result = '';
    for (let i = 0; i < cells.length; i++) {
      if (i > 0) result += ',';
      result += cells[i].toString();
    }
    return result;
  }
}
