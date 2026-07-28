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

    // ---------- settings ----------
    // Applies "k=v,k=v" to the Settings singleton, matching the serate flags
    // that change solving behaviour, plus isRCNotation, which changes hint text
    // only. Keys are the Settings setter names.
    static void applySettings(String spec) {
        if (spec == null || spec.isEmpty()) return;
        Settings s = Settings.getInstance();
        for (String pair : spec.split(",")) {
            String[] kv = pair.split("=", 2);
            String k = kv[0].trim(), v = kv[1].trim();
            switch (k) {
                case "revisedRating": s.setRevisedRating(Integer.parseInt(v)); break;
                case "batchSolving": s.setBatchSolving(Integer.parseInt(v)); break;
                case "FCPlus": s.setFCPlus(Integer.parseInt(v)); break;
                case "islkSudokuBUG": s.setlkSudokuBUG(Boolean.parseBoolean(v)); break;
                case "islkSudokuURUL": s.setlkSudokuURUL(Boolean.parseBoolean(v)); break;
                case "isRCNotation": s.setRCNotation(Boolean.parseBoolean(v)); break;
                case "isBringBackSE121":
                    s.setBringBackSE121(Boolean.parseBoolean(v));
                    if (Boolean.parseBoolean(v)) s.Settings_BBSE121();
                    break;
                default: throw new IllegalArgumentException("unknown setting: " + k);
            }
        }
    }

    // ---------- modes ----------
    // timingsPath is optional. Timings deliberately do NOT go into the fixture
    // JSON: a wall-clock field would churn every fixture on each regeneration.
    static void rate(String corpusPath, String outDir, String timingsPath) throws IOException {
        StringBuilder timings = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new FileReader(corpusPath))) {
            String line;
            while ((line = r.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                String[] parts = line.split("\\s+");
                String id = parts[0], puzzle = parts[1];
                System.out.println("rating " + id);
                long t0 = System.nanoTime();
                ratePuzzle(id, puzzle, outDir);
                timings.append(id).append('\t').append((System.nanoTime() - t0) / 1000000L).append('\n');
            }
        }
        if (timingsPath != null) {
            try (PrintWriter w = new PrintWriter(new FileWriter(timingsPath))) {
                w.print(timings);
            }
        }
    }

    // serate.java:672-682 load sequence. adjustPencilmarks() runs unconditionally
    // (a no-op for 81-char input, whose potentials are still empty), while
    // rebuildPotentialValues() runs only below 729 chars: for a pencilmark grid
    // the loaded marks ARE the potentials and must not be recomputed.
    static Grid loadGrid(String puzzle) {
        Grid grid = new Grid();
        grid.fromString(puzzle);
        grid.adjustPencilmarks();
        return grid;
    }

    static Solver newSolver(Grid grid, String puzzle) {
        Solver solver = new Solver(grid);
        solver.want = 0;
        if (puzzle.length() >= 81 && puzzle.length() < 729) {
            solver.rebuildPotentialValues();
        }
        return solver;
    }

    static void ratePuzzle(String id, String puzzle, String outDir) throws IOException {
        // validity
        Grid vGrid = loadGrid(puzzle);
        Solver vSolver = newSolver(vGrid, puzzle);
        Hint warning = vSolver.checkValidity();
        String validityJson = warning == null ? "null"
            : "{\"kind\":" + jstr(warning.getClass().getSimpleName())
              + ",\"message\":" + jstr(warning.toString()) + "}";

        // brute-force solution (valid puzzles only)
        String solutionJson = "null";
        if (warning == null) {
            Grid sGrid = loadGrid(puzzle);
            Solver sSolver = newSolver(sGrid, puzzle);
            Hint sol = sSolver.bruteForceSolve();
            // PORT-CHECK SolutionHint.java: apply() must fill the whole grid.
            // If it does not, read SolutionHint for a getter exposing the solution.
            sol.apply(sGrid);
            solutionJson = jstr(sGrid.toString81());
        }

        // rating + steps.
        // getDifficulty() has no validity guard and never terminates on invalid /
        // under-constrained grids (no simple technique fires, so it climbs to nested
        // forcing chains on an open grid). Rating is only meaningful for valid puzzles,
        // so we run it only when checkValidity passed. For invalid puzzles we record the
        // pre-loop initialized state getDifficulty would start from (Solver.java:675-683).
        // The TS rate() applies the same guard so driver and port stay aligned.
        StringBuilder b = new StringBuilder("{\n");
        b.append("  \"id\": ").append(jstr(id)).append(",\n");
        b.append("  \"puzzle\": ").append(jstr(puzzle)).append(",\n");
        b.append("  \"validity\": ").append(validityJson).append(",\n");
        b.append("  \"solution\": ").append(solutionJson).append(",\n");
        if (warning == null) {
            Grid grid = loadGrid(puzzle);
            Solver solver = newSolver(grid, puzzle);
            Recorder rec = new Recorder();
            // serate.java:682-686 picks the loop by batchSolving. In batch mode
            // beforeHint fires once per batch while afterHint fires per hint, so
            // gridBefore repeats within a batch. That is Java's own behaviour and
            // the TS batch replay mirrors it.
            if (Settings.getInstance().batchSolving() < 1) solver.getDifficulty(rec);
            else solver.getBatchDifficulty(rec);

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
        } else {
            b.append("  \"rating\": {");
            b.append("\"er\":0.0,\"ep\":0.0,\"ed\":0.0");
            b.append(",\"erTechnique\":\"No solution\",\"epTechnique\":\"No solution\",\"edTechnique\":\"No solution\"");
            b.append(",\"erShort\":\"O\",\"epShort\":\"O\",\"edShort\":\"O\"");
            b.append("},\n  \"steps\": [\n    ");
            b.append("\n  ]\n}\n");
        }

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
        // Optional trailing args for `rate`: a timings path, and --set k=v,k=v
        // applied to the Settings singleton before any puzzle is rated.
        String timingsPath = null, settingsSpec = null;
        for (int i = 3; i < args.length; i++) {
            if (args[i].equals("--set")) settingsSpec = args[++i];
            else timingsPath = args[i];
        }
        applySettings(settingsSpec);
        switch (args[0]) {
            case "rate": rate(args[1], args[2], timingsPath); break;
            case "random": random(args[1]); break;
            case "generate": generate(Long.parseLong(args[1]),
                Double.parseDouble(args[2]), Double.parseDouble(args[3]), args[4]); break;
            default: throw new IllegalArgumentException("mode: rate|random|generate");
        }
    }
}
