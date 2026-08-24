import type { Cell } from './Cell.js';

// A link between two potential values (candidates) of two cells.
//
// Deviation from the Java original, which carries the four fields alone: a link
// built from a chain also records whether each end is the candidate being set
// or being removed. That is what tells a strong link from a weak one, and only
// the chaining rules know it. Rules that build links without a chain behind
// them leave both undefined, and the strength is then unknown rather than
// guessed.
export class Link {
  private readonly srcCell: Cell;
  private readonly srcValue: number;
  private readonly dstCell: Cell;
  private readonly dstValue: number;
  private readonly srcOn: boolean | undefined;
  private readonly dstOn: boolean | undefined;

  constructor(
    srcCell: Cell,
    srcValue: number,
    dstCell: Cell,
    dstValue: number,
    srcOn?: boolean,
    dstOn?: boolean,
  ) {
    this.srcCell = srcCell;
    this.srcValue = srcValue;
    this.dstCell = dstCell;
    this.dstValue = dstValue;
    this.srcOn = srcOn;
    this.dstOn = dstOn;
  }

  getSrcOn(): boolean | undefined {
    return this.srcOn;
  }

  getDstOn(): boolean | undefined {
    return this.dstOn;
  }

  /**
   * True for a strong link, false for a weak one, undefined when the rule that
   * built this link reasons without on/off states.
   *
   * A strong link runs from a candidate being removed to one being set: if this
   * one is not the value, that one must be. The reverse direction is the weak
   * link. Links whose ends share a state are neither, which happens inside a
   * forcing chain where a naked or hidden single carries the inference.
   */
  isStrong(): boolean | undefined {
    if (this.srcOn === undefined || this.dstOn === undefined) return undefined;
    if (!this.srcOn && this.dstOn) return true;
    if (this.srcOn && !this.dstOn) return false;
    return undefined;
  }

  getSrcCell(): Cell {
    return this.srcCell;
  }

  getSrcValue(): number {
    return this.srcValue;
  }

  getDstCell(): Cell {
    return this.dstCell;
  }

  getDstValue(): number {
    return this.dstValue;
  }
}
