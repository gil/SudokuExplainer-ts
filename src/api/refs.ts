import { BLOCK, ROW, type Region } from '../engine/Grid.js';
import { InvalidGridError } from './errors.js';

export type GridInput = string | number[];

/**
 * Player pencil marks, supplied alongside (never instead of) the placed digits.
 * Either a 729-char string, index `cell * 9 + (value - 1)`, holding the digit
 * when that candidate is live and `.` or `0` when it is not, or a `number[81]`
 * of 9-bit masks with bit `value - 1` set when the candidate is live.
 */
export type CandidateInput = string | number[];

export interface CellRef {
  index: number;
  row: number;
  column: number;
  name: string; // "R5C7"
}

export interface CandidateRef extends CellRef {
  value: number;
}

export interface RegionRef {
  type: 'block' | 'row' | 'column';
  index: number;
  name: string; // "B5", "R3", "C2"
}

export function toCellRef(index: number): CellRef {
  const row = Math.trunc(index / 9);
  const column = index % 9;
  return { index, row, column, name: `R${row + 1}C${column + 1}` };
}

export function toCandidateRef(index: number, value: number): CandidateRef {
  const cell = toCellRef(index);
  return { ...cell, value };
}

export function toRegionRef(region: Region): RegionRef {
  const typeIndex = region.getRegionTypeIndex();
  const type = typeIndex === BLOCK ? 'block' : typeIndex === ROW ? 'row' : 'column';
  const index = region.getRegionIndex();
  const prefix = type === 'block' ? 'B' : type === 'row' ? 'R' : 'C';
  return { type, index, name: `${prefix}${index + 1}` };
}

// Accepts an 81-char string (digits, '.', '0', whitespace tolerated) or a
// number[81] (0 = empty). Anything else throws InvalidGridError.
export function parseGrid(input: GridInput): number[] {
  if (typeof input === 'string') {
    const cleaned = input.replace(/\s/g, '');
    if (cleaned.length !== 81) {
      throw new InvalidGridError(`Grid string must be 81 characters, got ${cleaned.length}`);
    }
    const out: number[] = [];
    for (const ch of cleaned) {
      if (ch >= '1' && ch <= '9') out.push(ch.charCodeAt(0) - '0'.charCodeAt(0));
      else if (ch === '.' || ch === '0') out.push(0);
      else throw new InvalidGridError(`Invalid character '${ch}' in grid string`);
    }
    return out;
  }
  if (Array.isArray(input)) {
    if (input.length !== 81) {
      throw new InvalidGridError(`Grid array must have 81 values, got ${input.length}`);
    }
    const out: number[] = [];
    for (const v of input) {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 9) {
        throw new InvalidGridError(`Invalid cell value ${String(v)} (expected integer 0-9)`);
      }
      out.push(v);
    }
    return out;
  }
  throw new InvalidGridError('Grid input must be a string or number[]');
}

// Accepts a 729-char string (whitespace tolerated) or a number[81] of 9-bit
// masks, and normalises both to masks with bit (value - 1) set. Anything else
// throws InvalidGridError. In the string form the digit is required to match
// its own slot, so a candidate cannot be claimed from the wrong position.
export function parseCandidates(input: CandidateInput): number[] {
  const out: number[] = new Array(81).fill(0);
  if (typeof input === 'string') {
    const cleaned = input.replace(/\s/g, '');
    if (cleaned.length !== 729) {
      throw new InvalidGridError(
        `Candidate string must be 729 characters, got ${cleaned.length}`,
      );
    }
    for (let i = 0; i < 729; i++) {
      const ch = cleaned[i];
      const value = (i % 9) + 1;
      if (ch === '.' || ch === '0') continue;
      if (ch < '1' || ch > '9') {
        throw new InvalidGridError(`Invalid character '${ch}' in candidate string`);
      }
      if (ch.charCodeAt(0) - '0'.charCodeAt(0) !== value) {
        throw new InvalidGridError(
          `Candidate string position ${i} holds '${ch}' but that slot is value ${value}`,
        );
      }
      out[Math.trunc(i / 9)] |= 1 << (value - 1);
    }
    return out;
  }
  if (Array.isArray(input)) {
    if (input.length !== 81) {
      throw new InvalidGridError(`Candidate array must have 81 values, got ${input.length}`);
    }
    for (let i = 0; i < 81; i++) {
      const mask = input[i];
      if (typeof mask !== 'number' || !Number.isInteger(mask) || mask < 0 || mask > 0x1ff) {
        throw new InvalidGridError(
          `Invalid candidate mask ${String(mask)} (expected integer 0-511)`,
        );
      }
      out[i] = mask;
    }
    return out;
  }
  throw new InvalidGridError('Candidate input must be a string or number[]');
}
