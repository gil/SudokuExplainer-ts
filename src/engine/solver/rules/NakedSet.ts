import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { Permutations } from '../../tools/Permutations.js';
import { CommonTuples } from '../../tools/CommonTuples.js';
import { CellSet } from '../../tools/CellSet.js';
import type { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { NakedSetHint } from './NakedSetHint.js';

// Ported from diuf.sudoku.solver.rules.NakedSet (Naked Pair/Triplet/Quad).
export class NakedSet implements IndirectHintProducer {
  private readonly degree: number;

  constructor(degree: number) {
    this.degree = degree;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    this.getHintsForType(grid, 0, accu); // block
    this.getHintsForType(grid, 2, accu); // column
    this.getHintsForType(grid, 1, accu); // row
  }

  private getHintsForType(grid: Grid, regionTypeIndex: number, accu: HintsAccumulator): void {
    const regions = Grid.getRegions(regionTypeIndex);
    for (const region of regions) {
      if (region.getEmptyCellCount(grid) >= this.degree * 2) {
        const perm = new Permutations(this.degree, 9);
        while (perm.hasNext()) {
          const indexes = perm.nextBitNums();

          const cells: Cell[] = new Array(this.degree);
          for (let i = 0; i < cells.length; i++) cells[i] = region.getCell(indexes[i]);

          const potentialValues: BitSet32[] = new Array(this.degree);
          for (let i = 0; i < this.degree; i++) potentialValues[i] = grid.getCellPotentialValues(cells[i].getIndex());

          const commonPotentialValues = CommonTuples.searchCommonTuple(potentialValues, this.degree);
          if (commonPotentialValues !== null) {
            const hint = this.createValueUniquenessHint(grid, region, cells, commonPotentialValues);
            if (hint.isWorth()) accu.add(hint);
          }
        }
      }
    }
  }

  private createValueUniquenessHint(
    grid: Grid,
    region: Region,
    cells: Cell[],
    commonPotentialValues: BitSet32,
  ): IndirectHint {
    const cellsSet = new CellSet(cells);
    const values: number[] = new Array(this.degree);
    let dstIndex = 0;
    for (let value = 1; value <= 9; value++) {
      if (commonPotentialValues.get(value)) values[dstIndex++] = value;
    }
    const cellPValues = new Map<Cell, BitSet32>();
    for (const cell of cells) {
      const potentials = new BitSet32();
      potentials.or(commonPotentialValues);
      potentials.and(grid.getCellPotentialValues(cell.getIndex()));
      cellPValues.set(cell, potentials);
    }
    const cellRemovePValues = new Map<Cell, BitSet32>(); // Java: HashMap
    for (let i = 0; i < 9; i++) {
      const otherCell = region.getCell(i);
      if (!cellsSet.contains(otherCell)) {
        const removablePotentials = commonPotentialValues.clone();
        removablePotentials.and(grid.getCellPotentialValues(otherCell.getIndex()));
        if (!removablePotentials.isEmpty()) cellRemovePValues.set(otherCell, removablePotentials);
      }
    }
    return new NakedSetHint(this, cells, values, cellPValues, cellRemovePValues, region);
  }

  toString(): string {
    if (this.degree === 2) return 'Naked Pairs';
    else if (this.degree === 3) return 'Naked Triplets';
    else if (this.degree === 4) return 'Naked Quads';
    return 'Naked Sets ' + this.degree;
  }
}
