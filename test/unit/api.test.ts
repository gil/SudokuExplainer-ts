import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEngine, InvalidGridError, rate } from '../../src/index.js';

const fx = (id: string) =>
  JSON.parse(readFileSync(`test/fixtures/puzzles/${id}.json`, 'utf8'));

const engine = createEngine();

describe('rate', () => {
  it('matches the fixture rating and technique names', () => {
    const f = fx('easy-s1');
    const r = engine.rate(f.puzzle);
    expect(r.er).toBe(f.rating.er);
    expect(r.ep).toBe(f.rating.ep);
    expect(r.ed).toBe(f.rating.ed);
    expect(r.erTechnique).toBe(f.rating.erTechnique);
    expect(r.erTechniqueShort).toBe(f.rating.erShort);
  });
  it('is exposed as a top-level convenience function', () => {
    expect(rate(fx('easy-s1').puzzle).er).toBe(fx('easy-s1').rating.er);
  });
});

describe('solvePath', () => {
  it('walks the fixture path and completes', () => {
    const f = fx('easy-s1');
    const { steps, complete } = engine.solvePath(f.puzzle);
    expect(complete).toBe(true);
    expect(steps).toHaveLength(f.steps.length);
    expect(steps[0].hint.name).toBe(f.steps[0].technique);
    expect(steps[0].hint.toString()).toBe(f.steps[0].toString);
    expect(steps[0].gridBefore).toHaveLength(81);
  });
});

describe('hints', () => {
  it('getHint returns the first fixture step', () => {
    const f = fx('easy-s1');
    const h = engine.getHint(f.puzzle);
    expect(h).not.toBeNull();
    expect(h!.name).toBe(f.steps[0].technique);
    expect(h!.removals[0]?.values ?? []).toEqual(f.steps[0].removals[0]?.values ?? []);
    expect(h!.explain()).toContain(h!.name.split(' ')[0]); // markdown resolved, no {0} left
    expect(h!.explain()).not.toMatch(/\{\d+\}/);
  });
  it('getAllHints returns multiple structured hints', () => {
    expect(engine.getAllHints(fx('easy-s1').puzzle).length).toBeGreaterThan(1);
  });
  // Guards the default (no pencil marks) path against the Java-derived fixtures
  // across every band, so a change to how the grid is loaded cannot slip past.
  const ids = ['easy-s1', 'medium-s3', 'hard-s1', 'fiendish-s3', 'diabolical-s1',
    'cover-swordfish', 'cover-uloop1', 'cover-ate'];
  for (const id of ids) {
    it(`getHint matches the first fixture step of ${id}`, () => {
      const f = fx(id);
      const step = f.steps[0];
      const h = engine.getHint(f.puzzle)!;
      expect(h.name).toBe(step.technique);
      expect(h.shortName).toBe(step.shortName);
      expect(h.difficulty).toBe(step.rating);
      expect(h.cell?.index ?? -1).toBe(step.cell);
      expect(h.value ?? 0).toBe(step.value);
      expect(h.removals.map((r) => ({ cell: r.cell.index, values: r.values }))).toEqual(step.removals);
      expect(h.toString()).toBe(step.toString);
    });
  }
});

describe('solve and validity', () => {
  it('solve returns the brute-force solution', () => {
    const f = fx('easy-s1');
    expect(engine.solve(f.puzzle).join('')).toBe(f.solution);
  });
  it('checkValidity maps warning kinds', () => {
    expect(engine.checkValidity(fx('easy-s1').puzzle)).toBeNull();
    const w = engine.checkValidity(fx('invalid-double').puzzle)!;
    expect(w.kind).toBe('duplicateValue');
    expect(w.message.length).toBeGreaterThan(0);
    expect(w.explain().length).toBeGreaterThan(0);
  });
  it('rejects malformed input', () => {
    expect(() => engine.rate('123')).toThrow(InvalidGridError);
    expect(() => engine.rate('x'.repeat(81))).toThrow(InvalidGridError);
    expect(() => engine.rate(new Array(81).fill(10) as number[])).toThrow(InvalidGridError);
  });
});

describe('generate', () => {
  it('reproduces the seeded generator fixture', () => {
    const gf = JSON.parse(readFileSync('test/fixtures/generator/easy-s1.json', 'utf8'));
    const out = engine.generate({ difficulty: 'easy', seed: gf.seed })!;
    expect(out.puzzle.map((v) => (v === 0 ? '.' : v)).join('')).toBe(gf.puzzle);
    expect(out.rating.er).toBe(gf.er);
    expect(out.solution).toHaveLength(81);
  });
  it('returns null when cancelled', () => {
    expect(engine.generate({ shouldCancel: () => true })).toBeNull();
  });
});
