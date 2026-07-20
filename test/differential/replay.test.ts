import { describe, it } from 'vitest';
import { loadFixtures, replayFixture } from './replay.js';

describe('differential prefix replay', () => {
  for (const f of loadFixtures()) {
    if (f.validity !== null) continue; // warning fixtures are covered in step-008/015 tests
    it(f.id, () => replayFixture(f));
  }
});
