import { Cell } from '../../Cell.js';
import { Grid } from '../../Grid.js';
import { BitSet32 } from '../../util/BitSet32.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { WXYZWingHint } from './WXYZWingHint.js';

// Ported from diuf.sudoku.solver.rules.WXYZWing (ALS-XZ with a bivalue cell).
export class WXYZWing implements IndirectHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    const hintsFinal = this.getHintList(grid);
    // Sort the result
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

  private isWXYZWing(
    wxyzValues: BitSet32,
    wzValues: BitSet32,
    xzValues: BitSet32,
    aBit: BitSet32,
    yzCell: Cell,
    xzCell: Cell,
    wzCell: Cell,
    wxyzCell: Cell,
  ): boolean {
    let inter = aBit.clone();
    inter.and(xzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(xzCell)) return false;
    inter = aBit.clone();
    inter.and(wzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(wzCell)) return false;
    inter = aBit.clone();
    inter.and(wxyzValues);
    if (inter.cardinality() === 1 && !yzCell.canSeeCell(wxyzCell)) return false;
    return true;
  }

  private getHintList(grid: Grid): WXYZWingHint[] {
    const result: WXYZWingHint[] = [];
    let biggestCardinality = 0;
    let biggestCardinality2 = 0;
    let biggestCardinality3 = 0;
    let wingSize: number;
    let w1Value = 0;
    let w2Value = 0;
    let w1Bit = new BitSet32();
    let w2Bit = new BitSet32();
    let remCand = new BitSet32();
    for (let i = 0; i < 81; i++) {
      const wxyzCell = Grid.getCell(i);
      const wxyzValues = grid.getCellPotentialValues(i);
      if (wxyzValues.cardinality() > 1 && wxyzValues.cardinality() < 5) {
        biggestCardinality = wxyzValues.cardinality();
        wingSize = wxyzValues.cardinality();
        for (const wzCellIndex of wxyzCell.getForwardVisibleCellIndexes()) {
          const wzValues = grid.getCellPotentialValues(wzCellIndex);
          let inter = wxyzValues.clone();
          inter.or(wzValues);
          if (wzValues.cardinality() > 1 && inter.cardinality() < 5) {
            const wzCell = Grid.getCell(wzCellIndex);
            biggestCardinality2 = biggestCardinality;
            if (wzValues.cardinality() > biggestCardinality2) biggestCardinality2 = wzValues.cardinality();
            wingSize = wxyzValues.cardinality() + wzValues.cardinality();
            const intersection1 = new CellSet(wxyzCell.getForwardVisibleCells());
            intersection1.retainAll(wzCell.getForwardVisibleCells());
            for (const xzCell of intersection1) {
              const xzCellIndex = xzCell.getIndex();
              const xzValues = grid.getCellPotentialValues(xzCellIndex);
              inter = wxyzValues.clone();
              inter.or(wzValues);
              inter.or(xzValues);
              if (xzValues.cardinality() > 1 && inter.cardinality() === 4) {
                biggestCardinality3 = biggestCardinality2;
                if (xzValues.cardinality() > biggestCardinality3) biggestCardinality3 = xzValues.cardinality();
                wingSize = wxyzValues.cardinality() + wzValues.cardinality() + xzValues.cardinality();
                const yzCellRange = new CellSet(wxyzCell.getVisibleCells());
                yzCellRange.addAll(wzCell.getVisibleCells());
                yzCellRange.addAll(xzCell.getVisibleCells());
                yzCellRange.remove(wxyzCell);
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
                    if (!this.isWXYZWing(wxyzValues, wzValues, xzValues, zBit, yzCell, xzCell, wzCell, wxyzCell)) doubleLink = false;
                    if (this.isWXYZWing(wxyzValues, wzValues, xzValues, xBit, yzCell, xzCell, wzCell, wxyzCell)) {
                      if (!doubleLink) {
                        const hint = this.createHint(
                          grid, wxyzCell, Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                          wzValues, xzValues, yzValues, wxyzValues, xValue, zValue, xBit, zBit, biggestCardinality3, wingSize, doubleLink, w1Value, w2Value, w1Bit, w2Bit, remCand, inter);
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
                        const hint = this.createHint(
                          grid, wxyzCell, Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                          wzValues, xzValues, yzValues, wxyzValues, xValue, zValue, xBit, zBit, biggestCardinality3, wingSize, doubleLink, w1Value, w2Value, w1Bit, w2Bit, remCand, inter);
                        if (hint.isWorth()) result.push(hint);
                      }
                    } else if (doubleLink) {
                      doubleLink = false;
                      const hint = this.createHint(
                        grid, wxyzCell, Grid.getCell(wzCellIndex), Grid.getCell(xzCellIndex), Grid.getCell(yzCellIndex),
                        wzValues, xzValues, yzValues, wxyzValues, zValue, xValue, zBit, xBit, biggestCardinality3, wingSize, doubleLink, w1Value, w2Value, w1Bit, w2Bit, remCand, inter);
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
    return result;
  }

  private createHint(
    grid: Grid,
    wxyzCell: Cell,
    wzCell: Cell,
    xzCell: Cell,
    yzCell: Cell,
    wzValues: BitSet32,
    xzValues: BitSet32,
    yzValues: BitSet32,
    wxyzValues: BitSet32,
    xValue: number,
    zValue: number,
    xBit: BitSet32,
    zBit: BitSet32,
    biggestCardinality: number,
    wingSize: number,
    doubleLink: boolean,
    w1Value: number,
    w2Value: number,
    w1Bit: BitSet32,
    w2Bit: BitSet32,
    remCand: BitSet32,
    wingSet: BitSet32,
  ): WXYZWingHint {
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
      inter.and(wxyzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(wxyzCell.getVisibleCells());
        else victims.retainAll(wxyzCell.getVisibleCells());
      victims!.remove(wxyzCell);
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
      inter.and(wxyzValues);
      if (inter.cardinality() === 1)
        if (victims === null) victims = new CellSet(wxyzCell.getVisibleCells());
        else victims.retainAll(wxyzCell.getVisibleCells());
      victims!.remove(wxyzCell);
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
      victims = new CellSet(yzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(xzValues);
      if (inter.cardinality() === 1) victims.retainAll(xzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(wzValues);
      if (inter.cardinality() === 1) victims.retainAll(wzCell.getVisibleCells());
      inter = xBit.clone();
      inter.and(wxyzValues);
      if (inter.cardinality() === 1) victims.retainAll(wxyzCell.getVisibleCells());
      victims.remove(wxyzCell);
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
    inter.and(wxyzValues);
    if (inter.cardinality() === 1) victims.retainAll(wxyzCell.getVisibleCells());
    victims.remove(wxyzCell);
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
          return new WXYZWingHint(this, removablePotentials, wxyzCell, wzCell, xzCell, yzCell, xValue, zValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
        } else if (!strongPotentialsX) doubleLink = false;
    return new WXYZWingHint(this, removablePotentials, wxyzCell, wzCell, xzCell, yzCell, zValue, xValue, biggestCardinality, wingSize, doubleLink, wingSet, eliminationsTotal);
  }

  toString(): string {
    return 'WXYZ-Wings';
  }
}
