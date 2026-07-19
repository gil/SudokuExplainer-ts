import type { Cell } from './Cell.js';

// A link between two potential values (candidates) of two cells.
export class Link {
  private readonly srcCell: Cell;
  private readonly srcValue: number;
  private readonly dstCell: Cell;
  private readonly dstValue: number;

  constructor(srcCell: Cell, srcValue: number, dstCell: Cell, dstValue: number) {
    this.srcCell = srcCell;
    this.srcValue = srcValue;
    this.dstCell = dstCell;
    this.dstValue = dstValue;
  }

  getSrcCell(): Cell {
    return this.srcCell;
  }

  getSrcValue(): number {
    return this.srcValue;
  }

  getDstCell(): Cell {
    return this.dstCell;
  }

  getDstValue(): number {
    return this.dstValue;
  }
}
