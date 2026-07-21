import type { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesChaining.js';
import { ChainingHint } from './ChainingHint.js';
import { Potential } from './Potential.js';

// Ported from diuf.sudoku.solver.rules.chaining.CellChainingHint.
export class CellChainingHint extends ChainingHint {
  private readonly srcCell: Cell;
  private readonly chains: Map<number, Potential>; // cell value -> outcome

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    srcCell: Cell,
    chains: Map<number, Potential>,
  ) {
    super(rule, removablePotentials, true, true);
    this.srcCell = srcCell;
    this.chains = chains;
  }

  protected override getInitialCause(): Potential.Cause | null {
    return Potential.Cause.NakedSingle;
  }

  private keyAt(index: number): number {
    const iter = this.chains.keys();
    let cur = iter.next();
    while (index > 0) {
      cur = iter.next();
      index--;
    }
    return cur.value as number;
  }

  private getTargetPotential(viewNum: number): Potential {
    const value = this.keyAt(viewNum);
    return this.chains.get(value)!;
  }

  private firstValue(): Potential {
    return this.chains.values().next().value as Potential;
  }

  override getFlatViewCount(): number {
    return this.chains.size;
  }

  override getSelectedCells(): Cell[] {
    const dstCell = this.firstValue().cell;
    return [this.srcCell, dstCell];
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedGreenPotentials(grid, viewNum);
    const target = this.getTargetPotential(viewNum);
    return this.getColorPotentials(target, true, true);
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedRedPotentials(grid, viewNum);
    const target = this.getTargetPotential(viewNum);
    return this.getColorPotentials(target, false, false);
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    if (viewNum >= this.getFlatViewCount()) return this.getNestedLinks(grid, viewNum);
    const target = this.getTargetPotential(viewNum);
    return this.getLinksFrom(target);
  }

  override getChainsTargets(): Potential[] {
    return [...this.chains.values()];
  }

  override getChainTarget(viewNum: number): Potential {
    return this.getTargetPotential(viewNum);
  }

  override getFlatComplexity(): number {
    let result = 0;
    for (const target of this.chains.values()) result += this.getAncestorCount(target);
    return result;
  }

  override getSortKey(): number {
    return 5;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  getDifficulty(): number {
    return this.getChainingRule().getDifficulty() + this.getLengthDifficulty();
  }

  getName(): string {
    const name = this.getChainingRule().getCommonName(this);
    if (name !== null) return name;
    return this.getNamePrefix() + 'Cell Forcing' + this.getNameSuffix();
  }

  getShortName(): string {
    const name = this.getChainingRule().getCommonName(this);
    if (name !== null) return name;
    return this.getShortNamePrefix() + 'LF' + this.getShortNameSuffix();
  }

  override getResult(): Potential {
    return this.firstValue();
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the cell <b>' + this.srcCell.toString() + '</b>';
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    let prefix = this.getChainingRule().getCommonName(this);
    if (prefix === null) prefix = 'Cell Forcing Chains';
    const dstPotential = this.firstValue();
    return (
      prefix +
      ': ' +
      this.srcCell.toString() +
      ' ==> ' +
      dstPotential.toString() +
      (dstPotential.isOn ? ' on' : ' off')
    );
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.getChainingRule().isDynamicRule()) result = templates.DynamicCellReductionHint;
    else result = templates.StaticCellReductionHint;
    let assertions = '';
    for (const curTarget of this.chains.values()) {
      const curSource = this.getSrcPotential(curTarget);
      assertions += '<li>If ' + curSource.toWeakString() + ', then ' + curTarget.toStrongString();
    }
    const cellName = this.srcCell.toString();
    const target = this.firstValue();
    const resultName = target.toStrongString();
    const htmlChains = this.getChainsDetails();
    result = format(result, assertions, cellName, resultName, htmlChains);
    return this.appendNestedChainsDetails(result);
  }

  private getChainsDetails(): string {
    let htmlChains = '';
    let index = 1;
    for (const curTarget of this.chains.values()) {
      const curSource = this.getSrcPotential(curTarget);
      htmlChains +=
        'Chain ' +
        index +
        ': <b>If ' +
        curSource.toWeakString() +
        ', then ' +
        curTarget.toStrongString() +
        '</b>' +
        ' (View ' +
        index +
        '):<br>\n';
      htmlChains += this.getHtmlChain(curTarget);
      htmlChains += '<br>\n';
      index++;
    }
    return htmlChains;
  }
}
