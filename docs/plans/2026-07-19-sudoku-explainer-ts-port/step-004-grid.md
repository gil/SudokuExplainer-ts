# Step 4: Grid Model (SolvingTechnique, Options, Cell, Grid, Link, Potentials)

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-003 (`BitSet32`)

**Files:**

- Port from: `SukakuExplainer/diuf/sudoku/SolvingTechnique.java`, `Settings.java`, `Cell.java`, `Grid.java`, `Link.java`, and `Solver.java` lines 286-352 (potentials)
- Create: `src/engine/SolvingTechnique.ts`, `src/engine/Options.ts`, `src/engine/Cell.ts`, `src/engine/Grid.ts`, `src/engine/Link.ts`, `src/engine/solver/potentials.ts`
- Test: `test/unit/Grid.test.ts`

**Interfaces:**

- Consumes: `BitSet32` from `src/engine/util/BitSet32.ts`.
- Produces: everything in the overview's "Core shared interfaces" block for `Grid` and `potentials`, plus the items below. All later steps import these names verbatim.

```ts
// src/engine/SolvingTechnique.ts
export enum SolvingTechnique { HiddenSingle = 'Hidden Single', /* ...full in-scope list... */ }
// src/engine/Options.ts
export const islkSudokuBUG = true;
export const islkSudokuURUL = true;
export const FCPlus = 0;
export function defaultTechniques(): Set<SolvingTechnique>;
// src/engine/Cell.ts
export class Cell {
  constructor(index: number);
  getIndex(): number; getX(): number; getY(): number;
  getB(): number;                    // block index, keep whatever Java Cell.java exposes
  toString(): string;                // Java cell name, e.g. "R5C7" under RC notation
  toFullString(): string;
  equals(o: unknown): boolean;
}
// src/engine/Grid.ts additionally exports the region classes
export abstract class Region { /* ported from Grid.Region */ }
export class Block extends Region {}
export class Row extends Region {}
export class Column extends Region {}
// src/engine/Link.ts
export class Link { constructor(srcCell: Cell, srcValue: number, dstCell: Cell, dstValue: number); getSrcCell(): Cell; getSrcValue(): number; getDstCell(): Cell; getDstValue(): number; }
```

**Translation scope notes:**

- `SolvingTechnique.ts`: port only the in-scope members listed in the overview, keeping Java declaration order and the exact display strings from `SolvingTechnique.java`. Use a string enum so `technique` equals its display name (Java `toString()`).
- `Options.ts` replaces the Java `Settings` singleton. Frozen flags become module constants (only port the ones engine code actually reads: `islkSudokuBUG`, `islkSudokuURUL`, `FCPlus`). `defaultTechniques()` returns a fresh `Set` of all in-scope techniques minus `FiveStrongLinks` and `SixStrongLinks` (see the overview). The Solver (step-015) takes the set as a constructor argument instead of reading a singleton. This is a sanctioned deviation, note it in a comment in `Options.ts`.
- `Grid.ts`: port only the vanilla surface. Keep `cellValues`, `cellPotentialValues` (as `BitSet32[]`), `isGiven`. Keep the static tables `visibleCellIndex` and `forwardVisibleCellIndex` by copying the literal arrays from `Grid.java` (lines 125-207 and 1080 onward) verbatim. Drop every variant table (windows, DG, X, asterisk, girandola, CD, ferz, wazir, knight, toroidal). Keep `regionCellIndex` and `cellRegions` sized `[81][3]`.
- Regions: port `Grid.Region` plus `Block`, `Row`, `Column` only, including `getPotentialPositions`, `copyPotentialPositions`, `getEmptyCellCount`, `crosses`, `getCell`, `indexOf`, `contains`, the `toString`/`toFullString`/`toStringShort`/`toFullStringShort`/`toFullNumber` name methods, and `getRegionTypeIndex`/`getRegionIndex`. Read the Java static initializer to learn the exact region type indexes and the order regions are built in, and replicate both. The static `regions` array keeps only the three vanilla region types.
- `Grid.fromString`: port the vanilla branch (81-char values input, digits `1`-`9`, `.` or `0` empty, tolerate whitespace exactly as Java does). Skip the Sukaku 729-char branch. Also port `toString81` (find it near `toString` in `Grid.java`), `adjustPencilmarks` is NOT ported.
- `getCellPotentialValues` returns the live `BitSet32` exactly like Java returns the live `BitSet` (producers mutate copies via `clone()`, the engine relies on aliasing in places).
- `equals`/`hashCode` on Grid: port `equals` only.
- `potentials.ts`: port `Solver.rebuildPotentialValues` and `cancelPotentialValues` as free functions taking a `Grid`. In `cancelPotentialValues` keep only the vanilla path (the whole `isForbiddenPairs()` block drops, since `whichNC == 0` is frozen).
- `Link.ts` is a trivial 1:1 port.

- [x] **Action 1: port SolvingTechnique.ts and Options.ts**

Write both files per the notes above. No test yet (they are data).

- [x] **Action 2: write the failing Grid test**

`test/unit/Grid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
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
    const row0 = Grid.getRegions(/* row type index from Java */ 2)[0];
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
});
```

Adjust the region type index in the test to the value you find in `Grid.java` (search `getRegionTypeIndex` in the `Row` class). Record the mapping as constants in `Grid.ts`.

- [x] **Action 3: run it, expect failure**

Run: `pnpm vitest run test/unit/Grid.test.ts`
Expected: FAIL (modules not found).

- [x] **Action 4: port Cell.ts, Grid.ts, Link.ts, potentials.ts**

Mechanical translation per the scope notes. Order of work inside the action: `Cell.ts` first (no dependencies), then `Grid.ts` statics and instance methods, then `potentials.ts`. Keep Java loop bounds and iteration directions identical, including the `visibleCellIndex`-driven loop in `cancelPotentialValues`.

`Grid.ts` needs `CellSet` for `visibleCellsSet`/`forwardVisibleCellsSet` which arrive in step-005. For now declare them as `static visibleCellsSet: unknown[]` placeholders only if `Grid.java` initializes them in the static block you are porting. Better: move their initialization into a `initCellSets()` function exported from `Grid.ts` that step-005 completes. Leave a `// completed in step-005` comment.

- [x] **Action 5: run the test, expect pass**

Run: `pnpm vitest run test/unit/Grid.test.ts`
Expected: PASS.

Run: `pnpm typecheck`
Expected: exits 0.

- [x] **Action 6: commit**

```bash
git add src/engine test/unit/Grid.test.ts
```

```bash
git commit -m "feat: port Grid model, regions, potentials, options"
```

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
