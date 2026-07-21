import { Grid } from '../Grid.js';
import { JavaRandom } from '../util/JavaRandom.js';
import { BruteForceAnalysis } from '../solver/checks/BruteForceAnalysis.js';
import { Solver } from '../solver/Solver.js';
import { Point } from './Point.js';
import { Symmetry } from './Symmetry.js';

export interface GeneratorCallbacks {
  shouldCancel?: () => boolean;
  onAttempt?: (attempt: number) => void;
}

export class Generator {
  private readonly analyser = new BruteForceAnalysis(true);

  generate(
    symmetries: Symmetry[],
    minDifficulty: number,
    maxDifficulty: number,
    rnd: JavaRandom,
    callbacks?: GeneratorCallbacks,
  ): Grid | null {
    let symmetryIndex = rnd.nextInt(symmetries.length);
    for (;;) {
      const symmetry = symmetries[symmetryIndex];
      symmetryIndex = (symmetryIndex + 1) % symmetries.length;
      const grid = this.generateOne(rnd, symmetry);

      if (callbacks?.shouldCancel?.()) return null;

      const copy = new Grid();
      grid.copyTo(copy);
      const solver = new Solver(copy);
      solver.want = 0;
      solver.rebuildPotentialValues();
      const difficulty = solver.analyseDifficulty(
        minDifficulty, maxDifficulty,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        '', '', '', '', '', '', '', '', '', '', '', '',
      );
      if (difficulty >= minDifficulty && difficulty <= maxDifficulty) return grid;

      if (callbacks?.shouldCancel?.()) return null;
    }
  }

  generateOne(rnd: JavaRandom, symmetry: Symmetry): Grid {
    // Build the solution
    const grid = new Grid();
    const solver = new Solver(grid);
    solver.want = 0;
    this.analyser.solveRandom(grid, rnd);
    const solution = new Grid();
    grid.copyTo(solution);

    // Build running indexes
    const indexes = new Array<number>(81);
    for (let i = 0; i < indexes.length; i++) indexes[i] = i;
    // Shuffle
    for (let i = 0; i < 81; i++) {
      const p1 = rnd.nextInt(81);
      const p2 = rnd.nextInt(81);
      const temp = indexes[p1];
      indexes[p1] = indexes[p2];
      indexes[p2] = temp;
    }

    let attempts = 0;

    // Randomly remove clues
    let isSuccess = true;
    while (isSuccess && attempts < 6) {
      // Choose a random cell to clear
      let index = rnd.nextInt(81);
      let countDown = 81; // Number of cells
      isSuccess = false;
      do {
        // Build symmetric points list
        const y = Math.trunc(indexes[index] / 9);
        const x = indexes[index] % 9;
        const points: Point[] = symmetry.getPoints(x, y);

        // Remove cells
        let cellRemoved = false;
        for (const p of points) {
          if (grid.getCellValue(p.x, p.y) !== 0) {
            grid.setCellValue(p.x, p.y, 0);
            cellRemoved = true;
          }
        }
        if (cellRemoved) {
          // Test if the Sudoku still has a unique solution
          const state = this.analyser.getCountSolutions(grid);
          if (state === 1) {
            // Cells successfully removed: still a unique solution
            isSuccess = true;
          } else if (state === 0) {
            // Invalid grid (unreachable under the frozen baseline)
          } else {
            // Failed. Put the cells back and try with next cell
            for (const p of points) {
              grid.setCellValue(p.x, p.y, solution.getCellValue(p.x, p.y));
            }
            attempts += 1;
          }
        }
        index = (index + 1) % 81; // Next index (indexing scrambled array of indexes)
        countDown--;
      } while (!isSuccess && countDown > 0);
    }
    grid.fixGivens();
    return grid;
  }
}
