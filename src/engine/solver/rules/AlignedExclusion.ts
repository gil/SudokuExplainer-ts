import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { Permutations } from '../../tools/Permutations.js';
import { Twomutations } from '../../tools/Twomutations.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { HintsAccumulator, IndirectHintProducer } from '../HintProducer.js';
import { AlignedExclusionHint } from './AlignedExclusionHint.js';

// Ported from diuf.sudoku.solver.rules.AlignedExclusion.
// Aligned Set Exclusion technique. Very slow for degree >= 4.
export class AlignedExclusion implements IndirectHintProducer {
  protected readonly degree: number;

  constructor(degree: number) {
    this.degree = degree;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
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
          else if (exclCardinality >= 2 && exclCardinality <= this.degree)
            excludingCells.push(Grid.getCell(excludingCellIndex));
        }
        if (!hasNakedSingle && excludingCells.length !== 0) {
          candidateList.push(cell);
          cellExcluders.set(cell, excludingCells);
        }
      }
    }

    if (cellExcluders.size < this.degree) return;

    // First iterate on the first two cells.
    const cellSetPerm2 = new Twomutations(2, candidateList.length);
    while (cellSetPerm2.hasNext()) {
      const indexes = cellSetPerm2.nextBitNums();
      const cell0 = candidateList[indexes[0]];
      const card0 = grid.getCellPotentialValues(cell0.getIndex()).cardinality();
      const cell1 = candidateList[indexes[1]];
      const card1 = grid.getCellPotentialValues(cell1.getIndex()).cardinality();

      // Create the twinArea: set of cells visible by one of the two first cells.
      const twinArea: Cell[] = [];
      for (const c of cellExcluders.get(cell0)!) if (!twinArea.includes(c)) twinArea.push(c);
      for (const c of cellExcluders.get(cell1)!) if (!twinArea.includes(c)) twinArea.push(c);
      // Retain only other candidates, then remove the two first cells.
      const tailCells = twinArea.filter((c) => candidateList.includes(c) && c !== cell0 && c !== cell1);

      if (tailCells.length >= this.degree - 2) {
        const tailSetPerm = new Permutations(this.degree - 2, tailCells.length);
        while (tailSetPerm.hasNext()) {
          const cells = new Array<Cell>(this.degree);
          const cardinalities = new Array<number>(this.degree);
          cells[0] = cell0;
          cardinalities[0] = card0;
          cells[1] = cell1;
          cardinalities[1] = card1;

          const tindexes = tailSetPerm.nextBitNums();
          for (let i = 0; i < tindexes.length; i++) {
            cells[i + 2] = tailCells[tindexes[i]];
            cardinalities[i + 2] = grid.getCellPotentialValues(cells[i + 2].getIndex()).cardinality();
          }

          // Build the list of common excluding cells for the base cells 'cells'.
          let commonExcluders: Cell[] = [];
          for (let i = 0; i < this.degree; i++) {
            const excludingCells = cellExcluders.get(cells[i])!;
            if (i === 0) commonExcluders = [...excludingCells];
            else commonExcluders = commonExcluders.filter((c) => excludingCells.includes(c));
          }

          if (commonExcluders.length >= 2) {
            const removablePotentials = new Map<Cell, BitSet32>();

            const potIndexes = new Array<number>(this.degree).fill(0);
            const allowedPotentialCombinations: number[][] = [];
            const lockedPotentialCombinations = new Map<number[], Cell | null>();
            let isFinished = false;
            do {
              // Get next combination of potential indexes.
              let z = 0;
              let rollOver = false;
              do {
                if (potIndexes[z] === 0) {
                  rollOver = true;
                  potIndexes[z] = cardinalities[z] - 1;
                  z++;
                } else {
                  rollOver = false;
                  potIndexes[z]--;
                }
              } while (z < this.degree && rollOver);

              // Build the combination of potential values.
              const potentials = new Array<number>(this.degree);
              for (let i = 0; i < this.degree; i++) {
                const values = grid.getCellPotentialValues(cells[i].getIndex());
                let p = values.nextSetBit(0);
                for (let j = 0; j < potIndexes[i]; j++) p = values.nextSetBit(p + 1);
                potentials[i] = p;
              }

              let isAllowed = true;
              let lockingCell: Cell | null = null;
              // Check if this potential combination is allowed, hidden single rule.
              const perm = new Permutations(2, this.degree);
              while (perm.hasNext()) {
                const cellIndexes = perm.nextBitNums();
                const p1 = potentials[cellIndexes[0]];
                const p2 = potentials[cellIndexes[1]];
                if (p1 === p2) {
                  const c1 = cells[cellIndexes[0]];
                  const c2 = cells[cellIndexes[1]];
                  if (c1.getVisibleCells().containsCell(c2)) {
                    isAllowed = false;
                    break;
                  }
                }
              }

              // Check if this potential combination is allowed, using common excluder cells.
              if (isAllowed) {
                for (const excludingCell of commonExcluders) {
                  const values = grid.getCellPotentialValues(excludingCell.getIndex()).clone();
                  for (let i = 0; i < this.degree; i++) values.clear(potentials[i]);
                  if (values.isEmpty()) {
                    lockingCell = excludingCell;
                    isAllowed = false;
                    break;
                  }
                }
              }

              // Store the combination in the appropriate structure.
              if (isAllowed) allowedPotentialCombinations.push(potentials);
              else lockedPotentialCombinations.set(potentials, lockingCell);

              // Check if last combination of potentials from the base cells has been reached.
              isFinished = true;
              for (let i = 0; i < this.degree; i++) if (potIndexes[i] !== 0) isFinished = false;
            } while (!isFinished);

            // For all potentials of all base cells, test if the value is possible
            // in at least one allowed combination.
            for (let i = 0; i < this.degree; i++) {
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
  }

  toString(): string {
    if (this.degree === 2) return 'Aligned Pair Exclusion';
    else if (this.degree === 3) return 'Aligned Triplet Exclusion';
    else if (this.degree === 4) return 'Aligned Quad Exclusion';
    else return 'Aligned Set (' + this.degree + ') Exclusion';
  }
}
