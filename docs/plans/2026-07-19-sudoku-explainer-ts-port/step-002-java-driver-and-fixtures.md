# Step 2: Java Reference Driver and Fixture Corpus

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** step-001 (repo toolchain)

**Files:**

- Create: `scripts/java-driver/Driver.java`, `scripts/java-driver/README.md`, `scripts/generate-fixtures.ts`, `test/fixtures/corpus.txt`, `test/fixtures/puzzles/*.json` (~200 files), `test/fixtures/random.json`, `test/fixtures/generator/*.json`
- Modify: nothing in `src/`

**Interfaces:**

- Consumes: the Java sources in `SukakuExplainer/`, compiled locally with a JDK 17+ on PATH (check `java -version`).
- Produces: the fixture files matching the schema in the overview. Every later test step reads them verbatim. Nothing else in the repo may regenerate them silently.

**Design constraints for the driver:**

- The driver uses only the public Java surface. The rating loop stays inside `Solver.getDifficulty(serate.Formatter)`, and the driver records steps by subclassing `serate.Formatter` (public static, non-final, its callbacks return early when the format strings are empty).
- Reference semantics for a puzzle: `grid.fromString(puzzle)`, `new Solver(grid)`, `solver.want = 0`, `solver.rebuildPotentialValues()`, then `getDifficulty(recorder)`. This intentionally skips serate's `adjustPencilmarks()` call, which only matters for pencilmark (Sukaku) input. The TS `rate()` will perform the same sequence, so driver and port stay aligned.
- Do not change any file under `SukakuExplainer/`.

- [ ] **Action 1: write the driver**

`scripts/java-driver/Driver.java` (default package). Complete skeleton below. Where a body says PORT-CHECK, open that Java file and use the exact public method that exists there (the plan was written against this source tree, and the names were verified except where marked).

```java
import java.io.*;
import java.util.*;
import diuf.sudoku.*;
import diuf.sudoku.generator.*;
import diuf.sudoku.solver.*;
import diuf.sudoku.solver.checks.*;
import diuf.sudoku.test.serate;

public class Driver {

    // ---------- JSON helpers (no libraries) ----------
    static String jstr(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c == '\n') b.append("\\n");
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }

    static int cellIndex(Cell cell) {
        // PORT-CHECK Cell.java: use cell.getIndex() if present, else cell.getY() * 9 + cell.getX()
        return cell.getY() * 9 + cell.getX();
    }

    // ---------- step recorder ----------
    static class Recorder extends serate.Formatter {
        final List<String> stepsJson = new ArrayList<>();
        String gridBefore;

        Recorder() { super(new PrintWriter(new StringWriter()), "", "", "", ""); }

        @Override public void beforePuzzle(Solver solver) {}
        @Override public void afterPuzzle(Solver solver) {}
        @Override public void beforeHint(Solver solver) {
            gridBefore = solver.getGrid().toString81();
        }
        @Override public void afterHint(Solver solver, Hint hint) {
            Rule rule = (Rule) hint;
            StringBuilder b = new StringBuilder("{");
            b.append("\"gridBefore\":").append(jstr(gridBefore));
            b.append(",\"technique\":").append(jstr(rule.getName()));
            b.append(",\"shortName\":").append(jstr(rule.getShortName()));
            b.append(",\"rating\":").append(rule.getDifficulty());
            Cell cell = hint.getCell();
            b.append(",\"cell\":").append(cell == null ? -1 : cellIndex(cell));
            b.append(",\"value\":").append(hint.getValue());
            b.append(",\"removals\":[");
            if (hint instanceof IndirectHint) {
                Map<Cell, java.util.BitSet> rem = ((IndirectHint) hint).getRemovablePotentials();
                TreeMap<Integer, java.util.BitSet> sorted = new TreeMap<>();
                for (Map.Entry<Cell, java.util.BitSet> e : rem.entrySet())
                    sorted.put(cellIndex(e.getKey()), e.getValue());
                boolean first = true;
                for (Map.Entry<Integer, java.util.BitSet> e : sorted.entrySet()) {
                    if (!first) b.append(',');
                    first = false;
                    b.append("{\"cell\":").append(e.getKey()).append(",\"values\":[");
                    java.util.BitSet v = e.getValue();
                    boolean fv = true;
                    for (int i = v.nextSetBit(0); i >= 0; i = v.nextSetBit(i + 1)) {
                        if (!fv) b.append(',');
                        fv = false;
                        b.append(i);
                    }
                    b.append("]}");
                }
            }
            b.append("]");
            b.append(",\"toString\":").append(jstr(hint.toString()));
            b.append("}");
            stepsJson.add(b.toString());
        }
    }

    // ---------- modes ----------
    static void rate(String corpusPath, String outDir) throws IOException {
        try (BufferedReader r = new BufferedReader(new FileReader(corpusPath))) {
            String line;
            while ((line = r.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] parts = line.split("\\s+");
                String id = parts[0], puzzle = parts[1];
                System.out.println("rating " + id);
                ratePuzzle(id, puzzle, outDir);
            }
        }
    }

    static void ratePuzzle(String id, String puzzle, String outDir) throws IOException {
        // validity
        Grid vGrid = new Grid();
        vGrid.fromString(puzzle);
        Solver vSolver = new Solver(vGrid);
        vSolver.want = 0;
        vSolver.rebuildPotentialValues();
        Hint warning = vSolver.checkValidity();
        String validityJson = warning == null ? "null"
            : "{\"kind\":" + jstr(warning.getClass().getSimpleName())
              + ",\"message\":" + jstr(warning.toString()) + "}";

        // brute-force solution (valid puzzles only)
        String solutionJson = "null";
        if (warning == null) {
            Grid sGrid = new Grid();
            sGrid.fromString(puzzle);
            Solver sSolver = new Solver(sGrid);
            sSolver.want = 0;
            sSolver.rebuildPotentialValues();
            Hint sol = sSolver.bruteForceSolve();
            // PORT-CHECK SolutionHint.java: apply() must fill the whole grid.
            // If it does not, read SolutionHint for a getter exposing the solution.
            sol.apply(sGrid);
            solutionJson = jstr(sGrid.toString81());
        }

        // rating + steps
        Grid grid = new Grid();
        grid.fromString(puzzle);
        Solver solver = new Solver(grid);
        solver.want = 0;
        solver.rebuildPotentialValues();
        Recorder rec = new Recorder();
        solver.getDifficulty(rec);

        StringBuilder b = new StringBuilder("{\n");
        b.append("  \"id\": ").append(jstr(id)).append(",\n");
        b.append("  \"puzzle\": ").append(jstr(puzzle)).append(",\n");
        b.append("  \"validity\": ").append(validityJson).append(",\n");
        b.append("  \"solution\": ").append(solutionJson).append(",\n");
        b.append("  \"rating\": {");
        b.append("\"er\":").append(solver.difficulty);
        b.append(",\"ep\":").append(solver.pearl);
        b.append(",\"ed\":").append(solver.diamond);
        b.append(",\"erTechnique\":").append(jstr(solver.ERtN));
        b.append(",\"epTechnique\":").append(jstr(solver.EPtN));
        b.append(",\"edTechnique\":").append(jstr(solver.EDtN));
        b.append(",\"erShort\":").append(jstr(solver.shortERtN));
        b.append(",\"epShort\":").append(jstr(solver.shortEPtN));
        b.append(",\"edShort\":").append(jstr(solver.shortEDtN));
        b.append("},\n  \"steps\": [\n    ");
        b.append(String.join(",\n    ", rec.stepsJson));
        b.append("\n  ]\n}\n");

        try (PrintWriter w = new PrintWriter(new FileWriter(new File(outDir, id + ".json")))) {
            w.print(b);
        }
    }

    static void random(String outPath) throws IOException {
        long[] seeds = { 0L, 1L, 42L, 123456789L, -987654321L };
        StringBuilder b = new StringBuilder("{\n");
        for (int s = 0; s < seeds.length; s++) {
            Random rnd = new Random(seeds[s]);
            b.append("  \"").append(seeds[s]).append("\": {");
            b.append("\"nextInt\":[");
            for (int i = 0; i < 30; i++) b.append(i == 0 ? "" : ",").append(rnd.nextInt());
            Random r81 = new Random(seeds[s]);
            b.append("],\"nextInt81\":[");
            for (int i = 0; i < 30; i++) b.append(i == 0 ? "" : ",").append(r81.nextInt(81));
            Random r64 = new Random(seeds[s]);
            b.append("],\"nextInt64\":[");
            for (int i = 0; i < 30; i++) b.append(i == 0 ? "" : ",").append(r64.nextInt(64));
            Random r100 = new Random(seeds[s]);
            b.append("],\"nextInt100\":[");
            for (int i = 0; i < 30; i++) b.append(i == 0 ? "" : ",").append(r100.nextInt(100));
            b.append("]}").append(s < seeds.length - 1 ? "," : "").append("\n");
        }
        b.append("}\n");
        try (PrintWriter w = new PrintWriter(new FileWriter(outPath))) { w.print(b); }
    }

    static void generate(long seed, double minEr, double maxEr, String outPath) throws IOException {
        // Replicates Generator.generate(List, ...) but with an injected seeded Random.
        // The TS Generator port (step-017) must follow this exact sequence.
        Random rnd = new Random(seed);
        List<Symmetry> syms = Arrays.asList(Symmetry.BiDiagonal, Symmetry.Orthogonal,
            Symmetry.Rotational180, Symmetry.Rotational90, Symmetry.Full);
        Generator gen = new Generator();
        int symmetryIndex = rnd.nextInt(syms.size());
        while (true) {
            Symmetry symmetry = syms.get(symmetryIndex);
            symmetryIndex = (symmetryIndex + 1) % syms.size();
            Grid grid = gen.generate(rnd, symmetry);
            Grid copy = new Grid();
            grid.copyTo(copy);
            Solver solver = new Solver(copy);
            solver.want = 0;
            solver.rebuildPotentialValues();
            double d = solver.analyseDifficulty(minEr, maxEr,
                0, 0, 0, 0, 0, 0, 0, 0, 0,
                "", "", "", "", "", "", "", "", "", "", "", "");
            if (d >= minEr && d <= maxEr) {
                StringBuilder b = new StringBuilder("{\n");
                b.append("  \"seed\": ").append(seed).append(",\n");
                b.append("  \"minEr\": ").append(minEr).append(",\n");
                b.append("  \"maxEr\": ").append(maxEr).append(",\n");
                b.append("  \"symmetries\": [\"BiDiagonal\",\"Orthogonal\",\"Rotational180\",\"Rotational90\",\"Full\"],\n");
                b.append("  \"puzzle\": ").append(jstr(grid.toString81())).append(",\n");
                b.append("  \"er\": ").append(d).append("\n}\n");
                try (PrintWriter w = new PrintWriter(new FileWriter(outPath))) { w.print(b); }
                System.out.println(grid.toString81());
                return;
            }
        }
    }

    public static void main(String[] args) throws Exception {
        switch (args[0]) {
            case "rate": rate(args[1], args[2]); break;
            case "random": random(args[1]); break;
            case "generate": generate(Long.parseLong(args[1]),
                Double.parseDouble(args[2]), Double.parseDouble(args[3]), args[4]); break;
            default: throw new IllegalArgumentException("mode: rate|random|generate");
        }
    }
}
```

- [ ] **Action 2: compile and smoke-test the driver**

```bash
javac -encoding UTF-8 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java
```

Expected: exit 0 (warnings are fine). `-sourcepath` pulls in only the transitively referenced engine classes, so GUI and applet sources stay uncompiled. If `toString81()` or another method name does not compile, look up the real name in `SukakuExplainer/diuf/sudoku/Grid.java` (search `toString81`, it is used by `serate.Formatter`) and fix the driver, not the engine.

Smoke test with one trivial line:

```bash
mkdir -p test/fixtures/puzzles
```

```bash
printf 'smoke .....................................................................1........\n' > /tmp/smoke.txt
```

```bash
java -cp scripts/java-driver/out Driver rate /tmp/smoke.txt test/fixtures/puzzles
```

Expected: `test/fixtures/puzzles/smoke.json` exists and is valid JSON with a `validity` object (this grid has too few clues). Inspect it, then delete it.

- [ ] **Action 3: emit JavaRandom reference sequences**

```bash
java -cp scripts/java-driver/out Driver random test/fixtures/random.json
```

Expected: JSON object keyed by the five seeds, four arrays of 30 ints each per seed.

- [ ] **Action 4: generate the seeded corpus puzzles**

For every row of this table, run the driver `generate` mode once per seed. ER bounds come from the Java `GenerateDialog.Difficulty` enum.

| level | bounds | seeds | fixture files |
|---|---|---|---|
| `easy` | 1.0 to 1.2 | 1..30 | only seeds 1, 2, 3 |
| `medium` | 1.3 to 1.6 | 1..30 | only seed 1 |
| `hard` | 1.7 to 2.5 | 1..30 | only seed 1 |
| `fiendish` | 2.6 to 6.0 | 1..20 | none |
| `diabolical` | 6.1 to 11.0 | 1..10 | none |

Example invocation (repeat per seed and level):

```bash
mkdir -p test/fixtures/generator /tmp/gen
```

```bash
java -cp scripts/java-driver/out Driver generate 1 1.0 1.2 /tmp/gen/easy-s1.json
```

The last stdout line is the puzzle string. Append `"<level>-s<seed> <puzzle>"` to `test/fixtures/corpus.txt` for every generated puzzle. Copy only the fixture files named in the table into `test/fixtures/generator/` (5 files: `easy-s1.json`, `easy-s2.json`, `easy-s3.json`, `medium-s1.json`, `hard-s1.json`). The other `/tmp/gen` outputs are throwaway.

Diabolical generation can take minutes per seed. If a seed has not finished after 30 minutes, kill that one `java` process by its exact PID, skip the seed, and note it in the corpus header comment. At least 5 diabolical puzzles must make it in (top up from more seeds if needed).

- [ ] **Action 5: add handpicked and invalid corpus entries**

Append to `test/fixtures/corpus.txt`:

```
# invalid grids
invalid-empty .................................................................................
invalid-double 11...............................................................................
invalid-nosol 12345678.........9...............................................................
invalid-fewclues ...............................................................1........2........
hard-monster-1 1.......2.9.4...5...6...7...5.9.3.......7.......85..4.7.....6...3...9.8...2.....1
hard-monster-2 8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..
```

Then craft `invalid-multi` from the `easy-s1` puzzle by replacing two of its clue digits with `.`, and confirm in Action 6 that its fixture reports a `DoubleSolutionWarning` (retry with different removed clues if it does not). Append it as `invalid-multi <string>`.

The two monster entries are known extreme puzzles, and their exact provenance does not matter because whatever the Java engine outputs for them is the reference. They will be slow to rate (possibly hours), so run them last and separately. If either exceeds 2 hours, drop it from `corpus.txt` and record the omission in `step-999-leftovers.md`.

- [ ] **Action 6: rate the whole corpus into fixtures**

```bash
java -cp scripts/java-driver/out Driver rate test/fixtures/corpus.txt test/fixtures/puzzles
```

Expected: one `<id>.json` per corpus line. Sanity-check three by eye: an `easy` fixture ends with `er` between 1.0 and 1.2, `invalid-double` has the warning class Java actually reports in `validity.kind` (record reality, do not force expectations), and step `removals` are sorted.

- [ ] **Action 7: technique coverage scan**

Write `scripts/check-coverage.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';

const REQUIRED = [
  'Hidden Single', 'Direct Pointing', 'Direct Hidden Pair', 'Naked Single',
  'Direct Hidden Triplet', 'Pointing', 'Claiming', 'Naked Pair', 'X-Wing',
  'Hidden Pair', 'Naked Triplet', 'Swordfish', 'Hidden Triplet',
  'XY-Wing', 'XYZ-Wing', 'Unique', 'Naked Quad', 'Jellyfish', 'Hidden Quad',
  'WXYZ-Wing', 'VWXYZ-Wing', 'UVWXYZ-Wing', 'TUVWXYZ-Wing',
  'Bivalue Universal Grave', 'Aligned Pair Exclusion', 'Aligned Triplet Exclusion',
  'Turbot', 'Skyscraper', 'Kite', 'Strong Links', 'Strong-Linked',
  'Forcing Chain', 'Bidirectional', 'Nishio', 'Dynamic', 'Nested',
];

const seen = new Set<string>();
for (const f of readdirSync('test/fixtures/puzzles')) {
  const fx = JSON.parse(readFileSync(`test/fixtures/puzzles/${f}`, 'utf8'));
  for (const s of fx.steps) seen.add(s.technique);
}
console.log('distinct step techniques:', [...seen].sort());
const missing = REQUIRED.filter((r) => ![...seen].some((t) => t.includes(r)));
console.log('missing (substring match):', missing);
```

```bash
pnpm exec tsx scripts/check-coverage.ts
```

The REQUIRED list uses substrings because chaining and strong-link rule names embed structure details. Adjust entries to the real names you see in `distinct step techniques` (that output is the ground truth), then re-run. For every technique still missing, mine more puzzles by rating extra fiendish/diabolical seeds and keeping any whose paths add coverage (append them to the corpus and fixtures). Wings and uniqueness variants usually appear by fiendish level. Nested Forcing Chains only appear on monster-class puzzles, so they depend on Action 5's monsters. If a technique stays uncovered after reasonable mining, list it at the top of `test/fixtures/corpus.txt` in a `# uncovered:` comment. Step-016's meta-test will read that comment as the allowlist.

- [ ] **Action 8: write scripts/generate-fixtures.ts and the driver README**

`scripts/generate-fixtures.ts` re-runs everything for reproducibility:

```ts
import { execSync } from 'node:child_process';

const run = (cmd: string) => {
  console.log('$', cmd);
  execSync(cmd, { stdio: 'inherit' });
};

run('javac -encoding UTF-8 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java');
run('java -cp scripts/java-driver/out Driver random test/fixtures/random.json');
run('java -cp scripts/java-driver/out Driver rate test/fixtures/corpus.txt test/fixtures/puzzles');
// generator fixtures (5 committed seeds)
run('java -cp scripts/java-driver/out Driver generate 1 1.0 1.2 test/fixtures/generator/easy-s1.json');
run('java -cp scripts/java-driver/out Driver generate 2 1.0 1.2 test/fixtures/generator/easy-s2.json');
run('java -cp scripts/java-driver/out Driver generate 3 1.0 1.2 test/fixtures/generator/easy-s3.json');
run('java -cp scripts/java-driver/out Driver generate 1 1.3 1.6 test/fixtures/generator/medium-s1.json');
run('java -cp scripts/java-driver/out Driver generate 1 1.7 2.5 test/fixtures/generator/hard-s1.json');
```

`scripts/java-driver/README.md`: one page documenting the three driver modes and the JDK requirement. It must also state that fixtures are committed artifacts regenerated only via `pnpm exec tsx scripts/generate-fixtures.ts`.

- [ ] **Action 9: commit**

```bash
git add scripts test/fixtures
```

```bash
git commit -m "feat: Java reference driver and differential fixture corpus"
```

## Step completion

- [ ] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
