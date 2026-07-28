import type { HintProducer } from '../../src/engine/solver/HintProducer.js';
import { buildProducerTiers } from '../../src/engine/solver/Solver.js';
import { defaultTechniques } from '../../src/engine/Settings.js';

// The registration order now lives in exactly one place: Solver.buildProducerTiers
// (the Solver constructor consumes it too). currentProducers flattens the tiers
// in the same order getSingleHint runs them: direct, indirect, chaining1,
// chaining2, advanced, experimental (validators/warnings excluded).
export function currentProducers(): HintProducer[] {
  const tiers = buildProducerTiers(defaultTechniques());
  return [
    ...tiers.direct,
    ...tiers.indirect,
    ...tiers.chaining1,
    ...tiers.chaining2,
    ...tiers.advanced,
    ...tiers.experimental,
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
