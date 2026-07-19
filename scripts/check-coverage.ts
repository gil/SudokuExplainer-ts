import { readFileSync, readdirSync } from 'node:fs';

// Substrings adjusted to the real Rule.getName() strings this corpus produces
// (see the "distinct step techniques" output). Turbot fish surface as
// Skyscraper/Kite/X-Loop, strong-link fishes as "N Strong Links ...", and BUG
// as "BUG type N", so those literal enum labels are not the substrings to match.
const REQUIRED = [
  'Hidden Single', 'Direct Pointing', 'Direct Hidden Pair', 'Naked Single',
  'Direct Hidden Triplet', 'Pointing', 'Claiming', 'Naked Pair', 'X-Wing',
  'Hidden Pair', 'Naked Triplet', 'Swordfish', 'Hidden Triplet',
  'XY-Wing', 'XYZ-Wing', 'Unique', 'Naked Quad', 'Jellyfish', 'Hidden Quad',
  'WXYZ-Wing', 'VWXYZ-Wing', 'UVWXYZ-Wing', 'TUVWXYZ-Wing',
  'BUG', 'Aligned Pair Exclusion', 'Aligned Triplet Exclusion',
  'Skyscraper', 'Kite', 'Strong Links',
  'Forcing Chain', 'Bidirectional', 'Nishio', 'Dynamic', 'Nested',
];

const seen = new Set<string>();
for (const f of readdirSync('test/fixtures/puzzles')) {
  const fx = JSON.parse(readFileSync(`test/fixtures/puzzles/${f}`, 'utf8'));
  for (const s of fx.steps) seen.add(s.technique);
}
console.log('distinct step techniques:', [...seen].sort());
const missing = REQUIRED.filter((r) => ![...seen].some((t) => t.includes(r)));
console.log('missing (substring match):', missing);
