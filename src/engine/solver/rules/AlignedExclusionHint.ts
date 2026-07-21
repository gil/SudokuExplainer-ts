import { Cell } from '../../Cell.js';
import type { Grid, Region } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import type { Link } from '../../Link.js';
import { ValuesFormatter } from '../../tools/ValuesFormatter.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';

// HtmlLoader.formatColors maps custom color tags to colors; the port keeps those
// roles as span color names to match the converted markdown templates.
function formatColors(html: string): string {
  return html
    .replace(/<r>/g, '<span color="red">')
    .replace(/<\/r>/g, '</span>')
    .replace(/<g>/g, '<span color="green">')
    .replace(/<\/g>/g, '</span>')
    .replace(/<o>/g, '<span color="orange">')
    .replace(/<\/o>/g, '</span>')
    .replace(/<b>/g, '**')
    .replace(/<\/b>/g, '**');
}

// Ported from diuf.sudoku.solver.rules.AlignedExclusionHint.
export class AlignedExclusionHint extends IndirectHint implements Rule {
  private readonly cells: Cell[];
  private readonly lockedCombinations: Map<number[], Cell | null>;

  constructor(
    rule: IndirectHintProducer,
    removables: Map<Cell, BitSet32>,
    cells: Cell[],
    lockedCombinations: Map<number[], Cell | null>,
  ) {
    super(rule, removables);
    this.cells = cells;
    this.lockedCombinations = lockedCombinations;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    return this.cells;
  }

  private getReleventCombinationValues(): BitSet32 {
    const result = new BitSet32();
    for (const combination of this.lockedCombinations.keys()) {
      if (this.isRelevent(combination)) {
        for (let i = 0; i < combination.length; i++) result.set(combination[i]);
      }
    }
    return result;
  }

  private contains(set: BitSet32, subSet: BitSet32): boolean {
    const temp = set.clone();
    temp.or(subSet);
    return temp.cardinality() === set.cardinality();
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const releventValues = this.getReleventCombinationValues();
    const result = new Map<Cell, BitSet32>();
    for (const cell of this.lockedCombinations.values()) {
      if (cell !== null) {
        const values = grid.getCellPotentialValues(cell.getIndex()).clone();
        if (this.contains(releventValues, values)) result.set(cell, values);
      }
    }
    return this.appendOranges(grid, result);
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return this.appendOranges(grid, this.getRemovablePotentials());
  }

  private appendOranges(grid: Grid, values: Map<Cell, BitSet32>): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>(values);
    const removables = this.getRemovablePotentials();
    for (const cell of this.cells) {
      if (!removables.has(cell)) {
        const existing = result.get(cell);
        if (existing) existing.or(grid.getCellPotentialValues(cell.getIndex()));
        else result.set(cell, grid.getCellPotentialValues(cell.getIndex()).clone());
      }
    }
    return result;
  }

  override getLinks(grid: Grid, viewNum: number): Link[] | null {
    return null;
  }

  override getRegions(): Region[] | null {
    return null;
  }

  getName(): string {
    const degree = this.cells.length;
    if (degree === 2) return 'Aligned Pair Exclusion';
    else if (degree === 3) return 'Aligned Triplet Exclusion';
    else if (degree === 4) return 'Aligned Quad Exclusion';
    else return 'Aligned Set (' + degree + ') Exclusion';
  }

  getShortName(): string {
    const degree = this.cells.length;
    if (degree === 2) return 'APE';
    else if (degree === 3) return 'ATE';
    else if (degree === 4) return 'AQE';
    else return 'A' + degree + 'E';
  }

  getDifficulty(): number {
    const degree = this.cells.length;
    if (degree === 2) return 6.2;
    else if (degree === 3) return 7.5;
    else throw new Error('UnsupportedOperationException');
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) return 'Look for an ' + this.getName() + ' on the cells ' + Cell.toString(...this.cells);
    else return 'Look for an ' + this.getName();
  }

  override toString(): string {
    return this.getName() + ': ' + Cell.toString(...this.cells);
  }

  // A combination is relevent if it includes one of the removable potential.
  private isRelevent(combination: number[]): boolean {
    const removables = this.getRemovablePotentials();
    for (let i = 0; i < combination.length; i++) {
      const cell = this.cells[i];
      const value = combination[i];
      const values = removables.get(cell);
      if (values && values.get(value)) return true;
    }
    return false;
  }

  private getColor(cell: Cell, value: number): string | null {
    const removables = this.getRemovablePotentials();
    const values = removables.get(cell);
    if (values) {
      if (values.get(value)) return 'r';
      else return null;
    } else if (this.cells.includes(cell)) {
      return 'o';
    } else {
      return null;
    }
  }

  private getRemovableValues(): BitSet32 {
    const result = new BitSet32();
    for (const values of this.getRemovablePotentials().values()) result.or(values);
    return result;
  }

  private appendCombination(grid: Grid, builder: string[], combination: number[], lockCell: Cell | null): void {
    for (let i = 0; i < combination.length; i++) {
      if (i === combination.length - 1) builder.push(' and ');
      else if (i > 0) builder.push(', ');
      const color = this.getColor(this.cells[i], combination[i]);
      if (color !== null) builder.push('<' + color + '>');
      builder.push('<b>');
      builder.push(String(combination[i]));
      builder.push('</b>');
      if (color !== null) builder.push('</' + color + '>');
    }
    builder.push(' because ');
    if (lockCell === null) {
      builder.push('the same value cannot occur twice in the same ' + this.sharedRegions());
    } else {
      builder.push('the cell <b>' + lockCell.toString() + '</b> must already contain <g><b>');
      builder.push(ValuesFormatter.formatValues(grid.getCellPotentialValues(lockCell.getIndex()), ' or '));
      builder.push('</b></g>');
    }
    builder.push('<br>');
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true.
    return 'row, column or block';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (this.cells.length === 2) result = templates.AlignedPairExclusionHint;
    else result = templates.AlignedExclusionHint;
    const names = ['Pair', 'Triplet', 'Quad', 'Set (5)', 'Set (6)'];
    const degree = this.cells.length;
    const name = names[degree - 2];
    const cellNames = ValuesFormatter.formatCells(this.cells, ' and ');
    const rules: string[] = [];
    for (const [combination, lockCell] of this.lockedCombinations) {
      if (this.isRelevent(combination)) this.appendCombination(grid, rules, combination, lockCell);
    }
    const ruleList = formatColors(rules.join(''));
    const exclCells = [...this.getRemovablePotentials().keys()];
    const exclCellNames = ValuesFormatter.formatCells(exclCells, ' and ');
    const exclValues = ValuesFormatter.formatValues(this.getRemovableValues(), ', ');
    return format(result, name, cellNames, ruleList, exclCellNames, exclValues);
  }

  private cellSet(): Set<Cell> {
    return new Set<Cell>(this.cells);
  }

  override equals(o: unknown): boolean {
    if (!(o instanceof AlignedExclusionHint)) return false;
    const a = this.cellSet();
    const b = o.cellSet();
    if (a.size !== b.size) return false;
    for (const cell of a) if (!b.has(cell)) return false;
    return this.removablePotentialsEqual(o.getRemovablePotentials());
  }

  private removablePotentialsEqual(other: Map<Cell, BitSet32>): boolean {
    const self = this.getRemovablePotentials();
    if (self.size !== other.size) return false;
    for (const [cell, values] of self) {
      const otherValues = other.get(cell);
      if (!otherValues || !values.equals(otherValues)) return false;
    }
    return true;
  }
}
