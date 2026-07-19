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

- `rate <corpus.txt> <outDir>`: for each `id puzzle` line (blank lines and `#`
  comments skipped), writes `<outDir>/<id>.json` following the fixture schema in
  `docs/plans/.../step-000-overview.md`. `checkValidity()` and the brute-force
  solution run first. The rating loop (`getDifficulty`) runs only for valid
  puzzles: it has no validity guard and never returns on under-constrained
  grids, so invalid puzzles get the solver's pre-loop defaults (`er/ep/ed = 0.0`,
  technique `"No solution"`, short `"O"`, empty `steps`). The TS `rate()` applies
  the same guard so driver and port stay aligned.

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
pnpm exec tsx scripts/generate-fixtures.ts
```

Nothing else in the repo may regenerate them. `corpus.txt` holds the puzzle
strings (seeded generator output plus handpicked/invalid grids); regenerating
re-rates those exact strings, so ratings and steps stay reproducible.
