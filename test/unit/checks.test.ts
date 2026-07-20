import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';
import { InterruptedError } from '../../src/engine/util/InterruptedError.js';
import { SingleHintAccumulator } from '../../src/engine/solver/SingleHintAccumulator.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import { BruteForceAnalysis } from '../../src/engine/solver/checks/BruteForceAnalysis.js';
import { NoDoubles } from '../../src/engine/solver/checks/NoDoubles.js';
import { NumberOfFilledCells } from '../../src/engine/solver/checks/NumberOfFilledCells.js';
import { NumberOfValues } from '../../src/engine/solver/checks/NumberOfValues.js';
import { Solution } from '../../src/engine/solver/checks/Solution.js';

interface Fixture {
  id: string;
  puzzle: string;
  validity: { kind: string; message: string } | null;
  solution: string | null;
}

const fixtures: Fixture[] = readdirSync('test/fixtures/puzzles').map((f) =>
  JSON.parse(readFileSync(`test/fixtures/puzzles/${f}`, 'utf8')),
);

const byId = (id: string): Fixture => {
  const f = fixtures.find((x) => x.id === id);
  if (f === undefined) throw new Error(`missing fixture ${id}`);
  return f;
};

const load = (puzzle: string): Grid => {
  const g = new Grid();
  g.fromString(puzzle);
  rebuildPotentialValues(g);
  return g;
};

const run = (producer: { getHints(g: Grid, a: SingleHintAccumulator): void }, grid: Grid): Hint | null => {
  const accu = new SingleHintAccumulator();
  try {
    producer.getHints(grid, accu);
  } catch (e) {
    if (!(e instanceof InterruptedError)) throw e;
  }
  return accu.getHint();
};

// Java Solver.checkValidity order: validator (NoDoubles) then the warning
// producers; the first hint wins.
const firstValidityHint = (grid: Grid): Hint | null => {
  const producers = [
    new NoDoubles(),
    new NumberOfFilledCells(),
    new NumberOfValues(),
    new BruteForceAnalysis(false),
  ];
  for (const p of producers) {
    const hint = run(p, grid);
    if (hint !== null) return hint;
  }
  return null;
};

describe('BruteForceAnalysis.getCountSolutions', () => {
  for (const f of fixtures) {
    it(`${f.id}: solution count matches validity`, () => {
      const count = new BruteForceAnalysis(false).getCountSolutions(load(f.puzzle));
      if (f.validity === null) expect(count).toBe(1);
      else if (f.validity.kind.includes('DoubleSolution')) expect(count).toBeGreaterThan(1);
    });
  }
});

describe('brute-force solution', () => {
  for (const f of fixtures.filter((x) => x.solution !== null)) {
    it(`${f.id}: solves to the Java solution`, () => {
      const g = load(f.puzzle);
      const hint = run(new Solution(), g);
      expect(hint).not.toBeNull();
      hint!.apply(g);
      expect(g.toString81()).toBe(f.solution);
    });
  }
});

describe('validity warnings match fixtures', () => {
  it('invalid-double: NoDoubles yields the recorded warning', () => {
    const f = byId('invalid-double');
    const hint = run(new NoDoubles(), load(f.puzzle));
    expect(hint).not.toBeNull();
    expect(hint!.constructor.name).toBe(f.validity!.kind);
    expect(hint!.toString()).toBe(f.validity!.message);
  });

  for (const id of ['invalid-fewclues', 'invalid-nosol', 'invalid-empty', 'invalid-multi']) {
    it(`${id}: validity chain matches fixture`, () => {
      const f = byId(id);
      const hint = firstValidityHint(load(f.puzzle));
      expect(hint).not.toBeNull();
      expect(hint!.constructor.name).toBe(f.validity!.kind);
      expect(hint!.toString()).toBe(f.validity!.message);
    });
  }
});
