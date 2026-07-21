import { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import { ValuesFormatter } from '../../../tools/ValuesFormatter.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesChaining.js';
import { ChainingHint } from './ChainingHint.js';
import type { Potential } from './Potential.js';

// Ported from diuf.sudoku.solver.rules.chaining.CycleHint.
export class CycleHint extends ChainingHint {
  private readonly dstOn: Potential;
  private readonly dstOff: Potential;

  private _complexity = -1;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    isYChain: boolean,
    isXChain: boolean,
    dstOn: Potential,
    dstOff: Potential,
  ) {
    super(rule, removablePotentials, isYChain, isXChain);
    this.dstOn = dstOn;
    this.dstOff = dstOff;
  }

  override getFlatViewCount(): number {
    return 2;
  }

  override getSelectedCells(): Cell[] {
    const cells = new Set<Cell>();
    let current = this.dstOff;
    while (current.parents.length !== 0) {
      current = current.parents[0];
      cells.add(current.cell);
    }
    return [...cells];
  }

  private colorPotentials(viewNum: number, state: boolean): Map<Cell, BitSet32> {
    return this.getColorPotentials(viewNum === 0 ? this.dstOn : this.dstOff, state, false);
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.colorPotentials(viewNum, true);
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = this.colorPotentials(viewNum, false);
    const removable = this.getRemovablePotentials();
    for (const [c, values] of removable) {
      let reds = result.get(c);
      if (reds === undefined) {
        reds = new BitSet32();
        result.set(c, reds);
      }
      reds.or(values);
    }
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const start = viewNum === 0 ? this.dstOn : this.dstOff;
    return this.getLinksFrom(start);
  }

  override getFlatComplexity(): number {
    if (this._complexity < 0) this._complexity = this.getAncestorCount(this.dstOn);
    return this._complexity;
  }

  override getChainsTargets(): Potential[] {
    return [this.dstOn, this.dstOff];
  }

  override getChainTarget(viewNum: number): Potential {
    return this.dstOn;
  }

  override getSortKey(): number {
    if (this.isYChain && this.isXChain) return 4;
    else if (this.isYChain) return 3;
    else return 2;
  }

  getDifficulty(): number {
    let result: number;
    if (this.isYChain && this.isXChain) result = 7.0;
    else result = 6.5;
    return result + this.getLengthDifficulty();
  }

  override getRegions(): Region[] | null {
    return null;
  }

  override getResult(): Potential | null {
    return null;
  }

  getName(): string {
    if (this.isXChain && this.isYChain) return 'Bidirectional Cycle';
    else if (this.isYChain) return 'Bidirectional Y-Cycle';
    else {
      if (this.getSelectedCells().length === 4) return 'Generalized X-Wing';
      else return 'Bidirectional X-Cycle';
    }
  }

  getShortName(): string {
    if (this.isXChain && this.isYChain) return 'BiCy';
    else if (this.isYChain) return 'BiYCy';
    else {
      if (this.getSelectedCells().length === 4) return 'GXW';
      else return 'BiXCy';
    }
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      if (this.isXChain && !this.isYChain) {
        return 'Look for a ' + this.getName() + ' with the value <b>' + this.dstOn.value + '</b>';
      } else {
        return (
          'Look for a ' +
          this.getName() +
          ' touching the cell <b>' +
          this.dstOn.cell.toString() +
          '</b>'
        );
      }
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    return this.getName() + ': ' + Cell.toString(...this.getSelectedCells());
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.isXChain && this.isYChain) result = templates.XYCycle;
    else if (this.isXChain) result = templates.XCycle;
    else result = templates.YCycle;
    const cells = ValuesFormatter.formatCells(this.getSelectedCells(), ' and ');
    const value = String(this.dstOn.value);
    let commonName = '';
    if (!this.isYChain && this.getSelectedCells().length === 4) commonName = '(Generalized X-Wing)';
    const onChain = this.getHtmlChain(this.dstOn);
    const offChain = this.getHtmlChain(this.dstOff);
    result = format(result, cells, value, commonName, onChain, offChain, this.sharedRegions());
    return result;
  }
}
