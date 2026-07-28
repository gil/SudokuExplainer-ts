import { describe, expect, it } from 'vitest';
import { Grid, ROW } from '../../src/engine/Grid.js';
import { rebuildPotentialValues, cancelPotentialValues } from '../../src/engine/solver/potentials.js';

const PUZZLE = '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..';

describe('Grid', () => {
  it('round-trips fromString/toString81', () => {
    const g = new Grid();
    g.fromString(PUZZLE);
    expect(g.toString81()).toBe(PUZZLE.replace(/0/g, '.'));
    expect(g.getCellValue(2)).toBe(3);
    expect(g.getCellValue(0)).toBe(0);
  });

  it('visibleCellIndex matches the Java table spot checks', () => {
    expect(Grid.visibleCellIndex[0]).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72],
    );
    expect(Grid.visibleCellIndex[80]).toEqual(
      [8, 17, 26, 35, 44, 53, 60, 61, 62, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
    );
  });

  it('rebuildPotentialValues cancels values seen by filled cells', () => {
    const g = new Grid();
    g.fromString(PUZZLE);
    rebuildPotentialValues(g);
    // r1c1 (index 0) sees 3 in its row and block; 3 must not be a candidate
    expect(g.hasCellPotentialValue(0, 3)).toBe(false);
    // 4 appears nowhere visible from r1c1
    expect(g.hasCellPotentialValue(0, 4)).toBe(true);
    // filled cells keep empty potential sets
    expect(g.getCellPotentialValues(2).isEmpty()).toBe(true);
  });

  it('regions expose membership and potential positions', () => {
    const g = new Grid();
    g.fromString(PUZZLE);
    rebuildPotentialValues(g);
    const row0 = Grid.getRegions(ROW)[0];
    expect(row0.getCell(2).getIndex()).toBe(2);
    const positions = row0.getPotentialPositions(g, 4);
    expect(positions.get(2)).toBe(false); // cell already filled with 3
  });

  it('copyTo copies values, potentials and givens', () => {
    const a = new Grid();
    a.fromString(PUZZLE);
    rebuildPotentialValues(a);
    const b = new Grid();
    a.copyTo(b);
    expect(b.toString81()).toBe(a.toString81());
    expect(b.getCellPotentialValues(0).equals(a.getCellPotentialValues(0))).toBe(true);
    b.setCellValue(0, 4);
    cancelPotentialValues(b);
    expect(a.getCellValue(0)).toBe(0); // deep copy
  });

  describe('pencilmark (Sukaku) input', () => {
    // A 729-char string maps position `cell * 9 + (value - 1)` to a candidate.
    const marks = (cands: Record<number, number[]>): string => {
      let out = '';
      for (let i = 0; i < 81; i++) {
        for (let v = 1; v <= 9; v++) out += cands[i]?.includes(v) ? String(v) : '.';
      }
      return out;
    };

    it('loads candidates and places nothing on its own', () => {
      const g = new Grid();
      g.fromString(marks({ 0: [1, 5], 1: [3] }));
      expect(g.getCellPotentialValues(0).toArray()).toEqual([1, 5]);
      expect(g.getCellPotentialValues(1).toArray()).toEqual([3]);
      expect(g.getCellValue(0)).toBe(0);
      expect(g.getCellValue(1)).toBe(0);
    });

    it('adjustPencilmarks places a lone candidate no peer shares', () => {
      const g = new Grid();
      g.fromString(marks({ 1: [3] }));
      g.adjustPencilmarks();
      expect(g.getCellValue(1)).toBe(3);
      expect(g.getCellPotentialValues(1).toArray()).toEqual([]);
    });

    it('adjustPencilmarks leaves a lone candidate a peer still shares', () => {
      const g = new Grid();
      g.fromString(marks({ 1: [3], 2: [3, 7] })); // r1c2 and r1c3 both see 3
      g.adjustPencilmarks();
      expect(g.getCellValue(1)).toBe(0);
      expect(g.getCellPotentialValues(1).toArray()).toEqual([3]);
    });

    it('is a no-op on 81-char input, whose potentials are still empty', () => {
      const g = new Grid();
      g.fromString(PUZZLE);
      const before = g.toString81();
      g.adjustPencilmarks();
      expect(g.toString81()).toBe(before);
    });

    it('tracks isSudoku / setSukaku', () => {
      const g = new Grid();
      expect(g.isSudoku()).toBe(1);
      g.setSukaku();
      expect(g.isSudoku()).toBe(0);
    });
  });
});
