import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { LockingHint } from './LockingHint.js';
import { DirectLockingHint } from './DirectLockingHint.js';

// Ported from diuf.sudoku.solver.rules.Locking (Pointing and Claiming). Variant
// region pairs (DG, Windows) are dropped: those settings are frozen off.
export class Locking implements IndirectHintProducer {
  private readonly isDirectMode: boolean;

  constructor(isDirectMode: boolean) {
    this.isDirectMode = isDirectMode;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    this.getHintsForTypes(grid, 0, 2, accu); // block, column
    this.getHintsForTypes(grid, 0, 1, accu); // block, row
    this.getHintsForTypes(grid, 2, 0, accu); // column, block
    this.getHintsForTypes(grid, 1, 0, accu); // row, block
  }

  private getHintsForTypes(
    grid: Grid,
    regionType1Index: number,
    regionType2Index: number,
    accu: HintsAccumulator,
  ): void {
    for (let value = 1; value <= 9; value++) {
      for (let i1 = 0; i1 < 9; i1++) {
        const region1 = Grid.getRegions(regionType1Index)[i1];
        const potentialPositions = region1.getPotentialPositions(grid, value);
        // Note: if cardinality == 1, this is Hidden Single in part1
        if (potentialPositions.cardinality() < 2) continue;
        for (let i2 = 0; i2 < 9; i2++) {
          const region2 = Grid.getRegions(regionType2Index)[i2];
          if (!region1.crosses(region2)) continue;
          let isInCommonSet = true;
          for (let i = potentialPositions.nextSetBit(0); i >= 0; i = potentialPositions.nextSetBit(i + 1)) {
            const cell = region1.getCell(i);
            if (!region2.regionCellsBitSet.has(cell.getIndex())) {
              isInCommonSet = false;
              break;
            }
          }
          if (isInCommonSet) {
            if (this.isDirectMode) {
              this.lookForFollowingHiddenSingles(grid, regionType1Index, accu, i1, region1, region2, value);
            } else {
              const hint = this.createLockingHint(grid, region1, region2, null, value);
              if (hint.isWorth()) accu.add(hint);
            }
          }
        }
      }
    }
  }

  private lookForFollowingHiddenSingles(
    grid: Grid,
    regionType1Index: number,
    accu: HintsAccumulator,
    i1: number,
    region1: Region,
    region2: Region,
    value: number,
  ): void {
    for (let i3 = 0; i3 < 9; i3++) {
      if (i3 === i1) continue;
      const region3 = Grid.getRegions(regionType1Index)[i3];
      if (!region3.crosses(region2)) continue;
      const potentialPositions3 = region3.getPotentialPositions(grid, value);
      if (potentialPositions3.cardinality() > 1) {
        let nbRemainInRegion3 = 0;
        let hcell: Cell | null = null;
        for (let i = 0; i < 9; i++) {
          if (potentialPositions3.get(i)) {
            const cell = region3.getCell(i);
            if (!region2.regionCellsBitSet.has(cell.getIndex())) {
              nbRemainInRegion3++;
              hcell = cell;
            }
          }
        }
        if (nbRemainInRegion3 === 1) {
          const hint = this.createLockingHint(grid, region1, region2, hcell, value);
          if (hint.isWorth()) accu.add(hint);
        }
      }
    }
  }

  private createLockingHint(grid: Grid, p1: Region, p2: Region, hcell: Cell | null, value: number): IndirectHint {
    // Java: HashMap (iteration order not observable; removals are sorted downstream).
    const cellPotentials = new Map<Cell, BitSet32>();
    for (let i = 0; i < 9; i++) {
      const cell = p1.getCell(i);
      if (grid.hasCellPotentialValue(cell.getIndex(), value)) cellPotentials.set(cell, SingletonBitSet.create(value));
    }
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    const highlightedCells: Cell[] = [];
    for (let i = 0; i < 9; i++) {
      const cell = p2.getCell(i);
      if (!p1.regionCellsBitSet.has(cell.getIndex())) {
        if (grid.hasCellPotentialValue(cell.getIndex(), value))
          cellRemovablePotentials.set(cell, SingletonBitSet.create(value));
      } else if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
        highlightedCells.push(cell);
      }
    }
    const cells = highlightedCells.slice();
    if (this.isDirectMode)
      return new DirectLockingHint(this, cells, hcell!, value, cellPotentials, cellRemovablePotentials, [p1, p2]);
    else return new LockingHint(this, cells, value, cellPotentials, cellRemovablePotentials, [p1, p2]);
  }

  toString(): string {
    if (this.isDirectMode) return 'Direct Intersections';
    else return 'Intersections';
  }
}
