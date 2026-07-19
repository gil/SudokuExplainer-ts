import { BitSet32 } from '../util/BitSet32.js';
import { Cell } from '../Cell.js';

// Port of tools/ValuesFormatter.java.
export class ValuesFormatter {
  static formatValues(values: number[] | BitSet32, lastSep: string): string {
    if (values instanceof BitSet32) {
      const array: number[] = [];
      for (let v = values.nextSetBit(0); v >= 0; v = values.nextSetBit(v + 1)) array.push(v);
      return ValuesFormatter.formatValues(array, lastSep);
    }
    let result = '';
    for (let i = 0; i < values.length; i++) {
      if (i > 0 && i === values.length - 1) result += lastSep;
      else if (i > 0) result += ', ';
      result += values[i];
    }
    return result;
  }

  static formatCells(cells: Cell[], lastSep: string): string {
    let result = '';
    for (let i = 0; i < cells.length; i++) {
      if (i > 0 && i === cells.length - 1) result += lastSep;
      else if (i > 0) result += ', ';
      result += cells[i].toString();
    }
    return result;
  }
}
