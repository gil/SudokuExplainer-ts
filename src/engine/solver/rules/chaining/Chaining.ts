import type { Cell } from '../../../Cell.js';
import { Grid, Region } from '../../../Grid.js';
import { BitSet32 } from '../../../util/BitSet32.js';
import { SingletonBitSet } from '../../../tools/SingletonBitSet.js';
import { LinkedSet } from '../../../tools/LinkedSet.js';
import type { Hint } from '../../Hint.js';
import type { IndirectHintProducer, HintsAccumulator } from '../../HintProducer.js';
import { SingleHintAccumulator } from '../../SingleHintAccumulator.js';
import type { IndirectHint } from '../../IndirectHint.js';
import type { HasParentPotentialHint } from '../HasParentPotentialHint.js';
import { Locking } from '../Locking.js';
import { HiddenSet } from '../HiddenSet.js';
import { NakedSet } from '../NakedSet.js';
import { Fisherman } from '../Fisherman.js';
import { Potential } from './Potential.js';
import { ChainingHint, getNestedSuffix } from './ChainingHint.js';
import { BinaryChainingHint } from './BinaryChainingHint.js';
import { CellChainingHint } from './CellChainingHint.js';
import { RegionChainingHint } from './RegionChainingHint.js';
import { CycleHint } from './CycleHint.js';
import { ForcingChainHint } from './ForcingChainHint.js';

// Java regionCauses[] (vanilla entries only; regionTypeIndex is always 0..2).
const regionCauses: Potential.Cause[] = [
  Potential.Cause.HiddenBlock,
  Potential.Cause.HiddenRow,
  Potential.Cause.HiddenColumn,
];

function getRegionCause(regionTypeIndex: number): Potential.Cause {
  return regionCauses[regionTypeIndex];
}

// Java iterates hint.getRemovablePotentials() (a HashMap<Cell,BitSet>) in
// getAdvancedPotentials, and that order leaks into the chain search. Cell
// hashCode is its index; HashMap visits buckets 0..cap-1, insertion order
// within a bucket. Reproduce that so advanced potentials enter toOff in the
// Java order (fidelity rule 6). // Java: HashMap
function javaHashMapEntryOrder(map: Map<Cell, BitSet32>): [Cell, BitSet32][] {
  const entries = [...map.entries()]; // insertion order
  const n = entries.length;
  let cap = 16;
  while (n > (cap * 3) >> 2) cap <<= 1; // resize when size > cap * 0.75
  const mask = cap - 1;
  return entries
    .map((e, i) => ({ e, i, bucket: e[0].getIndex() & mask }))
    .sort((a, b) => a.bucket - b.bucket || a.i - b.i)
    .map((x) => x.e);
}

// A first-in-first-out queue over Potentials (Java LinkedList used as Queue).
class PQueue {
  private readonly items: Potential[] = [];
  private head = 0;

  constructor(init?: Iterable<Potential>) {
    if (init) for (const x of init) this.items.push(x);
  }

  add(p: Potential): void {
    this.items.push(p);
  }

  poll(): Potential | null {
    if (this.head >= this.items.length) return null;
    return this.items[this.head++];
  }

  isEmpty(): boolean {
    return this.head >= this.items.length;
  }
}

interface Sortable {
  hint: ChainingHint;
  difficulty: number;
  complexity: number;
  sortKey: number;
}

// Ported from diuf.sudoku.solver.rules.chaining.Chaining. Only the sequential
// (numThreads == 1) and FCPlus == 0 vanilla paths are kept per the frozen
// baseline; parallel machinery and variant branches are dropped.
export class Chaining implements IndirectHintProducer {
  private readonly isMultipleEnabled: boolean;
  private readonly isDynamic: boolean;
  private readonly isNisho: boolean;
  private readonly level: number;
  private readonly noParallel: boolean;
  private readonly nestingLimit: number;
  private saveGrid = new Grid();
  private otherRules: IndirectHintProducer[] | null = null;
  private lastGrid: Grid | null = null;
  private lastHints: ChainingHint[] | null = null;
  // Generation-stamped scratch buffer replacing getOnToOff's per-call
  // boolean[81] "addedPotential". getOnToOff is not reentrant, so one buffer
  // per instance is safe.
  private readonly addedStamp = new Int32Array(81);
  private addedGen = 0;

  constructor(
    isMultipleEnabled: boolean,
    isDynamic: boolean,
    isNishio: boolean,
    level: number,
    noParallel: boolean,
    nestingLimit: number,
  ) {
    this.isMultipleEnabled = isMultipleEnabled;
    this.isDynamic = isDynamic;
    this.isNisho = isNishio;
    this.level = level;
    this.noParallel = noParallel;
    this.nestingLimit = nestingLimit;
  }

  isDynamicRule(): boolean {
    return this.isDynamic;
  }

  isNishio(): boolean {
    return this.isNisho;
  }

  isMultiple(): boolean {
    return this.isMultipleEnabled;
  }

  getLevel(): number {
    return this.level;
  }

  getDifficulty(): number {
    if (this.level > 0) return 8.5 + 0.5 * this.level;
    else if (this.isNisho) return 7.5;
    else if (this.isDynamic) return 8.5;
    else if (this.isMultipleEnabled) return 8.0;
    else throw new Error('IllegalStateException');
  }

  private static compareSortable(h1: Sortable, h2: Sortable): number {
    const d1 = h1.difficulty;
    const d2 = h2.difficulty;
    if (d1 < d2) return -1;
    else if (d1 > d2) return 1;
    const l1 = h1.complexity;
    const l2 = h2.complexity;
    if (l1 === l2) return h1.sortKey - h2.sortKey;
    return l1 - l2;
  }

  protected getHintList(grid: Grid): ChainingHint[] {
    let result: ChainingHint[];
    if (this.isMultipleEnabled || this.isDynamic) {
      result = this.getMultipleChainsHintList(grid);
    } else {
      const xLoops = this.getLoopHintList(grid, false, true);
      const yLoops = this.getLoopHintList(grid, true, false);
      const xyLoops = this.getLoopHintList(grid, true, true);
      result = xLoops;
      result.push(...yLoops);
      result.push(...xyLoops);
    }
    if (result.length === 0) {
      return result;
    }
    const sortableResult: Sortable[] = result.map((hint) => ({
      hint,
      difficulty: hint.getDifficulty(),
      complexity: hint.getComplexity(),
      sortKey: hint.getSortKey(),
    }));
    sortableResult.sort((a, b) => Chaining.compareSortable(a, b));
    return sortableResult.map((s) => s.hint);
  }

  private getLoopHintList(
    grid: Grid,
    isYChainEnabled: boolean,
    isXChainEnabled: boolean,
  ): ChainingHint[] {
    const result: ChainingHint[] = [];
    for (let i = 0; i < 81; i++) {
      if (grid.getCellValue(i) === 0) {
        const cardinality = grid.getCellPotentialValues(i).cardinality();
        if (cardinality > 1) {
          const cell = Grid.getCell(i);
          for (let value = 1; value <= 9; value++) {
            if (grid.hasCellPotentialValue(i, value)) {
              const pOn = new Potential(cell, value, true);
              this.doUnaryChaining(grid, pOn, result, isYChainEnabled, isXChainEnabled);
            }
          }
        }
      }
    }
    return result;
  }

  private getMultipleChainsHintListForCell(
    grid: Grid,
    cell: Cell,
    cardinality: number,
  ): ChainingHint[] {
    const result: ChainingHint[] = [];
    const valueToOn = new Map<number, LinkedSet<Potential>>();
    const valueToOff = new Map<number, LinkedSet<Potential>>();
    let cellToOn: LinkedSet<Potential> | null = null;
    let cellToOff: LinkedSet<Potential> | null = null;

    for (let value = 1; value <= 9; value++) {
      if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
        const pOn = new Potential(cell, value, true);
        const pOff = new Potential(cell, value, false);
        const onToOn = new LinkedSet<Potential>();
        const onToOff = new LinkedSet<Potential>();
        const doDouble = cardinality >= 3 && !this.isNisho && this.isDynamic;
        const doContradiction = this.isDynamic || this.isNisho;
        this.doBinaryChaining(grid, pOn, pOff, result, onToOn, onToOff, doDouble, doContradiction);

        if (!this.isNisho) {
          this.doRegionChainings(grid, result, cell, value, onToOn, onToOff);
        }

        valueToOn.set(value, onToOn);
        valueToOff.set(value, onToOff);
        if (cellToOn === null) {
          cellToOn = new LinkedSet<Potential>();
          cellToOff = new LinkedSet<Potential>();
          cellToOn.addAll(onToOn);
          cellToOff!.addAll(onToOff);
        } else {
          cellToOn.retainAll(onToOn);
          cellToOff!.retainAll(onToOff);
        }
      }
    }

    if (!this.isNisho) {
      if (cardinality === 2 || (this.isMultipleEnabled && cardinality > 2)) {
        for (const p of cellToOn!) {
          const hint = this.createCellReductionHint(grid, cell, p, valueToOn);
          if (hint.isWorth()) result.push(hint);
        }
        for (const p of cellToOff!) {
          const hint = this.createCellReductionHint(grid, cell, p, valueToOff);
          if (hint.isWorth()) result.push(hint);
        }
      }
    }
    return result;
  }

  private getMultipleChainsHintList(grid: Grid): ChainingHint[] {
    const result: ChainingHint[] = [];
    // noParallel is always effectively true: the frozen baseline is numThreads == 1.
    for (let i = 0; i < 81; i++) {
      if (grid.getCellValue(i) === 0) {
        const cardinality = grid.getCellPotentialValues(i).cardinality();
        if (cardinality > 2 || (cardinality > 1 && this.isDynamic)) {
          const cell = Grid.getCell(i);
          result.push(...this.getMultipleChainsHintListForCell(grid, cell, cardinality));
        }
      }
    }
    return result;
  }

  private getReversedCycle(org: Potential | null): Potential {
    const result: Potential[] = [];
    let explanations: string | null = null;
    while (org !== null) {
      const rev = new Potential(
        org.cell,
        org.value,
        !org.isOn,
        org.cause as Potential.Cause,
        explanations as string,
      );
      explanations = org.explanation;
      result.unshift(rev);
      if (org.parents.length !== 0) org = org.parents[0];
      else org = null;
    }
    let prev: Potential | null = null;
    for (const rev of result) {
      if (prev !== null) prev.parents.push(rev);
      prev = rev;
    }
    return result[0];
  }

  private doUnaryChaining(
    grid: Grid,
    pOn: Potential,
    result: ChainingHint[],
    isYChainEnabled: boolean,
    isXChainEnabled: boolean,
  ): void {
    if (!isXChainEnabled && grid.getCellPotentialValues(pOn.cell.getIndex()).cardinality() > 2)
      return; // Y-Cycles can only start if cell has 2 potential values

    const cycles: Potential[] = [];
    const chains: Potential[] = [];
    let onToOn = new LinkedSet<Potential>();
    let onToOff = new LinkedSet<Potential>();
    onToOn.add(pOn);
    this.doCycles(grid, onToOn, onToOff, isYChainEnabled, isXChainEnabled, cycles, pOn);
    if (isXChainEnabled) {
      // Forcing chain with "off" implication
      onToOn = new LinkedSet<Potential>();
      onToOff = new LinkedSet<Potential>();
      onToOn.add(pOn);
      this.doForcingChains(grid, onToOn, onToOff, isYChainEnabled, chains, pOn);

      // Forcing chain with "on" implication
      const pOff = new Potential(pOn.cell, pOn.value, false);
      onToOn = new LinkedSet<Potential>();
      onToOff = new LinkedSet<Potential>();
      onToOff.add(pOff);
      this.doForcingChains(grid, onToOn, onToOff, isYChainEnabled, chains, pOff);
    }
    for (const dstOn of cycles) {
      const dstOff = this.getReversedCycle(dstOn);
      const hint = this.createCycleHint(grid, dstOn, dstOff, isYChainEnabled, isXChainEnabled);
      if (hint.isWorth()) result.push(hint);
    }
    for (const target of chains) {
      const hint = this.createForcingChainHint(grid, target, isYChainEnabled, isXChainEnabled);
      if (hint.isWorth()) result.push(hint);
    }
  }

  private doBinaryChaining(
    grid: Grid,
    pOn: Potential,
    pOff: Potential,
    result: ChainingHint[],
    onToOn: LinkedSet<Potential>,
    onToOff: LinkedSet<Potential>,
    doReduction: boolean,
    doContradiction: boolean,
  ): void {
    let absurdPotential: Potential[] | null;
    const offToOn = new LinkedSet<Potential>();
    const offToOff = new LinkedSet<Potential>();

    // Test p = "on"
    onToOn.add(pOn);
    absurdPotential = this.doChaining(grid, onToOn, onToOff);
    if (doContradiction && absurdPotential !== null) {
      const hint = this.createChainingOffHint(absurdPotential[0], absurdPotential[1], pOn, pOn, true);
      if (hint.isWorth()) result.push(hint);
    }

    // Test p = "off"
    offToOff.add(pOff);
    absurdPotential = this.doChaining(grid, offToOn, offToOff);
    if (doContradiction && absurdPotential !== null) {
      const hint = this.createChainingOnHint(
        grid,
        absurdPotential[0],
        absurdPotential[1],
        pOff,
        pOff,
        true,
      );
      if (hint.isWorth()) result.push(hint);
    }

    if (doReduction) {
      for (const pFromOn of onToOn) {
        const pFromOff = offToOn.get(pFromOn);
        if (pFromOff !== null) {
          const hint = this.createChainingOnHint(grid, pFromOn, pFromOff, pOn, pFromOn, false);
          if (hint.isWorth()) result.push(hint);
        }
      }

      for (const pFromOn of onToOff) {
        const pFromOff = offToOff.get(pFromOn);
        if (pFromOff !== null) {
          const hint = this.createChainingOffHint(pFromOn, pFromOff, pOff, pFromOff, false);
          if (hint.isWorth()) result.push(hint);
        }
      }
    }
  }

  private doRegionChainings(
    grid: Grid,
    result: ChainingHint[],
    cell: Cell,
    value: number,
    onToOn: LinkedSet<Potential>,
    onToOff: LinkedSet<Potential>,
  ): void {
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const region = Grid.getRegionAt(regionTypeIndex, cell.getIndex());
      const potentialPositions = region.getPotentialPositions(grid, value);

      const cardinality = potentialPositions.cardinality();
      if (cardinality === 2 || (this.isMultipleEnabled && cardinality > 2)) {
        const firstPos = potentialPositions.nextSetBit(0);
        const firstCell = region.getCell(firstPos);

        if (firstCell.equals(cell)) {
          const posToOn = new Map<number, LinkedSet<Potential>>();
          const posToOff = new Map<number, LinkedSet<Potential>>();
          const regionToOn = new LinkedSet<Potential>();
          const regionToOff = new LinkedSet<Potential>();

          for (let pos = potentialPositions.nextSetBit(0); pos >= 0; pos = potentialPositions.nextSetBit(pos + 1)) {
            const otherCell = region.getCell(pos);
            if (otherCell.equals(cell)) {
              posToOn.set(pos, onToOn);
              posToOff.set(pos, onToOff);
              regionToOn.addAll(onToOn);
              regionToOff.addAll(onToOff);
            } else {
              const other = new Potential(otherCell, value, true);
              const otherToOn = new LinkedSet<Potential>();
              const otherToOff = new LinkedSet<Potential>();
              otherToOn.add(other);
              this.doChaining(grid, otherToOn, otherToOff);
              posToOn.set(pos, otherToOn);
              posToOff.set(pos, otherToOff);
              regionToOn.retainAll(otherToOn);
              regionToOff.retainAll(otherToOff);
            }
          }

          for (const p of regionToOn) {
            const hint = this.createRegionReductionHint(grid, region, value, p, posToOn);
            if (hint.isWorth()) result.push(hint);
          }
          for (const p of regionToOff) {
            const hint = this.createRegionReductionHint(grid, region, value, p, posToOff);
            if (hint.isWorth()) result.push(hint);
          }
        }
      }
    }
  }

  private getOnToOff(grid: Grid, p: Potential, isYChainEnabled: boolean): Potential[] {
    const result: Potential[] = [];

    const potentialCellIndex = p.cell.getIndex();
    if (isYChainEnabled) {
      const potentialValues = grid.getCellPotentialValues(potentialCellIndex);
      for (
        let value = potentialValues.nextSetBit(0);
        value >= 0;
        value = potentialValues.nextSetBit(value + 1)
      ) {
        if (value !== p.value)
          result.push(
            new Potential(
              p.cell,
              value,
              false,
              p,
              Potential.Cause.NakedSingle,
              'the cell can contain only one value',
            ),
          );
      }
    }

    // Inlined block/row/col scan (vanilla). Equivalent to Java's
    // copyPotentialPositions + clear(own) + nextSetBit ascending: skip the
    // cell's own position and positions without the value, same order.
    const gen = ++this.addedGen;
    const stamp = this.addedStamp;
    stamp[potentialCellIndex] = gen;
    const value = p.value;
    const mask = 1 << value;
    for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
      const region = Grid.getRegionAt(regionTypeIndex, potentialCellIndex);
      const regionCells = region.getRegionCells();
      for (let pos = 0; pos < 9; pos++) {
        const ci = regionCells[pos];
        if (ci === potentialCellIndex) continue;
        if ((grid.cellPotentialBits(ci) & mask) === 0) continue;
        if (stamp[ci] !== gen) {
          const cell = Grid.getCell(ci);
          result.push(
            new Potential(
              cell,
              value,
              false,
              p,
              getRegionCause(regionTypeIndex),
              'the value can occur only once in the ' + region.toString(),
            ),
          );
          stamp[ci] = gen;
        }
      }
    }
    return result;
  }

  private addHiddenParentsOfCell(
    p: Potential,
    grid: Grid,
    source: Grid,
    offPotentials: LinkedSet<Potential>,
  ): void {
    const i = p.cell.getIndex();
    for (let value = 1; value <= 9; value++) {
      if (source.hasCellPotentialValue(i, value) && !grid.hasCellPotentialValue(i, value)) {
        let parent = new Potential(p.cell, value, false);
        const found = offPotentials.get(parent);
        if (found === null) throw new Error('Parent not found');
        parent = found;
        p.parents.push(parent);
      }
    }
  }

  private addHiddenParentsOfRegion(
    p: Potential,
    grid: Grid,
    source: Grid,
    curRegion: Region,
    offPotentials: LinkedSet<Potential>,
  ): void {
    const value = p.value;
    const curPositions = curRegion.copyPotentialPositions(grid, value);
    const srcPositions = curRegion.copyPotentialPositions(source, value);
    srcPositions.andNot(curPositions);
    for (let i = srcPositions.nextSetBit(0); i >= 0; i = srcPositions.nextSetBit(i + 1)) {
      const curCell = curRegion.getCell(i);
      let parent = new Potential(curCell, value, false);
      const found = offPotentials.get(parent);
      if (found === null) throw new Error('Parent not found');
      parent = found;
      p.parents.push(parent);
    }
  }

  private getOffToOn(
    grid: Grid,
    p: Potential,
    source: Grid,
    offPotentials: LinkedSet<Potential>,
    isYChainEnabled: boolean,
    isXChainEnabled: boolean,
  ): Potential[] {
    const result: Potential[] = [];

    const thisCellIndex = p.cell.getIndex();
    if (isYChainEnabled) {
      const potentialValues = grid.getCellPotentialValues(thisCellIndex);
      if (potentialValues.cardinality() === 2) {
        let otherValue = potentialValues.nextSetBit(0);
        if (otherValue === p.value) otherValue = potentialValues.nextSetBit(otherValue + 1);
        const pOn = new Potential(
          p.cell,
          otherValue,
          true,
          p,
          Potential.Cause.NakedSingle,
          'only remaining possible value in the cell',
        );
        this.addHiddenParentsOfCell(pOn, grid, source, offPotentials);
        result.push(pOn);
      }
    }

    if (isXChainEnabled) {
      const thisValue = p.value;
      const mask = 1 << thisValue;
      for (let regionTypeIndex = 0; regionTypeIndex < 3; regionTypeIndex++) {
        const r = Grid.getRegionAt(regionTypeIndex, thisCellIndex);
        const regionCells = r.getRegionCells();
        let otherPosition = -1;
        for (let regionCellIndex = 0; regionCellIndex < 9; regionCellIndex++) {
          const cellIndex = regionCells[regionCellIndex];
          if (cellIndex === thisCellIndex) continue;
          if ((grid.cellPotentialBits(cellIndex) & mask) !== 0) {
            if (otherPosition >= 0) {
              otherPosition = -1;
              break;
            }
            otherPosition = cellIndex;
          }
        }
        if (otherPosition >= 0) {
          const pOn = new Potential(
            Grid.getCell(otherPosition),
            thisValue,
            true,
            p,
            getRegionCause(regionTypeIndex),
            'only remaining possible position in the ' + r.toString(),
          );
          this.addHiddenParentsOfRegion(pOn, grid, source, r, offPotentials);
          result.push(pOn);
        }
      }
    }

    return result;
  }

  private isParent(child: Potential, parent: Potential): boolean {
    let pTest = child;
    while (pTest.parents.length !== 0) {
      pTest = pTest.parents[0];
      if (pTest.equals(parent)) return true;
    }
    return false;
  }

  private doCycles(
    grid: Grid,
    toOn: LinkedSet<Potential>,
    toOff: LinkedSet<Potential>,
    isYChainEnabled: boolean,
    isXChainEnabled: boolean,
    cycles: Potential[],
    source: Potential,
  ): void {
    const pendingOn = new PQueue(toOn);
    const pendingOff = new PQueue(toOff);

    let length = 0;
    while (!pendingOn.isEmpty() || !pendingOff.isEmpty()) {
      length++;
      let p: Potential | null;
      while ((p = pendingOn.poll()) !== null) {
        const makeOff = this.getOnToOff(grid, p, isYChainEnabled);
        for (const pOff of makeOff) {
          if (!this.isParent(p, pOff)) {
            pendingOff.add(pOff);
            toOff.add(pOff);
          }
        }
      }
      length++;
      while ((p = pendingOff.poll()) !== null) {
        const makeOn = this.getOffToOn(
          grid,
          p,
          this.saveGrid,
          toOff,
          isYChainEnabled,
          isXChainEnabled,
        );
        for (const pOn of makeOn) {
          if (length >= 4 && pOn.equals(source)) {
            cycles.push(pOn);
          }
          if (!toOn.contains(pOn)) {
            pendingOn.add(pOn);
            toOn.add(pOn);
          }
        }
      }
    }
  }

  private doForcingChains(
    grid: Grid,
    toOn: LinkedSet<Potential>,
    toOff: LinkedSet<Potential>,
    isYChainEnabled: boolean,
    chains: Potential[],
    source: Potential,
  ): void {
    const pendingOn = new PQueue(toOn);
    const pendingOff = new PQueue(toOff);
    while (!pendingOn.isEmpty() || !pendingOff.isEmpty()) {
      let p: Potential | null;
      while ((p = pendingOn.poll()) !== null) {
        const makeOff = this.getOnToOff(grid, p, isYChainEnabled);
        for (const pOff of makeOff) {
          const pOn = new Potential(pOff.cell, pOff.value, true); // Conjugate
          if (source.equals(pOn)) {
            if (!chains.some((c) => c.equals(pOff))) chains.push(pOff);
          }
          if (!toOff.contains(pOff)) {
            pendingOff.add(pOff);
            toOff.add(pOff);
          }
        }
      }
      while ((p = pendingOff.poll()) !== null) {
        const makeOn = this.getOffToOn(grid, p, this.saveGrid, toOff, isYChainEnabled, true);
        for (const pOn of makeOn) {
          const pOff = new Potential(pOn.cell, pOn.value, false); // Conjugate
          if (source.equals(pOff)) {
            if (!chains.some((c) => c.equals(pOn))) chains.push(pOn);
          }
          if (!toOn.contains(pOn)) {
            pendingOn.add(pOn);
            toOn.add(pOn);
          }
        }
      }
    }
  }

  private doChaining(
    grid: Grid,
    toOn: LinkedSet<Potential>,
    toOff: LinkedSet<Potential>,
  ): Potential[] | null {
    grid.copyTo(this.saveGrid);
    try {
      const pendingOn = new PQueue(toOn);
      const pendingOff = new PQueue(toOff);
      let p: Potential | null = null;
      do {
        p = pendingOn.poll();
        if (p !== null) {
          const makeOff = this.getOnToOff(grid, p, !this.isNisho);
          for (const pOff of makeOff) {
            const pOn = new Potential(pOff.cell, pOff.value, true); // Conjugate
            if (toOn.contains(pOn)) {
              const real = toOn.get(pOn)!; // Retrieve version with parents
              return [real, pOff];
            } else if (!toOff.contains(pOff)) {
              toOff.add(pOff);
              pendingOff.add(pOff);
            }
          }
          continue;
        }
        p = pendingOff.poll();
        if (p !== null) {
          const makeOn = this.getOffToOn(grid, p, this.saveGrid, toOff, !this.isNisho, true);
          if (this.isDynamic) p.off(grid); // writes to grid
          for (const pOn of makeOn) {
            const pOff = new Potential(pOn.cell, pOn.value, false); // Conjugate
            if (toOff.contains(pOff)) {
              const real = toOff.get(pOff)!; // Retrieve version with parents
              return [pOn, real];
            } else if (!toOn.contains(pOn)) {
              toOn.add(pOn);
              pendingOn.add(pOn);
            }
          }
          continue;
        }
        if (this.level > 0) {
          for (const pOff of this.getAdvancedPotentials(grid, this.saveGrid, toOff)) {
            if (!toOff.contains(pOff)) {
              toOff.add(pOff);
              pendingOff.add(pOff);
              p = pOff; // marker that the main loop should continue
            }
          }
        }
      } while (p !== null);
      return null;
    } finally {
      this.saveGrid.copyTo(grid);
    }
  }

  private getAdvancedPotentials(
    grid: Grid,
    source: Grid,
    offPotentials: LinkedSet<Potential>,
  ): Potential[] {
    const result: Potential[] = [];
    if (this.otherRules === null) {
      this.otherRules = [];
      this.otherRules.push(new Locking(false));
      this.otherRules.push(new HiddenSet(2, false));
      this.otherRules.push(new NakedSet(2));
      this.otherRules.push(new Fisherman(2));
      // FCPlus == 0: the FCPlus > 0 / > 1 additions are dropped.
      if (this.level < 4) {
        if (this.level >= 2)
          this.otherRules.push(new Chaining(false, false, false, 0, true, 0)); // Forcing chains
        if (this.level >= 3)
          this.otherRules.push(new Chaining(true, false, false, 0, true, 0)); // Multiple forcing chains
      } else {
        this.otherRules.push(new Chaining(true, true, false, this.nestingLimit, true, 0)); // Dynamic FC
      }
    }
    let index = 0;
    while (index < this.otherRules.length && result.length === 0) {
      const rule = this.otherRules[index];
      const accu: HintsAccumulator = {
        add: (hint0: Hint): void => {
          const hint = hint0 as unknown as IndirectHint & HasParentPotentialHint;
          const parents = hint.getRuleParents(source, grid);
          if (parents.length !== 0) {
            let nested: ChainingHint | null = null;
            if (hint instanceof ChainingHint) nested = hint;
            const removable = hint.getRemovablePotentials();
            for (const [cell, values] of javaHashMapEntryOrder(removable)) {
              for (let value = values.nextSetBit(0); value !== -1; value = values.nextSetBit(value + 1)) {
                const toOff = new Potential(
                  cell,
                  value,
                  false,
                  Potential.Cause.Advanced,
                  hint0.toString(),
                  nested as ChainingHint,
                );
                for (const pp of parents) {
                  const real = offPotentials.get(pp)!;
                  toOff.parents.push(real);
                }
                result.push(toOff);
              }
            }
          }
        },
      };
      rule.getHints(grid, accu);
      index++;
    }
    return result;
  }

  private createCycleHint(
    grid: Grid,
    dstOn: Potential,
    dstOff: Potential,
    isYChain: boolean,
    isXChain: boolean,
  ): CycleHint {
    // Build list of cells in the chain
    const cells = new Set<Cell>();
    let p: Potential = dstOn;
    while (p.parents.length !== 0) {
      cells.add(p.cell);
      p = p.parents[0];
    }

    // Build canceled potentials
    const cancelForw = new LinkedSet<Potential>();
    const cancelBack = new LinkedSet<Potential>();
    p = dstOn;
    while (p.parents.length !== 0) {
      for (const cellIndex of p.cell.getVisibleCellIndexes()) {
        const cell = Grid.getCell(cellIndex);
        if (!cells.has(cell) && grid.hasCellPotentialValue(cellIndex, p.value)) {
          if (p.isOn) cancelForw.add(new Potential(cell, p.value, false));
          else cancelBack.add(new Potential(cell, p.value, false));
        }
      }
      p = p.parents[0];
    }

    // Build removable potentials
    const cancel = cancelForw;
    cancel.retainAll(cancelBack);
    const removable = new Map<Cell, BitSet32>();
    for (const rp of cancel) {
      const values = removable.get(rp.cell);
      if (values === undefined) removable.set(rp.cell, SingletonBitSet.create(rp.value));
      else values.set(rp.value);
    }

    return new CycleHint(this, removable, isYChain, isXChain, dstOn, dstOff);
  }

  private createForcingChainHint(
    grid: Grid,
    target: Potential,
    isYChain: boolean,
    isXChain: boolean,
  ): ForcingChainHint {
    const removable = new Map<Cell, BitSet32>();
    if (!target.isOn) removable.set(target.cell, SingletonBitSet.create(target.value));
    else {
      const values = new BitSet32();
      for (let value = 1; value <= 9; value++) {
        if (value !== target.value && grid.hasCellPotentialValue(target.cell.getIndex(), value))
          values.set(value);
      }
      removable.set(target.cell, values);
    }

    return new ForcingChainHint(this, removable, isYChain, isXChain, target);
  }

  private createChainingOnHint(
    grid: Grid,
    dstOn: Potential,
    dstOff: Potential,
    source: Potential,
    target: Potential,
    isAbsurd: boolean,
  ): BinaryChainingHint {
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    const removable = grid.getCellPotentialValues(target.cell.getIndex()).clone();
    removable.clear(target.value);
    if (!removable.isEmpty()) cellRemovablePotentials.set(target.cell, removable);

    return new BinaryChainingHint(
      this,
      cellRemovablePotentials,
      source,
      dstOn,
      dstOff,
      isAbsurd,
      this.isNisho,
    );
  }

  private createChainingOffHint(
    dstOn: Potential,
    dstOff: Potential,
    source: Potential,
    target: Potential,
    isAbsurd: boolean,
  ): BinaryChainingHint {
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    cellRemovablePotentials.set(target.cell, SingletonBitSet.create(target.value));

    return new BinaryChainingHint(
      this,
      cellRemovablePotentials,
      source,
      dstOn,
      dstOff,
      isAbsurd,
      this.isNisho,
    );
  }

  private createCellReductionHint(
    grid: Grid,
    srcCell: Cell,
    target: Potential,
    outcomes: Map<number, LinkedSet<Potential>>,
  ): CellChainingHint {
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    if (target.isOn) {
      const removable = grid.getCellPotentialValues(target.cell.getIndex()).clone();
      removable.clear(target.value);
      if (!removable.isEmpty()) cellRemovablePotentials.set(target.cell, removable);
    } else {
      cellRemovablePotentials.set(target.cell, SingletonBitSet.create(target.value));
    }

    const chains = new Map<number, Potential>();
    for (let value = 1; value <= 9; value++) {
      if (grid.hasCellPotentialValue(srcCell.getIndex(), value)) {
        const valueTarget = outcomes.get(value)!.get(target)!;
        chains.set(value, valueTarget);
      }
    }

    return new CellChainingHint(this, cellRemovablePotentials, srcCell, chains);
  }

  private createRegionReductionHint(
    grid: Grid,
    region: Region,
    value: number,
    target: Potential,
    outcomes: Map<number, LinkedSet<Potential>>,
  ): RegionChainingHint {
    const cellRemovablePotentials = new Map<Cell, BitSet32>();
    if (target.isOn) {
      const removable = grid.getCellPotentialValues(target.cell.getIndex()).clone();
      removable.clear(target.value);
      if (!removable.isEmpty()) cellRemovablePotentials.set(target.cell, removable);
    } else {
      cellRemovablePotentials.set(target.cell, SingletonBitSet.create(target.value));
    }

    const chains = new Map<number, Potential>();
    const potentialPositions = region.getPotentialPositions(grid, value);
    for (let pos = 0; pos < 9; pos++) {
      if (potentialPositions.get(pos)) {
        const posTarget = outcomes.get(pos)!.get(target)!;
        chains.set(pos, posTarget);
      }
    }

    return new RegionChainingHint(this, cellRemovablePotentials, region, value, chains);
  }

  getCommonName(hint: ChainingHint): string | null {
    if (!this.isDynamic && !this.isMultipleEnabled) {
      if ((hint as unknown as { isXChain: boolean }).isXChain) return 'X-Chain';
      else return 'Y-Chain';
    }
    return null;
  }

  toString(): string {
    if (this.isNisho) return 'Nishio Forcing Chains';
    else if (this.isDynamic) {
      if (this.level === 0) return 'Dynamic Forcing Chains';
      else return 'Dynamic Forcing Chains' + getNestedSuffix(this.level);
    } else if (this.isMultipleEnabled) return 'Multiple Forcing Chains';
    else return 'Forcing Chains & Cycles';
  }

  private getPreviousHints(accu: HintsAccumulator): void {
    for (const hint of this.lastHints!) accu.add(hint);
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    if (this.lastGrid !== null && grid.equals(this.lastGrid)) {
      this.getPreviousHints(accu);
      return;
    }
    const result = this.getHintList(grid);
    this.lastGrid = new Grid();
    grid.copyTo(this.lastGrid);
    if (accu instanceof SingleHintAccumulator) {
      this.lastHints = [];
      if (result.length !== 0) this.lastHints.push(result[0]);
    } else {
      // Filter hints that are equal (Java LinkedHashSet<ChainingHint>).
      const deduped: ChainingHint[] = [];
      for (const hint of result) {
        if (!deduped.some((h) => h.equals(hint))) deduped.push(hint);
      }
      this.lastHints = deduped;
    }
    for (const hint of this.lastHints) accu.add(hint);
  }
}
