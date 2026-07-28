import { Grid } from '../Grid.js';
import { SolvingTechnique } from '../SolvingTechnique.js';
import { Settings } from '../Settings.js';
import { InterruptedError } from '../util/InterruptedError.js';
import type { Hint } from './Hint.js';
import type { HintProducer, IndirectHintProducer, WarningHintProducer } from './HintProducer.js';
import type { Rule } from './Rule.js';
import { SingleHintAccumulator } from './SingleHintAccumulator.js';
import { DefaultHintsAccumulator } from './DefaultHintsAccumulator.js';
import { BeyondSolverInternalError } from './BeyondSolverInternalError.js';
import { rebuildPotentialValues, cancelPotentialValues } from './potentials.js';

import { NoDoubles } from './checks/NoDoubles.js';
import { NumberOfFilledCells } from './checks/NumberOfFilledCells.js';
import { NumberOfValues } from './checks/NumberOfValues.js';
import { BruteForceAnalysis } from './checks/BruteForceAnalysis.js';
import { Solution } from './checks/Solution.js';

import { HiddenSingle } from './rules/HiddenSingle.js';
import { NakedSingle } from './rules/NakedSingle.js';
import { Locking } from './rules/Locking.js';
import { HiddenSet } from './rules/HiddenSet.js';
import { NakedSet } from './rules/NakedSet.js';
import { Fisherman } from './rules/Fisherman.js';
import { StrongLinks } from './rules/StrongLinks.js';
import { XYWing } from './rules/XYWing.js';
import { WXYZWing } from './rules/WXYZWing.js';
import { VWXYZWing } from './rules/VWXYZWing.js';
import { UVWXYZWing } from './rules/UVWXYZWing.js';
import { TUVWXYZWing } from './rules/TUVWXYZWing.js';
import { UniqueLoops } from './rules/unique/UniqueLoops.js';
import { BivalueUniversalGrave } from './rules/unique/BivalueUniversalGrave.js';
import { AlignedPairExclusion } from './rules/AlignedPairExclusion.js';
import { AlignedExclusion } from './rules/AlignedExclusion.js';
import { Chaining } from './rules/chaining/Chaining.js';

// Ported from diuf.sudoku.solver.Solver.
//
// Omitted on purpose (not needed by the public API): the GUI replay helpers
// gatherHints/gatherProducer, getHintsHint, and the batch path
// getBatchDifficulty with its SmallestHintsAccumulator. The Asker argument is
// dropped everywhere: the port always proceeds as if the user answered yes,
// keeping the isUsingAdvanced bookkeeping. Only the frozen revisedRating==0
// else-branch of the Java constructor is ported.

export interface SolverHooks {
  shouldCancel?: () => boolean;
  onProgress?: (info: { step: number; difficulty: number }) => void;
  onStep?: (hint: Hint, gridBefore: number[]) => void;
}

export class CancelledError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CancelledError';
  }
}

export interface ProducerTiers {
  validators: WarningHintProducer[];
  warnings: WarningHintProducer[];
  direct: HintProducer[];
  indirect: IndirectHintProducer[];
  chaining1: IndirectHintProducer[];
  chaining2: IndirectHintProducer[];
  advanced: IndirectHintProducer[];
  experimental: IndirectHintProducer[];
  // Reverse lookup from a registered producer instance to the technique it was
  // registered under, so a hint's producer (hint.getRule()) can be mapped back
  // to its SolvingTechnique by identity (the public API needs it).
  techniqueByProducer: Map<HintProducer, SolvingTechnique>;
}

// Registration order of the Java Solver constructor (revisedRating==0 branch),
// with variant-gated entries (VLocking, *Gen, NC producers) removed and every
// producer guarded by addIfWorth against the enabled technique set. The result
// for defaultTechniques() equals the overview's registration table.
export function buildProducerTiers(techniques: Set<SolvingTechnique>): ProducerTiers {
  const direct: HintProducer[] = [];
  const indirect: IndirectHintProducer[] = [];
  const chaining1: IndirectHintProducer[] = [];
  const chaining2: IndirectHintProducer[] = [];
  const advanced: IndirectHintProducer[] = [];
  const experimental: IndirectHintProducer[] = [];
  const techniqueByProducer = new Map<HintProducer, SolvingTechnique>();

  const addD = (t: SolvingTechnique, p: HintProducer): void => {
    if (techniques.has(t)) {
      direct.push(p);
      techniqueByProducer.set(p, t);
    }
  };
  const addI = (t: SolvingTechnique, coll: IndirectHintProducer[], p: IndirectHintProducer): void => {
    if (techniques.has(t)) {
      coll.push(p);
      techniqueByProducer.set(p, t);
    }
  };

  const settings = Settings.getInstance();

  addD(SolvingTechnique.HiddenSingle, new HiddenSingle());
  if (settings.isBlocks()) addD(SolvingTechnique.DirectPointing, new Locking(true));
  addD(SolvingTechnique.DirectHiddenPair, new HiddenSet(2, true));
  addD(SolvingTechnique.NakedSingle, new NakedSingle());
  addD(SolvingTechnique.DirectHiddenTriplet, new HiddenSet(3, true));

  if (settings.isBlocks()) addI(SolvingTechnique.PointingClaiming, indirect, new Locking(false));
  addI(SolvingTechnique.NakedPair, indirect, new NakedSet(2));
  addI(SolvingTechnique.XWing, indirect, new Fisherman(2));
  addI(SolvingTechnique.HiddenPair, indirect, new HiddenSet(2, false));
  addI(SolvingTechnique.NakedTriplet, indirect, new NakedSet(3));
  addI(SolvingTechnique.Swordfish, indirect, new Fisherman(3));
  addI(SolvingTechnique.HiddenTriplet, indirect, new HiddenSet(3, false));
  addI(SolvingTechnique.TurbotFish, indirect, new StrongLinks(2));
  addI(SolvingTechnique.XYWing, indirect, new XYWing(false));
  addI(SolvingTechnique.XYZWing, indirect, new XYWing(true));
  addI(SolvingTechnique.UniqueLoop, indirect, new UniqueLoops());
  addI(SolvingTechnique.NakedQuad, indirect, new NakedSet(4));
  addI(SolvingTechnique.Jellyfish, indirect, new Fisherman(4));
  addI(SolvingTechnique.HiddenQuad, indirect, new HiddenSet(4, false));
  addI(SolvingTechnique.ThreeStrongLinks, indirect, new StrongLinks(3));
  addI(SolvingTechnique.WXYZWing, indirect, new WXYZWing());
  addI(SolvingTechnique.BivalueUniversalGrave, indirect, new BivalueUniversalGrave());
  addI(SolvingTechnique.FourStrongLinks, indirect, new StrongLinks(4));
  addI(SolvingTechnique.VWXYZWing, indirect, new VWXYZWing());
  addI(SolvingTechnique.AlignedPairExclusion, indirect, new AlignedPairExclusion());
  addI(SolvingTechnique.FiveStrongLinks, indirect, new StrongLinks(5));
  addI(SolvingTechnique.UVWXYZWing, indirect, new UVWXYZWing());
  addI(SolvingTechnique.SixStrongLinks, indirect, new StrongLinks(6));

  addI(SolvingTechnique.ForcingChainCycle, chaining1, new Chaining(false, false, false, 0, false, 0));
  addI(SolvingTechnique.TUVWXYZWing, chaining1, new TUVWXYZWing());
  addI(SolvingTechnique.AlignedTripletExclusion, chaining1, new AlignedExclusion(3));
  addI(SolvingTechnique.NishioForcingChain, chaining1, new Chaining(false, true, true, 0, false, 0));
  addI(SolvingTechnique.MultipleForcingChain, chaining1, new Chaining(true, false, false, 0, false, 0));
  addI(SolvingTechnique.DynamicForcingChain, chaining1, new Chaining(true, true, false, 0, false, 0));

  addI(SolvingTechnique.DynamicForcingChainPlus, chaining2, new Chaining(true, true, false, 1, false, 0));

  addI(SolvingTechnique.NestedForcingChain, advanced, new Chaining(true, true, false, 2, false, 0));
  addI(SolvingTechnique.NestedForcingChain, advanced, new Chaining(true, true, false, 3, false, 0));

  addI(SolvingTechnique.NestedForcingChain, experimental, new Chaining(true, true, false, 4, false, 0));
  addI(SolvingTechnique.NestedForcingChain, experimental, new Chaining(true, true, false, 4, false, 1));
  addI(SolvingTechnique.NestedForcingChain, experimental, new Chaining(true, true, false, 4, false, 2));
  addI(SolvingTechnique.NestedForcingChain, experimental, new Chaining(true, true, false, 4, false, 3));

  const validators: WarningHintProducer[] = [new NoDoubles()];
  const warnings: WarningHintProducer[] = [
    new NumberOfFilledCells(),
    new NumberOfValues(),
    new BruteForceAnalysis(false),
  ];

  return {
    validators,
    warnings,
    direct,
    indirect,
    chaining1,
    chaining2,
    advanced,
    experimental,
    techniqueByProducer,
  };
}

export class Solver {
  difficulty = 0;
  pearl = 0;
  diamond = 0;
  ERtN = '';
  EPtN = '';
  EDtN = '';
  shortERtN = '';
  shortEPtN = '';
  shortEDtN = '';
  want = 0;

  private grid: Grid;
  private directHintProducers: HintProducer[];
  private indirectHintProducers: IndirectHintProducer[];
  private validatorHintProducers: WarningHintProducer[];
  private warningHintProducers: WarningHintProducer[];
  private chainingHintProducers: IndirectHintProducer[];
  private chainingHintProducers2: IndirectHintProducer[];
  private advancedHintProducers: IndirectHintProducer[];
  private experimentalHintProducers: IndirectHintProducer[];

  private isUsingAdvanced = false;
  private readonly techniqueByProducer: Map<HintProducer, SolvingTechnique>;

  // Java reads Settings.getInstance().getTechniques() inside addIfWorth. The
  // explicit argument stays as an override for the API layer and tests.
  constructor(grid: Grid, techniques: Set<SolvingTechnique> = Settings.getInstance().getTechniques()) {
    this.grid = grid;
    const tiers = buildProducerTiers(techniques);
    this.techniqueByProducer = tiers.techniqueByProducer;
    this.validatorHintProducers = tiers.validators;
    this.warningHintProducers = tiers.warnings;
    this.directHintProducers = tiers.direct;
    this.indirectHintProducers = tiers.indirect;
    this.chainingHintProducers = tiers.chaining1;
    this.chainingHintProducers2 = tiers.chaining2;
    this.advancedHintProducers = tiers.advanced;
    this.experimentalHintProducers = tiers.experimental;
  }

  getGrid(): Grid {
    return this.grid;
  }

  // The technique a hint's producer was registered under, or undefined for
  // validator/warning producers (which carry no SolvingTechnique).
  getTechnique(producer: HintProducer): SolvingTechnique | undefined {
    return this.techniqueByProducer.get(producer);
  }

  rebuildPotentialValues(): void {
    rebuildPotentialValues(this.grid);
  }

  cancelPotentialValues(): void {
    cancelPotentialValues(this.grid);
  }

  checkValidity(): Hint | null {
    const accu = new SingleHintAccumulator();
    try {
      for (const producer of this.validatorHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.warningHintProducers) producer.getHints(this.grid, accu);
    } catch (e) {
      if (!(e instanceof InterruptedError)) throw e;
    }
    return accu.getHint();
  }

  getAllHints(): Hint[] {
    const result: Hint[] = [];
    const accu = new DefaultHintsAccumulator(result);
    try {
      for (const producer of this.directHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.indirectHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.validatorHintProducers) producer.getHints(this.grid, accu);
      if (result.length === 0) {
        for (const producer of this.warningHintProducers) producer.getHints(this.grid, accu);
      }
      if (result.length === 0) {
        for (const producer of this.chainingHintProducers) producer.getHints(this.grid, accu);
      }
      if (result.length === 0) {
        for (const producer of this.chainingHintProducers2) producer.getHints(this.grid, accu);
      }
      if (
        result.length === 0 &&
        !(this.advancedHintProducers.length === 0 && this.experimentalHintProducers.length === 0)
      ) {
        this.isUsingAdvanced = true;
        for (const producer of this.advancedHintProducers) {
          if (result.length === 0) producer.getHints(this.grid, accu);
        }
        for (const producer of this.experimentalHintProducers) {
          if (result.length === 0) producer.getHints(this.grid, accu);
        }
      }
    } catch (e) {
      if (!(e instanceof InterruptedError)) throw e;
    }
    return result;
  }

  private ruleComparer(r1: Rule, r2: Rule): number {
    const d1 = r1.getDifficulty();
    const d2 = r2.getDifficulty();
    if (d1 < d2) return -1;
    if (d1 > d2) return 1;
    const n1 = r1.getName();
    const n2 = r2.getName();
    return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
  }

  solve(hooks?: SolverHooks): Map<Rule, number> {
    // Java: TreeMap<Rule,Integer> with RuleComparer. Keys are equal iff the
    // comparator returns 0 (same difficulty and name), so dedup uses it too.
    const usedRules: Array<[Rule, number]> = [];
    while (!this.grid.isSolved()) {
      if (hooks?.shouldCancel?.()) throw new CancelledError();
      const accu = new SingleHintAccumulator();
      try {
        for (const producer of this.directHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.indirectHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.chainingHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.chainingHintProducers2) producer.getHints(this.grid, accu);
        for (const producer of this.advancedHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.experimentalHintProducers) producer.getHints(this.grid, accu);
      } catch (e) {
        if (!(e instanceof InterruptedError)) throw e;
      }
      const hint = accu.getHint();
      if (hint === null) throw new BeyondSolverInternalError('Failed to solve this Sudoku');
      const rule = hint as unknown as Rule;
      const existing = usedRules.find((e) => this.ruleComparer(e[0], rule) === 0);
      if (existing) existing[1] += 1;
      else usedRules.push([rule, 1]);
      hint.apply(this.grid);
    }
    usedRules.sort((a, b) => this.ruleComparer(a[0], b[0]));
    const result = new Map<Rule, number>();
    for (const [r, c] of usedRules) result.set(r, c);
    return result;
  }

  toNamedList(rules: Map<Rule, number>): Map<string, number> {
    const hints = new Map<string, number>();
    for (const [rule, count] of rules) {
      const name = rule.getName();
      const prev = hints.get(name);
      hints.set(name, prev === undefined ? count : prev + count);
    }
    return hints;
  }

  analyseDifficulty(
    min: number,
    max: number,
    include1: number,
    include2: number,
    include3: number,
    exclude1: number,
    exclude2: number,
    exclude3: number,
    notMax1: number,
    notMax2: number,
    notMax3: number,
    excludeT1: string,
    excludeT2: string,
    excludeT3: string,
    includeT1: string,
    includeT2: string,
    includeT3: string,
    notMaxT1: string,
    notMaxT2: string,
    notMaxT3: string,
    oneOf3_1: string,
    oneOf3_2: string,
    oneOf3_3: string,
  ): number {
    let difficulty = 0;
    let notMaxCounter = false;
    let inRateCounter = 0;
    let oneOfThreeCounter = false;
    if (include1 === 0.0) inRateCounter++;
    if (include2 === 0.0) inRateCounter++;
    if (include3 === 0.0) inRateCounter++;
    let inTechCounter = 0;
    if (includeT1 === '') inTechCounter++;
    if (includeT2 === '') inTechCounter++;
    if (includeT3 === '') inTechCounter++;
    while (!this.grid.isSolved()) {
      const accu = new SingleHintAccumulator();
      try {
        for (const producer of this.directHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.indirectHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.chainingHintProducers) producer.getHints(this.grid, accu);
        for (const producer of this.chainingHintProducers2) producer.getHints(this.grid, accu);
        // Only used for generator. Ignore advanced/experimental techniques
      } catch (e) {
        if (!(e instanceof InterruptedError)) throw e;
      }
      const hint = accu.getHint();
      if (hint === null) {
        return Number.MAX_VALUE;
      }
      const rule = hint as unknown as Rule;
      const ruleDiff = rule.getDifficulty();
      const ruleName = rule.getName();
      if (
        ruleDiff === exclude1 ||
        ruleDiff === exclude2 ||
        ruleDiff === exclude3 ||
        (ruleName.includes(excludeT1) && excludeT1 !== '') ||
        (ruleName.includes(excludeT2) && excludeT2 !== '') ||
        (ruleName.includes(excludeT3) && excludeT3 !== '')
      )
        return 0.0;
      if (inRateCounter < 3 && (ruleDiff === include1 || ruleDiff === include2 || ruleDiff === include3))
        inRateCounter++;
      if (inTechCounter < 3 && ruleName.includes(includeT1) && includeT1 !== '') inTechCounter++;
      if (inTechCounter < 3 && ruleName.includes(includeT2) && includeT2 !== '') inTechCounter++;
      if (inTechCounter < 3 && ruleName.includes(includeT3) && includeT3 !== '') inTechCounter++;
      if (!oneOfThreeCounter && (ruleName.includes(oneOf3_1) || ruleName.includes(oneOf3_2) || ruleName.includes(oneOf3_3)))
        oneOfThreeCounter = true;
      if (ruleDiff > difficulty) {
        if (
          notMax1 === ruleDiff ||
          notMax2 === ruleDiff ||
          notMax3 === ruleDiff ||
          (ruleName.includes(notMaxT1) && notMaxT1 !== '') ||
          (ruleName.includes(notMaxT2) && notMaxT2 !== '') ||
          (ruleName.includes(notMaxT3) && notMaxT3 !== '')
        )
          notMaxCounter = true;
        else notMaxCounter = false;
        difficulty = ruleDiff;
      }
      if (difficulty >= min && max >= 11.0) break;
      if (difficulty > max) break;
      hint.apply(this.grid);
    }
    if (!oneOfThreeCounter || notMaxCounter || inRateCounter < 3 || inTechCounter < 3) return 0.0;
    return difficulty;
  }

  getSingleHint(): Hint | null {
    const accu = new SingleHintAccumulator();
    try {
      for (const producer of this.directHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.indirectHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.chainingHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.chainingHintProducers2) producer.getHints(this.grid, accu);
      for (const producer of this.advancedHintProducers) producer.getHints(this.grid, accu);
      for (const producer of this.experimentalHintProducers) producer.getHints(this.grid, accu);
    } catch (e) {
      if (!(e instanceof InterruptedError)) throw e;
    }
    return accu.getHint();
  }

  getDifficulty(hooks?: SolverHooks): void {
    const backupGrid = new Grid();
    this.grid.copyTo(backupGrid);
    let stepCount = 0;
    try {
      this.difficulty = 0;
      this.pearl = 0.0;
      this.diamond = 0.0;
      this.ERtN = 'No solution';
      this.EPtN = 'No solution';
      this.EDtN = 'No solution';
      this.shortERtN = 'O';
      this.shortEPtN = 'O';
      this.shortEDtN = 'O';
      // Reference-semantics guard (overview line 173): Java's getDifficulty has
      // no validity check and never returns on under-constrained grids. The port
      // only runs the rating loop when the puzzle is valid, so an invalid puzzle
      // keeps the pre-loop defaults, matching the driver.
      if (this.checkValidity() !== null) return;
      while (!this.grid.isSolved()) {
        if (hooks?.shouldCancel?.()) throw new CancelledError();
        let hint: Hint | null = null;
        try {
          hint = this.getSingleHint();
          if (hint !== null) {
            const rule = hint as unknown as Rule;
            const ruleDiff = rule.getDifficulty();
            const ruleName = rule.getName();
            const ruleNameShort = rule.getShortName();
            if (ruleDiff > this.difficulty) {
              this.difficulty = ruleDiff;
              this.ERtN = ruleName;
              this.shortERtN = ruleNameShort;
            }
          }
        } catch (ex) {
          if (ex instanceof CancelledError) throw ex;
          if (ex instanceof BeyondSolverInternalError) {
            this.difficulty = this.pearl = this.diamond = 0.0;
            this.ERtN = this.EPtN = this.EDtN = 'No solution';
            this.shortERtN = this.shortEPtN = this.shortEDtN = 'O';
          } else throw ex;
        }
        if (hint === null) {
          this.difficulty = 20.0;
          this.ERtN = 'Beyond solver';
          this.shortERtN = 'xx';
          break;
        }
        const gridBefore: number[] = [];
        for (let i = 0; i < 81; i++) gridBefore.push(this.grid.getCellValue(i));
        hint.apply(this.grid);
        hooks?.onStep?.(hint, gridBefore);
        hooks?.onProgress?.({ step: ++stepCount, difficulty: this.difficulty });
        if (this.pearl === 0.0) {
          if (this.diamond === 0.0) {
            this.diamond = this.difficulty;
            this.EDtN = this.ERtN;
            this.shortEDtN = this.shortERtN;
          }
          if (hint.getCell() !== null) {
            if (this.want === 100 /* 'd' */ && this.difficulty > this.diamond) {
              this.difficulty = 20.0;
              this.ERtN = 'Beyond solver';
              this.shortERtN = 'xx';
              break;
            }
            this.pearl = this.difficulty;
            this.EPtN = this.ERtN;
            this.shortEPtN = this.shortERtN;
          }
        } else if (this.want !== 0 && this.difficulty > this.pearl) {
          this.difficulty = 20.0;
          this.ERtN = 'Beyond solver';
          this.shortERtN = 'xx';
          break;
        }
      }
    } finally {
      backupGrid.copyTo(this.grid);
    }
  }

  bruteForceSolve(): Hint | null {
    const accu = new SingleHintAccumulator();
    try {
      for (const producer of this.validatorHintProducers) producer.getHints(this.grid, accu);
      const engine = new Solution();
      engine.getHints(this.grid, accu);
    } catch (e) {
      if (!(e instanceof InterruptedError)) throw e;
    }
    return accu.getHint();
  }
}
