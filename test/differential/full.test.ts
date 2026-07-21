import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { Solver } from '../../src/engine/solver/Solver.js';
import { IndirectHint } from '../../src/engine/solver/IndirectHint.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import type { Rule } from '../../src/engine/solver/Rule.js';
import { loadFixtures, type PuzzleFixture, type FixtureStep } from './replay.js';

export const SLOW_IDS = new Set(['hard-monster-1', 'hard-monster-2']);

function checkStep(hint: Hint, step: FixtureStep, ctx: string, grid: Grid): void {
  const rule = hint as unknown as Rule;
  expect(grid.toString81(), ctx).toBe(step.gridBefore);
  expect(rule.getName(), ctx).toBe(step.technique);
  expect(rule.getShortName(), ctx).toBe(step.shortName);
  expect(rule.getDifficulty(), ctx).toBe(step.rating);
  expect(hint.getCell()?.getIndex() ?? -1, ctx).toBe(step.cell);
  expect(hint.getValue(), ctx).toBe(step.value);
  const removals = hint instanceof IndirectHint
    ? [...hint.getRemovablePotentials().entries()]
        .map(([c, v]) => ({ cell: c.getIndex(), values: v.toArray() }))
        .sort((a, b) => a.cell - b.cell)
    : [];
  expect(removals, ctx).toEqual(step.removals);
  expect(hint.toString(), ctx).toBe(step.toString);
}

export function runFull(f: PuzzleFixture): void {
  const grid = new Grid();
  grid.fromString(f.puzzle);
  const solver = new Solver(grid);
  solver.rebuildPotentialValues();

  // step-by-step path via getSingleHint, mirroring getDifficulty's loop
  for (const [i, step] of f.steps.entries()) {
    const hint = solver.getSingleHint();
    expect(hint, `${f.id} step ${i}: hint expected`).not.toBeNull();
    checkStep(hint!, step, `${f.id} step ${i} (${step.technique})`, grid);
    hint!.apply(grid);
  }
  if (f.rating.er !== 20) {
    // path complete unless Java itself gave up
    expect(grid.isSolved() || f.validity !== null, `${f.id} end state`).toBe(true);
  }

  // rating fields via a fresh solver (getDifficulty restores its grid itself)
  const grid2 = new Grid();
  grid2.fromString(f.puzzle);
  const solver2 = new Solver(grid2);
  solver2.rebuildPotentialValues();
  solver2.getDifficulty();
  const r = f.rating;
  expect(solver2.difficulty, f.id).toBe(r.er);
  expect(solver2.pearl, f.id).toBe(r.ep);
  expect(solver2.diamond, f.id).toBe(r.ed);
  expect(solver2.ERtN, f.id).toBe(r.erTechnique);
  expect(solver2.EPtN, f.id).toBe(r.epTechnique);
  expect(solver2.EDtN, f.id).toBe(r.edTechnique);
  expect(solver2.shortERtN, f.id).toBe(r.erShort);
  expect(solver2.shortEPtN, f.id).toBe(r.epShort);
  expect(solver2.shortEDtN, f.id).toBe(r.edShort);
}

describe('full differential', () => {
  for (const f of loadFixtures()) {
    if (SLOW_IDS.has(f.id)) continue;
    it(f.id, () => runFull(f));
  }
});
