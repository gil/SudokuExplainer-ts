import { afterEach, describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { Settings, snapshotSettings, restoreSettings } from '../../src/engine/Settings.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';
import { BivalueUniversalGrave } from '../../src/engine/solver/rules/unique/BivalueUniversalGrave.js';
import type { Hint } from '../../src/engine/solver/Hint.js';

const pristine = snapshotSettings();
afterEach(() => restoreSettings(pristine));

function bugHints(puzzle: string, islkSudokuBUG: boolean): string[] {
  Settings.getInstance().setlkSudokuBUG(islkSudokuBUG);
  const grid = new Grid();
  grid.fromString(puzzle);
  rebuildPotentialValues(grid);
  const out: string[] = [];
  new BivalueUniversalGrave().getHints(grid, {
    add: (h: Hint) => {
      out.push(h.toString());
    },
  });
  return out;
}

/**
 * The differential corpora cannot pin islkSudokuBUG=false down: BUG is
 * registered at 5.6+, so on every one of the 1614 reglib puzzles a simpler
 * technique fires first and the flag never changes the chosen hint. Without
 * this test the false branch would be effectively unverified, since its
 * fixtures are byte-identical to the default config's.
 *
 * rl-0691 separates the two branches at the producer level. lksudoku's fix
 * gathers cells that carry the same extra value across regions (allExtraCells)
 * and promotes them into bugCells, which is what lets the type 2 pattern be
 * recognised. Without it the sweep bails at the "every remaining empty cell
 * must have exactly two candidates" check and finds nothing.
 */
describe('islkSudokuBUG', () => {
  const rl0691 = '357496218892751.6.461.2.5972356471897.9.8.6.56.85.972.17.9658.258....976926.7..51';

  it('finds a BUG type 2 only with the lksudoku fix on', () => {
    expect(bugHints(rl0691, true)).toEqual(['BUG type 2: r5c4,r9c6,r8c4,r8c6 on 3']);
    expect(bugHints(rl0691, false)).toEqual([]);
  });

  it('defaults to the fix being on', () => {
    expect(Settings.getInstance().islkSudokuBUG()).toBe(true);
  });
});
