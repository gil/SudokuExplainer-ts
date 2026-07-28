# Java reference driver

`Driver.java` drives the vendored SukakuExplainer engine (`SukakuExplainer/`) to
emit the reference JSON that the differential tests assert against. It uses only
the engine's public surface and does not modify anything under `SukakuExplainer/`.

## Requirements

- A JDK 17 or newer on `PATH` (`java -version`, `javac -version`). Developed
  against JDK 26.
- The Java sources are Latin-1 encoded (e.g. degree signs in `Symmetry.java`),
  so compile with `-encoding ISO-8859-1`. `-encoding UTF-8` fails on those bytes.
  Non-ASCII text lives only in symmetry descriptions and never reaches fixtures.

## Compile

```bash
javac -encoding ISO-8859-1 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java
```

`-sourcepath` pulls in only the transitively referenced engine classes, so the
GUI and applet sources stay uncompiled.

## Modes

- `rate <corpus.txt> <outDir> [timings.tsv]`: for each `id puzzle` line (blank
  lines and `#` comments skipped), writes `<outDir>/<id>.json` following the
  fixture schema in `docs/plans/.../step-000-overview.md`. `checkValidity()` and
  the brute-force solution run first. The rating loop (`getDifficulty`) runs only
  for valid puzzles: it has no validity guard and never returns on
  under-constrained grids, so invalid puzzles get the solver's pre-loop defaults
  (`er/ep/ed = 0.0`, technique `"No solution"`, short `"O"`, empty `steps`). The
  TS `rate()` applies the same guard so driver and port stay aligned.

  A puzzle may be 81 chars (givens) or 729 chars (pencilmarks). `loadGrid` /
  `newSolver` follow serate's own load sequence (`serate.java:672-682`):
  `adjustPencilmarks()` runs unconditionally, and `rebuildPotentialValues()`
  runs only below 729 chars, because a pencilmark grid's loaded marks *are* its
  potentials and must not be recomputed. `test/differential/replay.ts` exports
  the same two helpers so the TS harness loads grids identically.

  The optional third argument writes `id\telapsedMs` lines. Timings stay out of
  the fixture JSON on purpose: a wall-clock field would churn every fixture on
  each regeneration. The file is gitignored and only feeds the slow-tier split.

  `--set k=v,k=v` applies Java `Settings` before rating, covering the same flags
  serate exposes: `revisedRating`, `batchSolving`, `FCPlus`, `islkSudokuBUG`,
  `islkSudokuURUL`, `isBringBackSE121`. As in serate, `batchSolving >= 1` runs
  `getBatchDifficulty` instead of `getDifficulty`.

  ```bash
  java -cp scripts/java-driver/out Driver rate corpus.txt out --set revisedRating=1
  ```

  ```bash
  java -cp scripts/java-driver/out Driver rate test/fixtures/corpus.txt test/fixtures/puzzles
  ```

- `random <outPath>`: writes JavaRandom reference sequences (`nextInt`,
  `nextInt(81/64/100)`) for five seeds, consumed by the `JavaRandom` port tests.

  ```bash
  java -cp scripts/java-driver/out Driver random test/fixtures/random.json
  ```

- `generate <seed> <minEr> <maxEr> <outPath>`: replicates
  `Generator.generate(List, ...)` with an injected seeded `Random`, looping until
  a puzzle rates within `[minEr, maxEr]`. Writes a generator fixture and prints
  the puzzle as the last stdout line. The TS `Generator` port must follow this
  exact sequence.

  ```bash
  java -cp scripts/java-driver/out Driver generate 1 1.0 1.2 test/fixtures/generator/easy-s1.json
  ```

## Fixtures are committed artifacts

Everything under `test/fixtures/` is committed and must only be regenerated via:

```bash
# generator-derived corpus (corpus.txt -> puzzles/, plus random/ and generator/)
pnpm exec tsx scripts/generate-fixtures.ts

# reglib-derived corpora (needs HoDoKu's reglib-1.3.txt, which is NOT vendored)
pnpm exec tsx scripts/generate-reglib-fixtures.ts /path/to/reglib-1.3.txt

# Settings flag matrix (add --slow for the monsters, which take minutes each)
pnpm exec tsx scripts/generate-config-fixtures.ts
```

Nothing else in the repo may regenerate them. `corpus.txt` holds the puzzle
strings (seeded generator output plus handpicked/invalid grids); regenerating
re-rates those exact strings, so ratings and steps stay reproducible.

`reglib-pm-corpus.txt` is derived from HoDoKu's regression library, which is
GPLv3 and deliberately not copied into this repo: `harvest-reglib.ts` takes its
path as an argument and only the derived puzzle strings are committed.
