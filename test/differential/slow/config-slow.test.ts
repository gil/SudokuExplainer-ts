import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import {
  Settings,
  snapshotSettings,
  restoreSettings,
  type SettingsSnapshot,
} from '../../../src/engine/Settings.js';
import { loadFixtures, type PuzzleFixture } from '../replay.js';
import { runFull } from '../runFull.js';

/**
 * FCPlus only feeds Chaining's otherRules, which are reached from level >= 2
 * nesting, so only the monsters get deep enough to show it. They take minutes
 * each, hence the slow tier.
 *
 * hard-monster-2 has no fcplus2 fixture on purpose. FCPlus=2 puts UniqueLoops
 * into otherRules, and getAdvancedPotentials casts every hint it produces to
 * HasParentPotentialHint, which UniqueLoopType4Hint does not implement. Java
 * dies there with a ClassCastException (Chaining.java:1246), so there is no
 * reference output to record. The port reproduces the defect at the same point,
 * differing only in exception type (TypeError, since the TS cast is structural).
 */
const CONFIGS = [
  { id: 'fcplus1', apply: (s: Settings) => s.setFCPlus(1) },
  { id: 'fcplus2', apply: (s: Settings) => s.setFCPlus(2) },
];

const baselineDir = 'test/fixtures/config-slow/baseline';
const baseline = new Map<string, PuzzleFixture>();
if (existsSync(baselineDir)) for (const f of loadFixtures(baselineDir)) baseline.set(f.id, f);

for (const config of CONFIGS) {
  const dir = `test/fixtures/config-slow/${config.id}`;
  if (!existsSync(dir)) continue;
  const fixtures = loadFixtures(dir);

  describe(`config ${config.id} (slow)`, () => {
    let snap: SettingsSnapshot;
    beforeAll(() => {
      snap = snapshotSettings();
      config.apply(Settings.getInstance());
    });
    afterAll(() => restoreSettings(snap));

    // Java itself takes ~10 minutes on a monster at FCPlus=2, and replaying the
    // path in JS is several times slower again, so this needs a wide budget.
    for (const f of fixtures) it(f.id, () => runFull(f), 3_600_000);

    it('diverges from the default config somewhere', () => {
      const differs = fixtures.some((f) => {
        const b = baseline.get(f.id);
        if (b === undefined) return false;
        return JSON.stringify(b.rating) !== JSON.stringify(f.rating) || b.steps.length !== f.steps.length;
      });
      expect(differs, `${config.id} matches the default on the monsters`).toBe(true);
    });
  });
}
