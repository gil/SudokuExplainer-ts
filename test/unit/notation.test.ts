import { afterEach, describe, expect, it } from 'vitest';
import { Cell } from '../../src/engine/Cell.js';
import { Grid, COLUMN, ROW } from '../../src/engine/Grid.js';
import { Settings, snapshotSettings, restoreSettings } from '../../src/engine/Settings.js';
import { createEngine } from '../../src/api/engine.js';

/**
 * Settings.isRCNotation, the one flag that changes hint text without touching
 * the solve path. Expected strings come from probing the Java engine with
 * Grid.getColumnAt / Grid.getCell under both settings.
 */
const pristine = snapshotSettings();
afterEach(() => restoreSettings(pristine));

const PUZZLE = '.6.2..9.......4..31.36.97...518.74.2....9....2.45.638...67.18.45..3.......2..5.3.';

describe('isRCNotation', () => {
  it('defaults to Java rc notation', () => {
    expect(Settings.getInstance().isRCNotation()).toBe(true);
    expect(Grid.getCellXY(0, 0).toString()).toBe('r1c1');
    expect(Grid.getCellXY(4, 7).toString()).toBe('r8c5');
    expect(Grid.getCellXY(4, 7).toFullString()).toBe('Cell r8c5');
    expect(Cell.toString(Grid.getCellXY(0, 0), Grid.getCellXY(8, 8))).toBe('r1c1,r9c9');
    expect(Cell.toFullString(Grid.getCellXY(0, 0), Grid.getCellXY(8, 8))).toBe('Cells r1c1,r9c9');
  });

  it('switches cells to chess notation', () => {
    Settings.getInstance().setRCNotation(false);
    expect(Grid.getCellXY(0, 0).toString()).toBe('A1');
    expect(Grid.getCellXY(4, 7).toString()).toBe('E8');
    expect(Grid.getCellXY(8, 8).toFullString()).toBe('Cell I9');
    expect(Cell.toString(Grid.getCellXY(0, 0), Grid.getCellXY(8, 8))).toBe('A1,I9');
  });

  it('switches column full names to letters, and nothing else', () => {
    const s = Settings.getInstance();
    const column = Grid.getRegions(COLUMN)[7];
    const row = Grid.getRegions(ROW)[7];

    expect(column.toFullString()).toBe('column 8');
    expect(column.toFullStringShort()).toBe('c8');
    expect(row.toFullString()).toBe('row 8');

    s.setRCNotation(false);
    expect(column.toFullString()).toBe('column H');
    // Java branches on the flag here too, but both arms are numeric.
    expect(column.toFullStringShort()).toBe('c8');
    expect(row.toFullString()).toBe('row 8');
    expect(row.toFullStringShort()).toBe('r8');
  });

  it('reaches hint text and explanations through the public API', () => {
    const withColumn = (isRCNotation: boolean) => {
      const hints = createEngine({ settings: { isRCNotation } }).getAllHints(PUZZLE);
      return hints.find((h) => h.explain().includes('column '))!;
    };

    const rc = withColumn(true);
    expect(rc.toString()).toBe('2-String Kite 012: Cell r6c2,r6c9,r5c8,r8c8 on value 7');
    expect(rc.explain()).toContain('column 8');

    const chess = withColumn(false);
    expect(chess.toString()).toBe('2-String Kite 012: Cell B6,I6,H5,H8 on value 7');
    expect(chess.explain()).toContain('column H');

    // Structured refs are this port's own surface and stay index-based.
    expect(chess.removals[0].cell.name).toBe(rc.removals[0].cell.name);
  });

  it('does not leak out of the engine that set it', () => {
    createEngine({ settings: { isRCNotation: false } }).getHint(PUZZLE);
    expect(Settings.getInstance().isRCNotation()).toBe(true);
    expect(Grid.getCellXY(0, 0).toString()).toBe('r1c1');
  });
});
