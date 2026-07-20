import type { HintProducer } from '../../src/engine/solver/HintProducer.js';
import { HiddenSingle } from '../../src/engine/solver/rules/HiddenSingle.js';
import { NakedSingle } from '../../src/engine/solver/rules/NakedSingle.js';
import { Locking } from '../../src/engine/solver/rules/Locking.js';
import { HiddenSet } from '../../src/engine/solver/rules/HiddenSet.js';
import { NakedSet } from '../../src/engine/solver/rules/NakedSet.js';

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
    // indirect 3: Fisherman(2)        (step-010)
    new HiddenSet(2, false),     // indirect 4
    new NakedSet(3),             // indirect 5
    // indirect 6: Fisherman(3)        (step-010)
    new HiddenSet(3, false),     // indirect 7
    // indirect 8: StrongLinks(2)      (step-010)
    // indirect 9-10: XYWing           (step-011)
    // indirect 11: UniqueLoops        (step-012)
    new NakedSet(4),             // indirect 12
    // indirect 13: Fisherman(4)       (step-010)
    new HiddenSet(4, false),     // indirect 14
    // indirect 15: StrongLinks(3)     (step-010)
    // indirect 16: WXYZWing           (step-011)
    // indirect 17: BivalueUniversalGrave (step-012)
    // indirect 18: StrongLinks(4)     (step-010)
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
]);
