import type { Cell } from '../../../Cell.js';
import type { Grid } from '../../../Grid.js';
import type { ChainingHint } from './ChainingHint.js';

// Ported from diuf.sudoku.solver.rules.chaining.Potential. A (Cell, value,
// on/off) triplet, optionally with parent potentials and an explanation.
export class Potential {
  readonly cell: Cell;
  readonly value: number;
  readonly isOn: boolean;
  readonly parents: Potential[] = [];
  readonly explanation: string | null;
  readonly cause: Potential.Cause | null;
  readonly nestedChain: ChainingHint | null;

  constructor(cell: Cell, value: number, isOn: boolean);
  constructor(cell: Cell, value: number, isOn: boolean, cause: Potential.Cause, explanation: string);
  constructor(
    cell: Cell,
    value: number,
    isOn: boolean,
    cause: Potential.Cause,
    explanation: string,
    nestedChain: ChainingHint,
  );
  constructor(
    cell: Cell,
    value: number,
    isOn: boolean,
    parent: Potential,
    cause: Potential.Cause,
    explanation: string,
  );
  constructor(
    cell: Cell,
    value: number,
    isOn: boolean,
    a?: Potential.Cause | Potential,
    b?: string | Potential.Cause,
    c?: ChainingHint | string,
  ) {
    this.cell = cell;
    this.value = value;
    this.isOn = isOn;
    if (a instanceof Potential) {
      // (cell, value, isOn, parent, cause, explanation)
      this.parents.push(a);
      this.cause = b as Potential.Cause;
      this.explanation = c as string;
      this.nestedChain = null;
    } else if (a === undefined) {
      // (cell, value, isOn)
      this.explanation = null;
      this.cause = null;
      this.nestedChain = null;
    } else {
      // (cell, value, isOn, cause, explanation[, nestedChain])
      this.cause = a;
      this.explanation = b as string;
      this.nestedChain = c === undefined ? null : (c as ChainingHint);
    }
  }

  off(grid: Grid): void {
    grid.removeCellPotentialValue(this.cell.getIndex(), this.value);
  }

  equals(o: unknown): boolean {
    if (!(o instanceof Potential)) return false;
    const other = o;
    return this.cell.equals(other.cell) && this.value === other.value && this.isOn === other.isOn;
  }

  // Primitive key consistent with equals (cell, value, isOn), used by LinkedSet
  // for O(1) membership. Not a port of Java hashCode (which is unused here).
  hashKey(): number {
    return this.cell.getIndex() * 20 + this.value * 2 + (this.isOn ? 1 : 0);
  }

  getAncestorCount(): number {
    const child: Potential = this;
    const ancestors: Potential[] = [];
    let todo: Potential[] = [child];
    while (todo.length !== 0) {
      const next: Potential[] = [];
      for (const p of todo) {
        if (!ancestors.some((a) => a.equals(p))) {
          ancestors.push(p);
          next.push(...p.parents);
        }
      }
      todo = next;
    }
    return ancestors.length;
  }

  toString(): string {
    return this.cell.toString() + '.' + this.value;
  }

  toWeakString(): string {
    return (
      this.cell.toString() +
      (this.isOn ? ' contains ' : ' does not contain ') +
      'the value ' +
      this.value
    );
  }

  toStrongString(): string {
    return (
      this.cell.toString() +
      (this.isOn ? ' must contain ' : ' cannot contain ') +
      'the value ' +
      this.value
    );
  }
}

export namespace Potential {
  export enum Cause {
    NakedSingle,
    HiddenBlock,
    HiddenRow,
    HiddenColumn,
    HiddenDG,
    HiddenWindow,
    HiddenMD,
    HiddenAD,
    HiddenGirandola,
    HiddenAsterisk,
    HiddenCD,
    Advanced,
  }
}
