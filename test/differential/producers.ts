import type { HintProducer } from '../../src/engine/solver/HintProducer.js';
import { HiddenSingle } from '../../src/engine/solver/rules/HiddenSingle.js';
import { NakedSingle } from '../../src/engine/solver/rules/NakedSingle.js';
import { Locking } from '../../src/engine/solver/rules/Locking.js';
import { HiddenSet } from '../../src/engine/solver/rules/HiddenSet.js';
import { NakedSet } from '../../src/engine/solver/rules/NakedSet.js';
import { Fisherman } from '../../src/engine/solver/rules/Fisherman.js';
import { StrongLinks } from '../../src/engine/solver/rules/StrongLinks.js';

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
    // indirect 9-10: XYWing           (step-011)
    // indirect 11: UniqueLoops        (step-012)
    new NakedSet(4),             // indirect 12
    new Fisherman(4),            // indirect 13
    new HiddenSet(4, false),     // indirect 14
    new StrongLinks(3),          // indirect 15
    // indirect 16: WXYZWing           (step-011)
    // indirect 17: BivalueUniversalGrave (step-012)
    new StrongLinks(4),          // indirect 18
    // indirect 19: VWXYZWing          (step-011)
    // indirect 20: AlignedPairExclusion (step-013)
    // indirect 21: StrongLinks(5) is DISABLED by default, never add it here
    // indirect 22: UVWXYZWing         (step-011)
    // indirect 23: StrongLinks(6) is DISABLED by default, never add it here
    // chaining tiers                  (step-014, except TUVWXYZWing in step-011
    //   and AlignedExclusion(3) in step-013; keep chaining1 order: Chaining,
    //   TUVWXYZWing, AlignedExclusion, Chaining x3, then chaining2/advanced/experimental)
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
]);
