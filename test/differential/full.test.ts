import { describe, it } from 'vitest';
import { loadFixtures } from './replay.js';
import { runFull, SLOW_IDS } from './runFull.js';

describe('full differential', () => {
  for (const f of loadFixtures()) {
    if (SLOW_IDS.has(f.id)) continue;
    it(f.id, () => runFull(f));
  }
});
