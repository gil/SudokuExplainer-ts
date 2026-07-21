import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JavaRandom } from '../../src/engine/util/JavaRandom.js';
import { Generator } from '../../src/engine/generator/Generator.js';
import { DEFAULT_SYMMETRIES, Symmetry } from '../../src/engine/generator/Symmetry.js';

interface GenFixture { seed: number; minEr: number; maxEr: number; symmetries: string[]; puzzle: string; er: number; }

const fixtures: GenFixture[] = readdirSync('test/fixtures/generator')
  .map((f) => JSON.parse(readFileSync(`test/fixtures/generator/${f}`, 'utf8')));

describe('Symmetry', () => {
  it('default selection matches the Java GenerateDialog set in declaration order', () => {
    expect(DEFAULT_SYMMETRIES.map((s) => s.name))
      .toEqual(['BiDiagonal', 'Orthogonal', 'Rotational180', 'Rotational90', 'Full']);
  });
  it('Rotational180 mirrors through the center', () => {
    const pts = Symmetry.Rotational180.getPoints(1, 2).map((p) => [p.x, p.y]);
    expect(pts).toEqual([[1, 2], [7, 6]]);
  });
});

describe('Generator determinism vs Java', () => {
  for (const f of fixtures) {
    it(`seed ${f.seed} in [${f.minEr}, ${f.maxEr}]`, () => {
      const grid = new Generator().generate(
        DEFAULT_SYMMETRIES, f.minEr, f.maxEr, new JavaRandom(BigInt(f.seed)),
      );
      expect(grid).not.toBeNull();
      expect(grid!.toString81()).toBe(f.puzzle);
    });
  }

  it('returns null when cancelled', () => {
    const grid = new Generator().generate(
      DEFAULT_SYMMETRIES, 1.0, 1.2, new JavaRandom(1n), { shouldCancel: () => true },
    );
    expect(grid).toBeNull();
  });
});
