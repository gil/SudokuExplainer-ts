import { Cell } from '../../../Cell.js';
import { Grid, type Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { CellSet } from '../../../tools/CellSet.js';
import { CommonTuples } from '../../../tools/CommonTuples.js';
import { Permutations } from '../../../tools/Permutations.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../../HintProducer.js';
import { UniqueLoopHint } from './UniqueLoopHint.js';
import { UniqueLoopType1Hint } from './UniqueLoopType1Hint.js';
import { UniqueLoopType2Hint } from './UniqueLoopType2Hint.js';
import { UniqueLoopType3HiddenHint } from './UniqueLoopType3HiddenHint.js';
import { UniqueLoopType3NakedHint } from './UniqueLoopType3NakedHint.js';
import { UniqueLoopType4Hint } from './UniqueLoopType4Hint.js';

// Ported from diuf.sudoku.solver.rules.unique.UniqueLoops. Vanilla surface only:
// islkSudokuURUL / isVLatin / isVanilla frozen true, all variant branches and
// the forbidden-pair restriction checks dropped.
export class UniqueLoops implements IndirectHintProducer {
  private lastGrid = new Grid();
  private lastResult: UniqueLoopHint[] | null = null;

  getHints(grid: Grid, accu: HintsAccumulator): void {
    let hints: UniqueLoopHint[];
    if (grid.equals(this.lastGrid)) hints = this.lastResult!;
    else hints = this.computeHints(grid);
    // Sort the result
    hints.sort((h1, h2) => {
      const d1 = h1.getDifficulty();
      const d2 = h2.getDifficulty();
      if (d1 < d2) return -1;
      else if (d1 > d2) return 1;
      else return h1.getType() - h2.getType();
    });
    grid.copyTo(this.lastGrid);
    this.lastResult = hints;
    for (const hint of hints) accu.add(hint);
  }

  private computeHints(grid: Grid): UniqueLoopHint[] {
    const result: UniqueLoopHint[] = [];
    for (let i = 0; i < 81; i++) {
      const potentials = grid.getCellPotentialValues(i);
      if (potentials.cardinality() === 2) {
        const cell = Grid.getCell(i);
        const v1 = potentials.nextSetBit(0);
        const v2 = potentials.nextSetBit(v1 + 1);
        const tempLoop: Cell[] = [];
        const results: Cell[][] = [];
        this.checkForLoops(grid, cell, v1, v2, tempLoop, 2, new BitSet32(), -1, results);
        for (const loop of results) {
          // Potential loop found. Check validity
          if (this.isValidLoop(grid, loop)) {
            // This is a unique loop. Get cells with more than 2 potentials
            const extraCells: Cell[] = [];
            for (const loopCell of loop) {
              if (grid.getCellPotentialValues(loopCell.getIndex()).cardinality() > 2) extraCells.push(loopCell);
            }
            if (extraCells.length === 1) {
              // Try a type-1 hint
              const hint = this.createType1Hint(loop, extraCells[0], v1, v2);
              if (!result.some((h) => h.equals(hint)) && hint.isWorth()) result.push(hint);
            } else if (extraCells.length > 2) {
              // Only type 2 is possible
              const hint = this.createType2Hint(grid, loop, extraCells, v1, v2);
              if (!result.some((h) => h.equals(hint)) && hint.isWorth()) result.push(hint);
            } else if (extraCells.length === 2) {
              const r1 = extraCells[0];
              const r2 = extraCells[1];
              const rPotentials = grid.getCellPotentialValues(r1.getIndex()).clone();
              rPotentials.or(grid.getCellPotentialValues(r2.getIndex()));
              rPotentials.clear(v1);
              rPotentials.clear(v2);
              if (rPotentials.cardinality() === 1) {
                // Try type 2 hint
                const hint = this.createType2Hint(grid, loop, extraCells, v1, v2);
                if (!result.some((h) => h.equals(hint)) && hint.isWorth()) result.push(hint);
              } else if (rPotentials.cardinality() >= 2) {
                // Try type 3 hint
                const hints = this.createType3Hints(grid, loop, r1, r2, v1, v2);
                for (const hint of hints) {
                  if (!result.some((h) => h.equals(hint)) && hint.isWorth()) result.push(hint);
                }
              }
              // Try type 4 hint
              const hint = this.createType4Hint(grid, loop, r1, r2, v1, v2);
              if (hint !== null && !result.some((h) => h.equals(hint)) && hint.isWorth()) result.push(hint);
            } else {
              // Huh ? 0 rescue cell ? Sudoku has two solutions !! Do nothing.
            }
          }
        }
      }
    }
    return result;
  }

  private checkForLoops(
    grid: Grid,
    cell: Cell,
    v1: number,
    v2: number,
    loop: Cell[],
    allowedEx: number,
    exValues: BitSet32,
    lastRegionTypeIndex: number,
    results: Cell[][],
  ): void {
    loop.push(cell);
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      if (regionTypeIndex !== lastRegionTypeIndex) {
        const region = Grid.getRegionAt(regionTypeIndex, cell.getIndex());
        for (let i = 0; i < 9; i++) {
          const next = region.getCell(i);
          if (loop[0].equals(next) && loop.length >= 4) {
            // Yeah, the loop is closed. Save a copy
            results.push(loop.slice());
          } else if (!loop.some((c) => c.equals(next))) {
            const potentials = grid.getCellPotentialValues(next.getIndex());
            if (potentials.get(v1) && potentials.get(v2)) {
              const newExValues = exValues.clone(); // Ensure we cleanup ourself
              newExValues.or(potentials);
              newExValues.clear(v1);
              newExValues.clear(v2);
              const cardinality = potentials.cardinality();
              if (cardinality === 2 || newExValues.cardinality() === 1 || allowedEx > 0) {
                let newAllowedEx = allowedEx;
                if (cardinality > 2) newAllowedEx -= 1;
                this.checkForLoops(grid, next, v1, v2, loop, newAllowedEx, newExValues, regionTypeIndex, results);
              }
            }
          } // Not in the loop yet
        } // for i
      } // not last region type
    } // for regionType
    // Rollback
    loop.pop();
  }

  private isValidLoop(grid: Grid, loop: Cell[]): boolean {
    const visitedOdd = new Set<Region>();
    const visitedEven = new Set<Region>();
    let isOdd = false;
    for (const cell of loop) {
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
        const region = Grid.getRegionAt(regionTypeIndex, cell.getIndex());
        if (isOdd) {
          if (visitedOdd.has(region)) return false;
          else visitedOdd.add(region);
        } else {
          if (visitedEven.has(region)) return false;
          else visitedEven.add(region);
        }
      }
      isOdd = !isOdd;
    }
    // All regions must have been visited once with each parity (or never)
    if (visitedOdd.size !== visitedEven.size) return false;
    for (const region of visitedOdd) if (!visitedEven.has(region)) return false;
    return true;
  }

  private createType1Hint(loop: Cell[], rescueCell: Cell, v1: number, v2: number): UniqueLoopHint {
    const removable = new Map<Cell, BitSet32>();
    const values = new BitSet32();
    values.set(v1);
    values.set(v2);
    removable.set(rescueCell, values);
    return new UniqueLoopType1Hint(this, loop, v1, v2, removable, rescueCell);
  }

  private createType2Hint(grid: Grid, loop: Cell[], extraCells: Cell[], v1: number, v2: number): UniqueLoopHint {
    // Get the extra value
    const common = grid.getCellPotentialValues(extraCells[0].getIndex()).clone();
    common.clear(v1);
    common.clear(v2);
    const value = common.nextSetBit(0);
    // Get removable potentials
    const removable = new Map<Cell, BitSet32>();
    let commonCells: CellSet | null = null;
    for (const extraCell of extraCells) {
      if (commonCells === null) commonCells = new CellSet(extraCell.getVisibleCells());
      else commonCells.retainAll(extraCell.getVisibleCells());
    }
    for (const cell of commonCells!) {
      if (!extraCells.some((c) => c.equals(cell))) {
        if (grid.hasCellPotentialValue(cell.getIndex(), value)) removable.set(cell, SingletonBitSet.create(value));
      }
    }
    const cells = extraCells.slice();
    return new UniqueLoopType2Hint(this, loop, v1, v2, removable, cells, value);
  }

  private containsFirst(indexes: number[], index1: number, index2: number): boolean {
    let contains1 = false;
    for (let i = 0; i < indexes.length; i++) {
      if (indexes[i] === index1) contains1 = true;
      else if (indexes[i] === index2) return false;
    }
    return contains1;
  }

  private createType3Hints(grid: Grid, loop: Cell[], c1: Cell, c2: Cell, v1: number, v2: number): UniqueLoopHint[] {
    const result: UniqueLoopHint[] = [];
    // Get the extra values
    const extra = grid.getCellPotentialValues(c1.getIndex()).clone();
    extra.or(grid.getCellPotentialValues(c2.getIndex()));
    extra.clear(v1);
    extra.clear(v2);
    // Look for Naked and hidden Sets. Iterate on degree
    for (let degree = 2; degree <= 7; degree++) {
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
        const region = Grid.getRegionAt(regionTypeIndex, c1.getIndex());
        if (region === Grid.getRegionAt(regionTypeIndex, c2.getIndex())) {
          // Region common to c1 and c2
          const nbEmptyCells = region.getEmptyCellCount(grid);
          const index1 = region.indexOf(c1);
          const index2 = region.indexOf(c2);

          // Look for naked sets
          if (degree * 2 <= nbEmptyCells && degree >= extra.cardinality()) {
            // Look on combinations of cells that include c1 but not c2
            const perm2 = new Permutations(degree, 9);
            while (perm2.hasNext()) {
              const indexes = perm2.nextBitNums();
              if (this.containsFirst(indexes, index1, index2)) {
                // This permutation contains c1 (but not c2)
                const potentials = new Array<BitSet32>(degree);
                // We have to ensure (c1 AND c2) OR otherCells = fullSet
                const nakedSet = extra.clone();
                nakedSet.and(grid.getCellPotentialValues(c1.getIndex()));
                nakedSet.and(grid.getCellPotentialValues(c2.getIndex())); // Common to c1 and c2

                const otherCells = new Array<Cell>(degree - 1);
                let otherIndex = 0;
                for (let i = 0; i < indexes.length; i++) {
                  if (indexes[i] === index1) {
                    potentials[i] = extra; // Index of cell c1. Use extra potentials
                  } else {
                    // Other cell. Use actual potentials
                    const cell = region.getCell(indexes[i]);
                    potentials[i] = grid.getCellPotentialValues(cell.getIndex());
                    nakedSet.or(potentials[i]);
                    otherCells[otherIndex++] = cell;
                  }
                }
                if (nakedSet.cardinality() === degree) {
                  // Look for a common tuple of potential values, with same degree
                  const commonPotentialValues = CommonTuples.searchCommonTuple(potentials, degree);
                  if (commonPotentialValues !== null) {
                    // Potential naked set found
                    const hint = this.createType3NakedHint(grid, loop, v1, v2, extra, region, c1, c2, otherCells, commonPotentialValues);
                    if (hint.isWorth()) result.push(hint);
                  }
                }
              } // if containsFirst
            } // while (perm.hasNext())
          }

          if (degree * 2 < nbEmptyCells) {
            // Look for hidden sets
            const remValues = new Array<number>(7 - extra.cardinality());
            for (let value = 1, dstIndex = 0; value <= 9; value++) {
              if (value !== v1 && value !== v2 && !extra.get(value)) remValues[dstIndex++] = value;
            }
            if (degree - 2 <= remValues.length) {
              const perm1 = new Permutations(degree - 2, remValues.length);
              while (perm1.hasNext()) {
                const pValues = perm1.nextBitNums();
                const values = new Array<number>(degree);
                for (let i = 0; i < pValues.length; i++) values[i] = remValues[pValues[i]];
                values[degree - 2] = v1;
                values[degree - 1] = v2;
                const potentialIndexes = new Array<BitSet32>(degree);
                for (let i = 0; i < degree; i++) {
                  potentialIndexes[i] = region.copyPotentialPositions(grid, values[i]);
                  potentialIndexes[i].clear(index2); // Remove one of the two cells
                }
                const commonPotentialPositions = CommonTuples.searchCommonTupleLight(potentialIndexes, degree);
                if (commonPotentialPositions !== null) {
                  // Potential hidden set found
                  const hiddenValues = new BitSet32();
                  for (let i = 0; i < values.length; i++) hiddenValues.set(values[i]);
                  const hint = this.createType3HiddenHint(grid, loop, v1, v2, extra, hiddenValues, region, c1, c2, commonPotentialPositions);
                  if (hint.isWorth()) result.push(hint);
                }
              }
            }
          }
        } // region common to c1 and c2
      } // for regionType
    } // for degree
    return result;
  }

  private createType3HiddenHint(
    grid: Grid,
    loop: Cell[],
    v1: number,
    v2: number,
    otherValues: BitSet32,
    hiddenValues: BitSet32,
    region: Region,
    c1: Cell,
    c2: Cell,
    potentialIndexes: BitSet32,
  ): UniqueLoopHint {
    // Build other value list
    const oValues = new Array<number>(otherValues.cardinality());
    let dstIndex = 0;
    for (let value = 1; value <= 9; value++) {
      if (otherValues.get(value)) oValues[dstIndex++] = value;
    }
    const index1 = region.indexOf(c1);
    const index2 = region.indexOf(c2);
    potentialIndexes.clear(index1);
    potentialIndexes.clear(index2);
    const removable = new Map<Cell, BitSet32>();
    for (let i = 0; i < 9; i++) {
      if (potentialIndexes.get(i)) {
        const cell = region.getCell(i);
        if (!cell.equals(c1) && !cell.equals(c2)) {
          const values = new BitSet32();
          for (let value = 1; value <= 9; value++) {
            if (!hiddenValues.get(value) && grid.hasCellPotentialValue(cell.getIndex(), value)) values.set(value);
          }
          if (!values.isEmpty()) removable.set(cell, values);
        }
      }
    }
    const indexes = new Array<number>(potentialIndexes.cardinality());
    for (let i = 0, j = 0; i < 9; i++) {
      if (potentialIndexes.get(i)) indexes[j++] = i;
    }
    return new UniqueLoopType3HiddenHint(this, loop, v1, v2, removable, c1, c2, oValues, hiddenValues, region, indexes);
  }

  private createType3NakedHint(
    grid: Grid,
    loop: Cell[],
    v1: number,
    v2: number,
    otherValues: BitSet32,
    region: Region,
    c1: Cell,
    c2: Cell,
    cells: Cell[],
    commonPotentialValues: BitSet32,
  ): UniqueLoopHint {
    // Build other value list
    const oValues = new Array<number>(otherValues.cardinality());
    let dstIndex = 0;
    for (let value = 1; value <= 9; value++) {
      if (otherValues.get(value)) oValues[dstIndex++] = value;
    }
    // Build naked set value list
    const nValues = new Array<number>(commonPotentialValues.cardinality());
    dstIndex = 0;
    for (let value = 1; value <= 9; value++) {
      if (commonPotentialValues.get(value)) nValues[dstIndex++] = value;
    }
    // Build removable potentials (isVLatin frozen true)
    const removable = new Map<Cell, BitSet32>();
    for (let i = 0; i < 9; i++) {
      const otherCell = region.getCell(i);
      if (!cells.some((c) => c.equals(otherCell)) && !c1.equals(otherCell) && !c2.equals(otherCell)) {
        // Get removable potentials
        const removablePotentials = new BitSet32();
        for (let value = 1; value <= 9; value++) {
          if (commonPotentialValues.get(value) && grid.hasCellPotentialValue(otherCell.getIndex(), value)) removablePotentials.set(value);
        }
        if (!removablePotentials.isEmpty()) removable.set(otherCell, removablePotentials);
      }
    }
    return new UniqueLoopType3NakedHint(this, loop, v1, v2, removable, c1, c2, oValues, region, cells, nValues);
  }

  private createType4Hint(grid: Grid, loop: Cell[], c1: Cell, c2: Cell, v1: number, v2: number): UniqueLoopHint | null {
    // Look for v1 or v2 locked in a region of c1 and c2
    let r1: Region | null = null;
    let r2: Region | null = null;
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const region = Grid.getRegionAt(regionTypeIndex, c1.getIndex());
      if (region === Grid.getRegionAt(regionTypeIndex, c2.getIndex())) {
        // Region common to c1 and c2
        let hasValue1 = false;
        let hasValue2 = false;
        for (let i = 0; i < 9; i++) {
          const cell = region.getCell(i);
          if (!cell.equals(c1) && !cell.equals(c2)) {
            if (grid.hasCellPotentialValue(cell.getIndex(), v1)) hasValue1 = true;
            if (grid.hasCellPotentialValue(cell.getIndex(), v2)) hasValue2 = true;
          }
        }
        if (!hasValue1) r1 = region;
        if (!hasValue2) r2 = region;
      }
    }
    let region: Region | null = null;
    let lockValue = -1;
    let remValue = -1;
    const removable = new Map<Cell, BitSet32>();
    if (r1 !== null) {
      region = r1;
      lockValue = v1;
      remValue = v2;
      removable.set(c1, SingletonBitSet.create(v2));
      removable.set(c2, SingletonBitSet.create(v2));
    } else if (r2 !== null) {
      region = r2;
      lockValue = v2;
      remValue = v1;
      removable.set(c1, SingletonBitSet.create(v1));
      removable.set(c2, SingletonBitSet.create(v1));
    }
    if (region !== null) return new UniqueLoopType4Hint(this, loop, lockValue, remValue, removable, c1, c2, region);
    return null;
  }

  toString(): string {
    return 'Unique patterns';
  }
}
