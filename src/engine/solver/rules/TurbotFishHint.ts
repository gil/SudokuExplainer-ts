import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { Link } from '../../Link.js';
import { Settings } from '../../Settings.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';
import { Potential } from './chaining/Potential.js';
import type { HasParentPotentialHint } from './HasParentPotentialHint.js';

// baseSetRegionTypeIndex, coverSetRegionTypeIndex -> [name, shortName]
const hintNames: string[][][] = [
  [
    ['Turbot Crane', '2SL'],
    ['Turbot Crane', 'TC'],
    ['Turbot Crane', 'TC'],
  ],
  [
    ['Turbot Crane', 'TC'],
    ['Skyscraper', 'SS'],
    ['Two-string Kite', '2SK'],
  ],
  [
    ['Turbot Crane', 'TC'],
    ['Two-string Kite', '2SK'],
    ['Skyscraper', 'SS'],
  ],
];

const difficulties: number[][] = [
  [4.2, 4.2, 4.2],
  [4.2, 4.0, 4.1],
  [4.2, 4.1, 4.0],
];

// Ported from diuf.sudoku.solver.rules.TurbotFishHint. Only reachable when
// Settings.revisedRating() == 1, which registers TurbotFish in place of
// StrongLinks(2) for SolvingTechnique.TurbotFish.
export class TurbotFishHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly value: number;
  private readonly startCell: Cell;
  private readonly endCell: Cell;
  private readonly bridgeCell1: Cell;
  private readonly bridgeCell2: Cell;
  private readonly baseSet: Region;
  private readonly coverSet: Region;
  private readonly shareRegion: Region;
  private readonly ringRegion: Region | null;
  private readonly emptyRegion1: boolean;
  private readonly emptyRegion2: boolean;
  private readonly emptyRegionCells: (Cell | null)[];
  private readonly eliminationsTotal: number;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    startCell: Cell,
    endCell: Cell,
    bridgeCell1: Cell,
    bridgeCell2: Cell,
    value: number,
    base: Region,
    cover: Region,
    shareRegion: Region,
    emptyRegion1: boolean,
    emptyRegion2: boolean,
    emptyRegionCells: (Cell | null)[],
    eliminationsTotal: number,
    ringRegion: Region | null,
  ) {
    super(rule, removablePotentials);
    this.value = value;
    this.startCell = startCell;
    this.endCell = endCell;
    this.bridgeCell1 = bridgeCell1;
    this.bridgeCell2 = bridgeCell2;
    this.baseSet = base;
    this.coverSet = cover;
    this.shareRegion = shareRegion;
    this.ringRegion = ringRegion;
    this.emptyRegion1 = emptyRegion1;
    this.emptyRegion2 = emptyRegion2;
    this.emptyRegionCells = emptyRegionCells.slice();
    this.eliminationsTotal = eliminationsTotal;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    if (this.emptyRegion1 || this.emptyRegion2) return this.emptyRegionCells as Cell[];
    return [this.startCell, this.endCell];
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const fishDigitSet = SingletonBitSet.create(this.value);
    if (!this.emptyRegion1) {
      result.set(this.startCell, fishDigitSet);
      result.set(this.bridgeCell1, fishDigitSet);
    }
    // The Java `else if` is gated on isDG(), frozen false, so it never fires.
    if (!this.emptyRegion2) {
      result.set(this.bridgeCell2, fishDigitSet);
      result.set(this.endCell, fishDigitSet);
    }
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map(super.getRemovablePotentials());
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    result.push(new Link(this.startCell, this.value, this.bridgeCell1, this.value));
    result.push(new Link(this.bridgeCell1, this.value, this.bridgeCell2, this.value));
    result.push(new Link(this.bridgeCell2, this.value, this.endCell, this.value));
    return result;
  }

  override getRegions(): Region[] {
    return [this.baseSet, this.shareRegion, this.coverSet];
  }

  override toString(): string {
    return (
      this.getName() +
      ': ' +
      Cell.toFullString(this.startCell, this.bridgeCell1, this.bridgeCell2, this.endCell) +
      ' on value ' +
      this.value
    );
  }

  private sharedRegions(): string {
    // Settings.isVanilla() is frozen true; the variant branch enumerates the
    // extra region types and is unreachable here.
    if (Settings.getInstance().isVanilla()) return 'row, column or block';
    return 'row or column';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    if (
      (this.emptyRegion1 && this.baseSet.getRegionTypeIndex() === 0) ||
      (this.emptyRegion2 && this.coverSet.getRegionTypeIndex() === 0)
    )
      result = templates.GroupedTCFishHint;
    else if (this.emptyRegion1 || this.emptyRegion2) result = templates.Grouped2LinksFishHint;
    else result = templates.TurbotFishHint;
    const name = this.getName();
    const base = this.baseSet.toFullString();
    const cover = this.coverSet.toFullString();
    const shared = this.shareRegion.toFullString();
    const value = String(this.value);
    const cell1 = this.startCell.toString();
    const cell2 = this.bridgeCell1.toString();
    const cell3 = this.bridgeCell2.toString();
    const cell4 = this.endCell.toString();
    return format(result, name, value, cell1, cell2, cell3, cell4, base, cover, shared, this.sharedRegions());
  }

  getSuffix(): string {
    const suffixNames = ['00', '01', '11'];
    return suffixNames[(this.emptyRegion1 ? 1 : 0) + (this.emptyRegion2 ? 1 : 0)];
  }

  getName(): string {
    const ring = this.ringRegion === null ? '' : ' X-Loop';
    const b0 = this.emptyRegion1 && this.baseSet.getRegionTypeIndex() === 0;
    const c0 = this.emptyRegion2 && this.coverSet.getRegionTypeIndex() === 0;
    if (b0 !== c0) return 'Grouped Turbot Crane' + ring + ' ' + this.getSuffix();
    if (b0 && c0) return 'Grouped 2 strong links' + ring + ' ' + this.getSuffix();
    if (
      (this.emptyRegion1 || this.emptyRegion2) &&
      this.baseSet.getRegionTypeIndex() === this.coverSet.getRegionTypeIndex()
    )
      return 'Grouped Skyscraper' + ring + ' ' + this.getSuffix();
    if (this.emptyRegion1 || this.emptyRegion2) return 'Grouped 2-String Kite' + ring + ' ' + this.getSuffix();
    if (this.baseSet.getRegionTypeIndex() > 2 || this.coverSet.getRegionTypeIndex() > 2)
      return 'Grouped 2 strong links' + ring + ' ' + this.getSuffix();
    return hintNames[this.baseSet.getRegionTypeIndex()][this.coverSet.getRegionTypeIndex()][0] + ring;
  }

  getShortName(): string {
    const ring = this.ringRegion === null ? '' : 'r';
    const b0 = this.emptyRegion1 && this.baseSet.getRegionTypeIndex() === 0;
    const c0 = this.emptyRegion2 && this.coverSet.getRegionTypeIndex() === 0;
    if (b0 !== c0) return 'gTC' + ring + this.getSuffix();
    if (b0 && c0) return 'g2SL' + ring + this.getSuffix();
    if (
      (this.emptyRegion1 || this.emptyRegion2) &&
      this.baseSet.getRegionTypeIndex() === this.coverSet.getRegionTypeIndex()
    )
      return 'gSS' + ring + this.getSuffix();
    if (this.emptyRegion1 || this.emptyRegion2) return 'g2SK' + ring + this.getSuffix();
    if (this.baseSet.getRegionTypeIndex() > 2 || this.coverSet.getRegionTypeIndex() > 2)
      return 'g2SL' + ring + this.getSuffix();
    return hintNames[this.baseSet.getRegionTypeIndex()][this.coverSet.getRegionTypeIndex()][1] + ring;
  }

  getEliminationsTotal(): number {
    return this.eliminationsTotal;
  }

  getDifficulty(): number {
    if (
      this.emptyRegion1 ||
      this.emptyRegion2 ||
      this.baseSet.getRegionTypeIndex() > 2 ||
      this.coverSet.getRegionTypeIndex() > 2
    )
      return 4.3;
    return difficulties[this.baseSet.getRegionTypeIndex()][this.coverSet.getRegionTypeIndex()];
  }

  getClueHtml(grid: Grid, isBig: boolean): string {
    if (isBig) {
      return 'Look for a ' + this.getName() + ' on the value ' + this.value;
    } else {
      return 'Look for a ' + this.getName();
    }
  }

  getRuleParents(initialGrid: Grid, currentGrid: Grid): Potential[] {
    const result: Potential[] = [];
    const startCell = Grid.getCell(this.startCell.getIndex());
    const endCell = Grid.getCell(this.endCell.getIndex());
    const bridgeCell1 = Grid.getCell(this.bridgeCell1.getIndex());
    const bridgeCell2 = Grid.getCell(this.bridgeCell2.getIndex());
    if (
      initialGrid.hasCellPotentialValue(startCell.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.startCell.getIndex(), this.value)
    )
      result.push(new Potential(this.startCell, this.value, false));
    if (
      initialGrid.hasCellPotentialValue(bridgeCell1.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.bridgeCell1.getIndex(), this.value)
    )
      result.push(new Potential(this.bridgeCell1, this.value, false));
    if (
      initialGrid.hasCellPotentialValue(bridgeCell2.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.bridgeCell2.getIndex(), this.value)
    )
      result.push(new Potential(this.bridgeCell2, this.value, false));
    if (
      initialGrid.hasCellPotentialValue(endCell.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.endCell.getIndex(), this.value)
    )
      result.push(new Potential(this.endCell, this.value, false));
    return result;
  }
}
