import { afterEach, describe, expect, it } from 'vitest';
import {
  Settings,
  defaultTechniques,
  snapshotSettings,
  restoreSettings,
} from '../../src/engine/Settings.js';
import { SolvingTechnique } from '../../src/engine/SolvingTechnique.js';
import { createEngine } from '../../src/api/engine.js';

const pristine = snapshotSettings();
afterEach(() => restoreSettings(pristine));

describe('Settings singleton', () => {
  it('is a singleton', () => {
    expect(Settings.getInstance()).toBe(Settings.getInstance());
  });

  it('matches the Java defaults', () => {
    const s = Settings.getInstance();
    expect(s.getRevisedRating()).toBe(0);
    expect(s.batchSolving()).toBe(0);
    expect(s.FCPlus()).toBe(0);
    expect(s.islkSudokuBUG()).toBe(true);
    expect(s.islkSudokuURUL()).toBe(true);
    expect(s.isRCNotation()).toBe(true);
    expect(s.isBringBackSE121()).toBe(false);
    expect(s.getNumThreads()).toBe(1);
    expect(s.getBestHintOnly()).toBe(false);
  });

  it('pins the vanilla region flags', () => {
    const s = Settings.getInstance();
    expect(s.isBlocks()).toBe(true);
    expect(s.isVLatin()).toBe(true);
    expect(s.isVanilla()).toBe(true);
    expect(s.isForbiddenPairs()).toBe(false);
    expect(s.whichNC()).toBe(0);
  });

  it('starts from Settings.init(): everything but 5 and 6 strong links', () => {
    const t = Settings.getInstance().getTechniques();
    expect(t).toEqual(defaultTechniques());
    expect(t.has(SolvingTechnique.FiveStrongLinks)).toBe(false);
    expect(t.has(SolvingTechnique.SixStrongLinks)).toBe(false);
    expect(t.has(SolvingTechnique.NestedForcingChain)).toBe(true);
  });

  it('getTechniques returns a copy, like EnumSet.copyOf', () => {
    const s = Settings.getInstance();
    const t = s.getTechniques();
    t.clear();
    expect(s.getTechniques().size).toBeGreaterThan(0);
  });

  it('settingsBBSE121 applies the SE 1.2.1 technique set', () => {
    const s = Settings.getInstance();
    s.setBringBackSE121(true);
    s.settingsBBSE121();
    const t = s.getTechniques();
    for (const removed of [
      SolvingTechnique.TurbotFish,
      SolvingTechnique.ThreeStrongLinks,
      SolvingTechnique.FourStrongLinks,
      SolvingTechnique.FiveStrongLinks,
      SolvingTechnique.SixStrongLinks,
      SolvingTechnique.WXYZWing,
      SolvingTechnique.VWXYZWing,
      SolvingTechnique.UVWXYZWing,
      SolvingTechnique.TUVWXYZWing,
    ]) {
      expect(t.has(removed), removed).toBe(false);
    }
    // SE 1.2.1 keeps these, and unlike init() it does not drop 5/6 strong links
    // for any other reason, so the classic set is strictly smaller.
    expect(t.has(SolvingTechnique.XYWing)).toBe(true);
    expect(t.has(SolvingTechnique.AlignedPairExclusion)).toBe(true);
    expect(t.size).toBeLessThan(defaultTechniques().size);
  });

  it('snapshot/restore round-trips every mutable flag', () => {
    const s = Settings.getInstance();
    const before = snapshotSettings();

    s.setRevisedRating(1);
    s.setBatchSolving(2);
    s.setFCPlus(2);
    s.setlkSudokuBUG(false);
    s.setlkSudokuURUL(false);
    s.setRCNotation(false);
    s.setBringBackSE121(true);
    s.setNumThreads(4);
    s.setBestHintOnly(true);
    s.setTechniques(new Set([SolvingTechnique.NakedSingle]));

    restoreSettings(before);

    expect(s.getRevisedRating()).toBe(0);
    expect(s.batchSolving()).toBe(0);
    expect(s.FCPlus()).toBe(0);
    expect(s.islkSudokuBUG()).toBe(true);
    expect(s.islkSudokuURUL()).toBe(true);
    expect(s.isRCNotation()).toBe(true);
    expect(s.isBringBackSE121()).toBe(false);
    expect(s.getNumThreads()).toBe(1);
    expect(s.getBestHintOnly()).toBe(false);
    expect(s.getTechniques()).toEqual(defaultTechniques());
  });

  it('the public API does not leak its settings into the singleton', () => {
    const puzzle =
      '.2.....7...4...8...9.628.4.93..5..272.53.49.864..8..13.8.493.5...9...1...7.....3.';
    const engine = createEngine({
      settings: { revisedRating: 1, FCPlus: 2, islkSudokuBUG: false, isBringBackSE121: true },
    });
    engine.checkValidity(puzzle);

    const s = Settings.getInstance();
    expect(s.getRevisedRating()).toBe(0);
    expect(s.FCPlus()).toBe(0);
    expect(s.islkSudokuBUG()).toBe(true);
    expect(s.isBringBackSE121()).toBe(false);
    expect(s.getTechniques()).toEqual(defaultTechniques());
  });

  it('isUsingOneOf / isusingAll / isUsingAllButMaybeNot', () => {
    const s = Settings.getInstance();
    s.setTechniques(new Set([SolvingTechnique.NakedSingle, SolvingTechnique.HiddenSingle]));
    expect(s.isUsingOneOf(SolvingTechnique.NakedSingle, SolvingTechnique.Jellyfish)).toBe(true);
    expect(s.isUsingOneOf(SolvingTechnique.Jellyfish)).toBe(false);
    expect(s.isusingAll(SolvingTechnique.NakedSingle, SolvingTechnique.HiddenSingle)).toBe(true);
    expect(s.isusingAll(SolvingTechnique.NakedSingle, SolvingTechnique.Jellyfish)).toBe(false);
    expect(s.isUsingAllTechniques()).toBe(false);

    const all = new Set(Object.values(SolvingTechnique));
    s.setTechniques(all);
    expect(s.isUsingAllTechniques()).toBe(true);
    expect(s.isUsingAllButMaybeNot()).toBe(true);

    const minusOne = new Set(all);
    minusOne.delete(SolvingTechnique.Jellyfish);
    s.setTechniques(minusOne);
    expect(s.isUsingAllButMaybeNot(SolvingTechnique.Jellyfish)).toBe(true);
    expect(s.isUsingAllButMaybeNot(SolvingTechnique.XYWing)).toBe(false);
  });
});
