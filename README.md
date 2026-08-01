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
input throws `InvalidGridError`. Pencil marks are a separate input; see
[Solve from your own pencil marks](#solve-from-your-own-pencil-marks).

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

### Solve from your own pencil marks

By default the engine derives candidates from the placed digits, so a hint that
only eliminates candidates comes back unchanged however many of its eliminations
you applied. Pass your own marks and it solves from those instead:

```ts
import { getHint } from 'sudoku-explainer';

// 81 masks, bit (value - 1) set when the candidate is live
let candidates = myPencilMarks;
const hint = getHint(puzzle, { candidates });
for (const r of hint.removals) {
  for (const v of r.values) candidates[r.cell.index] &= ~(1 << (v - 1));
}
getHint(puzzle, { candidates }); // moves on to the next step
```

`candidates` is either that `number[81]` of 9-bit masks or a 729-char Sukaku
string, where position `cell * 9 + (value - 1)` holds the digit when that
candidate is live and `.` or `0` when it is not. `parseCandidates` normalises
either form to masks.

Placed digits still come from the grid argument; the mask of a cell that holds a
digit is ignored. The engine still removes candidates that a placed peer rules
out, so a stale mark is forgiven, but it never adds one back: an empty cell left
with no candidate throws `InvalidGridError` naming the cell rather than falling
back to the derived set.

`getHint` and `getAllHints` take this option. `rate`, `analyze` and `solvePath`
do not, because a rating means "how hard is this puzzle", which is a property of
the digits and not of one player's marks.

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

## Settings

The Java engine has a handful of flags that change *how* a puzzle is solved and
therefore what it rates, plus one that only changes how hints are worded. They
default to the Java defaults, so you only need these if you are reproducing a
specific `serate` invocation or comparing rating schemes.

```ts
const engine = createEngine({ settings: { revisedRating: 1, FCPlus: 2 } });
```

| Setting | Default | serate |
| --- | --- | --- |
| `revisedRating` | `0` | `-N`, `--revisedRating=N` |
| `batchSolving` | `0` | `-B`, `--batch=N` |
| `FCPlus` | `0` | `-P`, `--FCPlus=N` |
| `islkSudokuBUG` | `true` | `-G`, `--islkSudokuBUG=N` |
| `islkSudokuURUL` | `true` | `-U`, `--islkSudokuURUL=N` |
| `isBringBackSE121` | `false` | not exposed (GUI preference in Java) |
| `isRCNotation` | `true` | not exposed (GUI preference in Java) |

### `revisedRating`

An alternative rating scheme. `1` changes both the order rules are tried in and
what several of them score, so the same puzzle can come out at a different ER.

Reordering: Naked Single is tried much earlier, Hidden Pair before Naked Pair,
and Turbot Fish before Swordfish. It also swaps in a separate `TurbotFish`
producer where the default scheme uses `StrongLinks(2)` for the same technique.

Rescoring:

| Technique | Default | `revisedRating: 1` |
| --- | --- | --- |
| Naked Single | 2.3 | 1.6 |
| Hidden Pair / Triplet / Quad | 3.4 / 4.0 / 5.4 | 2.9 / 3.8 / 5.2 |
| Direct Hidden Triplet | 2.5 | 3.1 |
| Swordfish / Jellyfish | 3.8 / 5.2 | 4.0 / 5.4 |
| Unique Rectangle / Loop | 4.5, 4.6, 4.7, 5.0 by size | 4.5 rising by 0.1 per loop pair |
| Unique Loop type 3 (hidden) | +0.0 pair … +0.2 quad | +0.1 pair … +0.3 quad |

### `batchSolving`

Changes the rating loop from "apply one hint per step" to "apply every hint of
the smallest rating, then look again". Faster on large runs, and it can shift
the reported ER because a different set of hints gets applied.

- `1` collects only hints sharing the first (smallest) rating found this round.
- `2` also keeps hints of other ratings, as long as they do not exceed the ER
  reached so far.

### `FCPlus`

Controls how many non-trivial implications the chaining engine may use while
building nested chains. Higher values let it find shorter chains, which
generally lowers the ER of very hard puzzles. This only affects nesting level 2
and above, so most puzzles are unaffected.

- `0` matches SE 1.2.1: pointing/claiming, hidden and naked pairs, X-Wing.
- `1` adds Turbot Fish and both XY-Wing forms.
- `2` also adds the triplet sets, 3 strong links, WXYZ- and VWXYZ-Wings,
  aligned triplet exclusion, unique loops and BUG.

> `FCPlus: 2` can hit a latent bug in the Java engine: it puts unique-loop
> detection into the chaining path, which then casts hints to an interface
> `UniqueLoopType4Hint` does not implement. Java throws `ClassCastException`
> there and this port fails at the same point with a `TypeError`. The behaviour
> is reproduced rather than fixed, so both engines agree on where it breaks.

### `islkSudokuBUG` and `islkSudokuURUL`

Two corrections by lkSudoku, on by default. Setting either to `false` restores
the older algorithm.

`islkSudokuBUG` affects BUG detection: the fix gathers cells sharing the same
extra value across regions so a type 2 pattern is recognised, and orders the
type 3 search by degree so the simplest hint wins. Without it, some BUGs are
missed entirely.

`islkSudokuURUL` affects unique rectangles and loops: the fix keeps each
candidate cell's extra values separate (they otherwise leak between siblings)
and searches type 3 from degree 2 upward rather than starting at the number of
extra values.

### `isBringBackSE121`

Restricts the engine to the technique set of the original Sudoku Explainer
1.2.1, dropping Turbot Fish, the 3-6 strong-linked fishes, and the WXYZ,
VWXYZ, UVWXYZ and TUVWXYZ wings. Puzzles needing those now rate higher, since
the solver must fall back to chains.

### `isRCNotation`

Picks the cell notation used in hint text. `true` (the Java default) gives
`r1c1` and `column 8`; `false` gives chess-style `A1` and `column H`. Rows and
the short region forms (`r8`, `c8`) are numeric either way, as in Java.

This is the only flag that leaves the solve path untouched: ratings, hint order
and removals are identical, and only `hint.toString()` and `hint.explain()`
change. The structured refs this port adds (`CellRef.name`, `RegionRef.name`)
are its own surface, not Java's, and stay `R8C2` / `C8` regardless.

Java can only set this from its GUI, and it loads preferences on GUI startup
only, so every headless Java path runs with `true`. The flag is exposed here
anyway, and its fixtures are generated from the Java engine like every other.

### Deliberately not exposed

The Java `Settings` singleton carries two further fields. Neither can change
this engine's output, so neither is settable here:

- **`numThreads`** (serate `-t`) distributes the multiple-chaining search across
  threads in Java. It hands the same cell list to the same rules, so only wall
  time changes, and JS has no shared-memory threads to hand it to. The field is
  ported for fidelity; the engine always takes the serial path.
- **`bestHintOnly`** is read in exactly one place in Java, and that line is
  commented out. It is dead there too.

Sudoku variant flags (`isX`, `isWindows`, `isDG`, `whichNC`, …) are out of
scope; see below.

## Fidelity

Correctness is enforced by a differential test suite: a Java reference driver
emits fixtures for committed puzzle corpora, and the port asserts exact equality
of ratings and every recorded field of every solve step. The corpora are 133
seeded generator puzzles, 1000 grids and 614 pencilmark states derived from
HoDoKu's regression library, and a per-flag matrix.

Every setting above has its own fixture set generated by the same Java driver,
one factor varied at a time, and each is asserted to actually change the output
somewhere. A flag that quietly did nothing would fail the suite rather than
pass it.

Sudoku *variants* (X, Windoku, Disjoint Groups, NC, …) are out of scope; this is
a vanilla 9×9 engine.

## License

LGPL-2.1-or-later, as a derivative work of SukakuExplainer.
