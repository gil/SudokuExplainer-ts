import type { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesChaining.js';
import { ChainingHint } from './ChainingHint.js';
import { Potential } from './Potential.js';

// Ported from diuf.sudoku.solver.rules.chaining.ForcingChainHint.
export class ForcingChainHint extends ChainingHint {
  private readonly target: Potential;

  private _complexity = -1;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    isYChain: boolean,
    isXChain: boolean,
    target: Potential,
  ) {
    super(rule, removablePotentials, isYChain, isXChain);
    this.target = target;
  }

  override getFlatViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return [this.target.cell];
  }

  private colorPotentials(state: boolean): Map<Cell, BitSet32> {
    return this.getColorPotentials(this.target, state, state);
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedGreenPotentials(grid, viewNum);
    const result = this.colorPotentials(true);
    if (!this.target.isOn) result.get(this.target.cell)!.clear(this.target.value);
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedRedPotentials(grid, viewNum);
    const result = this.colorPotentials(false);
    if (this.target.isOn) result.get(this.target.cell)!.clear(this.target.value);
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedLinks(grid, viewNum);
    return this.getLinksFrom(this.target);
  }

  override getFlatComplexity(): number {
    if (this._complexity < 0) this._complexity = this.getAncestorCount(this.target);
    return this._complexity;
  }

  override getChainsTargets(): Potential[] {
    return [this.target];
  }

  override getChainTarget(viewNum: number): Potential {
    return this.target;
  }

  override getSortKey(): number {
    if (this.isYChain && this.isXChain) return 4;
    else if (this.isYChain) return 3;
    else return 2;
  }

  getDifficulty(): number {
    let result: number;
    if (this.isYChain && this.isXChain) result = 7.0;
    else result = 6.6;
    return result + this.getLengthDifficulty();
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getCell(): Cell | null {
    if (this.target.isOn) return this.target.cell;
    return null;
  }

  override getValue(): number {
    return this.target.value;
  }

  getName(): string {
    if (this.isXChain && this.isYChain) return 'Forcing Chain';
    else if (this.isYChain) return 'Forcing Y-Chain';
    else {
      if (this.getAncestorCount(this.target) === 6) return 'Turbot Fish';
      else return 'Forcing X-Chain';
    }
  }

  getShortName(): string {
    if (this.isXChain && this.isYChain) return 'FC';
    else if (this.isYChain) return 'FYC';
    else {
      if (this.getAncestorCount(this.target) === 6) return 'TF';
      else return 'FXC';
    }
  }

  override getResult(): Potential {
    return this.target;
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return (
        'Look for a ' +
        this.getName() +
        ' on the cell <b>' +
        this.target.cell.toString() +
        '</b> with the value <b>' +
        this.target.value +
        '</b>'
      );
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    return this.getName() + ': ' + this.target.toString() + (this.target.isOn ? ' on' : ' off');
  }

  override toHtml(grid: Grid): string {
    const fileName = this.isYChain ? templates.ForcingChain : templates.ForcingXChain;
    let result = fileName;
    const reverse = new Potential(this.target.cell, this.target.value, !this.target.isOn);
    const assumption = reverse.toWeakString();
    const consequence = this.target.toStrongString();
    const conclusion = this.target.toWeakString();
    const htmlChain = this.getHtmlChain(this.target);
    let commonName = '';
    if (this.isXChain && !this.isYChain && this.getAncestorCount(this.target) === 6)
      commonName = '(Turbot Fish)';
    result = format(result, assumption, consequence, conclusion, htmlChain, commonName);
    return this.appendNestedChainsDetails(result);
  }
}
