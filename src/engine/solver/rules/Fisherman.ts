import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { Permutations } from '../../tools/Permutations.js';
import { CommonTuples } from '../../tools/CommonTuples.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { LockingHint } from './LockingHint.js';

// Ported from diuf.sudoku.solver.rules.Fisherman (X-Wing, Swordfish, Jellyfish).
export class Fisherman implements IndirectHintProducer {
  private readonly degree: number;

  constructor(degree: number) {
    this.degree = degree;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    this.getHintsForTypes(grid, 2, 1, accu); // column, row
    this.getHintsForTypes(grid, 1, 2, accu); // row, column
  }

  private getHintsForTypes(
    grid: Grid,
    partType1Index: number,
    partType2Index: number,
    accu: HintsAccumulator,
  ): void {
    // Get occurance count for each value
    const occurances = new Array<number>(10).fill(0);
    for (let value = 1; value <= 9; value++) occurances[value] = grid.getCountOccurancesOfValue(value);

    const parts = Grid.getRegions(partType1Index);
    // Iterate on lines tuples
    const perm = new Permutations(this.degree, 9);
    while (perm.hasNext()) {
      const indexes = perm.nextBitNums();

      const myIndexes = new BitSet32();
      for (let i = 0; i < indexes.length; i++) myIndexes.set(indexes[i]);

      // Iterate on values
      for (let value = 1; value <= 9; value++) {
        // Pattern is only possible if there are at least (degree * 2) missing
        // occurances of the value.
        if (occurances[value] + this.degree * 2 <= 9) {
          // Check for exactly the same positions of the value in all lines
          const positions = new Array<BitSet32>(this.degree);
          for (let i = 0; i < this.degree; i++)
            positions[i] = parts[indexes[i]].getPotentialPositions(grid, value);
          const common = CommonTuples.searchCommonTuple(positions, this.degree);

          if (common !== null) {
            const hint = this.createFishHint(grid, partType1Index, partType2Index, myIndexes, common, value);
            if (hint.isWorth()) accu.add(hint);
          }
        }
      }
    }
  }

  private createFishHint(
    grid: Grid,
    otherPartTypeIndex: number,
    myPartTypeIndex: number,
    otherIndexes: BitSet32,
    myIndexes: BitSet32,
    value: number,
  ): IndirectHint {
    const myParts = Grid.getRegions(myPartTypeIndex);
    const otherParts = Grid.getRegions(otherPartTypeIndex);
    // Build parts
    const parts1: Region[] = [];
    const parts2: Region[] = [];
    for (let i = 0; i < 9; i++) {
      if (otherIndexes.get(i)) parts1.push(otherParts[i]);
      if (myIndexes.get(i)) parts2.push(myParts[i]);
    }
    const allParts = new Array<Region>(parts1.length + parts2.length);
    for (let i = 0; i < parts1.length; i++) {
      allParts[i * 2] = parts1[i];
      allParts[i * 2 + 1] = parts2[i];
    }

    // Build highlighted potentials and cells
    const cells: Cell[] = [];
    const cellPotentials = new Map<Cell, BitSet32>();
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (myIndexes.get(i) && otherIndexes.get(j)) {
          const cell = myParts[i].getCell(j);
          if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
            cells.push(cell);
            cellPotentials.set(cell, SingletonBitSet.create(value));
          }
        }
      }
    }
    const allCells = cells.slice();

    // Build removable potentials
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    for (let i = 0; i < 9; i++) {
      if (myIndexes.get(i)) {
        // Check if value appears outside from otherIndexes
        const potentialPositions = myParts[i].copyPotentialPositions(grid, value);
        potentialPositions.andNot(otherIndexes);
        if (!potentialPositions.isEmpty()) {
          for (let j = 0; j < 9; j++) {
            if (potentialPositions.get(j))
              cellRemovablePotentials.set(myParts[i].getCell(j), SingletonBitSet.create(value));
          }
        }
      }
    }
    return new LockingHint(this, allCells, value, cellPotentials, cellRemovablePotentials, allParts);
  }

  toString(): string {
    if (this.degree === 2) return 'X-Wings';
    else if (this.degree === 3) return 'Swordfishes';
    else if (this.degree === 4) return 'Jellyfishes';
    return null as unknown as string;
  }
}
