import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { Permutations } from '../../tools/Permutations.js';
import { CommonTuples } from '../../tools/CommonTuples.js';
import type { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { HiddenSetHint } from './HiddenSetHint.js';
import { DirectHiddenSetHint } from './DirectHiddenSetHint.js';

// Ported from diuf.sudoku.solver.rules.HiddenSet (Hidden Pair/Triplet/Quad).
export class HiddenSet implements IndirectHintProducer {
  private readonly degree: number;
  private readonly isDirect: boolean;

  constructor(degree: number, isDirect: boolean) {
    this.degree = degree;
    this.isDirect = isDirect;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    this.getHintsForType(grid, 0, accu); // block
    this.getHintsForType(grid, 2, accu); // column
    this.getHintsForType(grid, 1, accu); // row
  }

  private getHintsForType(grid: Grid, regionTypeIndex: number, accu: HintsAccumulator): void {
    const regions = Grid.getRegions(regionTypeIndex);
    for (const region of regions) {
      const nbEmptyCells = region.getEmptyCellCount(grid);
      if (nbEmptyCells > this.degree * 2 || (this.isDirect && nbEmptyCells > this.degree)) {
        const perm = new Permutations(this.degree, 9);
        while (perm.hasNext()) {
          const values = perm.nextBitNums();
          for (let i = 0; i < values.length; i++) values[i] += 1; // 0..8 -> 1..9

          const potentialIndexes: BitSet32[] = new Array(this.degree);
          for (let i = 0; i < this.degree; i++) potentialIndexes[i] = region.getPotentialPositions(grid, values[i]);

          const commonPotentialPositions = CommonTuples.searchCommonTuple(potentialIndexes, this.degree);
          if (commonPotentialPositions !== null) {
            const hint = this.createHiddenSetHint(grid, region, values, commonPotentialPositions);
            if (hint !== null && hint.isWorth()) accu.add(hint);
          }
        }
      }
    }
  }

  private createHiddenSetHint(
    grid: Grid,
    region: Region,
    values: number[],
    commonPotentialPositions: BitSet32,
  ): IndirectHint | null {
    const valueSet = new BitSet32();
    for (let i = 0; i < values.length; i++) valueSet.set(values[i]);

    const cells: Cell[] = new Array(this.degree);
    let dstIndex = 0;
    const cellPValues = new Map<Cell, BitSet32>();
    const cellRemovePValues = new Map<Cell, BitSet32>(); // Java: HashMap
    for (let index = 0; index < 9; index++) {
      const cell = region.getCell(index);
      if (commonPotentialPositions.get(index)) {
        cellPValues.set(cell, valueSet);
        const removablePotentials = new BitSet32();
        for (let value = 1; value <= 9; value++) {
          if (!valueSet.get(value) && grid.hasCellPotentialValue(cell.getIndex(), value)) removablePotentials.set(value);
        }
        if (!removablePotentials.isEmpty()) cellRemovePValues.set(cell, removablePotentials);
        cells[dstIndex++] = cell;
      }
    }
    if (this.isDirect) {
      for (let value = 1; value <= 9; value++) {
        if (!valueSet.get(value)) {
          const positions = region.copyPotentialPositions(grid, value);
          if (positions.cardinality() > 1) {
            positions.andNot(commonPotentialPositions);
            if (positions.cardinality() === 1) {
              const index = positions.nextSetBit(0);
              const cell = region.getCell(index);
              return new DirectHiddenSetHint(this, cells, values, cellPValues, cellRemovePValues, region, cell, value);
            }
          }
        }
      }
      return null;
    } else {
      return new HiddenSetHint(this, cells, values, cellPValues, cellRemovePValues, region);
    }
  }

  toString(): string {
    if (this.degree === 2) {
      return this.isDirect ? 'Direct Hidden Pairs' : 'Hidden Pairs';
    } else if (this.degree === 3) {
      return this.isDirect ? 'Direct Hidden Triplets' : 'Hidden Triplets';
    } else if (this.degree === 4) {
      return 'Hidden Quads';
    }
    return 'Hidden Sets ' + this.degree;
  }
}
