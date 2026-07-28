# sudoku-explainer

A dependency-free TypeScript port of the [SukakuExplainer](https://github.com/SudokuMonster/SukakuExplainer)
Java engine, for vanilla 9×9 Sudoku. It rates puzzles, explains every solving
step, brute-force solves, and generates puzzles with seeded determinism.

The port reproduces the Java engine bit-for-bit. ER/EP/ED ratings match, the
technique and eliminations match at every step, and seeded generator output is
identical.

## Install

```sh
pnpm add sudoku-explainer
```

Requires **Node >= 20**. The package is **ESM only** with zero runtime
dependencies.

## Usage

Grid input is an 81-char string (digits `1`-`9`, `.` or `0` for empty,
whitespace tolerated) or a `number[]` of length 81 (`0` = empty). Malformed
input throws `InvalidGridError`.

### Rate a puzzle

```ts
import { rate } from 'sudoku-explainer';

const r = rate('.2.....7...4...8...9.628.4.93..5..272.53.49.864..8..13.8.493.5...9...1...7.....3.');
console.log(r.er, r.erTechnique); // 1.2 "Hidden Single"
```

`rate` returns `er`/`ep`/`ed` (as exact doubles; `20.0` = beyond solver, `0.0` =
no solution) with the technique name and short name for each.

### Explain the next step

```ts
import { getHint } from 'sudoku-explainer';

const hint = getHint(puzzle);
if (hint) {
  console.log(hint.name);        // "Naked Pair"
  console.log(hint.toString());  // compact one-liner
  console.log(hint.explain());   // markdown explanation, placeholders resolved
  console.log(hint.removals);    // [{ cell: { name: "R3C1", ... }, values: [2, 7] }]
}
```

`solvePath(puzzle)` returns every step as `{ hint, gridBefore }`, and
`getAllHints(puzzle)` returns all hints available at the current grid state.

### Generate a puzzle

```ts
import { generate } from 'sudoku-explainer';

const out = generate({ difficulty: 'easy', seed: 1 });
// out: { puzzle: number[81], solution: number[81], rating } | null (null iff cancelled)
```

Difficulty is one of `easy`, `medium`, `hard`, `fiendish`, `diabolical`, or an
explicit `{ min, max }` ER range. Pass a `seed` to reproduce a puzzle; omit
it for a time-based seed like the Java generator.

### Custom engine

`createEngine({ techniques })` builds a reusable, stateless engine with the same
methods (`rate`, `solvePath`, `getHint`, `getAllHints`, `solve`, `analyze`,
`checkValidity`, `generate`). The top-level functions wrap a lazily created
default engine.

## Fidelity

Correctness is enforced by a differential test suite: a Java reference driver
emits fixtures for committed puzzle corpora, and the port asserts exact equality
of ratings and every recorded field of every solve step. The corpora are 133
seeded generator puzzles, 1000 grids and 614 pencilmark states derived from
HoDoKu's regression library, and a per-flag matrix.

Both 81-character givens and 729-character pencilmark (Sukaku) grids are
accepted, and the `Settings` flags that serate exposes are settable per engine:

```ts
const engine = createEngine({ settings: { revisedRating: 1, FCPlus: 2 } });
```

`revisedRating`, `isBringBackSE121`, `batchSolving`, `FCPlus`, `islkSudokuBUG`
and `islkSudokuURUL` each have their own fixture set, so they are held to the
Java engine exactly rather than assumed.

Sudoku *variants* (X, Windoku, Disjoint Groups, NC, …) are out of scope; this is
a vanilla 9×9 engine.

## License

LGPL-2.1-or-later, as a derivative work of SukakuExplainer.
