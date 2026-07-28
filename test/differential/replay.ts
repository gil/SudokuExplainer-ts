import { readFileSync, readdirSync } from 'node:fs';
import { expect } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';
import { SingleHintAccumulator } from '../../src/engine/solver/SingleHintAccumulator.js';
import { InterruptedError } from '../../src/engine/util/InterruptedError.js';
import { IndirectHint } from '../../src/engine/solver/IndirectHint.js';
import type { Hint } from '../../src/engine/solver/Hint.js';
import type { Rule } from '../../src/engine/solver/Rule.js';
import { currentProducers, PORTED_TECHNIQUE_NAMES } from './producers.js';

export interface FixtureStep {
  gridBefore: string; technique: string; shortName: string; rating: number;
  cell: number; value: number;
  removals: { cell: number; values: number[] }[];
  toString: string;
}
export interface FixtureRating {
  er: number; ep: number; ed: number;
  erTechnique: string; epTechnique: string; edTechnique: string;
  erShort: string; epShort: string; edShort: string;
}
export interface PuzzleFixture {
  id: string; puzzle: string;
  validity: { kind: string; message: string } | null;
  solution: string | null;
  rating: FixtureRating;
  steps: FixtureStep[];
}

export function loadFixtures(dir = 'test/fixtures/puzzles'): PuzzleFixture[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')));
}

/**
 * serate.java:672-682, mirrored by Driver.loadGrid/newSolver. adjustPencilmarks
 * runs unconditionally; rebuildPotentialValues runs only below 729 chars,
 * because a pencilmark grid's loaded marks ARE its potentials.
 */
export function loadGrid(puzzle: string): Grid {
  const grid = new Grid();
  grid.fromString(puzzle);
  grid.adjustPencilmarks();
  return grid;
}

export function preparePotentials(grid: Grid, puzzle: string): void {
  if (puzzle.length >= 81 && puzzle.length < 729) rebuildPotentialValues(grid);
}

function findHint(grid: Grid): Hint | null {
  const accu = new SingleHintAccumulator();
  try {
    for (const p of currentProducers()) p.getHints(grid, accu);
  } catch (e) {
    if (!(e instanceof InterruptedError)) throw e;
  }
  return accu.getHint();
}

function removalsOf(hint: Hint): { cell: number; values: number[] }[] {
  if (!(hint instanceof IndirectHint)) return [];
  const entries = [...hint.getRemovablePotentials().entries()]
    .map(([cell, values]) => ({ cell: cell.getIndex(), values: values.toArray() }))
    .sort((a, b) => a.cell - b.cell);
  return entries;
}

export function replayFixture(f: PuzzleFixture): void {
  const grid = loadGrid(f.puzzle);
  preparePotentials(grid, f.puzzle);
  for (const [i, step] of f.steps.entries()) {
    if (!PORTED_TECHNIQUE_NAMES.has(step.technique)) return; // verified prefix ends here
    const hint = findHint(grid);
    const ctx = `${f.id} step ${i} (${step.technique})`;
    expect(hint, ctx).not.toBeNull();
    const rule = hint as unknown as Rule;
    expect(rule.getName(), ctx).toBe(step.technique);
    expect(rule.getShortName(), ctx).toBe(step.shortName);
    expect(rule.getDifficulty(), ctx).toBe(step.rating);
    expect(hint!.getCell()?.getIndex() ?? -1, ctx).toBe(step.cell);
    expect(hint!.getValue(), ctx).toBe(step.value);
    expect(removalsOf(hint!), ctx).toEqual(step.removals);
    expect(hint!.toString(), ctx).toBe(step.toString);
    expect(grid.toString81(), ctx).toBe(step.gridBefore);
    hint!.apply(grid);
  }
}
