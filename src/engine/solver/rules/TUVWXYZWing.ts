import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { TUVWXYZWingHint } from './TUVWXYZWingHint.js';

// Ported from diuf.sudoku.solver.rules.TUVWXYZWing (ALS-XZ with a bivalue cell).
export class TUVWXYZWing implements IndirectHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    const hintsFinal = this.getHintList(grid);
    hintsFinal.sort((h1, h2) => {
      const d1 = h1.getDifficulty();
      const d2 = h2.getDifficulty();
      const e1 = h1.getEliminationsTotal();
      const e2 = h2.getEliminationsTotal();
      const s1 = h1.getSuffix();
      const s2 = h2.getSuffix();
      if (d1 < d2) return -1;
      else if (d1 > d2) return 1;
      if (e2 - e1 !== 0) return e2 - e1;
      return s2 < s1 ? -1 : s2 > s1 ? 1 : 0;
    });
    for (const hint of hintsFinal) accu.add(hint);
  }

  private isTUVWXYZWing(
    TUVWXYZValues: BitSet32,
    tzValues: BitSet32,
    uzValues: BitSet32,
    vzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    aBit: BitSet32,
    yzCell: Cell,
    xzCell: Cell,
    wzCell: Cell,
    vzCell: Cell,
    uzCell: Cell,
    tzCell: Cell,
    TUVWXYZCell: Cell,
  ): boolean {
    let inter = aBit.clone();
    inter.and(xzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(xzCell)) return false;
    inter = aBit.clone();
    inter.and(wzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(wzCell)) return false;
    inter = aBit.clone();
    inter.and(vzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(vzCell)) return false;
    inter = aBit.clone();
    inter.and(uzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(uzCell)) return false;
    inter = aBit.clone();
    inter.and(tzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(tzCell)) return false;
    inter = aBit.clone();
    inter.and(TUVWXYZValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(TUVWXYZCell)) return false;
    return true;
  }

  private getHintList(grid: Grid): TUVWXYZWingHint[] {
    const result: TUVWXYZWingHint[] = [];
    let biggestCardinality = 0;
    let biggestCardinality2 = 0;
    let biggestCardinality3 = 0;
    let biggestCardinality4 = 0;
    let biggestCardinality5 = 0;
    let biggestCardinality6 = 0;
    let wingSize: number;
    let w1Value = 0;
    let w2Value = 0;
    let w3Value = 0;
    let w4Value = 0;
    let w5Value = 0;
    let w1Bit = new BitSet32();
    let w2Bit = new BitSet32();
    let w3Bit = new BitSet32();
    let w4Bit = new BitSet32();
    let w5Bit = new BitSet32();
    let remCand = new BitSet32();
    for (let i = 0; i < 81; i++) {
      const TUVWXYZCell = Grid.getCell(i);
      const TUVWXYZValues = grid.getCellPotentialValues(i);
      if (TUVWXYZValues.cardinality() > 1 && TUVWXYZValues.cardinality() < 8) {
        biggestCardinality = TUVWXYZValues.cardinality();
        wingSize = TUVWXYZValues.cardinality();
        for (const tzCellIndex of TUVWXYZCell.getForwardVisibleCellIndexes()) {
          const tzValues = grid.getCellPotentialValues(tzCellIndex);
          let inter = TUVWXYZValues.clone();
          inter.or(tzValues);
          if (tzValues.cardinality() > 1 && inter.cardinality() < 8) {
            const tzCell = Grid.getCell(tzCellIndex);
            biggestCardinality2 = biggestCardinality;
            if (tzValues.cardinality() > biggestCardinality2) biggestCardinality2 = tzValues.cardinality();
            wingSize = TUVWXYZValues.cardinality() + tzValues.cardinality();
            const intersection1 = new CellSet(TUVWXYZCell.getForwardVisibleCells());
            intersection1.retainAll(tzCell.getForwardVisibleCells());
            for (const uzCell of intersection1) {
              const uzCellIndex = uzCell.getIndex();
              const uzValues = grid.getCellPotentialValues(uzCellIndex);
              inter = TUVWXYZValues.clone();
              inter.or(tzValues);
              inter.or(uzValues);
              if (uzValues.cardinality() > 1 && inter.cardinality() < 8) {
                biggestCardinality3 = biggestCardinality2;
                if (uzValues.cardinality() > biggestCardinality3) biggestCardinality3 = uzValues.cardinality();
                wingSize = TUVWXYZValues.cardinality() + tzValues.cardinality() + uzValues.cardinality();
                const intersection2 = new CellSet(uzCell.getForwardVisibleCells());
                intersection2.retainAll(intersection1);
                for (const vzCell of intersection2) {
                  const vzCellIndex = vzCell.getIndex();
                  const vzValues = grid.getCellPotentialValues(vzCellIndex);
                  inter = TUVWXYZValues.clone();
                  inter.or(tzValues);
                  inter.or(uzValues);
                  inter.or(vzValues);
                  if (vzValues.cardinality() > 1 && inter.cardinality() < 8) {
                    biggestCardinality4 = biggestCardinality3;
                    if (vzValues.cardinality() > biggestCardinality4) biggestCardinality4 = vzValues.cardinality();
                    wingSize = TUVWXYZValues.cardinality() + tzValues.cardinality() + uzValues.cardinality() + vzValues.cardinality();
                    const intersection3 = new CellSet(vzCell.getForwardVisibleCells());
                    intersection3.retainAll(intersection2);
                    for (const wzCell of intersection3) {
                      const wzCellIndex = wzCell.getIndex();
                      const wzValues = grid.getCellPotentialValues(wzCellIndex);
                      inter = TUVWXYZValues.clone();
                      inter.or(tzValues);
                      inter.or(uzValues);
                      inter.or(vzValues);
                      inter.or(wzValues);
                      if (wzValues.cardinality() > 1 && inter.cardinality() < 8) {
                        biggestCardinality5 = biggestCardinality4;
                        if (wzValues.cardinality() > biggestCardinality5) biggestCardinality5 = wzValues.cardinality();
                        wingSize = TUVWXYZValues.cardinality() + tzValues.cardinality() + uzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality();
                        const intersection4 = new CellSet(wzCell.getForwardVisibleCells());
                        intersection4.retainAll(intersection3);
                        for (const xzCell of intersection4) {
                          const xzCellIndex = xzCell.getIndex();
                          const xzValues = grid.getCellPotentialValues(xzCellIndex);
                          inter = TUVWXYZValues.clone();
                          inter.or(tzValues);
                          inter.or(uzValues);
                          inter.or(vzValues);
                          inter.or(wzValues);
                          inter.or(xzValues);
                          if (xzValues.cardinality() > 1 && inter.cardinality() === 7) {
                            biggestCardinality6 = biggestCardinality5;
                            if (xzValues.cardinality() > biggestCardinality6) biggestCardinality6 = xzValues.cardinality();
                            wingSize = TUVWXYZValues.cardinality() + tzValues.cardinality() + uzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality() + xzValues.cardinality();
                            const yzCellRange = new CellSet(TUVWXYZCell.getVisibleCells());
                            yzCellRange.addAll(tzCell.getVisibleCells());
                            yzCellRange.addAll(uzCell.getVisibleCells());
                            yzCellRange.addAll(vzCell.getVisibleCells());
                            yzCellRange.addAll(wzCell.getVisibleCells());
                            yzCellRange.addAll(xzCell.getVisibleCells());
                            yzCellRange.remove(TUVWXYZCell);
                            yzCellRange.remove(tzCell);
                            yzCellRange.remove(uzCell);
                            yzCellRange.remove(vzCell);
                            yzCellRange.remove(wzCell);
                            yzCellRange.remove(xzCell);
                            for (const yzCell of yzCellRange) {
                              const yzCellIndex = yzCell.getIndex();
                              const yzValues = grid.getCellPotentialValues(yzCellIndex);
                              const union = yzValues.clone();
                              union.and(inter);
                              if (yzValues.cardinality() === 2 && union.cardinality() === 2) {
                                let doubleLink = true;
                                const xValue = yzValues.nextSetBit(0);
                                const xBit = new BitSet32();
                                xBit.set(xValue);
                                const zValue = yzValues.nextSetBit(xValue + 1);
                                const zBit = new BitSet32();
                                zBit.set(zValue);
                                if (!this.isTUVWXYZWing(TUVWXYZValues, tzValues, uzValues, vzValues, wzValues, xzValues, zBit, yzCell, xzCell, wzCell, vzCell, uzCell, tzCell, TUVWXYZCell)) doubleLink = false;
                                if (this.isTUVWXYZWing(TUVWXYZValues, tzValues, uzValues, vzValues, wzValues, xzValues, xBit, yzCell, xzCell, wzCell, vzCell, uzCell, tzCell, TUVWXYZCell)) {
                                  if (!doubleLink) {
                                    const hint = this.createHint(
                                      grid, TUVWXYZCell, Grid.getCell(tzCellIndex), Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                      tzValues, uzValues, vzValues, wzValues, xzValues, yzValues, TUVWXYZValues, xValue, zValue, xBit, zBit, biggestCardinality6, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w5Value, w1Bit, w2Bit, w3Bit, w4Bit, w5Bit, remCand, inter);
                                    if (hint.isWorth()) result.push(hint);
                                  } else {
                                    remCand = inter.clone();
                                    remCand.xor(yzValues);
                                    w1Value = remCand.nextSetBit(0);
                                    w1Bit = new BitSet32();
                                    w1Bit.set(w1Value);
                                    w2Value = remCand.nextSetBit(w1Value + 1);
                                    w2Bit = new BitSet32();
                                    w2Bit.set(w2Value);
                                    w3Value = remCand.nextSetBit(w2Value + 1);
                                    w3Bit = new BitSet32();
                                    w3Bit.set(w3Value);
                                    w4Value = remCand.nextSetBit(w3Value + 1);
                                    w4Bit = new BitSet32();
                                    w4Bit.set(w4Value);
                                    w5Value = remCand.nextSetBit(w4Value + 1);
                                    w5Bit = new BitSet32();
                                    w5Bit.set(w5Value);
                                    const hint = this.createHint(
                                      grid, TUVWXYZCell, Grid.getCell(tzCellIndex), Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                      tzValues, uzValues, vzValues, wzValues, xzValues, yzValues, TUVWXYZValues, xValue, zValue, xBit, zBit, biggestCardinality6, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w5Value, w1Bit, w2Bit, w3Bit, w4Bit, w5Bit, remCand, inter);
                                    if (hint.isWorth()) result.push(hint);
                                  }
                                } else if (doubleLink) {
                                  doubleLink = false;
                                  const hint = this.createHint(
                                    grid, TUVWXYZCell, Grid.getCell(tzCellIndex), Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                    tzValues, uzValues, vzValues, wzValues, xzValues, yzValues, TUVWXYZValues, zValue, xValue, zBit, xBit, biggestCardinality6, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w5Value, w1Bit, w2Bit, w3Bit, w4Bit, w5Bit, remCand, inter);
                                  if (hint.isWorth()) result.push(hint);
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return result;
  }

  private createHint(
    grid: Grid,
    TUVWXYZCell: Cell,
    tzCell: Cell,
    uzCell: Cell,
    vzCell: Cell,
    wzCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    tzValues: BitSet32,
    uzValues: BitSet32,
    vzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    yzValues: BitSet32,
    TUVWXYZValues: BitSet32,
    xValue: number,
    zValue: number,
    xBit: BitSet32,
    zBit: BitSet32,
    biggestCardinality: number,
    wingSize: number,
    doubleLink: boolean,
    w1Value: number,
    w2Value: number,
    w3Value: number,
    w4Value: number,
    w5Value: number,
    w1Bit: BitSet32,
    w2Bit: BitSet32,
    w3Bit: BitSet32,
    w4Bit: BitSet32,
    w5Bit: BitSet32,
    remCand: BitSet32,
    wingSet: BitSet32,
  ): TUVWXYZWingHint {
    let weakPotentials = false;
    let strongPotentialsX = false;
    let strongPotentialsZ = false;
    let inter = zBit.clone();
    const removablePotentials = new Map<Cell, BitSet32>();
    let eliminationsTotal = 0;
    let victims: CellSet | null = null;
    if (doubleLink) {
      for (const [wBit, wValue] of [
        [w1Bit, w1Value],
        [w2Bit, w2Value],
        [w3Bit, w3Value],
        [w4Bit, w4Value],
        [w5Bit, w5Value],
      ] as [BitSet32, number][]) {
        victims = null;
        inter = wBit.clone();
        inter.and(xzValues);
        if (inter.cardinality() === 1) victims = new CellSet(xzCell.getVisibleCells());
        inter = wBit.clone();
        inter.and(wzValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(wzCell.getVisibleCells());
          else victims.retainAll(wzCell.getVisibleCells());
        inter = wBit.clone();
        inter.and(vzValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(vzCell.getVisibleCells());
          else victims.retainAll(vzCell.getVisibleCells());
        inter = wBit.clone();
        inter.and(uzValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(uzCell.getVisibleCells());
          else victims.retainAll(uzCell.getVisibleCells());
        inter = wBit.clone();
        inter.and(tzValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(tzCell.getVisibleCells());
          else victims.retainAll(tzCell.getVisibleCells());
        inter = wBit.clone();
        inter.and(TUVWXYZValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(TUVWXYZCell.getVisibleCells());
          else victims.retainAll(TUVWXYZCell.getVisibleCells());
        victims!.remove(TUVWXYZCell);
        victims!.remove(tzCell);
        victims!.remove(uzCell);
        victims!.remove(vzCell);
        victims!.remove(wzCell);
        victims!.remove(xzCell);
        victims!.remove(yzCell);
        for (const cell of victims!) {
          if (grid.hasCellPotentialValue(cell.getIndex(), wValue)) {
            eliminationsTotal++;
            if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(wValue);
            else removablePotentials.set(cell, SingletonBitSet.create(wValue));
            weakPotentials = true;
          }
        }
      }
      victims = new CellSet(yzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(xzValues);
      if (inter.cardinality() === 1) victims.retainAll(xzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(wzValues);
      if (inter.cardinality() === 1) victims.retainAll(wzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(vzValues);
      if (inter.cardinality() === 1) victims.retainAll(vzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(uzValues);
      if (inter.cardinality() === 1) victims.retainAll(uzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(tzValues);
      if (inter.cardinality() === 1) victims.retainAll(tzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(TUVWXYZValues);
      if (inter.cardinality() === 1) victims.retainAll(TUVWXYZCell.getVisibleCells());
      victims.remove(TUVWXYZCell);
      victims.remove(tzCell);
      victims.remove(uzCell);
      victims.remove(vzCell);
      victims.remove(wzCell);
      victims.remove(xzCell);
      victims.remove(yzCell);
      for (const cell of victims) {
        if (grid.hasCellPotentialValue(cell.getIndex(), xValue)) {
          eliminationsTotal++;
          if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(xValue);
          else removablePotentials.set(cell, SingletonBitSet.create(xValue));
          strongPotentialsX = true;
        }
      }
    }
    victims = new CellSet(yzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(xzValues);
    if (inter.cardinality() === 1) victims.retainAll(xzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(wzValues);
    if (inter.cardinality() === 1) victims.retainAll(wzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(vzValues);
    if (inter.cardinality() === 1) victims.retainAll(vzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(uzValues);
    if (inter.cardinality() === 1) victims.retainAll(uzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(tzValues);
    if (inter.cardinality() === 1) victims.retainAll(tzCell.getVisibleCells());
    inter = zBit.clone();
    inter.and(TUVWXYZValues);
    if (inter.cardinality() === 1) victims.retainAll(TUVWXYZCell.getVisibleCells());
    victims.remove(TUVWXYZCell);
    victims.remove(tzCell);
    victims.remove(uzCell);
    victims.remove(vzCell);
    victims.remove(wzCell);
    victims.remove(xzCell);
    victims.remove(yzCell);
    for (const cell of victims) {
      if (grid.hasCellPotentialValue(cell.getIndex(), zValue)) {
        eliminationsTotal++;
        if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(zValue);
        else removablePotentials.set(cell, SingletonBitSet.create(zValue));
        strongPotentialsZ = true;
      }
    }
    if (doubleLink)
      if (!weakPotentials)
        if (!strongPotentialsZ) {
          doubleLink = false;
          return new TUVWXYZWingHint(this, removablePotentials, TUVWXYZCell, tzCell, uzCell, vzCell, wzCell, xzCell, yzCell, xValue, zValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
        } else if (!strongPotentialsX) doubleLink = false;
    return new TUVWXYZWingHint(this, removablePotentials, TUVWXYZCell, tzCell, uzCell, vzCell, wzCell, xzCell, yzCell, zValue, xValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
  }

  toString(): string {
    return 'TUVWXYZ-Wings';
  }
}
