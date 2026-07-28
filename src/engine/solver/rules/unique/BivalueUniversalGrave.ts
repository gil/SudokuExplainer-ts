import { Cell } from '../../../Cell.js';
import { Settings } from '../../../Settings.js';
import { Grid, type Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { CellSet } from '../../../tools/CellSet.js';
import { CommonTuples } from '../../../tools/CommonTuples.js';
import { Permutations } from '../../../tools/Permutations.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import type { IndirectHint } from '../../IndirectHint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../../HintProducer.js';
import { Bug1Hint } from './Bug1Hint.js';
import { Bug2Hint } from './Bug2Hint.js';
import { Bug3Hint } from './Bug3Hint.js';
import { Bug4Hint } from './Bug4Hint.js';

// Ported from diuf.sudoku.solver.rules.unique.BivalueUniversalGrave. Vanilla
// surface only: isVLatin / isVanilla frozen true, so variant branches and
// forbidden-pair restriction checks are dropped. Both islkSudokuBUG branches
// are ported, since serate can turn that fix off.
export class BivalueUniversalGrave implements IndirectHintProducer {
  private readonly temp = new Grid();

  // Replicates java.util.BitSet.size() (word capacity) for a CellSet holding
  // cell indexes 0..80, which the Java code compares against a List size. Not
  // the element count: 64 when the highest set bit is < 64, else 128.
  private static bitSetCapacity(cs: CellSet): number {
    return (cs.bits >> 64n) !== 0n ? 128 : 64;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    grid.copyTo(this.temp);
    const temp = this.temp;
    const bugCells: Cell[] = [];
    const bugValues = new Map<Cell, BitSet32>();
    const allBugValues = new BitSet32();
    let commonCells: CellSet | null = null;
    if (Settings.getInstance().islkSudokuBUG()) {
      // lksudoku handle the case of type 2, a cell with another on every region
      let allExtraCells: CellSet | null = null;
      let onlyValue = 0;
      let oneValue = true;
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
        const regions = Grid.getRegions(regionTypeIndex);
        for (const region of regions) {
          for (let value = 1; value <= 9; value++) {
            // Possible positions of a value in a region (row/column/block):
            const positions = region.getPotentialPositions(grid, value);
            const cardinality = positions.cardinality();
            if (cardinality !== 0 && cardinality !== 2) {
              // The value has not zero or two positions in the region
              // Look for bug cells
              const newBugCells: Cell[] = [];
              for (let index = positions.nextSetBit(0); index >= 0; index = positions.nextSetBit(index + 1)) {
                const cell = region.getCell(index);
                const cellCardinality = grid.getCellPotentialValues(cell.getIndex()).cardinality();
                if (cellCardinality >= 3) newBugCells.push(cell);
              }
              if (allExtraCells === null) {
                allExtraCells = new CellSet(newBugCells);
                onlyValue = value;
              } else if (oneValue) {
                if (onlyValue === value) allExtraCells.addAll(newBugCells);
                else oneValue = false;
              }
              /*
               * If there are two or more positions falling in a bug cell, we cannot
               * decide which one is the buggy one. Just do nothing because another
               * region will capture the correct cell.
               */
              if (newBugCells.length === 1) {
                // A new BUG cell has been found (BUG value = 'value')
                const cell = newBugCells[0];
                if (!bugCells.some((c) => c.equals(cell))) bugCells.push(cell);
                if (!bugValues.has(cell)) bugValues.set(cell, new BitSet32());
                bugValues.get(cell)!.set(value);
                allBugValues.set(value);
                temp.removeCellPotentialValue(cell.getIndex(), value);
                if (commonCells === null) commonCells = new CellSet(cell.getVisibleCells());
                else commonCells.retainAll(cell.getVisibleCells());
                commonCells.removeAll(bugCells);
                if (bugCells.length > 1 && allBugValues.cardinality() > 1 && commonCells.isEmpty()) return; // None of type 1, 2 or 3
              }
              if (newBugCells.length === 0)
                // A value appear more than twice, but no cell has more
                // than two values. => This is not a BUG pattern.
                return;
            }
          } // for value
        } // for region
      } // for regionType
      if (oneValue && allExtraCells !== null && BivalueUniversalGrave.bitSetCapacity(allExtraCells) > bugCells.length) {
        allExtraCells.removeAll(bugCells);
        for (const cell of allExtraCells) {
          bugCells.push(cell);
          bugValues.set(cell, new BitSet32());
          bugValues.get(cell)!.set(onlyValue);
          temp.removeCellPotentialValue(cell.getIndex(), onlyValue);

          if (commonCells === null) commonCells = new CellSet(cell.getVisibleCells());
          else commonCells.retainAll(cell.getVisibleCells());
          commonCells.removeAll(bugCells);
          if (bugCells.length > 1 && allBugValues.cardinality() > 1 && commonCells.isEmpty()) return; // None of type 1, 2 or 3
        }
      }
    } else {
      // Same sweep without lksudoku's type-2 accumulation.
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
        const regions = Grid.getRegions(regionTypeIndex);
        for (const region of regions) {
          for (let value = 1; value <= 9; value++) {
            const positions = region.getPotentialPositions(grid, value);
            const cardinality = positions.cardinality();
            if (cardinality !== 0 && cardinality !== 2) {
              const newBugCells: Cell[] = [];
              for (let index = positions.nextSetBit(0); index >= 0; index = positions.nextSetBit(index + 1)) {
                const cell = region.getCell(index);
                const cellCardinality = grid.getCellPotentialValues(cell.getIndex()).cardinality();
                if (cellCardinality >= 3) newBugCells.push(cell);
              }
              if (newBugCells.length === 1) {
                const cell = newBugCells[0];
                if (!bugCells.some((c) => c.equals(cell))) bugCells.push(cell);
                if (!bugValues.has(cell)) bugValues.set(cell, new BitSet32());
                bugValues.get(cell)!.set(value);
                allBugValues.set(value);
                temp.removeCellPotentialValue(cell.getIndex(), value);
                if (commonCells === null) commonCells = new CellSet(cell.getVisibleCells());
                else commonCells.retainAll(cell.getVisibleCells());
                commonCells.removeAll(bugCells);
                if (bugCells.length > 1 && allBugValues.cardinality() > 1 && commonCells.isEmpty()) return; // None of type 1, 2 or 3
              }
              if (newBugCells.length === 0) return;
            }
          } // for value
        } // for region
      } // for regionType
    }
    // When bug values have been removed, all remaining empty cells must have
    // exactly two potential values. Check it
    for (let i = 0; i < 81; i++) {
      if (temp.getCellValue(i) === 0 && temp.getCellPotentialValues(i).cardinality() !== 2) return; // Not a BUG
    }
    // When bug values have been removed, all remaining candidates must have
    // two positions in each region
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const regions = Grid.getRegions(regionTypeIndex);
      for (const region of regions) {
        for (let value = 1; value <= 9; value++) {
          const positions = region.getPotentialPositions(temp, value);
          const cardinality = positions.cardinality();
          if (cardinality !== 0 && cardinality !== 2) return; // Not a BUG
        }
      }
    }
    if (bugCells.length === 1) {
      // Yeah, potential BUG type-1 pattern found
      this.addBug1Hint(grid, accu, bugCells, allBugValues);
    } else if (allBugValues.cardinality() === 1) {
      // Yeah, potential BUG type-2 or type-4 pattern found
      this.addBug2Hint(grid, accu, bugCells, allBugValues, commonCells);
      if (bugCells.length === 2)
        // Potential BUG type-4 pattern found
        this.addBug4Hint(accu, bugCells, bugValues, allBugValues, commonCells!, grid);
    } else if (commonCells !== null && !commonCells.isEmpty()) {
      if (bugCells.length === 2)
        // Potential BUG type-4 pattern found
        this.addBug4Hint(accu, bugCells, bugValues, allBugValues, commonCells, grid);
      // Yeah, potential BUG type-3 pattern found
      this.addBug3Hint(accu, bugCells, bugValues, allBugValues, commonCells, grid);
    }
  }

  private addBug1Hint(grid: Grid, accu: HintsAccumulator, bugCells: Cell[], extraValues: BitSet32): void {
    const bugCell = bugCells[0];
    const removablePotentials = new Map<Cell, BitSet32>();
    const removable = grid.getCellPotentialValues(bugCell.getIndex()).clone();
    removable.andNot(extraValues);
    removablePotentials.set(bugCell, removable);
    const hint: IndirectHint = new Bug1Hint(this, removablePotentials, bugCell, extraValues);
    accu.add(hint);
  }

  private addBug2Hint(grid: Grid, accu: HintsAccumulator, bugCells: Cell[], extraValues: BitSet32, commonCells: CellSet | null): void {
    const value = extraValues.nextSetBit(0);
    // Cells found ?
    if (commonCells !== null && !commonCells.isEmpty()) {
      const removablePotentials = new Map<Cell, BitSet32>();
      for (const cell of commonCells) {
        if (grid.hasCellPotentialValue(cell.getIndex(), value)) removablePotentials.set(cell, SingletonBitSet.create(value));
      }
      if (removablePotentials.size !== 0) {
        // Create hint
        const arrCells = bugCells.slice();
        const hint: IndirectHint = new Bug2Hint(this, removablePotentials, arrCells, value);
        accu.add(hint);
      }
    }
  }

  private addBug3Hint(
    accu: HintsAccumulator,
    bugCells: Cell[],
    extraValues: Map<Cell, BitSet32>,
    allExtraValues: BitSet32,
    commonCells: CellSet,
    grid: Grid,
  ): void {
    // The two islkSudokuBUG branches run the same body with the loops nested the
    // other way round. lksudoku puts degree outermost so the smallest degree is
    // found first, which changes which hint a SingleHintAccumulator keeps.
    const forRegion = (degree: number, regionTypeIndex: number): void => {
      {
        // Look for a region of this type shared by bugCells
        let region: Region | null = null;
        for (const cell of bugCells) {
          const cellRegion = Grid.getRegionAt(regionTypeIndex, cell.getIndex());
          if (region === null) {
            region = cellRegion;
          } else if (region !== cellRegion) {
            // Cells do not share a region of this type
            region = null;
            break;
          }
        }
        if (region !== null) {
          // A shared region of type regionType has been found
          // Gather other cells of this region
          const regionCells: Cell[] = [];
          for (const cell of commonCells) {
            if (Grid.getRegionAt(regionTypeIndex, cell.getIndex()) === region) regionCells.push(cell);
          }
          // Iterate on permutations of the missing (degree - 1) cells
          if (regionCells.length >= degree) {
            const perm = new Permutations(degree - 1, regionCells.length);
            while (perm.hasNext()) {
              const potentials = new Array<BitSet32>(degree);
              const nakedCells = new Array<Cell>(degree - 1);
              const otherCommon = new BitSet32();
              const indexes = perm.nextBitNums();
              for (let i = 0; i < indexes.length; i++) {
                const cell = regionCells[indexes[i]];
                // Fill array of missing naked cells
                nakedCells[i] = cell;
                const potential = grid.getCellPotentialValues(cell.getIndex());
                // Fill potential values array
                potentials[i] = potential;
                // Gather union of potentials
                otherCommon.or(potential);
              }
              // Get potentials for bug cells
              potentials[degree - 1] = allExtraValues;
              // Ensure that all values of the naked set are covered by non-bug cells
              if (otherCommon.cardinality() === degree) {
                // Search for a naked set
                const nakedSet = CommonTuples.searchCommonTuple(potentials, degree);
                if (nakedSet !== null) {
                  // One of bugCells form a naked set with nakedCells[]
                  // Look for cells not part of the naked set, sharing the region
                  // Java: HashSet (iteration order does not leak; removals are sorted).
                  const erasable = new Set<Cell>(regionCells);
                  for (const cell of nakedCells) erasable.delete(cell); // exclude cells of the naked set
                  for (const cell of bugCells) erasable.delete(cell); // exclude bug cells
                  if (erasable.size !== 0) {
                    // Ok, some cells in a common region. Look for removable potentials
                    const removablePotentials = new Map<Cell, BitSet32>();
                    for (const cell of erasable) {
                      const removable = grid.getCellPotentialValues(cell.getIndex()).clone();
                      removable.and(nakedSet);
                      if (!removable.isEmpty()) removablePotentials.set(cell, removable);
                    }
                    if (removablePotentials.size !== 0) {
                      // Create hint
                      const arrCells = bugCells.slice();
                      const hint: IndirectHint = new Bug3Hint(this, removablePotentials, arrCells, nakedCells, extraValues, allExtraValues, nakedSet, region);
                      accu.add(hint);
                    }
                  } // if (!erasable.isEmpty())
                } // if (nakedSet != null)
              } // if (otherCommon.cardinality() == degree)
            } // while (perm.hasNext())
          } // if (regionCells.size() >= degree)
        } // if (region != null)
      }
    };

    if (Settings.getInstance().islkSudokuBUG()) {
      for (let degree = 2; degree <= 6; degree++)
        for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) forRegion(degree, regionTypeIndex);
    } else {
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++)
        for (let degree = 2; degree <= 6; degree++) forRegion(degree, regionTypeIndex);
    }
  }

  private addBug4Hint(
    accu: HintsAccumulator,
    bugCells: Cell[],
    extraValues: Map<Cell, BitSet32>,
    allExtraValues: BitSet32,
    commonCells: CellSet,
    grid: Grid,
  ): void {
    // Test for a common, non-bug value in both cells
    const c1 = bugCells[0];
    const c2 = bugCells[1];
    const common = new BitSet32();
    common.or(grid.getCellPotentialValues(c1.getIndex()));
    common.and(grid.getCellPotentialValues(c2.getIndex()));
    common.andNot(allExtraValues);
    if (common.cardinality() !== 1) return; // No BUG type 4

    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      // Look for a region of this type shared by all bugCells
      let region: Region | null = null;
      for (const cell of bugCells) {
        const cellRegion = Grid.getRegionAt(regionTypeIndex, cell.getIndex());
        if (region === null) {
          region = cellRegion;
        } else if (region !== cellRegion) {
          // Cells do not share a region of this type
          region = null;
          break;
        }
      }
      if (region !== null) {
        // OK, this is a BUG type 4
        const value = common.nextSetBit(0);
        const removablePotentials = new Map<Cell, BitSet32>();
        const b1 = grid.getCellPotentialValues(c1.getIndex()).clone();
        b1.andNot(extraValues.get(c1)!);
        b1.clear(value);
        removablePotentials.set(c1, b1);
        const b2 = grid.getCellPotentialValues(c2.getIndex()).clone();
        b2.andNot(extraValues.get(c2)!);
        b2.clear(value);
        removablePotentials.set(c2, b2);
        const hint: IndirectHint = new Bug4Hint(this, removablePotentials, c1, c2, extraValues, allExtraValues, value, region);
        accu.add(hint);
      }
    }
  }

  toString(): string {
    return 'Unique patterns';
  }
}
