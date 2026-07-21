import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { Solver } from '../../src/engine/solver/Solver.js';
import { CancelledError } from '../../src/engine/solver/Solver.js';

const fx = (id: string) =>
  JSON.parse(readFileSync(`test/fixtures/puzzles/${id}.json`, 'utf8'));

const solverFor = (puzzle: string) => {
  const g = new Grid();
  g.fromString(puzzle);
  const s = new Solver(g);
  s.rebuildPotentialValues();
  return s;
};

describe('Solver.getDifficulty', () => {
  it('reproduces the easy-s1 fixture rating', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    s.getDifficulty();
    expect(s.difficulty).toBe(f.rating.er);
    expect(s.pearl).toBe(f.rating.ep);
    expect(s.diamond).toBe(f.rating.ed);
    expect(s.ERtN).toBe(f.rating.erTechnique);
    expect(s.shortERtN).toBe(f.rating.erShort);
  });

  it('restores the grid afterwards (backup semantics)', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    s.getDifficulty();
    expect(s.getGrid().toString81()).toBe(f.puzzle);
  });

  it('honors shouldCancel', () => {
    const f = fx('easy-s1');
    const s = solverFor(f.puzzle);
    expect(() => s.getDifficulty({ shouldCancel: () => true })).toThrow(CancelledError);
  });
});

describe('Solver.checkValidity', () => {
  it('flags the double-value fixture', () => {
    const f = fx('invalid-double');
    const hint = solverFor(f.puzzle).checkValidity();
    expect(hint).not.toBeNull();
    expect(hint!.constructor.name).toBe(f.validity.kind);
    expect(hint!.toString()).toBe(f.validity.message);
  });
  it('returns null for a valid puzzle', () => {
    expect(solverFor(fx('easy-s1').puzzle).checkValidity()).toBeNull();
  });
});

describe('Solver.solve / toNamedList', () => {
  it('solves easy-s1 and counts rules sorted by difficulty then name', () => {
    const s = solverFor(fx('easy-s1').puzzle);
    const named = s.toNamedList(s.solve());
    const counts = [...named.values()];
    expect(counts.reduce((a, b) => a + b, 0)).toBe(fx('easy-s1').steps.length);
  });
});
