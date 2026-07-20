import { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import { Link } from '../../Link.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import { format } from '../../../templates/format.js';
import * as templates from '../../../templates/rules.js';
import { IndirectHint } from '../IndirectHint.js';
import type { IndirectHintProducer } from '../HintProducer.js';
import type { Rule } from '../Rule.js';
import { Potential } from './chaining/Potential.js';
import type { HasParentPotentialHint } from './HasParentPotentialHint.js';

// Ported from diuf.sudoku.solver.rules.StrongLinksHint.
export class StrongLinksHint extends IndirectHint implements Rule, HasParentPotentialHint {
  private readonly value: number;
  private readonly startCell: Cell;
  private readonly endCell: Cell;
  private readonly emptyCells: (Cell | null)[];
  private readonly eliminationsTotal: number;
  private readonly baseLinkRegion: Region[];
  private readonly shareRegion: Region[];
  private readonly bridge1: (Cell | null)[];
  private readonly bridge2: (Cell | null)[];
  private readonly q: number[];
  private readonly linkSet: number[];
  private readonly baseLinkEmptyRegion: boolean[];
  private readonly linksNumber: number;
  private readonly ringRegion: Region | null;

  constructor(
    rule: IndirectHintProducer,
    removablePotentials: Map<Cell, BitSet32>,
    startCell: Cell,
    value: number,
    endCell: Cell,
    emptyRegionCells: (Cell | null)[],
    eliminationsTotal: number,
    baseLinkRegion: Region[],
    shareRegion: Region[],
    bridge1: (Cell | null)[],
    bridge2: (Cell | null)[],
    q: number[],
    linkSet: number[],
    baseLinkEmptyRegion: boolean[],
    ringRegion: Region | null,
  ) {
    super(rule, removablePotentials);
    this.value = value;
    this.startCell = startCell;
    this.endCell = endCell;
    this.emptyCells = emptyRegionCells.slice();
    this.eliminationsTotal = eliminationsTotal;
    this.baseLinkRegion = baseLinkRegion.slice();
    this.shareRegion = shareRegion.slice();
    this.bridge1 = bridge1.slice();
    this.bridge2 = bridge2.slice();
    this.q = q.slice();
    this.linkSet = linkSet.slice();
    this.baseLinkEmptyRegion = baseLinkEmptyRegion.slice();
    this.linksNumber = linkSet.length;
    this.ringRegion = ringRegion;
  }

  private isLex(intSet: number[]): boolean {
    let intSetO = '';
    let intSetR = '';
    for (let i = 0; i < intSet.length; i++) {
      intSetO += String(intSet[i]);
      intSetR += String(intSet[intSet.length - 1 - i]);
    }
    if (intSetO > intSetR) return false;
    return true;
  }

  private reverseIntegerArray(set: number[]): number[] {
    const reversedArray = new Array<number>(set.length);
    const currentArray = set.slice();
    for (let i = 0; i < set.length; i++) reversedArray[set.length - i - 1] = currentArray[i];
    return reversedArray.slice();
  }

  private rLineName(set: number[]): string {
    let OriginalLinesNames = '';
    let LinesName = '';
    let ReverseSwap = '';
    let CurrentSwap = '';
    let isThereOne = false;
    for (let i = 0; i < set.length; i++) {
      if (set[i] === 1) {
        isThereOne = true;
        ReverseSwap = '2' + ReverseSwap;
        CurrentSwap += '2';
      }
      OriginalLinesNames += String(set[i]);
      if (set[i] === 2) {
        LinesName += '1';
        ReverseSwap = '1' + ReverseSwap;
        CurrentSwap += '1';
      } else {
        LinesName += String(set[i]);
        if (set[i] < 1 || set[i] > 2) {
          ReverseSwap = String(set[i]) + ReverseSwap;
          CurrentSwap += String(set[i]);
        }
      }
    }
    if (ReverseSwap > CurrentSwap) ReverseSwap = CurrentSwap;
    if (isThereOne) return OriginalLinesNames > ReverseSwap ? ReverseSwap : OriginalLinesNames;
    return LinesName;
  }

  override getViewCount(): number {
    return 1;
  }

  override getSelectedCells(): Cell[] {
    for (let i = 0; i < this.linksNumber; i++) if (this.baseLinkEmptyRegion[i]) return this.emptyCells as Cell[];
    return [this.startCell, this.endCell];
  }

  override getGreenPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    const result = new Map<Cell, BitSet32>();
    const fishDigitSet = SingletonBitSet.create(this.value);
    if (!this.baseLinkEmptyRegion[this.q[0]]) {
      result.set(this.startCell, fishDigitSet);
      result.set(this.bridge1[0]!, fishDigitSet);
    }
    for (let i = 1; i < this.linksNumber - 1; i++)
      if (!this.baseLinkEmptyRegion[this.q[i]]) {
        result.set(this.bridge2[i - 1]!, fishDigitSet);
        result.set(this.bridge1[i]!, fishDigitSet);
      }
    if (!this.baseLinkEmptyRegion[this.q[this.linksNumber - 1]]) {
      result.set(this.bridge2[this.linksNumber - 2]!, fishDigitSet);
      result.set(this.endCell, fishDigitSet);
    }
    return result;
  }

  override getRedPotentials(grid: Grid, viewNum: number): Map<Cell, BitSet32> {
    return new Map(super.getRemovablePotentials());
  }

  override getLinks(grid: Grid, viewNum: number): Link[] {
    const result: Link[] = [];
    result.push(new Link(this.startCell, this.value, this.bridge1[0]!, this.value));
    for (let i = 1; i < this.linksNumber - 1; i++)
      result.push(new Link(this.bridge2[i - 1]!, this.value, this.bridge1[i]!, this.value));
    result.push(new Link(this.bridge2[this.linksNumber - 2]!, this.value, this.endCell, this.value));
    return result;
  }

  override getRegions(): Region[] {
    const finalRegions = new Array<Region>(this.linksNumber * 2);
    if (this.ringRegion === null) return this.shareRegion;
    else
      for (let i = 0; i < this.linksNumber; i++) {
        finalRegions[i * 2] = this.baseLinkRegion[i];
        if (i < this.linksNumber - 1) finalRegions[i * 2 + 1] = this.shareRegion[i];
        else finalRegions[i * 2 + 1] = this.ringRegion;
      }
    return finalRegions;
  }

  override toString(): string {
    let result = '';
    result = result + this.getName() + ': ' + Cell.toFullString(this.startCell) + ',';
    for (let i = 0; i < this.linksNumber - 1; i++)
      result += Cell.toString(this.bridge1[i]!, this.bridge2[i]!) + ',';
    result += Cell.toString(this.endCell) + ' on value ' + this.value;
    return result;
  }

  private shortBaseCover(sequence: Region[]): string {
    let finalSequence = '';
    for (let i = 0; i < sequence.length; i++) finalSequence += sequence[i].toFullStringShort();
    return finalSequence;
  }

  private fishRC(): string {
    return (
      this.shortBaseCover(this.baseLinkRegion) +
      '\\' +
      this.shortBaseCover(this.shareRegion) +
      this.ringRegion!.toFullStringShort()
    );
  }

  private fishShape(): string {
    const conf = this.fishRC();
    const halfLength = Math.trunc(conf.length / 2);
    if (conf.indexOf('r') >= 0)
      if (
        (conf.indexOf('r') <= halfLength && conf.lastIndexOf('r') > halfLength) ||
        (conf.lastIndexOf('r') > halfLength && conf.lastIndexOf('c') > halfLength) ||
        (conf.indexOf('r') <= halfLength && conf.indexOf('c') <= halfLength && conf.indexOf('c') >= 0)
      )
        return 'Mutant';
    if (conf.indexOf('c') >= 0)
      if (conf.indexOf('c') <= halfLength && conf.lastIndexOf('c') > halfLength) return 'Mutant';
    if (conf.indexOf('p') >= 0) return 'Mutant';
    if (conf.indexOf('w') >= 0) return 'Mutant';
    if (conf.indexOf('d') >= 0) return 'Mutant';
    if (conf.indexOf('g') >= 0) return 'Mutant';
    if (conf.indexOf('a') >= 0) return 'Mutant';
    if (conf.indexOf('.') >= 0) return 'Mutant';
    if (conf.indexOf('b') >= 0) return 'Franken';
    return 'Basic';
  }

  override toHtml(grid: Grid): string {
    let result: string;
    let fishName = this.getFishName(this.linksNumber);
    let loopRegion = '';
    if (this.ringRegion !== null) {
      result = templates.GroupedStrongLinksLoopHint;
      fishName = this.fishShape() + ' ' + this.getFishName(this.linksNumber) + ' ' + this.fishRC();
      loopRegion = this.ringRegion.toFullString();
    } else if (this.groupedLinks() > 0) {
      result = templates.GroupedStrongLinksHint;
      fishName = 'Finned ' + fishName;
    } else {
      result = templates.StrongLinksHint;
      fishName = '1 Finned Sashimi ' + fishName;
      for (let i = 1; i < this.linksNumber; i++) fishName = '2x' + fishName;
    }
    const name = this.getName();
    const firstLinkName = this.baseLinkRegion[this.q[0]].toFullString();
    const lastLinkName = this.baseLinkRegion[this.q[this.linksNumber - 1]].toFullString();
    let middleLinksName = '';
    for (let i = 1; i < this.linksNumber - 1; i++)
      middleLinksName += ', ' + this.baseLinkRegion[this.q[i]].toFullString();
    const firstShared = this.shareRegion[0].toFullString();
    const lastShared = this.shareRegion[this.linksNumber - 2].toFullString();
    let middleShared = '';
    for (let i = 1; i < this.linksNumber - 2; i++) middleShared += ', ' + this.shareRegion[i].toFullString();
    const numberOfStrongLinks = String(this.linksNumber);
    const numberOfWeakLinks = String(this.linksNumber - 1);
    const value = String(this.value);
    const cell1 = this.startCell.toString();
    const cell2 = this.endCell.toString();
    result = format(
      result,
      name,
      value,
      firstLinkName + (middleLinksName === '' ? '' : middleLinksName),
      lastLinkName,
      numberOfStrongLinks,
      numberOfWeakLinks,
      firstShared + (middleShared === '' ? '' : middleShared),
      lastShared,
      cell1,
      cell2,
      fishName,
      firstLinkName,
      firstShared,
      loopRegion,
    );
    return result;
  }

  private static baseRatings: number[] = [0, 4.0, 5.4, 5.8, 6.2, 6.6, 7.0, 7.4];

  private getFishName(fishSize: number): string {
    const fishNames = [
      'Cyclopsfish',
      'X-Wing',
      'Swordfish',
      'Jellyfish',
      'Starfish',
      'Whale',
      'Leviathan',
      'Octupus',
      'Enniafish',
    ];
    return fishNames[fishSize - 1];
  }

  private groupedLinks(): number {
    let groupedLinksNumber = 0;
    for (let i = 0; i < this.linksNumber; i++) if (this.baseLinkEmptyRegion[i]) groupedLinksNumber++;
    return groupedLinksNumber;
  }

  // The suffix is a string made of three numbers describing the configuration of
  // the links; it aims to be min-lex to remain relatively constant under isomorphism.
  getSuffix(): string {
    const setActual = new Array<number>(this.linksNumber);
    for (let i = 0; i < this.linksNumber; i++) setActual[i] = this.linkSet[this.q[i]];
    let Suffix = '';
    Suffix += this.groupedLinks();
    if (this.isLex(setActual)) Suffix += this.rLineName(setActual);
    else Suffix += this.rLineName(this.reverseIntegerArray(setActual));
    return Suffix;
  }

  getName(): string {
    const Suffix = this.getSuffix();
    let Name = '' + this.linksNumber;
    const gL = this.groupedLinks();
    if (this.ringRegion !== null) {
      Name = '(' + Name + ' Strong Links) ' + (gL > 0 ? 'Grouped ' : '') + 'X-Loop';
    } else if (Suffix.indexOf('0', 1) < 0 && Suffix.indexOf('2', 1) < 0)
      if (this.linksNumber < 3) Name = 'Skyscraper';
      else Name += ' Skyscrapers';
    else if (Suffix.indexOf('0', 1) < 0 && this.linksNumber < 4) Name += '-String Kite';
    else Name += ' Strong links';
    Name = (gL > 0 && this.ringRegion === null ? 'Grouped ' : '') + Name + ' ' + Suffix;
    return Name;
  }

  getShortName(): string {
    const Suffix = this.getSuffix();
    let Name = '' + this.linksNumber;
    const gL = this.groupedLinks();
    if (this.ringRegion !== null) Name += 'XL';
    else if (Suffix.indexOf('0', 1) < 0 && Suffix.indexOf('2', 1) < 0)
      if (this.linksNumber < 3) Name = 'SS';
      else Name += 'SS';
    else if (Suffix.indexOf('0', 1) >= 0 || this.linksNumber > 3) Name += 'SL';
    else Name += 'SK';

    Name = (gL > 0 ? 'g' : '') + Name + Suffix;
    return Name;
  }

  getEliminationsTotal(): number {
    return this.eliminationsTotal;
  }

  getDifficulty(): number {
    const Suffix = this.getSuffix();
    if (
      this.groupedLinks() > 0 ||
      Suffix.indexOf('3', 1) > 0 ||
      Suffix.indexOf('4', 1) > 0 ||
      Suffix.indexOf('5', 1) > 0 ||
      Suffix.indexOf('6', 1) > 0 ||
      Suffix.indexOf('7', 1) > 0 ||
      Suffix.indexOf('8', 1) > 0 ||
      Suffix.indexOf('9', 1) > 0
    )
      return StrongLinksHint.baseRatings[this.linksNumber - 1] + 0.3;
    if (Suffix.indexOf('0', 1) < 0 && Suffix.indexOf('2', 1) < 0) {
      return StrongLinksHint.baseRatings[this.linksNumber - 1];
    } else if (Suffix.indexOf('0', 1) > 0 && Suffix.indexOf('2', 1) > 0) {
      return StrongLinksHint.baseRatings[this.linksNumber - 1] + 0.2;
    } else {
      return StrongLinksHint.baseRatings[this.linksNumber - 1] + 0.1;
    }
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
    if (
      initialGrid.hasCellPotentialValue(startCell.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.startCell.getIndex(), this.value)
    )
      result.push(new Potential(this.startCell, this.value, false));
    if (
      initialGrid.hasCellPotentialValue(endCell.getIndex(), this.value) &&
      !initialGrid.hasCellPotentialValue(this.endCell.getIndex(), this.value)
    )
      result.push(new Potential(this.endCell, this.value, false));
    return result;
  }
}
