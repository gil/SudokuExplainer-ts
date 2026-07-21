import type { Cell } from '../../../Cell.js';
import type { Grid, Region } from '../../../Grid.js';
import type { BitSet32 } from '../../../util/BitSet32.js';
import type { Link } from '../../../Link.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import { format } from '../../../../templates/format.js';
import * as templates from '../../../../templates/rulesChaining.js';
import { ChainingHint, regionCauseOf } from './ChainingHint.js';
import type { Potential } from './Potential.js';

// Ported from diuf.sudoku.solver.rules.chaining.RegionChainingHint.
export class RegionChainingHint extends ChainingHint {
  private readonly region: Region;
  private readonly value: number;
  private readonly chains: Map<number, Potential>;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    region: Region,
    value: number,
    chains: Map<number, Potential>,
  ) {
    super(rule, removablePotentials, true, true);
    this.region = region;
    this.value = value;
    this.chains = chains;
  }

  protected override getInitialCause(): Potential.Cause | null {
    return regionCauseOf(this.region);
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
    return [dstCell];
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

  override getFlatComplexity(): number {
    let result = 0;
    for (const target of this.chains.values()) result += this.getAncestorCount(target);
    return result;
  }

  override getChainsTargets(): Potential[] {
    return [...this.chains.values()];
  }

  override getChainTarget(viewNum: number): Potential {
    return this.getTargetPotential(viewNum);
  }

  override getSortKey(): number {
    return 6;
  }

  override getRegions(): Region[] {
    return [this.region];
  }

  getRegion(): Region {
    return this.region;
  }

  getDifficulty(): number {
    return this.getChainingRule().getDifficulty() + this.getLengthDifficulty();
  }

  getName(): string {
    const name = this.getChainingRule().getCommonName(this);
    if (name !== null) return name;
    return this.getNamePrefix() + 'Region Forcing' + this.getNameSuffix();
  }

  getShortName(): string {
    const name = this.getChainingRule().getCommonName(this);
    if (name !== null) return name;
    return this.getShortNamePrefix() + 'RF' + this.getShortNameSuffix();
  }

  override getResult(): Potential {
    return this.firstValue();
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return (
        'Look for a ' +
        this.getName() +
        ' with the value ' +
        this.value +
        ' on the <b1>' +
        this.region.toFullString() +
        '</b1>'
      );
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  override toString(): string {
    let prefix = this.getChainingRule().getCommonName(this);
    if (prefix === null) prefix = 'Region Forcing Chains';
    const dstPotential = this.firstValue();
    return (
      prefix +
      ': ' +
      this.value +
      ' in ' +
      this.region.toString() +
      ' ==> ' +
      dstPotential.toString() +
      (dstPotential.isOn ? ' on' : ' off')
    );
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.getChainingRule().isDynamicRule()) result = templates.DynamicRegionReductionHint;
    else result = templates.StaticRegionReductionHint;
    let assertions = '';
    for (const curTarget of this.chains.values()) {
      const curSource = this.getSrcPotential(curTarget);
      assertions += '<li>If ' + curSource.toWeakString() + ', then ' + curTarget.toStrongString();
    }
    const valueName = String(this.value);
    const regionName = this.region.toString();
    const target = this.firstValue();
    const resultName = target.toStrongString();
    const htmlChains = this.getChainsDetails();
    result = format(result, assertions, valueName, regionName, resultName, htmlChains);
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
