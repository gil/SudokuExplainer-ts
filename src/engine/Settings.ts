import { SolvingTechnique } from './SolvingTechnique.js';

// Ported from diuf.sudoku.Settings. Faithful singleton, because the flags below
// are set at runtime (serate exposes -r/-b/-F and the lkSudoku toggles), so
// compile-time constants cannot express them.
//
// Out of scope, deliberately not ported:
// - GUI-only state (look and feel, antialiasing, candidate display, isGUI)
// - java.util.prefs load()/save()
// - Variant flags beyond the vanilla defaults (isX, isDG, isWindows, isAsterisk,
//   isCD, isGirandola, isToroidal, isAntiFerz, isAntiKnight, whichNC). Their
//   getters are kept as frozen constants because ~30 engine files read them.
export class Settings {
  private revisedRating = 0;
  private islkSudokuBUGFlag = true;
  private islkSudokuURULFlag = true;
  private batchSolvingMode = 0;
  private fcPlus = 0;
  private isBringBackSE121Flag = false;

  // Vanilla baseline. isVLatin gates the region sweep (`< 3` vs `< 10`) in ~30
  // files; isBlocks picks its lower bound. Both are frozen because variants are
  // out of scope, so the variant region types they would select do not exist.
  private readonly isBlocksFlag = true;
  private readonly isVLatinFlag = true;
  private readonly isVanillaFlag = true;
  private readonly isForbiddenPairsFlag = false;
  private readonly whichNCValue = 0;

  variantString = '';

  // Java default is 1. Kept for surface completeness; the engine always takes
  // the serial path since JS has no shared-memory threads. Chaining's parallel
  // branch is work distribution over the same cell list, not different logic.
  private numThreads = 1;
  private bestHintOnly = false;

  private techniques: Set<SolvingTechnique> = new Set();

  private constructor() {
    this.init();
    if (this.isBringBackSE121()) this.settingsBBSE121();
  }

  private static instance: Settings | null = null;

  static getInstance(): Settings {
    if (Settings.instance === null) Settings.instance = new Settings();
    return Settings.instance;
  }

  setlkSudokuBUG(value: boolean): void {
    this.islkSudokuBUGFlag = value;
  }
  islkSudokuBUG(): boolean {
    return this.islkSudokuBUGFlag;
  }

  setlkSudokuURUL(value: boolean): void {
    this.islkSudokuURULFlag = value;
  }
  islkSudokuURUL(): boolean {
    return this.islkSudokuURULFlag;
  }

  setRevisedRating(value: number): void {
    this.revisedRating = value;
  }
  getRevisedRating(): number {
    return this.revisedRating;
  }

  setBatchSolving(value: number): void {
    this.batchSolvingMode = value;
  }
  batchSolving(): number {
    return this.batchSolvingMode;
  }

  setFCPlus(value: number): void {
    this.fcPlus = value;
  }
  FCPlus(): number {
    return this.fcPlus;
  }

  setBringBackSE121(value: boolean): void {
    this.isBringBackSE121Flag = value;
  }
  isBringBackSE121(): boolean {
    return this.isBringBackSE121Flag;
  }

  isBlocks(): boolean {
    return this.isBlocksFlag;
  }
  isVLatin(): boolean {
    return this.isVLatinFlag;
  }
  isVanilla(): boolean {
    return this.isVanillaFlag;
  }
  isForbiddenPairs(): boolean {
    return this.isForbiddenPairsFlag;
  }
  whichNC(): number {
    return this.whichNCValue;
  }

  setNumThreads(value: number): void {
    this.numThreads = value;
  }
  getNumThreads(): number {
    return this.numThreads;
  }

  setBestHintOnly(value: boolean): void {
    this.bestHintOnly = value;
  }
  getBestHintOnly(): boolean {
    return this.bestHintOnly;
  }

  getTechniques(): Set<SolvingTechnique> {
    return new Set(this.techniques);
  }

  setTechniques(techniques: Set<SolvingTechnique>): void {
    this.techniques = techniques;
  }

  isUsingAllTechniques(): boolean {
    return this.techniques.size === allTechniques().size;
  }

  isUsingOneOf(...solvingTechniques: SolvingTechnique[]): boolean {
    for (const st of solvingTechniques) if (this.techniques.has(st)) return true;
    return false;
  }

  isusingAll(...solvingTechniques: SolvingTechnique[]): boolean {
    for (const st of solvingTechniques) if (!this.techniques.has(st)) return false;
    return true;
  }

  isUsingAllButMaybeNot(...solvingTechniques: SolvingTechnique[]): boolean {
    for (const st of allTechniques()) {
      if (!this.techniques.has(st) && !solvingTechniques.includes(st)) return false;
    }
    return true;
  }

  settingsBBSE121(): void {
    this.init121();
  }

  // Settings.init(). The Java version also removes VLocking and the five
  // NakedSetGen entries; those are variant-only and absent from our enum.
  private init(): void {
    this.techniques = allTechniques();
    this.techniques.delete(SolvingTechnique.FiveStrongLinks);
    this.techniques.delete(SolvingTechnique.SixStrongLinks);
  }

  // Settings.init121(). Same note as init() about the variant-only removals.
  private init121(): void {
    this.techniques = allTechniques();
    this.techniques.delete(SolvingTechnique.TurbotFish);
    this.techniques.delete(SolvingTechnique.ThreeStrongLinks);
    this.techniques.delete(SolvingTechnique.FourStrongLinks);
    this.techniques.delete(SolvingTechnique.FiveStrongLinks);
    this.techniques.delete(SolvingTechnique.SixStrongLinks);
    this.techniques.delete(SolvingTechnique.WXYZWing);
    this.techniques.delete(SolvingTechnique.VWXYZWing);
    this.techniques.delete(SolvingTechnique.UVWXYZWing);
    this.techniques.delete(SolvingTechnique.TUVWXYZWing);
  }
}

function allTechniques(): Set<SolvingTechnique> {
  return new Set(Object.values(SolvingTechnique));
}

export interface SettingsSnapshot {
  revisedRating: number;
  islkSudokuBUG: boolean;
  islkSudokuURUL: boolean;
  batchSolving: number;
  FCPlus: number;
  isBringBackSE121: boolean;
  numThreads: number;
  bestHintOnly: boolean;
  techniques: Set<SolvingTechnique>;
}

/** Captures the mutable settings so a caller can restore them in a `finally`. */
export function snapshotSettings(): SettingsSnapshot {
  const s = Settings.getInstance();
  return {
    revisedRating: s.getRevisedRating(),
    islkSudokuBUG: s.islkSudokuBUG(),
    islkSudokuURUL: s.islkSudokuURUL(),
    batchSolving: s.batchSolving(),
    FCPlus: s.FCPlus(),
    isBringBackSE121: s.isBringBackSE121(),
    numThreads: s.getNumThreads(),
    bestHintOnly: s.getBestHintOnly(),
    techniques: s.getTechniques(),
  };
}

export function restoreSettings(snap: SettingsSnapshot): void {
  const s = Settings.getInstance();
  s.setRevisedRating(snap.revisedRating);
  s.setlkSudokuBUG(snap.islkSudokuBUG);
  s.setlkSudokuURUL(snap.islkSudokuURUL);
  s.setBatchSolving(snap.batchSolving);
  s.setFCPlus(snap.FCPlus);
  s.setBringBackSE121(snap.isBringBackSE121);
  s.setNumThreads(snap.numThreads);
  s.setBestHintOnly(snap.bestHintOnly);
  s.setTechniques(snap.techniques);
}

/** Java Settings.init() default set, for callers that want it without the singleton. */
export function defaultTechniques(): Set<SolvingTechnique> {
  const set = allTechniques();
  set.delete(SolvingTechnique.FiveStrongLinks);
  set.delete(SolvingTechnique.SixStrongLinks);
  return set;
}

// Java Settings.variantString / isBlocks() under the vanilla baseline. Kept as
// module constants for the call sites that only need the frozen value.
export const variantString = '';
export const isBlocks = true;
