import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFixtures } from './replay.js';
import { runFull } from './runFull.js';

// The bare 81-char givens of each reglib entry. Weaker than the pencilmark
// corpus (SE rates from scratch and solves around the targeted technique), but
// 1000 grids from a distribution the generator never produces.
const slow = new Set(
  readFileSync('test/fixtures/reglib-slow-ids.txt', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#')),
);

describe('reglib differential', () => {
  for (const f of loadFixtures('test/fixtures/reglib')) {
    if (slow.has(f.id)) continue;
    it(f.id, () => runFull(f));
  }
});
