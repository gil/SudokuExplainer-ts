import { describe, it } from 'vitest';
import { loadFixtures } from '../replay.js';
import { runFull, SLOW_IDS } from '../full.test.js';

describe('full differential (slow monsters)', () => {
  for (const f of loadFixtures()) {
    if (!SLOW_IDS.has(f.id)) continue;
    // monster-1 reproduces dynamic forcing chains for ~5-6 minutes, past the
    // 300s global testTimeout, so give the monsters a wide per-test budget.
    it(f.id, () => runFull(f), 600_000);
  }
});
