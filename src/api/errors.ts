// Thrown when grid input is not a well-formed puzzle (bad length, characters,
// or out-of-range values).
export class InvalidGridError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidGridError';
  }
}

// Thrown by analyze() when the engine cannot solve the puzzle with its enabled
// techniques (Java UnsupportedOperationException -> BeyondSolverInternalError).
export class BeyondSolverError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'BeyondSolverError';
  }
}

export { CancelledError } from '../engine/solver/Solver.js';
