import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { XYWingHint } from './XYWingHint.js';

// Ported from diuf.sudoku.solver.rules.XYWing. isXYZ=false is XY-Wing,
// isXYZ=true is XYZ-Wing.
export class XYWing implements IndirectHintProducer {
  private readonly isXYZ: boolean;

  constructor(isXYZ: boolean) {
    this.isXYZ = isXYZ;
  }

  private isXYWing(xyValues: BitSet32, xzValues: BitSet32, yzValues: BitSet32): boolean {
    if (xyValues.cardinality() !== 2 || xzValues.cardinality() !== 2 || yzValues.cardinality() !== 2) return false;
    const union = xyValues.clone();
    union.or(xzValues);
    union.or(yzValues);
    if (union.cardinality() !== 3) return false;
    const inter = xyValues.clone();
    inter.and(xzValues);
    inter.and(yzValues);
    return inter.cardinality() === 0;
  }

  private isXYZWing(xyValues: BitSet32, xzValues: BitSet32, yzValues: BitSet32): boolean {
    if (xyValues.cardinality() !== 3 || xzValues.cardinality() !== 2 || yzValues.cardinality() !== 2) return false;
    const union = xyValues.clone();
    union.or(xzValues);
    union.or(yzValues);
    if (union.cardinality() !== 3) return false;
    const inter = xyValues.clone();
    inter.and(xzValues);
    inter.and(yzValues);
    return inter.cardinality() === 1;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    const targetCardinality = this.isXYZ ? 3 : 2;
    for (let i = 0; i < 81; i++) {
      const xyCell = Grid.getCell(i);
      const xyValues = grid.getCellPotentialValues(i);
      if (xyValues.cardinality() === targetCardinality) {
        // Potential XY cell found
        for (const xzCellIndex of xyCell.getVisibleCellIndexes()) {
          const xzValues = grid.getCellPotentialValues(xzCellIndex);
          if (xzValues.cardinality() === 2) {
            // Potential XZ cell found. Do small test
            const remValues = xyValues.clone();
            remValues.andNot(xzValues);
            if (remValues.cardinality() === 1) {
              // We have found XZ cell, look for YZ cell
              for (const yzCellIndex of xyCell.getVisibleCellIndexes()) {
                const yzValues = grid.getCellPotentialValues(yzCellIndex);
                if (yzValues.cardinality() === 2) {
                  if (this.isXYZ) {
                    if (this.isXYZWing(xyValues, xzValues, yzValues)) {
                      const hint = this.createHint(grid, xyCell, Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex), xzValues, yzValues);
                      if (hint.isWorth()) accu.add(hint);
                    }
                  } else {
                    if (this.isXYWing(xyValues, xzValues, yzValues)) {
                      const hint = this.createHint(grid, xyCell, Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex), xzValues, yzValues);
                      if (hint.isWorth()) accu.add(hint);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private createHint(grid: Grid, xyCell: Cell, xzCell: Cell, yzCell: Cell, xzValues: BitSet32, yzValues: BitSet32): XYWingHint {
    // Get the "z" value
    const inter = xzValues.clone();
    inter.and(yzValues);
    const zValue = inter.nextSetBit(0);

    // Build list of removable potentials
    const removablePotentials = new Map<Cell, BitSet32>();
    const victims = new CellSet(xzCell.getVisibleCells());
    victims.retainAll(yzCell.getVisibleCells());
    if (this.isXYZ) victims.retainAll(xyCell.getVisibleCells());
    victims.remove(xyCell);
    victims.remove(xzCell);
    victims.remove(yzCell);
    for (const cell of victims) {
      if (grid.hasCellPotentialValue(cell.getIndex(), zValue)) removablePotentials.set(cell, SingletonBitSet.create(zValue));
    }

    return new XYWingHint(this, removablePotentials, this.isXYZ, xyCell, xzCell, yzCell, zValue);
  }

  toString(): string {
    return 'XY-Wings';
  }
}
