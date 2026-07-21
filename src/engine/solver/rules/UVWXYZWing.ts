import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { UVWXYZWingHint } from './UVWXYZWingHint.js';

// Ported from diuf.sudoku.solver.rules.UVWXYZWing (ALS-XZ with a bivalue cell).
export class UVWXYZWing implements IndirectHintProducer {
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

  private isUVWXYZWing(
    UVWXYZValues: BitSet32,
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
    UVWXYZCell: Cell,
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
    inter.and(UVWXYZValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(UVWXYZCell)) return false;
    return true;
  }

  private getHintList(grid: Grid): UVWXYZWingHint[] {
    const result: UVWXYZWingHint[] = [];
    let biggestCardinality = 0;
    let biggestCardinality2 = 0;
    let biggestCardinality3 = 0;
    let biggestCardinality4 = 0;
    let biggestCardinality5 = 0;
    let wingSize: number;
    let w1Value = 0;
    let w2Value = 0;
    let w3Value = 0;
    let w4Value = 0;
    let w1Bit = new BitSet32();
    let w2Bit = new BitSet32();
    let w3Bit = new BitSet32();
    let w4Bit = new BitSet32();
    let remCand = new BitSet32();
    for (let i = 0; i < 81; i++) {
      const UVWXYZCell = Grid.getCell(i);
      const UVWXYZValues = grid.getCellPotentialValues(i);
      if (UVWXYZValues.cardinality() > 1 && UVWXYZValues.cardinality() < 7) {
        biggestCardinality = UVWXYZValues.cardinality();
        wingSize = UVWXYZValues.cardinality();
        for (const uzCellIndex of UVWXYZCell.getForwardVisibleCellIndexes()) {
          const uzValues = grid.getCellPotentialValues(uzCellIndex);
          let inter = UVWXYZValues.clone();
          inter.or(uzValues);
          if (uzValues.cardinality() > 1 && inter.cardinality() < 7) {
            const uzCell = Grid.getCell(uzCellIndex);
            biggestCardinality2 = biggestCardinality;
            if (uzValues.cardinality() > biggestCardinality2) biggestCardinality2 = uzValues.cardinality();
            wingSize = UVWXYZValues.cardinality() + uzValues.cardinality();
            const intersection1 = new CellSet(UVWXYZCell.getForwardVisibleCells());
            intersection1.retainAll(uzCell.getForwardVisibleCells());
            for (const vzCell of intersection1) {
              const vzCellIndex = vzCell.getIndex();
              const vzValues = grid.getCellPotentialValues(vzCellIndex);
              inter = UVWXYZValues.clone();
              inter.or(uzValues);
              inter.or(vzValues);
              if (vzValues.cardinality() > 1 && inter.cardinality() < 7) {
                biggestCardinality3 = biggestCardinality2;
                if (vzValues.cardinality() > biggestCardinality3) biggestCardinality3 = vzValues.cardinality();
                wingSize = UVWXYZValues.cardinality() + uzValues.cardinality() + vzValues.cardinality();
                const intersection2 = new CellSet(vzCell.getForwardVisibleCells());
                intersection2.retainAll(intersection1);
                for (const wzCell of intersection2) {
                  const wzCellIndex = wzCell.getIndex();
                  const wzValues = grid.getCellPotentialValues(wzCellIndex);
                  inter = UVWXYZValues.clone();
                  inter.or(uzValues);
                  inter.or(vzValues);
                  inter.or(wzValues);
                  if (wzValues.cardinality() > 1 && inter.cardinality() < 7) {
                    biggestCardinality4 = biggestCardinality3;
                    if (wzValues.cardinality() > biggestCardinality4) biggestCardinality4 = wzValues.cardinality();
                    wingSize = UVWXYZValues.cardinality() + uzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality();
                    const intersection3 = new CellSet(wzCell.getForwardVisibleCells());
                    intersection3.retainAll(intersection2);
                    for (const xzCell of intersection3) {
                      const xzCellIndex = xzCell.getIndex();
                      const xzValues = grid.getCellPotentialValues(xzCellIndex);
                      inter = UVWXYZValues.clone();
                      inter.or(uzValues);
                      inter.or(vzValues);
                      inter.or(wzValues);
                      inter.or(xzValues);
                      if (xzValues.cardinality() > 1 && inter.cardinality() === 6) {
                        biggestCardinality5 = biggestCardinality4;
                        if (xzValues.cardinality() > biggestCardinality5) biggestCardinality5 = xzValues.cardinality();
                        wingSize = UVWXYZValues.cardinality() + uzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality() + xzValues.cardinality();
                        const yzCellRange = new CellSet(UVWXYZCell.getVisibleCells());
                        yzCellRange.addAll(uzCell.getVisibleCells());
                        yzCellRange.addAll(vzCell.getVisibleCells());
                        yzCellRange.addAll(wzCell.getVisibleCells());
                        yzCellRange.addAll(xzCell.getVisibleCells());
                        yzCellRange.remove(UVWXYZCell);
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
                            if (!this.isUVWXYZWing(UVWXYZValues, uzValues, vzValues, wzValues, xzValues, zBit, yzCell, xzCell, wzCell, vzCell, uzCell, UVWXYZCell)) doubleLink = false;
                            if (this.isUVWXYZWing(UVWXYZValues, uzValues, vzValues, wzValues, xzValues, xBit, yzCell, xzCell, wzCell, vzCell, uzCell, UVWXYZCell)) {
                              if (!doubleLink) {
                                const hint = this.createHint(
                                  grid, UVWXYZCell, Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                  uzValues, vzValues, wzValues, xzValues, yzValues, UVWXYZValues, xValue, zValue, xBit, zBit, biggestCardinality5, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w1Bit, w2Bit, w3Bit, w4Bit, remCand, inter);
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
                                const hint = this.createHint(
                                  grid, UVWXYZCell, Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                  uzValues, vzValues, wzValues, xzValues, yzValues, UVWXYZValues, xValue, zValue, xBit, zBit, biggestCardinality5, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w1Bit, w2Bit, w3Bit, w4Bit, remCand, inter);
                                if (hint.isWorth()) result.push(hint);
                              }
                            } else if (doubleLink) {
                              doubleLink = false;
                              const hint = this.createHint(
                                grid, UVWXYZCell, Grid.getCell(uzCellIndex), Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                                uzValues, vzValues, wzValues, xzValues, yzValues, UVWXYZValues, zValue, xValue, zBit, xBit, biggestCardinality5, wingSize, doubleLink, w1Value, w2Value, w3Value, w4Value, w1Bit, w2Bit, w3Bit, w4Bit, remCand, inter);
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
    return result;
  }

  private createHint(
    grid: Grid,
    UVWXYZCell: Cell,
    uzCell: Cell,
    vzCell: Cell,
    wzCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    uzValues: BitSet32,
    vzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    yzValues: BitSet32,
    UVWXYZValues: BitSet32,
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
    w1Bit: BitSet32,
    w2Bit: BitSet32,
    w3Bit: BitSet32,
    w4Bit: BitSet32,
    remCand: BitSet32,
    wingSet: BitSet32,
  ): UVWXYZWingHint {
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
        inter.and(UVWXYZValues);
        if (inter.cardinality() === 1)
          if (victims === null) victims = new CellSet(UVWXYZCell.getVisibleCells());
          else victims.retainAll(UVWXYZCell.getVisibleCells());
        victims!.remove(UVWXYZCell);
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
      inter.and(UVWXYZValues);
      if (inter.cardinality() === 1) victims.retainAll(UVWXYZCell.getVisibleCells());
      victims.remove(UVWXYZCell);
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
    inter.and(UVWXYZValues);
    if (inter.cardinality() === 1) victims.retainAll(UVWXYZCell.getVisibleCells());
    victims.remove(UVWXYZCell);
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
          return new UVWXYZWingHint(this, removablePotentials, UVWXYZCell, uzCell, vzCell, wzCell, xzCell, yzCell, xValue, zValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
        } else if (!strongPotentialsX) doubleLink = false;
    return new UVWXYZWingHint(this, removablePotentials, UVWXYZCell, uzCell, vzCell, wzCell, xzCell, yzCell, zValue, xValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
  }

  toString(): string {
    return 'UVWXYZ-Wings';
  }
}
