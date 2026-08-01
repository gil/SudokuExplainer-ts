import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEngine, getHint, InvalidGridError, parseCandidates } from '../../src/index.js';
import type { Hint } from '../../src/index.js';
import { Grid } from '../../src/engine/Grid.js';
import { rebuildPotentialValues } from '../../src/engine/solver/potentials.js';

const engine = createEngine();

// The reported repro: its first hint is elimination-only, so an 81-char caller
// gets it back forever no matter how many eliminations it applies.
const REPRO = '085010036907806000106005098009007040570090001060200900790500004600008509850060000';

/** The candidate set the engine derives itself, as public (bit value-1) masks. */
function derivedMasks(puzzle: string): number[] {
  const g = new Grid();
  g.fromString(puzzle);
  rebuildPotentialValues(g);
  const masks: number[] = [];
  for (let i = 0; i < 81; i++) {
    let mask = 0;
    for (const value of g.getCellPotentialValues(i).toArray()) mask |= 1 << (value - 1);
    masks.push(mask);
  }
  return masks;
}

function toSukakuString(masks: number[]): string {
  let s = '';
  for (const mask of masks) {
    for (let value = 1; value <= 9; value++) {
      s += mask & (1 << (value - 1)) ? String(value) : '.';
    }
  }
  return s;
}

function shape(h: Hint | null) {
  if (h === null) return null;
  const { technique, name, shortName, difficulty, isDirect, cell, value, removals, highlights } = h;
  return {
    technique, name, shortName, difficulty, isDirect, cell, value, removals, highlights,
    explain: h.explain(),
    toString: h.toString(),
  };
}

function applyRemovals(masks: number[], hint: Hint): number[] {
  const next = [...masks];
  for (const r of hint.removals) {
    for (const value of r.values) next[r.cell.index] &= ~(1 << (value - 1));
  }
  return next;
}

describe('sukaku hint input', () => {
  it('an elimination-only hint stops repeating once its removals are fed back', () => {
    const first = engine.getHint(REPRO)!;
    expect(first.name).toBe('Pointing');
    expect(first.removals.length).toBeGreaterThan(0);
    // Without candidates the engine re-derives, so the same hint comes back.
    expect(engine.getHint(REPRO)!.toString()).toBe(first.toString());

    const masks = derivedMasks(REPRO);
    const viaMarks = engine.getHint(REPRO, { candidates: masks })!;
    expect(shape(viaMarks)).toEqual(shape(first));

    const second = engine.getHint(REPRO, { candidates: applyRemovals(masks, viaMarks) })!;
    expect(second.toString()).not.toBe(first.toString());
  });

  it('walks several elimination-only steps without repeating one, and changes technique', () => {
    let masks = derivedMasks(REPRO);
    const seen: string[] = [];
    const techniques = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const hint = engine.getHint(REPRO, { candidates: masks })!;
      expect(hint, `step ${i}`).not.toBeNull();
      // The grid argument never changes, so every step here is elimination-only.
      expect(hint.isDirect, `step ${i} should still be elimination-only`).toBe(false);
      expect(seen, `step ${i}`).not.toContain(hint.toString());
      seen.push(hint.toString());
      techniques.add(hint.name);
      masks = applyRemovals(masks, hint);
    }
    expect(seen).toHaveLength(5);
    expect(techniques.size).toBeGreaterThan(1);
  });

  it('reproduces the derived candidate set exactly, in both input forms', () => {
    const f = JSON.parse(readFileSync('test/fixtures/puzzles/hard-s1.json', 'utf8'));
    const masks = derivedMasks(f.puzzle);
    const plain = shape(engine.getHint(f.puzzle));
    expect(shape(engine.getHint(f.puzzle, { candidates: masks }))).toEqual(plain);
    expect(shape(engine.getHint(f.puzzle, { candidates: toSukakuString(masks) }))).toEqual(plain);

    const allPlain = engine.getAllHints(f.puzzle).map(shape);
    expect(engine.getAllHints(f.puzzle, { candidates: masks }).map(shape)).toEqual(allPlain);
    expect(engine.getAllHints(f.puzzle, { candidates: toSukakuString(masks) }).map(shape))
      .toEqual(allPlain);
    expect(allPlain.length).toBeGreaterThan(1);
  });

  it('ignores the mask of a cell that holds a digit', () => {
    const masks = derivedMasks(REPRO);
    const placed = masks.findIndex((_, i) => REPRO[i] !== '0');
    masks[placed] = 0x1ff;
    expect(shape(engine.getHint(REPRO, { candidates: masks }))).toEqual(shape(engine.getHint(REPRO)));
  });

  it('forgives a stale mark a placed peer already rules out', () => {
    const masks = derivedMasks(REPRO);
    // R1C1 is empty and shares row 1 with the 8 in R1C2.
    expect(REPRO[0]).toBe('0');
    expect(REPRO[1]).toBe('8');
    masks[0] |= 1 << (8 - 1);
    expect(shape(engine.getHint(REPRO, { candidates: masks }))).toEqual(shape(engine.getHint(REPRO)));
  });

  it('throws for an empty cell left with no candidate', () => {
    const masks = derivedMasks(REPRO);
    masks[0] = 0;
    expect(() => engine.getHint(REPRO, { candidates: masks }))
      .toThrow(/Cell R1C1 is empty but has no candidates/);
    expect(() => engine.getHint(REPRO, { candidates: masks })).toThrow(InvalidGridError);
    expect(() => engine.getAllHints(REPRO, { candidates: masks })).toThrow(InvalidGridError);
  });

  it('throws when cancelling a peer digit empties a cell', () => {
    const masks = derivedMasks(REPRO);
    masks[0] = 1 << (8 - 1); // only the 8 that R1C2 already holds
    expect(() => engine.getHint(REPRO, { candidates: masks }))
      .toThrow(/Cell R1C1 is empty but has no candidates/);
  });

  it('is reachable from the top-level functions', () => {
    const masks = derivedMasks(REPRO);
    expect(getHint(REPRO, { candidates: masks })!.toString()).toBe(getHint(REPRO)!.toString());
  });
});

describe('parseCandidates', () => {
  const full = toSukakuString(new Array(81).fill(0x1ff));

  it('accepts both forms and normalises to masks', () => {
    expect(parseCandidates(full)).toEqual(new Array(81).fill(0x1ff));
    expect(parseCandidates(new Array(81).fill(0))).toEqual(new Array(81).fill(0));
    expect(parseCandidates(full.replace(/1/g, '0'))[0]).toBe(0x1ff & ~1);
    expect(parseCandidates('\n' + full)).toEqual(new Array(81).fill(0x1ff));
  });

  it('rejects a string of the wrong length', () => {
    expect(() => parseCandidates('123')).toThrow(InvalidGridError);
    expect(() => parseCandidates(full.slice(1))).toThrow(/must be 729 characters, got 728/);
    expect(() => parseCandidates(full + '1')).toThrow(/got 730/);
  });

  it('rejects bad characters', () => {
    expect(() => parseCandidates('x' + full.slice(1))).toThrow(/Invalid character 'x'/);
    expect(() => parseCandidates('x' + full.slice(1))).toThrow(InvalidGridError);
  });

  it('rejects a digit that does not match its own slot', () => {
    expect(() => parseCandidates('2' + full.slice(1)))
      .toThrow(/position 0 holds '2' but that slot is value 1/);
  });

  it('rejects an array of the wrong length', () => {
    expect(() => parseCandidates(new Array(80).fill(0))).toThrow(/must have 81 values, got 80/);
    expect(() => parseCandidates(new Array(82).fill(0))).toThrow(InvalidGridError);
  });

  it('rejects out-of-range and non-integer masks', () => {
    expect(() => parseCandidates([512, ...new Array(80).fill(0)]))
      .toThrow(/Invalid candidate mask 512 \(expected integer 0-511\)/);
    expect(() => parseCandidates([-1, ...new Array(80).fill(0)])).toThrow(InvalidGridError);
    expect(() => parseCandidates([1.5, ...new Array(80).fill(0)])).toThrow(InvalidGridError);
    expect(() => parseCandidates([NaN, ...new Array(80).fill(0)])).toThrow(InvalidGridError);
    expect(() => parseCandidates(['1' as unknown as number, ...new Array(80).fill(0)]))
      .toThrow(InvalidGridError);
  });

  it('rejects anything that is not a string or array', () => {
    expect(() => parseCandidates(null as unknown as string))
      .toThrow(/Candidate input must be a string or number\[\]/);
    expect(() => parseCandidates(42 as unknown as string)).toThrow(InvalidGridError);
  });

  it('surfaces the same errors through getHint', () => {
    expect(() => engine.getHint(REPRO, { candidates: '123' })).toThrow(InvalidGridError);
    expect(() => engine.getAllHints(REPRO, { candidates: new Array(80).fill(0) }))
      .toThrow(InvalidGridError);
  });
});
