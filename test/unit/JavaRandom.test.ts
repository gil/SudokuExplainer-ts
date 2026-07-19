import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JavaRandom } from '../../src/engine/util/JavaRandom.js';

const fixtures: Record<string, Record<string, number[]>> = JSON.parse(
  readFileSync('test/fixtures/random.json', 'utf8'),
);

describe('JavaRandom', () => {
  for (const [seed, seqs] of Object.entries(fixtures)) {
    it(`matches java.util.Random(${seed})`, () => {
      const cases: Array<[string, (r: JavaRandom) => number]> = [
        ['nextInt', (r) => r.nextInt()],
        ['nextInt81', (r) => r.nextInt(81)],
        ['nextInt64', (r) => r.nextInt(64)],
        ['nextInt100', (r) => r.nextInt(100)],
      ];
      for (const [key, call] of cases) {
        const rnd = new JavaRandom(BigInt(seed));
        expect(seqs[key].map(() => call(rnd))).toEqual(seqs[key]);
      }
    });
  }

  it('rejects non-positive bounds', () => {
    expect(() => new JavaRandom(1).nextInt(0)).toThrow();
  });
});
