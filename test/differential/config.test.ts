import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import {
  Settings,
  snapshotSettings,
  restoreSettings,
  type SettingsSnapshot,
} from '../../src/engine/Settings.js';
import { loadFixtures, type PuzzleFixture } from './replay.js';
import { runFull } from './runFull.js';
import { runBatch } from './runBatch.js';

/**
 * Differential coverage for the Settings flags that change solving behaviour.
 * Each config varies exactly one factor from the Java defaults, and its
 * fixtures come from the same Java driver via `--set`.
 *
 * A config whose output matches the default proves nothing was wired up, so
 * each one also asserts that it diverges somewhere.
 */
interface Config {
  id: string;
  apply: (s: Settings) => void;
  /** Batch configs replay through getBatchDifficulty, not the step loop. */
  batch?: boolean;
  /**
   * Set when the flag provably changes no output on any corpus we have. The
   * replay tests still run, so the ported branch is held to Java exactly; only
   * the "this flag does something" assertion is waived, with the reason.
   */
  noKnownDivergence?: string;
}

export const CONFIGS: Config[] = [
  { id: 'rr1', apply: (s) => s.setRevisedRating(1) },
  {
    id: 'bbse121',
    apply: (s) => {
      s.setBringBackSE121(true);
      s.settingsBBSE121();
    },
  },
  // FCPlus only feeds Chaining's otherRules, which are reached from level >= 2
  // nesting. Nothing in this subset gets that far; the monsters do, and they
  // carry the divergence assertion in the slow tier.
  { id: 'fcplus1', apply: (s) => s.setFCPlus(1), noKnownDivergence: 'covered by the slow tier' },
  { id: 'fcplus2', apply: (s) => s.setFCPlus(2), noKnownDivergence: 'covered by the slow tier' },
  {
    id: 'nobugfix',
    apply: (s) => s.setlkSudokuBUG(false),
    // Deep-compared (every field of every step) across all 1614 reglib puzzles
    // and the base corpus: no divergence. Not because the branches agree, but
    // because BUG is registered at 5.6+, so a simpler technique always fires
    // first and masks it. At producer level the branches DO differ, and
    // test/unit/lkSudokuFlags.test.ts pins that case (verified against Java).
    noKnownDivergence: 'masked in full solves; producer-level case in test/unit/lkSudokuFlags.test.ts',
  },
  { id: 'nourulfix', apply: (s) => s.setlkSudokuURUL(false) },
  { id: 'batch1', apply: (s) => s.setBatchSolving(1), batch: true },
  { id: 'batch2', apply: (s) => s.setBatchSolving(2), batch: true },
  { id: 'chessnotation', apply: (s) => s.setRCNotation(false) },
];

const baseline = new Map<string, PuzzleFixture>();
for (const f of loadFixtures('test/fixtures/config/baseline')) baseline.set(f.id, f);

function differsFromBaseline(f: PuzzleFixture): boolean {
  const b = baseline.get(f.id);
  if (b === undefined) return false;
  if (JSON.stringify(b.rating) !== JSON.stringify(f.rating)) return true;
  if (b.steps.length !== f.steps.length) return true;
  // isRCNotation leaves the solve path alone and only rewrites the hint text.
  return b.steps.some((s, i) => s.toString !== f.steps[i].toString);
}

for (const config of CONFIGS) {
  const dir = `test/fixtures/config/${config.id}`;
  if (!existsSync(dir)) continue;
  const fixtures = loadFixtures(dir);

  describe(`config ${config.id}`, () => {
    let snap: SettingsSnapshot;
    beforeAll(() => {
      snap = snapshotSettings();
      config.apply(Settings.getInstance());
    });
    afterAll(() => restoreSettings(snap));

    const run = config.batch === true ? runBatch : runFull;
    for (const f of fixtures) it(f.id, () => run(f));

    const reason = config.noKnownDivergence;
    if (reason === undefined) {
      it('diverges from the default config somewhere', () => {
        expect(fixtures.some(differsFromBaseline), `${config.id} matches the default everywhere`).toBe(true);
      });
    } else {
      // Guard the guard: if this config starts diverging, the waiver is stale.
      it(`has no known divergence here (${reason})`, () => {
        expect(fixtures.some(differsFromBaseline), `${config.id} now diverges, drop its waiver`).toBe(false);
      });
    }
  });
}
