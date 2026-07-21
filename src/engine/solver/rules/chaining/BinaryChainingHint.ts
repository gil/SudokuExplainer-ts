import type { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesChaining.js';
import { ChainingHint } from './ChainingHint.js';
import { Potential } from './Potential.js';

// Ported from diuf.sudoku.solver.rules.chaining.BinaryChainingHint.
export class BinaryChainingHint extends ChainingHint {
  private readonly srcPotential: Potential;
  private readonly dstOnPotential: Potential;
  private readonly dstOffPotential: Potential;
  private readonly isAbsurd: boolean;
  private readonly isNishio: boolean;

  private _complexity = -1;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    srcPotential: Potential,
    fromOnPotential: Potential,
    fromOffPotential: Potential,
    isAbsurd: boolean,
    isNishio: boolean,
  ) {
    super(rule, removablePotentials, true, true);
    this.srcPotential = srcPotential;
    this.dstOnPotential = fromOnPotential;
    this.dstOffPotential = fromOffPotential;
    this.isAbsurd = isAbsurd;
    this.isNishio = isNishio;
  }

  override getFlatViewCount(): number {
    return 2;
  }

  override getSelectedCells(): Cell[] {
    return [this.srcPotential.cell, this.dstOnPotential.cell];
  }

  private colorPotentials(viewNum: number, state: boolean): Map<Cell, BitSet32> {
    return this.getColorPotentials(
      viewNum === 0 ? this.dstOnPotential : this.dstOffPotential,
      state,
      state,
    );
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedGreenPotentials(grid, viewNum);
    return this.colorPotentials(viewNum, true);
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedRedPotentials(grid, viewNum);
    return this.colorPotentials(viewNum, false);
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedLinks(grid, viewNum);
    const start = viewNum === 0 ? this.dstOnPotential : this.dstOffPotential;
    return this.getLinksFrom(start);
  }

  override getChainsTargets(): Potential[] {
    return [this.dstOnPotential, this.dstOffPotential];
  }

  override getChainTarget(viewNum: number): Potential {
    if (viewNum === 0) return this.dstOnPotential;
    else return this.dstOffPotential;
  }

  override getFlatComplexity(): number {
    if (this._complexity < 0)
      this._complexity =
        this.getAncestorCount(this.dstOnPotential) + this.getAncestorCount(this.dstOffPotential);
    return this._complexity;
  }

  override getSortKey(): number {
    if (this.isAbsurd) return 7;
    else return 1;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  getDifficulty(): number {
    return this.getChainingRule().getDifficulty() + this.getLengthDifficulty();
  }

  getName(): string {
    let result: string;
    if (this.isNishio) result = 'Forcing';
    else if (this.isAbsurd) result = 'Contradiction Forcing';
    else result = 'Double Forcing';
    return this.getNamePrefix() + result + this.getNameSuffix();
  }

  getShortName(): string {
    let result: string;
    if (this.isNishio) result = 'F';
    else if (this.isAbsurd) result = 'CF';
    else result = 'dF';
    return this.getShortNamePrefix() + result + this.getShortNameSuffix();
  }

  override getResult(): Potential {
    if (this.isNishio || this.isAbsurd)
      return new Potential(this.srcPotential.cell, this.srcPotential.value, !this.srcPotential.isOn);
    else return this.dstOnPotential;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return (
        'Look for a ' +
        this.getName() +
        ' starting on the cell <b>' +
        this.srcPotential.cell.toString() +
        '</b> with the value <b>' +
        this.srcPotential.value +
        '</b>'
      );
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    if (this.isNishio)
      return (
        'Nishio Forcing Chain: ' +
        this.srcPotential.toString() +
        (this.srcPotential.isOn ? ' on' : ' off') +
        ' ==> ' +
        this.dstOffPotential.toString() +
        ' both on & off'
      );
    else if (this.isAbsurd)
      return (
        'Contradiction Forcing Chain: ' +
        this.srcPotential.toString() +
        (this.srcPotential.isOn ? ' on' : ' off') +
        ' ==> ' +
        this.dstOffPotential.toString() +
        ' both on & off'
      );
    else
      return (
        'Double Forcing Chain: ' +
        this.srcPotential.toString() +
        ' on & off ==> ' +
        this.dstOnPotential.toString() +
        (this.dstOnPotential.isOn ? ' on' : ' off')
      );
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.isNishio) result = templates.NishioHint;
    else if (this.isAbsurd) result = templates.DynamicContradictionHint;
    else result = templates.DynamicReductionHint;
    const srcOn = new Potential(this.srcPotential.cell, this.srcPotential.value, true);
    const srcOff = new Potential(this.srcPotential.cell, this.srcPotential.value, false);
    const srcReverse = new Potential(
      this.srcPotential.cell,
      this.srcPotential.value,
      !this.srcPotential.isOn,
    );
    const chainOn = this.getHtmlChain(this.dstOnPotential);
    const chainOff = this.getHtmlChain(this.dstOffPotential);
    if (this.isAbsurd)
      result = format(
        result,
        this.srcPotential.toWeakString(),
        this.dstOnPotential.toStrongString(),
        this.dstOffPotential.toStrongString(),
        srcReverse.toStrongString(),
        chainOn,
        chainOff,
      );
    else
      result = format(
        result,
        srcOn.toWeakString(),
        srcOff.toWeakString(),
        this.dstOnPotential.toStrongString(),
        chainOn,
        chainOff,
      );
    return this.appendNestedChainsDetails(result);
  }
}
