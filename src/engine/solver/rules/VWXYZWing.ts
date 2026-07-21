import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { VWXYZWingHint } from './VWXYZWingHint.js';

// Ported from diuf.sudoku.solver.rules.VWXYZWing (ALS-XZ with a bivalue cell).
export class VWXYZWing implements IndirectHintProducer {
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

  private isVWXYZWing(
    vwxyzValues: BitSet32,
    vzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    aBit: BitSet32,
    yzCell: Cell,
    xzCell: Cell,
    wzCell: Cell,
    vzCell: Cell,
    vwxyzCell: Cell,
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
    inter.and(vwxyzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(vwxyzCell)) return false;
    return true;
  }

  private getHintList(grid: Grid): VWXYZWingHint[] {
    const result: VWXYZWingHint[] = [];
    let biggestCardinality = 0;
    let biggestCardinality2 = 0;
    let biggestCardinality3 = 0;
    let biggestCardinality4 = 0;
    let wingSize: number;
    let w1Value = 0;
    let w2Value = 0;
    let w3Value = 0;
    let w1Bit = new BitSet32();
    let w2Bit = new BitSet32();
    let w3Bit = new BitSet32();
    let remCand = new BitSet32();
    for (let i = 0; i < 81; i++) {
      const vwxyzCell = Grid.getCell(i);
      const vwxyzValues = grid.getCellPotentialValues(i);
      if (vwxyzValues.cardinality() > 1 && vwxyzValues.cardinality() < 6) {
        biggestCardinality = vwxyzValues.cardinality();
        wingSize = vwxyzValues.cardinality();
        for (const vzCellIndex of vwxyzCell.getForwardVisibleCellIndexes()) {
          const vzValues = grid.getCellPotentialValues(vzCellIndex);
          let inter = vwxyzValues.clone();
          inter.or(vzValues);
          if (vzValues.cardinality() > 1 && inter.cardinality() < 6) {
            const vzCell = Grid.getCell(vzCellIndex);
            biggestCardinality2 = biggestCardinality;
            if (vzValues.cardinality() > biggestCardinality2) biggestCardinality2 = vzValues.cardinality();
            wingSize = vwxyzValues.cardinality() + vzValues.cardinality();
            const intersection1 = new CellSet(vwxyzCell.getForwardVisibleCells());
            intersection1.retainAll(vzCell.getForwardVisibleCells());
            for (const wzCell of intersection1) {
              const wzCellIndex = wzCell.getIndex();
              const wzValues = grid.getCellPotentialValues(wzCellIndex);
              inter = vwxyzValues.clone();
              inter.or(vzValues);
              inter.or(wzValues);
              if (wzValues.cardinality() > 1 && inter.cardinality() < 6) {
                biggestCardinality3 = biggestCardinality2;
                if (wzValues.cardinality() > biggestCardinality3) biggestCardinality3 = wzValues.cardinality();
                wingSize = vwxyzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality();
                const intersection2 = new CellSet(wzCell.getForwardVisibleCells());
                intersection2.retainAll(intersection1);
                for (const xzCell of intersection2) {
                  const xzCellIndex = xzCell.getIndex();
                  const xzValues = grid.getCellPotentialValues(xzCellIndex);
                  inter = vwxyzValues.clone();
                  inter.or(vzValues);
                  inter.or(wzValues);
                  inter.or(xzValues);
                  if (xzValues.cardinality() > 1 && inter.cardinality() === 5) {
                    biggestCardinality4 = biggestCardinality3;
                    if (xzValues.cardinality() > biggestCardinality4) biggestCardinality4 = xzValues.cardinality();
                    wingSize = vwxyzValues.cardinality() + vzValues.cardinality() + wzValues.cardinality() + xzValues.cardinality();
                    const yzCellRange = new CellSet(vwxyzCell.getVisibleCells());
                    yzCellRange.addAll(vzCell.getVisibleCells());
                    yzCellRange.addAll(wzCell.getVisibleCells());
                    yzCellRange.addAll(xzCell.getVisibleCells());
                    yzCellRange.remove(vwxyzCell);
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
                        if (!this.isVWXYZWing(vwxyzValues, vzValues, wzValues, xzValues, zBit, yzCell, xzCell, wzCell, vzCell, vwxyzCell)) doubleLink = false;
                        if (this.isVWXYZWing(vwxyzValues, vzValues, wzValues, xzValues, xBit, yzCell, xzCell, wzCell, vzCell, vwxyzCell)) {
                          if (!doubleLink) {
                            const hint = this.createHint(
                              grid, vwxyzCell, Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                              vzValues, wzValues, xzValues, yzValues, vwxyzValues, xValue, zValue, xBit, zBit, biggestCardinality4, wingSize, doubleLink, w1Value, w2Value, w3Value, w1Bit, w2Bit, w3Bit, remCand, inter);
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
                            const hint = this.createHint(
                              grid, vwxyzCell, Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                              vzValues, wzValues, xzValues, yzValues, vwxyzValues, xValue, zValue, xBit, zBit, biggestCardinality4, wingSize, doubleLink, w1Value, w2Value, w3Value, w1Bit, w2Bit, w3Bit, remCand, inter);
                            if (hint.isWorth()) result.push(hint);
                          }
                        } else if (doubleLink) {
                          doubleLink = false;
                          const hint = this.createHint(
                            grid, vwxyzCell, Grid.getCell(vzCellIndex), Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                            vzValues, wzValues, xzValues, yzValues, vwxyzValues, zValue, xValue, zBit, xBit, biggestCardinality4, wingSize, doubleLink, w1Value, w2Value, w3Value, w1Bit, w2Bit, w3Bit, remCand, inter);
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
    return result;
  }

  private createHint(
    grid: Grid,
    vwxyzCell: Cell,
    vzCell: Cell,
    wzCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    vzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    yzValues: BitSet32,
    vwxyzValues: BitSet32,
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
    w1Bit: BitSet32,
    w2Bit: BitSet32,
    w3Bit: BitSet32,
    remCand: BitSet32,
    wingSet: BitSet32,
  ): VWXYZWingHint {
    let weakPotentials = false;
    let strongPotentialsX = false;
    let strongPotentialsZ = false;
    let inter = zBit.clone();
    const removablePotentials = new Map<Cell, BitSet32>();
    let eliminationsTotal = 0;
    let victims: CellSet | null = null;
    if (doubleLink) {
      inter = w1Bit.clone();
      inter.and(xzValues);
      if (inter.cardinality() === 1) victims = new CellSet(xzCell.getVisibleCells());
      inter = w1Bit.clone();
      inter.and(wzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(wzCell.getVisibleCells());
        else victims.retainAll(wzCell.getVisibleCells());
      inter = w1Bit.clone();
      inter.and(vzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vzCell.getVisibleCells());
        else victims.retainAll(vzCell.getVisibleCells());
      inter = w1Bit.clone();
      inter.and(vwxyzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vwxyzCell.getVisibleCells());
        else victims.retainAll(vwxyzCell.getVisibleCells());
      victims!.remove(vwxyzCell);
      victims!.remove(vzCell);
      victims!.remove(wzCell);
      victims!.remove(xzCell);
      victims!.remove(yzCell);
      for (const cell of victims!) {
        if (grid.hasCellPotentialValue(cell.getIndex(), w1Value)) {
          eliminationsTotal++;
          if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(w1Value);
          else removablePotentials.set(cell, SingletonBitSet.create(w1Value));
          weakPotentials = true;
        }
      }
      victims = null;
      inter = w2Bit.clone();
      inter.and(xzValues);
      if (inter.cardinality() === 1) victims = new CellSet(xzCell.getVisibleCells());
      inter = w2Bit.clone();
      inter.and(wzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(wzCell.getVisibleCells());
        else victims.retainAll(wzCell.getVisibleCells());
      inter = w2Bit.clone();
      inter.and(vzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vzCell.getVisibleCells());
        else victims.retainAll(vzCell.getVisibleCells());
      inter = w2Bit.clone();
      inter.and(vwxyzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vwxyzCell.getVisibleCells());
        else victims.retainAll(vwxyzCell.getVisibleCells());
      victims!.remove(vwxyzCell);
      victims!.remove(vzCell);
      victims!.remove(wzCell);
      victims!.remove(xzCell);
      victims!.remove(yzCell);
      for (const cell of victims!) {
        if (grid.hasCellPotentialValue(cell.getIndex(), w2Value)) {
          eliminationsTotal++;
          if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(w2Value);
          else removablePotentials.set(cell, SingletonBitSet.create(w2Value));
          weakPotentials = true;
        }
      }
      victims = null;
      inter = w3Bit.clone();
      inter.and(xzValues);
      if (inter.cardinality() === 1) victims = new CellSet(xzCell.getVisibleCells());
      inter = w3Bit.clone();
      inter.and(wzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(wzCell.getVisibleCells());
        else victims.retainAll(wzCell.getVisibleCells());
      inter = w3Bit.clone();
      inter.and(vzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vzCell.getVisibleCells());
        else victims.retainAll(vzCell.getVisibleCells());
      inter = w3Bit.clone();
      inter.and(vwxyzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(vwxyzCell.getVisibleCells());
        else victims.retainAll(vwxyzCell.getVisibleCells());
      victims!.remove(vwxyzCell);
      victims!.remove(vzCell);
      victims!.remove(wzCell);
      victims!.remove(xzCell);
      victims!.remove(yzCell);
      for (const cell of victims!) {
        if (grid.hasCellPotentialValue(cell.getIndex(), w3Value)) {
          eliminationsTotal++;
          if (removablePotentials.has(cell)) removablePotentials.get(cell)!.set(w3Value);
          else removablePotentials.set(cell, SingletonBitSet.create(w3Value));
          weakPotentials = true;
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
      inter.and(vwxyzValues);
      if (inter.cardinality() === 1) victims.retainAll(vwxyzCell.getVisibleCells());
      victims.remove(vwxyzCell);
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
    inter.and(vwxyzValues);
    if (inter.cardinality() === 1) victims.retainAll(vwxyzCell.getVisibleCells());
    victims.remove(vwxyzCell);
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
          return new VWXYZWingHint(this, removablePotentials, vwxyzCell, vzCell, wzCell, xzCell, yzCell, xValue, zValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
        } else if (!strongPotentialsX) doubleLink = false;
    return new VWXYZWingHint(this, removablePotentials, vwxyzCell, vzCell, wzCell, xzCell, yzCell, zValue, xValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
  }

  toString(): string {
    return 'VWXYZ-Wings';
  }
}
