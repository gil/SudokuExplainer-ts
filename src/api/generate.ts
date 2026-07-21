import type { Symmetry } from '../engine/generator/Symmetry.js';
import type { Rating } from './engine.js';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'fiendish' | 'diabolical';

export interface GenerateOptions {
  difficulty?: DifficultyLevel | { min: number; max: number }; // default 'easy'
  symmetries?: Symmetry[]; // default: the Java GenerateDialog default selection
  seed?: number | bigint; // seeds JavaRandom; omitted -> time-based like Java
  shouldCancel?: () => boolean;
  onProgress?: (info: { attempt: number }) => void;
}

export interface GeneratedPuzzle {
  puzzle: number[]; // 81 values, 0 = empty
  solution: number[];
  rating: Rating;
}

// Java GenerateDialog.Difficulty min/max ER bounds.
const LEVEL_BOUNDS: Record<DifficultyLevel, { min: number; max: number }> = {
  easy: { min: 1.0, max: 1.2 },
  medium: { min: 1.3, max: 1.6 },
  hard: { min: 1.7, max: 2.5 },
  fiendish: { min: 2.6, max: 6.0 },
  diabolical: { min: 6.1, max: 11.0 },
};

export function resolveDifficulty(
  difficulty: DifficultyLevel | { min: number; max: number } | undefined,
): { min: number; max: number } {
  if (difficulty === undefined) return LEVEL_BOUNDS.easy;
  if (typeof difficulty === 'object') return { min: difficulty.min, max: difficulty.max };
  return LEVEL_BOUNDS[difficulty];
}
