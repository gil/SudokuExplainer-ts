import type { HintProducer } from '../../src/engine/solver/HintProducer.js';
import { HiddenSingle } from '../../src/engine/solver/rules/HiddenSingle.js';
import { NakedSingle } from '../../src/engine/solver/rules/NakedSingle.js';
import { Locking } from '../../src/engine/solver/rules/Locking.js';
import { HiddenSet } from '../../src/engine/solver/rules/HiddenSet.js';
import { NakedSet } from '../../src/engine/solver/rules/NakedSet.js';
import { Fisherman } from '../../src/engine/solver/rules/Fisherman.js';
import { StrongLinks } from '../../src/engine/solver/rules/StrongLinks.js';
import { XYWing } from '../../src/engine/solver/rules/XYWing.js';
import { WXYZWing } from '../../src/engine/solver/rules/WXYZWing.js';
import { VWXYZWing } from '../../src/engine/solver/rules/VWXYZWing.js';
import { UVWXYZWing } from '../../src/engine/solver/rules/UVWXYZWing.js';
import { TUVWXYZWing } from '../../src/engine/solver/rules/TUVWXYZWing.js';
import { UniqueLoops } from '../../src/engine/solver/rules/unique/UniqueLoops.js';
import { BivalueUniversalGrave } from '../../src/engine/solver/rules/unique/BivalueUniversalGrave.js';
import { AlignedPairExclusion } from '../../src/engine/solver/rules/AlignedPairExclusion.js';
import { AlignedExclusion } from '../../src/engine/solver/rules/AlignedExclusion.js';
import { Chaining } from '../../src/engine/solver/rules/chaining/Chaining.js';

// Registration order from step-000-overview.md. Entries for producers that are
// not ported yet are simply absent; steps 010-014 splice theirs in AT THE
// DOCUMENTED POSITION (keep the numbered comments).
export function currentProducers(): HintProducer[] {
  return [
    // direct tier
    new HiddenSingle(),          // direct 1
    new Locking(true),           // direct 2
    new HiddenSet(2, true),      // direct 3
    new NakedSingle(),           // direct 4
    new HiddenSet(3, true),      // direct 5
    // indirect tier
    new Locking(false),          // indirect 1
    new NakedSet(2),             // indirect 2
    new Fisherman(2),            // indirect 3
    new HiddenSet(2, false),     // indirect 4
    new NakedSet(3),             // indirect 5
    new Fisherman(3),            // indirect 6
    new HiddenSet(3, false),     // indirect 7
    new StrongLinks(2),          // indirect 8
    new XYWing(false),           // indirect 9
    new XYWing(true),            // indirect 10
    new UniqueLoops(),           // indirect 11
    new NakedSet(4),             // indirect 12
    new Fisherman(4),            // indirect 13
    new HiddenSet(4, false),     // indirect 14
    new StrongLinks(3),          // indirect 15
    new WXYZWing(),              // indirect 16
    new BivalueUniversalGrave(), // indirect 17
    new StrongLinks(4),          // indirect 18
    new VWXYZWing(),             // indirect 19
    new AlignedPairExclusion(),  // indirect 20
    // indirect 21: StrongLinks(5) is DISABLED by default, never add it here
    new UVWXYZWing(),            // indirect 22
    // indirect 23: StrongLinks(6) is DISABLED by default, never add it here
    // chaining tiers                  (step-014, except TUVWXYZWing in step-011
    //   and AlignedExclusion(3) in step-013; keep chaining1 order: Chaining,
    //   TUVWXYZWing, AlignedExclusion, Chaining x3, then chaining2/advanced/experimental)
    new Chaining(false, false, false, 0, false, 0), // chaining1 1
    new TUVWXYZWing(),           // chaining1 2
    new AlignedExclusion(3),     // chaining1 3
    new Chaining(false, true, true, 0, false, 0),   // chaining1 4
    new Chaining(true, false, false, 0, false, 0),  // chaining1 5
    new Chaining(true, true, false, 0, false, 0),   // chaining1 6
    new Chaining(true, true, false, 1, false, 0),   // chaining2 1
    new Chaining(true, true, false, 2, false, 0),   // advanced 1
    new Chaining(true, true, false, 3, false, 0),   // advanced 2
    new Chaining(true, true, false, 4, false, 0),   // experimental 1
    new Chaining(true, true, false, 4, false, 1),   // experimental 2
    new Chaining(true, true, false, 4, false, 2),   // experimental 3
    new Chaining(true, true, false, 4, false, 3),   // experimental 4
  ];
}

// Every Rule.getName() string the ported hint classes can produce.
// Extend in later steps alongside currentProducers().
export const PORTED_TECHNIQUE_NAMES = new Set<string>([
  'Hidden Single',
  'Naked Single',
  'Direct Pointing',
  'Direct Claiming',
  'Pointing',
  'Claiming',
  'Direct Hidden Pair',
  'Direct Hidden Triplet',
  'Naked Pair',
  'Naked Triplet',
  'Naked Quad',
  'Hidden Pair',
  'Hidden Triplet',
  'Hidden Quad',
  // Fisherman (LockingHint) names
  'X-Wing',
  'Swordfish',
  'Jellyfish',
  // StrongLinksHint names (the numeric suffix is part of getName()); these are
  // the exact strings the corpus exercises for StrongLinks(2..4).
  'Skyscraper 011',
  'Grouped Skyscraper 111',
  '2-String Kite 012',
  'Grouped 2-String Kite 112',
  '2 Strong links 001',
  'Grouped 2 Strong links 101',
  '3 Skyscrapers 0111',
  'Grouped 3 Skyscrapers 1111',
  '3-String Kite 0112',
  '3 Strong links 0011',
  'Grouped 3 Strong links 1001',
  'Grouped 3 Strong links 1011',
  'Grouped 3 Strong links 2001',
  '(3 Strong Links) X-Loop 0011',
  '(3 Strong Links) X-Loop 0111',
  'Grouped 4 Strong links 40001',
  // XYWingHint names
  'XY-Wing',
  'XYZ-Wing',
  // Big-wing names: getName() is "<prefix>-Wing " + suffix, suffix =
  // (doubleLink?2:1) + biggestCardinality + wingSize. These are the exact
  // strings the corpus exercises.
  'WXYZ-Wing 126',
  'WXYZ-Wing 137',
  'WXYZ-Wing 138',
  'WXYZ-Wing 139',
  'WXYZ-Wing 237',
  'VWXYZ-Wing 128',
  'VWXYZ-Wing 139',
  'VWXYZ-Wing 1310',
  'VWXYZ-Wing 1311',
  'VWXYZ-Wing 1411',
  'VWXYZ-Wing 2311',
  'VWXYZ-Wing 2412',
  'UVWXYZ-Wing 1314',
  'TUVWXYZ-Wing 2418',
  // UniqueLoopHint names: "Unique <Rectangle|Loop> [<size>] type <n>". Exact
  // strings the corpus exercises.
  'Unique Rectangle type 1',
  'Unique Rectangle type 2',
  'Unique Rectangle type 3',
  'Unique Rectangle type 4',
  'Unique Loop 6 type 1',
  'Unique Loop 6 type 2',
  // BUG hint names.
  'BUG type 1',
  'BUG type 2',
  // Chaining hint names (getName() results) that the corpus exercises.
  // CycleHint:
  'Bidirectional Cycle',
  'Bidirectional Y-Cycle',
  // ForcingChainHint:
  'Forcing Chain',
  // BinaryChainingHint (Nishio / dynamic contradiction):
  'Nishio Forcing Chains',
  'Dynamic Contradiction Forcing Chains',
  'Dynamic Contradiction Forcing Chains (+)',
  'Dynamic Contradiction Forcing Chains (+ Forcing Chains)',
  'Dynamic Contradiction Forcing Chains (+ Multiple Forcing Chains)',
  // CellChainingHint:
  'Cell Forcing Chains',
  'Dynamic Cell Forcing Chains',
  'Dynamic Cell Forcing Chains (+)',
  // RegionChainingHint:
  'Region Forcing Chains',
  'Dynamic Region Forcing Chains',
  'Dynamic Region Forcing Chains (+)',
  'Dynamic Region Forcing Chains (+ Forcing Chains)',
]);
