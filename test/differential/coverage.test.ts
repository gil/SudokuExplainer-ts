import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SolvingTechnique } from '../../src/engine/SolvingTechnique.js';
import { loadFixtures } from './replay.js';

// StrongLinks hint names end in a digit suffix whose length equals linksNumber+1
// (see StrongLinksHint.getName), which is what separates TurbotFish (2),
// ThreeStrongLinks (3) and FourStrongLinks (4) since they share the same name
// stems (Skyscraper / -String Kite / Strong links / X-Loop).
const isStrongLink = (n: string): boolean =>
  n.includes('Skyscraper') ||
  n.includes('-String Kite') ||
  n.includes('Strong links') ||
  n.includes('Strong Links');
const slSuffixLen = (n: string): number => {
  const m = /(\d+)$/.exec(n);
  return m ? m[1].length : -1;
};

// Maps each SolvingTechnique to a predicate over fixture step technique names
// (the real Rule.getName() strings, which differ from the enum display labels
// for chaining, strong links and the direct/big-wing variants).
const NAME_MATCHERS: Partial<Record<SolvingTechnique, (n: string) => boolean>> = {
  [SolvingTechnique.HiddenSingle]: (n) => n === 'Hidden Single',
  [SolvingTechnique.DirectPointing]: (n) => n === 'Direct Pointing' || n === 'Direct Claiming',
  [SolvingTechnique.DirectHiddenPair]: (n) => n === 'Direct Hidden Pair',
  [SolvingTechnique.NakedSingle]: (n) => n === 'Naked Single',
  [SolvingTechnique.DirectHiddenTriplet]: (n) => n === 'Direct Hidden Triplet',
  [SolvingTechnique.PointingClaiming]: (n) => n === 'Pointing' || n === 'Claiming',
  [SolvingTechnique.NakedPair]: (n) => n === 'Naked Pair',
  [SolvingTechnique.XWing]: (n) => n === 'X-Wing' || n === 'Block X-Wing',
  [SolvingTechnique.HiddenPair]: (n) => n === 'Hidden Pair',
  [SolvingTechnique.NakedTriplet]: (n) => n === 'Naked Triplet',
  [SolvingTechnique.Swordfish]: (n) => n === 'Swordfish',
  [SolvingTechnique.HiddenTriplet]: (n) => n === 'Hidden Triplet',
  [SolvingTechnique.TurbotFish]: (n) => isStrongLink(n) && slSuffixLen(n) === 3,
  [SolvingTechnique.XYWing]: (n) => n === 'XY-Wing',
  [SolvingTechnique.XYZWing]: (n) => n === 'XYZ-Wing',
  [SolvingTechnique.WXYZWing]: (n) => n.startsWith('WXYZ-Wing'),
  [SolvingTechnique.UniqueLoop]: (n) => n.startsWith('Unique Rectangle') || n.startsWith('Unique Loop'),
  [SolvingTechnique.NakedQuad]: (n) => n === 'Naked Quad',
  [SolvingTechnique.Jellyfish]: (n) => n === 'Jellyfish',
  [SolvingTechnique.HiddenQuad]: (n) => n === 'Hidden Quad',
  [SolvingTechnique.ThreeStrongLinks]: (n) => isStrongLink(n) && slSuffixLen(n) === 4,
  [SolvingTechnique.VWXYZWing]: (n) => n.startsWith('VWXYZ-Wing'),
  [SolvingTechnique.BivalueUniversalGrave]: (n) => n.startsWith('BUG'),
  [SolvingTechnique.FourStrongLinks]: (n) => isStrongLink(n) && slSuffixLen(n) === 5,
  [SolvingTechnique.AlignedPairExclusion]: (n) => n === 'Aligned Pair Exclusion',
  [SolvingTechnique.FiveStrongLinks]: (n) => isStrongLink(n) && slSuffixLen(n) === 6,
  [SolvingTechnique.SixStrongLinks]: (n) => isStrongLink(n) && slSuffixLen(n) === 7,
  [SolvingTechnique.UVWXYZWing]: (n) => n.startsWith('UVWXYZ-Wing'),
  [SolvingTechnique.ForcingChainCycle]: (n) =>
    n === 'Forcing Chain' || n === 'Bidirectional Cycle' || n === 'Bidirectional Y-Cycle',
  [SolvingTechnique.TUVWXYZWing]: (n) => n.startsWith('TUVWXYZ-Wing'),
  [SolvingTechnique.AlignedTripletExclusion]: (n) => n === 'Aligned Triplet Exclusion',
  [SolvingTechnique.NishioForcingChain]: (n) => n === 'Nishio Forcing Chains',
  [SolvingTechnique.MultipleForcingChain]: (n) => n === 'Cell Forcing Chains' || n === 'Region Forcing Chains',
  [SolvingTechnique.DynamicForcingChain]: (n) =>
    n.startsWith('Dynamic') && n.endsWith('Forcing Chains') && !n.includes('(+'),
  [SolvingTechnique.DynamicForcingChainPlus]: (n) => n.startsWith('Dynamic') && n.includes('(+'),
  [SolvingTechnique.NestedForcingChain]: (n) => n.includes('Nested'),
};

// Every corpus contributes coverage, and any of them may carry an
// "# uncovered:" line justifying a technique that still cannot be reached.
const CORPUS_HEADERS = ['test/fixtures/corpus.txt', 'test/fixtures/reglib-pm-corpus.txt'];
const FIXTURE_DIRS = ['test/fixtures/puzzles', 'test/fixtures/reglib-pm', 'test/fixtures/reglib'];

const allowlist = CORPUS_HEADERS.filter((p) => existsSync(p)).flatMap((p) =>
  readFileSync(p, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('# uncovered:'))
    .flatMap((l) => l.replace('# uncovered:', '').split(',').map((s) => s.trim())),
);

describe('every in-scope technique appears in the corpus', () => {
  const seen = new Set<string>();
  for (const dir of FIXTURE_DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of loadFixtures(dir)) for (const s of f.steps) seen.add(s.technique);
  }
  for (const t of Object.values(SolvingTechnique)) {
    if (t === SolvingTechnique.FiveStrongLinks || t === SolvingTechnique.SixStrongLinks) continue; // disabled by default
    if (allowlist.includes(t)) continue;
    it(t, () => {
      const matcher = NAME_MATCHERS[t as SolvingTechnique];
      expect(matcher, `add a NAME_MATCHER entry for ${t}`).toBeDefined();
      expect([...seen].some(matcher!), `no corpus step exercises ${t}`).toBe(true);
    });
  }
});
