import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { variantString, isBlocks } from '../../Options.js';
import type { HintsAccumulator, WarningHintProducer } from '../HintProducer.js';
import { WarningMessage } from './WarningMessage.js';

const VARIANT = variantString + (isBlocks ? ' Sudoku' : '');

// Ported from diuf.sudoku.solver.checks.NoDoubles. Vanilla region types only
// (block, row, column); the variant branches are dropped.
export class NoDoubles implements WarningHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const regions = Grid.getRegions(regionTypeIndex);
      for (const region of regions) {
        const values = new BitSet32();
        for (let j = 0; j < 9; j++) {
          const cell = region.getCell(j);
          const value = grid.getCellValue(cell.getX(), cell.getY());
          if (value !== 0) {
            if (values.get(value)) {
              // Java: anonymous WarningMessage subclass (empty simple name).
              const message = new (class extends WarningMessage {
                override getRedCells(): Cell[] {
                  const result: Cell[] = [];
                  result.push(cell);
                  for (let i = 0; i < 9; i++) {
                    const other = region.getCell(i);
                    if (
                      !other.equals(cell) &&
                      grid.getCellValue(cell.getX(), cell.getY()) ===
                        grid.getCellValue(other.getX(), other.getY())
                    ) {
                      result.push(other);
                    }
                  }
                  return result;
                }

                override getRegions(): Region[] {
                  return [region];
                }
              })(this, 'More than one "' + value + '" in a ' + region.toString(), 'DoubleValue.html', String(value), region.toString(), VARIANT);
              accu.add(message);
            } else {
              values.set(value);
            }
          }
        }
      }
    }
  }

  isValid(grid: Grid): boolean {
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const regions = Grid.getRegions(regionTypeIndex);
      for (const region of regions) {
        const values = new BitSet32();
        for (let j = 0; j < 9; j++) {
          const cell = region.getCell(j);
          const value = grid.getCellValue(cell.getX(), cell.getY());
          if (value !== 0) {
            if (values.get(value)) return false;
            values.set(value);
          }
        }
      }
    }
    return true;
  }

  toString(): string {
    return 'Invalid ' + VARIANT;
  }
}
