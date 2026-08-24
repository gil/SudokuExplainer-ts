import { Cell } from '../../../Cell.js';
import { Grid, Region, Block, Column, Row } from '../../../Grid.js';
import { Link } from '../../../Link.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import { Pair } from '../../../tools/Pair.js';
import { IndirectHint } from '../../IndirectHint.js';
import type { IndirectHintProducer } from '../../HintProducer.js';
import type { Rule } from '../../Rule.js';
import type { HasParentPotentialHint } from '../HasParentPotentialHint.js';
import { Potential } from './Potential.js';
import { FullChain } from './FullChain.js';
import type { Chaining } from './Chaining.js';

// Unique key for a Potential under Potential.equals (cell, value, isOn). Java
// dedups Potentials in HashSet by that equality; this key reproduces it exactly.
function pkey(p: Potential): number {
  return p.cell.getIndex() * 20 + p.value * 2 + (p.isOn ? 1 : 0);
}

// Java Chaining.getRegionCause(Region), inlined here (vanilla regions only) to
// avoid a value import cycle with Chaining. Used by RegionChainingHint.
export function regionCauseOf(region: Region): Potential.Cause {
  if (region instanceof Block) return Potential.Cause.HiddenBlock;
  else if (region instanceof Column) return Potential.Cause.HiddenColumn;
  else if (region instanceof Row) return Potential.Cause.HiddenRow;
  return Potential.Cause.HiddenRow;
}

// Ported from diuf.sudoku.solver.rules.chaining.ChainingHint.
export abstract class ChainingHint
  extends IndirectHint
  implements Rule, HasParentPotentialHint
{
  protected readonly isYChain: boolean;
  protected readonly isXChain: boolean;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    isYChain: boolean,
    isXChain: boolean,
  ) {
    super(rule, removablePotentials);
    this.isYChain = isYChain;
    this.isXChain = isXChain;
  }

  // Java collectRuleParents branches on `this instanceof CellChainingHint /
  // RegionChainingHint` to pick the initial-assumption cause; expressed as a
  // virtual to keep the base free of a subclass import cycle.
  protected getInitialCause(): Potential.Cause | null {
    return null;
  }

  getChain(target: Potential): Potential[] {
    const result: Potential[] = [];
    const done = new Set<number>();
    let todo: Potential[] = [target];
    while (todo.length !== 0) {
      const next: Potential[] = [];
      for (const p of todo) {
        const k = pkey(p);
        if (!done.has(k)) {
          done.add(k);
          result.push(p);
          next.push(...p.parents);
        }
      }
      todo = next;
    }
    return result;
  }

  private getNestedChains(): ChainingHint[] {
    const result: ChainingHint[] = [];
    const processed: FullChain[] = [];
    for (const target of this.getChainsTargets()) {
      for (const p of this.getChain(target)) {
        if (p.nestedChain !== null) {
          const f = new FullChain(p.nestedChain);
          if (!processed.some((o) => o.equals(f))) {
            result.push(p.nestedChain);
            processed.push(f);
          }
        }
      }
    }
    // Recurse (in case there is more than one level of nesting)
    for (const chain of [...result]) {
      result.push(...chain.getNestedChains());
    }
    return result;
  }

  protected getColorPotentials(
    target: Potential,
    state: boolean,
    skipTarget: boolean,
  ): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    for (const p of this.getChain(target)) {
      if (p.isOn === state || (state && (p !== target || !skipTarget))) {
        let potentials = result.get(p.cell);
        if (potentials === undefined) {
          potentials = new BitSet32();
          result.set(p.cell, potentials);
        }
        potentials.set(p.value);
      }
    }
    return result;
  }

  private getNestedChain(nestedViewNum: number): Pair<ChainingHint, number> | null {
    const processed: FullChain[] = [];
    for (const target of this.getChainsTargets()) {
      for (const p of this.getChain(target)) {
        if (p.nestedChain !== null) {
          const f = new FullChain(p.nestedChain);
          if (!processed.some((o) => o.equals(f))) {
            processed.push(f);
            const localCount = p.nestedChain.getViewCount();
            if (localCount > nestedViewNum) {
              return new Pair<ChainingHint, number>(p.nestedChain, nestedViewNum);
            }
            nestedViewNum -= localCount;
          }
        }
      }
    }
    return null;
  }

  private getContainerTarget(nestedChain: ChainingHint): Potential | null {
    for (const target of this.getChainsTargets()) {
      for (const p of this.getChain(target)) {
        if (p.nestedChain === nestedChain) return p;
      }
    }
    return null;
  }

  protected getNestedGreenPotentials(grid: Grid, nestedViewNum: number): Map<Cell, BitSet32> {
    nestedViewNum -= this.getFlatViewCount();
    const nest = this.getNestedChain(nestedViewNum)!;
    return nest.getValue1().getGreenPotentials(grid, nest.getValue2());
  }

  protected getNestedRedPotentials(grid: Grid, nestedViewNum: number): Map<Cell, BitSet32> {
    nestedViewNum -= this.getFlatViewCount();
    const nest = this.getNestedChain(nestedViewNum)!;
    return nest.getValue1().getRedPotentials(grid, nest.getValue2());
  }

  override getBluePotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    viewNum -= this.getFlatViewCount();
    if (viewNum >= 0) {
      // Create the grid deduced from the container (or "main") chain
      const nestedGrid = new Grid();
      grid.copyTo(nestedGrid);
      const nest = this.getNestedChain(viewNum)!;
      const nestedChain = nest.getValue1();
      const nestedViewNum = nest.getValue2();
      const target = this.getContainerTarget(nestedChain)!;
      for (const p of this.getChain(target)) {
        if (!p.isOn) nestedGrid.removeCellPotentialValue(p.cell.getIndex(), p.value);
      }
      const blues: Potential[] = [];
      const nestTarget = nestedChain.getChainTarget(nestedViewNum);
      nestedChain.collectRuleParents(grid, nestedGrid, blues, nestTarget);
      for (const p of blues) {
        const sCell = p.cell;
        if (result.has(sCell)) result.get(sCell)!.set(p.value);
        else result.set(sCell, SingletonBitSet.create(p.value));
      }
    }
    return result;
  }

  protected getNestedLinks(grid: Grid, nestedViewNum: number): Link[] {
    nestedViewNum -= this.getFlatViewCount();
    const nest = this.getNestedChain(nestedViewNum)!;
    return nest.getValue1().getLinks(grid, nest.getValue2())!;
  }

  protected getNestedComplexity(): number {
    let result = 0;
    const processed: FullChain[] = [];
    for (const target of this.getChainsTargets()) {
      for (const p of this.getChain(target)) {
        if (p.nestedChain !== null) {
          const f = new FullChain(p.nestedChain);
          if (!processed.some((o) => o.equals(f))) {
            result += p.nestedChain.getComplexity();
            processed.push(f);
          }
        }
      }
    }
    return result;
  }

  protected getLinksFrom(target: Potential): Link[] {
    const result: Link[] = [];
    for (const p of this.getChain(target)) {
      if (p.parents.length <= 6) {
        // The on/off state of both ends rides along: this is the only place
        // that still has it, and it is what makes a link strong or weak.
        for (const pr of p.parents) {
          result.push(new Link(pr.cell, pr.value, p.cell, p.value, pr.isOn, p.isOn));
        }
      }
    }
    return result;
  }

  private static getCauseRegionTypeIndex(cause: Potential.Cause): number {
    switch (cause) {
      case Potential.Cause.HiddenBlock:
        return 0;
      case Potential.Cause.HiddenColumn:
        return 2;
      case Potential.Cause.HiddenRow:
        return 1;
      default:
        return 0;
    }
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    for (const target of this.getChainsTargets()) {
      this.collectRuleParents(initialGrid, currentGrid, result, target);
    }
    return result;
  }

  collectRuleParents(
    initialGrid: Grid,
    currentGrid: Grid,
    result: Potential[],
    target: Potential,
  ): void {
    const done = new Set<number>();
    let todo: Potential[] = [target];
    while (todo.length !== 0) {
      const next: Potential[] = [];
      for (const p of todo) {
        const k = pkey(p);
        if (!done.has(k)) {
          done.add(k);
          let cause = p.cause;
          if (cause === null) {
            // This is the initial assumption
            cause = this.getInitialCause();
          }
          if (p.isOn && cause !== null) {
            const curCell = p.cell;
            if (cause === Potential.Cause.NakedSingle) {
              const currCellIndex = curCell.getIndex();
              for (let value = 1; value <= 9; value++) {
                if (
                  initialGrid.hasCellPotentialValue(currCellIndex, value) &&
                  !currentGrid.hasCellPotentialValue(currCellIndex, value)
                )
                  result.push(new Potential(curCell, value, false));
              }
            } else {
              // Hidden single
              const r = Grid.getRegionAt(
                ChainingHint.getCauseRegionTypeIndex(cause),
                curCell.getIndex(),
              );
              for (let i = 0; i < 9; i++) {
                const actCell = r.getCell(i);
                if (
                  initialGrid.hasCellPotentialValue(actCell.getIndex(), p.value) &&
                  !currentGrid.hasCellPotentialValue(actCell.getIndex(), p.value)
                ) {
                  result.push(new Potential(actCell, p.value, false));
                }
              }
            }
          }
          next.push(...p.parents);
        }
      }
      todo = next;
    }
  }

  protected getChainingRule(): Chaining {
    return this.getRule() as unknown as Chaining;
  }

  protected abstract getResult(): Potential | null;

  abstract getChainsTargets(): Potential[];

  protected abstract getChainTarget(viewNum: number): Potential;

  abstract getFlatViewCount(): number;

  protected getNestedViewCount(): number {
    let result = 0;
    const processed: FullChain[] = [];
    for (const target of this.getChainsTargets()) {
      for (const p of this.getChain(target)) {
        if (p.nestedChain !== null) {
          const f = new FullChain(p.nestedChain);
          if (!processed.some((o) => o.equals(f))) {
            result += p.nestedChain.getViewCount();
            processed.push(f);
          }
        }
      }
    }
    return result;
  }

  override getViewCount(): number {
    return this.getFlatViewCount() + this.getNestedViewCount();
  }

  override getCell(): Cell | null {
    const result = this.getResult();
    if (result !== null && result.isOn) return result.cell;
    return null;
  }

  override getValue(): number {
    const result = this.getResult();
    if (result !== null && result.isOn) return result.value;
    return 0;
  }

  protected getLengthDifficulty(): number {
    let added = 0.0;
    let ceil = 4;
    let length = this.getComplexity() - 2;
    let isOdd = false;
    while (length > ceil) {
      added += 0.1;
      if (!isOdd) ceil = Math.trunc((ceil * 3) / 2);
      else ceil = Math.trunc((ceil * 4) / 3);
      isOdd = !isOdd;
    }
    return added;
  }

  protected getNamePrefix(): string {
    const rule = this.getChainingRule();
    if (rule.getLevel() > 0) return 'Dynamic ';
    if (rule.isNishio()) return 'Nishio ';
    else if (rule.isDynamicRule()) return 'Dynamic ';
    else if (rule.isMultiple()) return '';
    else return '';
  }

  protected getShortNamePrefix(): string {
    const rule = this.getChainingRule();
    if (rule.getLevel() > 0) return 'D';
    if (rule.isNishio()) return 'N';
    else if (rule.isDynamicRule()) return 'D';
    else if (rule.isMultiple()) return '';
    else return '';
  }

  protected getNameSuffix(): string {
    const rule = this.getChainingRule();
    if (rule.getLevel() >= 1) return ' Chains' + getNestedSuffix(rule.getLevel());
    return ' Chains';
  }

  protected getShortNameSuffix(): string {
    const rule = this.getChainingRule();
    if (rule.getLevel() >= 1) return 'C' + getShortNestedSuffix(rule.getLevel());
    return 'C';
  }

  protected getAncestorCount(child: Potential): number {
    const ancestors = new Set<number>();
    let todo: Potential[] = [child];
    while (todo.length !== 0) {
      const next: Potential[] = [];
      for (const p of todo) {
        const k = pkey(p);
        if (!ancestors.has(k)) {
          ancestors.add(k);
          next.push(...p.parents);
        }
      }
      todo = next;
    }
    return ancestors.size;
  }

  protected getHtmlChain(dst: Potential): string {
    const potentials: Potential[] = [];
    const rules: string[] = [];
    this.addChainItem(potentials, rules, dst);
    let result = '';
    for (const rule of rules) {
      result += rule;
      result += '<br>';
    }
    return result;
  }

  private addChainItem(potentials: Potential[], rules: string[], p: Potential): void {
    for (const parent of p.parents) this.addChainItem(potentials, rules, parent);
    if (!potentials.some((x) => x.equals(p)) && p.parents.length > 0) {
      let rule = '';
      rule += '(';
      rule += rules.length + 1;
      rule += ') ';
      rule += 'If ';
      for (let i = p.parents.length - 1; i >= 0; i--) {
        if (i < p.parents.length - 1) {
          if (i === 0) rule += ' and ';
          else rule += ', ';
        }
        const parent = p.parents[i];
        rule += parent.toWeakString();
        const pIndex = potentials.findIndex((x) => x.equals(parent));
        if (pIndex < rules.length - 1) {
          rule += ' (';
          if (pIndex >= 0) rule += pIndex + 1;
          else rule += 'initial assumption';
          rule += ')';
        }
      }
      rule += ', then ';
      rule += p.toStrongString();
      if (p.explanation !== null) {
        rule += ' (';
        rule += p.explanation;
        rule += ')';
      }
      potentials.push(p);
      rules.push(rule);
    }
  }

  abstract getFlatComplexity(): number;

  getComplexity(): number {
    return this.getFlatComplexity() + this.getNestedComplexity();
  }

  abstract getSortKey(): number;

  protected getSrcPotential(target: Potential): Potential {
    let result = target;
    while (result.parents.length !== 0) result = result.parents[0];
    return result;
  }

  appendNestedChainsDetails(result: string): string {
    const nestedChains = this.getNestedChains();
    if (nestedChains.length === 0) return result;
    let nested = '';
    nested += '<br><br>\n';
    nested += '<b>Nested Forcing Chains details</b> ';
    nested +=
      '(Note that each Nested Forcing Chain relies on the fact that some' +
      ' <font color="blue">candidates</font> have been excluded by the main' +
      ' Forcing Chain): <br><br>\n';
    let index = this.getFlatViewCount() + 1;
    for (const nestedHint of nestedChains) {
      nested += '<i>Nested <b>';
      nested += nestedHint.toString();
      nested += '</b></i><br>\n';
      for (const target of nestedHint.getChainsTargets()) {
        const assumption = this.getSrcPotential(target);
        nested +=
          'Chain ' +
          index +
          ': <b>If ' +
          assumption.toWeakString() +
          ', then ' +
          target.toStrongString() +
          '</b>' +
          ' (View ' +
          index +
          '):<br>\n';
        nested += this.getHtmlChain(target);
        nested += '<br>\n';
        index++;
      }
    }
    const pos = result.toLowerCase().indexOf('</body>');
    return result.substring(0, pos) + nested + result.substring(pos);
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof ChainingHint)) return false;
    return removablePotentialsEqual(this.getRemovablePotentials(), o.getRemovablePotentials());
  }

  // Rule
  abstract getName(): string;
  abstract getShortName(): string;
  abstract getDifficulty(): number;
  abstract getClueHtml(grid: Grid, isBig: boolean): string;
}

// Java Chaining.getNestedSuffix / getShortNestedSuffix live on Chaining as
// statics; kept here too so ChainingHint stays free of a value import cycle.
export function getNestedSuffix(level: number): string {
  if (level === 1) return ' (+)';
  else if (level === 2) return ' (+ Forcing Chains)';
  else if (level === 3) return ' (+ Multiple Forcing Chains)';
  else if (level === 4) return ' (+ Dynamic Forcing Chains)';
  else if (level >= 5) return ' (+ Dynamic Forcing Chains' + getNestedSuffix(level - 3) + ')';
  return '';
}

export function getShortNestedSuffix(level: number): string {
  if (level === 1) return '+';
  else if (level === 2) return '+FC';
  else if (level === 3) return '+MFC';
  else if (level === 4) return '+DFC';
  else if (level >= 5) return '+DFC' + getShortNestedSuffix(level - 3);
  return '';
}

// Java HashMap<Cell,BitSet>.equals: same keys (Cell.equals) mapping equal
// BitSets. Cells here are Grid singletons, so Map reference lookup suffices.
export function removablePotentialsEqual(
  a: Map<Cell, BitSet32>,
  b: Map<Cell, BitSet32>,
): boolean {
  if (a.size !== b.size) return false;
  for (const [cell, values] of a) {
    const other = b.get(cell);
    if (other === undefined || !values.equals(other)) return false;
  }
  return true;
}
