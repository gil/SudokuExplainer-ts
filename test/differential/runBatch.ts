import { expect } from 'vitest';
import { Solver } from '../../src/engine/solver/Solver.js';
import { IndirectHint } from '../../src/engine/solver/IndirectHint.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import type { Rule } from '../../src/engine/solver/Rule.js';
import { loadGrid, preparePotentials, type PuzzleFixture, type FixtureStep } from './replay.js';

/**
 * Batch-mode counterpart to runFull. getBatchDifficulty applies every hint of
 * the smallest rating per round, so a step's gridBefore is only re-read once
 * per batch, not once per hint. Driver.Recorder has the same shape, so the
 * hooks here mirror it exactly and the recorded sequences are compared directly.
 */
export function runBatch(f: PuzzleFixture): void {
  const grid = loadGrid(f.puzzle);
  const solver = new Solver(grid);
  preparePotentials(grid, f.puzzle);

  const steps: FixtureStep[] = [];
  let gridBefore = '';
  solver.getBatchDifficulty({
    beforeHint: () => {
      gridBefore = grid.toString81();
    },
    afterHint: (_s, hint: Hint) => {
      const rule = hint as unknown as Rule;
      const removals =
        hint instanceof IndirectHint
          ? [...hint.getRemovablePotentials().entries()]
              .map(([c, v]) => ({ cell: c.getIndex(), values: v.toArray() }))
              .sort((a, b) => a.cell - b.cell)
          : [];
      steps.push({
        gridBefore,
        technique: rule.getName(),
        shortName: rule.getShortName(),
        rating: rule.getDifficulty(),
        cell: hint.getCell()?.getIndex() ?? -1,
        value: hint.getValue(),
        removals,
        toString: hint.toString(),
      });
    },
  });

  expect(steps.length, `${f.id} step count`).toBe(f.steps.length);
  for (const [i, expected] of f.steps.entries()) {
    expect(steps[i], `${f.id} step ${i} (${expected.technique})`).toEqual(expected);
  }

  const r = f.rating;
  expect(solver.difficulty, f.id).toBe(r.er);
  expect(solver.pearl, f.id).toBe(r.ep);
  expect(solver.diamond, f.id).toBe(r.ed);
  expect(solver.ERtN, f.id).toBe(r.erTechnique);
  expect(solver.EPtN, f.id).toBe(r.epTechnique);
  expect(solver.EDtN, f.id).toBe(r.edTechnique);
  expect(solver.shortERtN, f.id).toBe(r.erShort);
  expect(solver.shortEPtN, f.id).toBe(r.epShort);
  expect(solver.shortEDtN, f.id).toBe(r.edShort);
}
