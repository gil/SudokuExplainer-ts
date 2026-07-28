import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadFixtures } from './replay.js';
import { runFull } from './runFull.js';

// Pencilmark states derived from HoDoKu's reglib-1.3. Each was built so that a
// specific technique is the simplest move available, which is what makes these
// reach techniques the generator-derived corpus never surfaces.
const slow = new Set(
  readFileSync('test/fixtures/reglib-pm-slow-ids.txt', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#')),
);

describe('reglib pencilmark differential', () => {
  for (const f of loadFixtures('test/fixtures/reglib-pm')) {
    if (slow.has(f.id)) continue;
    it(f.id, () => runFull(f));
  }
});
