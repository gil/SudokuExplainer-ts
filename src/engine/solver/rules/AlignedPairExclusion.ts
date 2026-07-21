import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { Twomutations } from '../../tools/Twomutations.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { HintsAccumulator } from '../HintProducer.js';
import { AlignedExclusion } from './AlignedExclusion.js';
import { AlignedExclusionHint } from './AlignedExclusionHint.js';

// Ported from diuf.sudoku.solver.rules.AlignedPairExclusion.
// The specialized degree-2 scanner.
export class AlignedPairExclusion extends AlignedExclusion {
  constructor() {
    super(2);
  }

  override getHints(grid: Grid, accu: HintsAccumulator): void {
    // Search for "base" cells that can participate to a exclusion set. For each
    // candidate, collect the potentially excluding cells.
    const candidateList: Cell[] = [];
    const cellExcluders = new Map<Cell, Cell[]>();
    for (let i = 0; i < 81; i++) {
      const cell = Grid.getCell(i);
      if (grid.getCellPotentialValues(i).cardinality() >= 2) {
        let hasNakedSingle = false;
        const excludingCells: Cell[] = [];
        for (const excludingCellIndex of cell.getVisibleCellIndexes()) {
          const exclCardinality = grid.getCellPotentialValues(excludingCellIndex).cardinality();
          if (exclCardinality === 1) hasNakedSingle = true;
          else if (exclCardinality === 2) excludingCells.push(Grid.getCell(excludingCellIndex));
        }
        if (!hasNakedSingle && excludingCells.length !== 0) {
          candidateList.push(cell);
          cellExcluders.set(cell, excludingCells);
        }
      }
    }

    if (cellExcluders.size < 2) return;

    // Iterate on the first two cells.
    const cellSetPerm2 = new Twomutations(2, cellExcluders.size);
    while (cellSetPerm2.hasNext()) {
      const indexes = cellSetPerm2.nextBitNums();
      const cells = new Array<Cell>(2);
      cells[0] = candidateList[indexes[0]];
      cells[1] = candidateList[indexes[1]];

      // Build the list of common excluding cells for the base cells 'cells'.
      const excl0 = cellExcluders.get(cells[0])!;
      const excl1 = cellExcluders.get(cells[1])!;
      const commonExcluders = excl0.filter((c) => excl1.includes(c));

      if (commonExcluders.length >= 2) {
        const removablePotentials = new Map<Cell, BitSet32>();

        const allowedPotentialCombinations: number[][] = [];
        const lockedPotentialCombinations = new Map<number[], Cell | null>();
        const v0 = grid.getCellPotentialValues(cells[0].getIndex());
        const v1 = grid.getCellPotentialValues(cells[1].getIndex());

        // Iterate on combinations of potentials accross the base cells.
        for (let pt0 = v0.nextSetBit(0); pt0 >= 0; pt0 = v0.nextSetBit(pt0 + 1)) {
          for (let pt1 = v1.nextSetBit(0); pt1 >= 0; pt1 = v1.nextSetBit(pt1 + 1)) {
            const potentials = [pt0, pt1];
            let isAllowed = true;
            let lockingCell: Cell | null = null;

            // Hidden single rule.
            if (pt0 === pt1 && cells[0].getVisibleCells().containsCell(cells[1])) isAllowed = false;

            // Common excluder cells.
            if (isAllowed) {
              for (const excludingCell of commonExcluders) {
                const values = grid.getCellPotentialValues(excludingCell.getIndex()).clone();
                for (let i = 0; i < 2; i++) values.clear(potentials[i]);
                if (values.isEmpty()) {
                  lockingCell = excludingCell;
                  isAllowed = false;
                  break;
                }
              }
            }

            if (isAllowed) allowedPotentialCombinations.push(potentials);
            else lockedPotentialCombinations.set(potentials, lockingCell);
          }
        }

        // For all potentials of all base cells, test if the value is possible
        // in at least one allowed combination.
        for (let i = 0; i < 2; i++) {
          const cell = cells[i];
          const values = grid.getCellPotentialValues(cell.getIndex());
          for (let p = values.nextSetBit(0); p >= 0; p = values.nextSetBit(p + 1)) {
            let isValueAllowed = false;
            for (const combinations of allowedPotentialCombinations) {
              if (combinations[i] === p) isValueAllowed = true;
            }
            if (!isValueAllowed) {
              const existing = removablePotentials.get(cell);
              if (existing) existing.set(p);
              else removablePotentials.set(cell, SingletonBitSet.create(p));
            }
          }
        }

        const hint = new AlignedExclusionHint(this, removablePotentials, cells, lockedPotentialCombinations);
        if (hint.isWorth()) accu.add(hint);
      }
    }
  }
}
