# Sudoku Explainer TypeScript Port Implementation Plan

> **For agentic workers:** You are executing one step of this plan in a clean
> session with no prior context. Read this overview fully, then read your
> assigned step file. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a dependency-free TypeScript library that reproduces the SukakuExplainer Java engine (vanilla Sudoku only) bit-for-bit, meaning the same ratings and hints at every solve step and identical seeded generator output.

**Architecture:** `src/engine/` is a mechanical 1:1 port of the Java classes in `SukakuExplainer/diuf/sudoku/` (class-for-class, method-for-method, variant branches dropped). `src/api/` + `src/index.ts` wrap it in a small idiomatic API. Correctness is enforced by differential fixtures: a Java driver (`scripts/java-driver/`) emits reference JSON for a committed corpus, and vitest suites assert exact equality.

**Tech Stack:** TypeScript (strict) with pnpm + Corepack. Built by tsdown (ESM + d.ts), tested with vitest, scripts run via tsx. Zero runtime dependencies. Node >= 20. License LGPL-2.1 (derivative work).

**Spec:** `docs/specs/2026-07-19-sudoku-explainer-ts-port-design.md` (read it if a fidelity question is not answered here).

**Java reference:** `SukakuExplainer/` at the repo root. Package root is `SukakuExplainer/diuf/sudoku/`. Whenever a step says "port `X.java`", the Java file is the authoritative source for method bodies; the step file gives the TS signatures, the translation rules, and the tests.

## Global Constraints

- Session setup: run `fnm use` once at session start (Node via fnm), and `export GIT_PAGER=cat` before git commands.
- Package name `sudoku-explainer`, ESM only, zero runtime dependencies, `engines.node >= 20`, license `LGPL-2.1-or-later`.
- Always `pnpm`, never npm/yarn. Build with `tsdown`, never tsup.
- Never "improve" ported algorithms, iteration order, or data structures. A port step is done when it is line-for-line traceable to the Java source.
- Frozen baseline (Java `Settings` defaults, constants in `src/engine/Options.ts`): `revisedRating = 0`, `isBringBackSE121 = false`, `islkSudokuBUG = true`, `islkSudokuURUL = true`, `FCPlus = 0`, `batchSolving = 0`, `isBlocks = true`, `isVanilla = true`, `whichNC = 0`, all other variant flags false. Java code gated on the losing side of these flags is dropped during translation, not ported.
- Acceptance bar: every corpus puzzle must reproduce its Java fixture exactly. That means ER/EP/ED as exact doubles and every recorded field of every solve step (see the fixture schema below).

### Java-to-TS translation rules (apply in every port step)

1. `java.util.BitSet` (always <= 32 bits here) becomes `BitSet32` from `src/engine/util/BitSet32.ts` (defined in step-003). Same method names: `get/set/clear/and/or/andNot/xor/cardinality/nextSetBit/isEmpty/equals/clone/length`. Methods that return live references in Java (e.g. `Grid.getCellPotentialValues`) must return the live `BitSet32`, not a copy.
2. `ArrayList` -> array. `LinkedHashSet`/`LinkedHashMap` -> `Set`/`Map` (insertion-ordered). `HashSet`/`HashMap` whose iteration order can leak into output -> `Set`/`Map` too, and note the site with a `// Java: HashSet` comment so differential failures can be traced (fidelity rule 6 of the spec). `TreeMap`/`TreeSet` with a comparator -> keep a sorted array/explicit sort replicating the comparator. Java `String.compareTo` matches JS `<`/`>` on strings.
3. `equals`/`hashCode` pairs on hints become an `equals(other: unknown): boolean` method; `list.contains(x)` -> `list.some(y => y.equals(x))`. Do not port `hashCode` unless a step says so.
4. Java `int` arithmetic that can overflow or truncate: use `| 0` (32-bit) or `Math.trunc` for integer division. Audit each arithmetic line as you translate.
5. `InterruptedException` -> `InterruptedError` class (step-003). Java `try { ... } catch (InterruptedException e) {}` -> `try { ... } catch (e) { if (!(e instanceof InterruptedError)) throw e; }`.
6. Thread-priority calls (`lowerPriority`/`normalPriority`) are dropped. The GUI `Asker` is dropped: always proceed as if the user answered yes, but keep the `isUsingAdvanced` bookkeeping where the Java code has it.
7. One TS file per Java class, same class name, same file name (`NakedSet.java` -> `NakedSet.ts`). Method and field names keep their Java names. Explicit `.js` extensions in relative imports.
8. Comments: keep only Java comments that explain intent the code cannot show. Do not add narration.

### Frozen producer registration order (Java `Solver` constructor, `revisedRating==0` branch, variant entries removed)

Every producer below is guarded by `addIfWorth(technique, ...)`: it is registered only if `techniques` (the enabled set) contains the technique.

| Tier | # | Producer (constructor args) | SolvingTechnique | Display name |
|---|---|---|---|---|
| validator | 1 | `NoDoubles()` | n/a | n/a |
| warning | 1 | `NumberOfFilledCells()` | n/a | n/a |
| warning | 2 | `NumberOfValues()` | n/a | n/a |
| warning | 3 | `BruteForceAnalysis(false)` | n/a | n/a |
| direct | 1 | `HiddenSingle()` | HiddenSingle | Hidden Single |
| direct | 2 | `Locking(true)` | DirectPointing | Direct Pointing |
| direct | 3 | `HiddenSet(2, true)` | DirectHiddenPair | Direct Hidden Pair |
| direct | 4 | `NakedSingle()` | NakedSingle | Naked Single |
| direct | 5 | `HiddenSet(3, true)` | DirectHiddenTriplet | Direct Hidden Triplet |
| indirect | 1 | `Locking(false)` | PointingClaiming | Pointing & Claiming |
| indirect | 2 | `NakedSet(2)` | NakedPair | Naked Pair |
| indirect | 3 | `Fisherman(2)` | XWing | X-Wing |
| indirect | 4 | `HiddenSet(2, false)` | HiddenPair | Hidden Pair |
| indirect | 5 | `NakedSet(3)` | NakedTriplet | Naked Triplet |
| indirect | 6 | `Fisherman(3)` | Swordfish | Swordfish |
| indirect | 7 | `HiddenSet(3, false)` | HiddenTriplet | Hidden Triplet |
| indirect | 8 | `StrongLinks(2)` | TurbotFish | Scraper, Kite, Turbot |
| indirect | 9 | `XYWing(false)` | XYWing | XY-Wing |
| indirect | 10 | `XYWing(true)` | XYZWing | XYZ-Wing |
| indirect | 11 | `UniqueLoops()` | UniqueLoop | Unique Rectangle / Loop |
| indirect | 12 | `NakedSet(4)` | NakedQuad | Naked Quad |
| indirect | 13 | `Fisherman(4)` | Jellyfish | Jellyfish |
| indirect | 14 | `HiddenSet(4, false)` | HiddenQuad | Hidden Quad |
| indirect | 15 | `StrongLinks(3)` | ThreeStrongLinks | 3 Strong-linked Fishes |
| indirect | 16 | `WXYZWing()` | WXYZWing | WXYZ-Wing |
| indirect | 17 | `BivalueUniversalGrave()` | BivalueUniversalGrave | Bivalue Universal Grave |
| indirect | 18 | `StrongLinks(4)` | FourStrongLinks | 4 Strong-Linked Fishes |
| indirect | 19 | `VWXYZWing()` | VWXYZWing | VWXYZ-Wing |
| indirect | 20 | `AlignedPairExclusion()` | AlignedPairExclusion | Aligned Pair Exclusion |
| indirect | 21 | `StrongLinks(5)` | FiveStrongLinks | 5 Strong-Linked Fishes |
| indirect | 22 | `UVWXYZWing()` | UVWXYZWing | UVWXYZ-Wing |
| indirect | 23 | `StrongLinks(6)` | SixStrongLinks | 6 Strong-Linked Fishes |
| chaining1 | 1 | `Chaining(false, false, false, 0, false, 0)` | ForcingChainCycle | Forcing Chains & Cycles |
| chaining1 | 2 | `TUVWXYZWing()` | TUVWXYZWing | TUVWXYZ-Wing |
| chaining1 | 3 | `AlignedExclusion(3)` | AlignedTripletExclusion | Aligned Triplet Exclusion |
| chaining1 | 4 | `Chaining(false, true, true, 0, false, 0)` | NishioForcingChain | Nishio Forcing Chains |
| chaining1 | 5 | `Chaining(true, false, false, 0, false, 0)` | MultipleForcingChain | Multiple Forcing Chains |
| chaining1 | 6 | `Chaining(true, true, false, 0, false, 0)` | DynamicForcingChain | Dynamic Forcing Chains |
| chaining2 | 1 | `Chaining(true, true, false, 1, false, 0)` | DynamicForcingChainPlus | Dynamic Forcing Chains (+) |
| advanced | 1 | `Chaining(true, true, false, 2, false, 0)` | NestedForcingChain | Nested Forcing Chains |
| advanced | 2 | `Chaining(true, true, false, 3, false, 0)` | NestedForcingChain | Nested Forcing Chains |
| experimental | 1 | `Chaining(true, true, false, 4, false, 0)` | NestedForcingChain | Nested Forcing Chains |
| experimental | 2 | `Chaining(true, true, false, 4, false, 1)` | NestedForcingChain | Nested Forcing Chains |
| experimental | 3 | `Chaining(true, true, false, 4, false, 2)` | NestedForcingChain | Nested Forcing Chains |
| experimental | 4 | `Chaining(true, true, false, 4, false, 3)` | NestedForcingChain | Nested Forcing Chains |

### Default enabled technique set

Java `Settings.init()` (the effective default under the frozen baseline) enables **all in-scope techniques except `FiveStrongLinks` and `SixStrongLinks`**. So with default options, indirect #21 and #23 are NOT registered. The spec's line "default: all in-scope techniques" is overridden by the spec's own acceptance bar (differential equality with the Java engine at defaults). This was verified against `Settings.java` `init()`. The `StrongLinks(5)`/`StrongLinks(6)` producers are still ported and can be enabled via `EngineOptions.techniques`.

In-scope `SolvingTechnique` enum (declaration order preserved from Java minus out-of-scope members): HiddenSingle, DirectPointing, DirectHiddenPair, NakedSingle, DirectHiddenTriplet, PointingClaiming, NakedPair, XWing, HiddenPair, NakedTriplet, Swordfish, HiddenTriplet, TurbotFish, XYWing, XYZWing, WXYZWing, UniqueLoop, NakedQuad, Jellyfish, HiddenQuad, ThreeStrongLinks, VWXYZWing, BivalueUniversalGrave, FourStrongLinks, AlignedPairExclusion, FiveStrongLinks, SixStrongLinks, UVWXYZWing, ForcingChainCycle, TUVWXYZWing, AlignedTripletExclusion, NishioForcingChain, MultipleForcingChain, DynamicForcingChain, DynamicForcingChainPlus, NestedForcingChain.

### Solver-tier semantics (needed by the replay harness and the API)

- `getSingleHint()` (rating/solve-path loop): runs direct, indirect, chaining1, chaining2, advanced, experimental producers in order through a `SingleHintAccumulator` (which throws `InterruptedError` on the first `add`), so the first hint produced in registration order wins each step.
- `getDifficulty()` ER/EP/ED bookkeeping: `difficulty`/`pearl`/`diamond` update loop as in `Solver.java` lines 753-832. `hint == null` -> `difficulty = 20.0`, "Beyond solver", short "xx". `UnsupportedOperationException` (ported as `BeyondSolverInternalError` thrown where Java throws it) -> all 0.0, "No solution", short "O". `want` stays `0`.
- `getAllHints()`: direct + indirect + validators always run. Warnings only if empty so far. Then each of chaining1, chaining2 and advanced/experimental runs only if the result is still empty (Asker replaced by always-yes).

### Core shared interfaces (defined in steps 003-007, consumed everywhere)

```ts
// src/engine/util/BitSet32.ts (step-003)
class BitSet32 {
  bits: number;                       // bit i set <=> Java BitSet.get(i)
  get(i: number): boolean; set(i: number): void; clear(i?: number): void;
  and(o: BitSet32): void; or(o: BitSet32): void; andNot(o: BitSet32): void; xor(o: BitSet32): void;
  cardinality(): number; nextSetBit(from: number): number; // -1 when none
  isEmpty(): boolean; equals(o: BitSet32): boolean; clone(): BitSet32; length(): number;
}
// src/engine/util/JavaRandom.ts (step-003)
class JavaRandom { constructor(seed?: number | bigint); next?; nextInt(bound?: number): number; }
// src/engine/util/InterruptedError.ts (step-003)
class InterruptedError extends Error {}

// src/engine/Grid.ts (step-004) — public surface used by producers
class Grid {
  getCellValue(index: number): number; setCellValue(index: number, value: number): void;
  getCellPotentialValues(index: number): BitSet32;          // live reference
  hasCellPotentialValue(index: number, value: number): boolean;
  addCellPotentialValue(index: number, value: number): void;
  removeCellPotentialValue(index: number, value: number): void;
  removeCellPotentialValues(index: number, values: BitSet32): void;
  clearCellPotentialValues(index: number): void;
  setCellPotentialValues(index: number, values: BitSet32): void;
  getFirstCancellerOf(target: Cell, value: number): Cell | null;
  copyTo(other: Grid): void; isSolved(): boolean; getCountOccurancesOfValue(value: number): number;
  fromString(s: string): void; toString81(): string; isGiven(index: number): boolean; fixGivens(): void;
  equals(o: unknown): boolean;
  static getCell(index: number): Cell; static getCellXY(x: number, y: number): Cell;
  static getRegions(regionTypeIndex: number): Region[];     // 0..2 = block,row,column (verify vs Java)
  static visibleCellIndex: number[][]; static forwardVisibleCellIndex: number[][];
  static regionCellIndex: number[][]; static cellRegions: number[][];
  static visibleCellsSet: CellSet[]; static forwardVisibleCellsSet: CellSet[];
}
// src/engine/solver/potentials.ts (step-004) — Java Solver.rebuildPotentialValues/cancelPotentialValues
function rebuildPotentialValues(grid: Grid): void;
function cancelPotentialValues(grid: Grid): void;

// src/engine/solver/HintProducer.ts (step-007)
interface HintProducer { getHints(grid: Grid, accu: HintsAccumulator): void; }
interface IndirectHintProducer extends HintProducer { toString(): string; }
interface WarningHintProducer extends HintProducer { isValidity(): boolean; }
interface HintsAccumulator { add(hint: Hint): void; } // throws InterruptedError to stop
interface Rule { getName(): string; getShortName(): string; getDifficulty(): number; getClueHtml(grid: Grid, isBig: boolean): string; }
class SingleHintAccumulator implements HintsAccumulator { getHint(): Hint | null; }
```

### Fixture schema (written by step-002, consumed by all test steps)

`test/fixtures/puzzles/<id>.json`:

```json
{
  "id": "easy-s1",
  "puzzle": "81 chars, digits and dots",
  "validity": null,
  "solution": "81 digits (present iff validity is null)",
  "rating": { "er": 1.2, "ep": 1.2, "ed": 1.2,
              "erTechnique": "Hidden Single", "epTechnique": "...", "edTechnique": "...",
              "erShort": "HS", "epShort": "...", "edShort": "..." },
  "steps": [ { "gridBefore": "81 chars",
               "technique": "Hidden Single", "shortName": "HS", "rating": 1.5,
               "cell": 40, "value": 5,
               "removals": [ { "cell": 3, "values": [2, 7] } ],
               "toString": "Hidden Single: R5C5: 5 in block" } ]
}
```

- `cell` is `y * 9 + x` (0-80). When the hint places nothing, `cell` is -1 and `value` is 0.
- `removals` sorted by cell index, values ascending. `[]` when none.
- Invalid puzzles: `validity` is `{ "kind": "<Java hint class simple name>", "message": "<hint.toString()>" }` (`kind` may be `""` when Java's warning is an anonymous class, e.g. `NoDoubles`), `solution` omitted. The rating loop does not run on invalid puzzles: `getDifficulty()` has no validity guard and never returns on under-constrained grids (no basic technique fires, so it climbs to nested forcing chains on an open grid). So `rating` holds the solver's pre-loop defaults (`er`/`ep`/`ed` = `0.0`, all techniques `"No solution"`, all shorts `"O"`) and `steps` is `[]`. Reference-semantics contract (verified in step-002, decided 2026-07-19): the port's `rate()` / `getDifficulty()` must apply the same guard, only running the rating loop when `checkValidity()` returns null, so driver and port stay aligned. This supersedes step-002's original "then getDifficulty(recorder)" phrasing, which was unconditional.
- `test/fixtures/random.json`: JavaRandom reference sequences. `test/fixtures/generator/<name>.json`: `{ "seed": 1, "minEr": 1.0, "maxEr": 1.2, "symmetries": ["BiDiagonal","Orthogonal","Rotational180","Rotational90","Full"], "puzzle": "...", "er": 1.2 }`.

### Replay harness (defined in step-009, extended by steps 010-014)

```ts
// test/differential/replay.ts
interface PuzzleFixture { /* matches the schema above */ }
function loadFixtures(): PuzzleFixture[];                  // reads test/fixtures/puzzles/*.json
function replayFixture(f: PuzzleFixture): void;            // vitest assertions inside
// test/differential/producers.ts
function currentProducers(): HintProducer[];               // registration-order list of PORTED producers only
const PORTED_TECHNIQUE_NAMES: Set<string>;                 // every Rule.getName() string the ported hint classes can return
```

`replayFixture` parses `puzzle`, runs `rebuildPotentialValues`, then loops over the fixture steps:

1. If the step's `technique` is not in `PORTED_TECHNIQUE_NAMES`, stop. The prefix is verified.
2. Otherwise run `currentProducers()` through a `SingleHintAccumulator` and assert the found hint equals the fixture step on every recorded field.
3. Apply the hint and continue with the next step.

This is sound because Java picked each step's hint as the first in registration order. Producers not yet ported produced nothing at that grid state in Java, so omitting them cannot change the prefix.

### Commands

- `pnpm test` runs the fast suites. `SLOW=1 pnpm test` also includes `test/differential/slow/`.
- `pnpm typecheck` runs `tsc --noEmit`. `pnpm build` runs tsdown.
- Driver: `scripts/java-driver/README.md` (written in step-002) documents javac/java invocations.

## Steps

- [x] `step-001-scaffolding.md`: pnpm/tsdown/vitest project skeleton with LICENSE and first commit
- [x] `step-002-java-driver-and-fixtures.md`: the Java reference driver plus a ~200-puzzle corpus of committed fixtures
- [x] `step-003-util.md`: ports of `JavaRandom` and `BitSet32` plus `InterruptedError`, tested against fixtures
- [x] `step-004-grid.md`: `SolvingTechnique` and `Options`, then `Cell`, `Grid` with regions, `Link`, potentials
- [x] `step-005-tools.md`: `CellSet`, `Permutations`, `Twomutations`, `CommonTuples`, `ValuesFormatter` and small tools
- [ ] `step-006-templates.md`: HTML->markdown template conversion + `format()`
- [ ] `step-007-hint-framework.md`: `Hint` hierarchy with producer interfaces, accumulators and `Potential`
- [ ] `step-008-checks.md`: `BruteForceAnalysis` + validity checks + `Solution`
- [ ] `step-009-singles-locking-sets.md`: singles, Locking, HiddenSet and NakedSet, plus the replay harness
- [ ] `step-010-fish-strong-links.md`: `Fisherman` and `StrongLinks` with their hints
- [ ] `step-011-wings.md`: XY/XYZ/WXYZ/VWXYZ/UVWXYZ/TUVWXYZ wings with their hints
- [ ] `step-012-unique-bug.md`: `UniqueLoops` and `BivalueUniversalGrave` with their hints
- [ ] `step-013-aligned-exclusion.md`: APE + ATE with their hint class
- [ ] `step-014-chaining.md`: `Chaining` + chain hint classes
- [ ] `step-015-solver.md`: `Solver` and `Analyser`, the rating loop, technique enable/disable
- [ ] `step-016-differential.md`: full differential suite with the coverage meta-test and the slow suite
- [ ] `step-017-generator.md`: `Point`, `Symmetry` and `Generator` with seeded determinism tests
- [ ] `step-018-public-api.md`: `src/api/` and `src/index.ts`, errors, hooks, build + package check

Ordering: steps 001 through 009 are strictly sequential. Steps 010-013 can run in any order after 009 (each extends the replay registry independently, and conflicts in `producers.ts` are trivial to merge). Step 014 needs 009. Step 015 needs 010-014. Step 016 needs 015. Step 017 needs 015. Step 018 needs 015 through 017. Check each step off here when done.

## Leftovers Protocol

Finishing your step completely is the goal. `step-999-leftovers.md` is a
last resort for work that cannot happen in your session at all (a missing
credential, an upstream bug, a discovery that changes scope). It is not a
place to park work that is hard, boring, or long.

If you must defer something, append an entry to `step-999-leftovers.md` in
this directory (create the file if it doesn't exist):

### [step file] - [short title]

- **What:** the undone work, specific enough to act on without your
  session's context
- **Why deferred:** the concrete blocker
- **Where:** files and tests involved
- **Done when:** how to verify it's resolved

Write down everything you defer. If it's not done and not in leftovers,
it's lost.
