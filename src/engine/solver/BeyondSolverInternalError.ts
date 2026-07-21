// Stand-in for the java.lang.UnsupportedOperationException that Solver.solve
// throws when a Sudoku cannot be solved without brute-force guessing.
export class BeyondSolverInternalError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'BeyondSolverInternalError';
  }
}
