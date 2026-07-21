import type { ChainingHint } from './ChainingHint.js';
import type { Potential } from './Potential.js';

function listEquals(a: Potential[], b: Potential[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!a[i].equals(b[i])) return false;
  return true;
}

// Ported from diuf.sudoku.solver.rules.chaining.FullChain. Wraps a chaining
// hint and compares by the entire chains instead of just the outcome.
export class FullChain {
  private readonly chain: ChainingHint;

  constructor(target: ChainingHint) {
    this.chain = target;
  }

  equals(o: unknown): boolean {
    if (o instanceof FullChain) {
      const thisTargets = [...this.chain.getChainsTargets()];
      const otherTargets = [...o.chain.getChainsTargets()];
      if (!listEquals(thisTargets, otherTargets)) return false;
      for (let i = 0; i < thisTargets.length && i < otherTargets.length; i++) {
        if (!listEquals(this.chain.getChain(thisTargets[i]), o.chain.getChain(otherTargets[i])))
          return false;
      }
      return true;
    }
    return false;
  }
}
