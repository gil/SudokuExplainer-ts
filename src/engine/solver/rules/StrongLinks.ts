import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { Permutations } from '../../tools/Permutations.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { StrongLinksHint } from './StrongLinksHint.js';

// Ported from diuf.sudoku.solver.rules.StrongLinks. Variant branches (DG,
// Windows, X, Girandola, Asterisk, CD) are dropped under the frozen baseline;
// only blocks, rows and columns survive, so linkSet values are always 0/1/2.
export class StrongLinks implements IndirectHintProducer {
  private readonly degree: number;

  constructor(degree: number) {
    this.degree = degree;
  }

  getHints(grid: Grid, accu: HintsAccumulator): void {
    const variantsArray = new Array<number>(10).fill(0);
    let j = 0;
    // Settings.isBlocks() is frozen true.
    variantsArray[j++] = 0;
    variantsArray[j++] = 1;
    variantsArray[j++] = 2;
    // isVLatin/variant branches dropped: all such flags are frozen false.
    const hintsFinal: StrongLinksHint[] = [];
    const perm = new Permutations(this.degree, j * this.degree);
    while (perm.hasNext()) {
      const indexes = perm.nextBitNums();
      const set = new Array<number>(this.degree);
      let i = 0;
      for (i = 0; i < this.degree; i++)
        if (indexes[i] % this.degree !== i) break;
        else set[i] = variantsArray[Math.trunc(indexes[i] / this.degree)];
      if (i < this.degree) continue;
      const hintsStart = this.getHintsForSet(grid, set);
      for (const hint of hintsStart) hintsFinal.push(hint);
    }
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
      return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
    });
    for (const hint of hintsFinal) accu.add(hint);
  }

  private shareRegionOf(
    grid: Grid,
    bridge1: Cell | null,
    bridge1Support: Cell | null,
    bridge2: Cell | null,
    bridge2Support: Cell | null,
    bridge1Support2: Cell | null,
    bridge2Support2: Cell | null,
  ): Region | null {
    let sameRegionCounter = true;
    const bridge1True = bridge1 !== null ? bridge1 : bridge1Support;
    const bridge2True = bridge2 !== null ? bridge2 : bridge2Support;

    if ((sameRegionCounter = bridge1True!.getX() === bridge2True!.getX())) {
      if (bridge1Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge1Support.getX() === bridge1True!.getX();
        if (bridge1Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge1Support2.getX() === bridge1True!.getX();
      }
      if (bridge2Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge2Support.getX() === bridge1True!.getX();
        if (bridge2Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge2Support2.getX() === bridge1True!.getX();
      }
      if (sameRegionCounter) return Grid.getRegionAt(2, bridge1True!.getIndex());
    }
    if ((sameRegionCounter = bridge1True!.getY() === bridge2True!.getY())) {
      if (bridge1Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge1Support.getY() === bridge1True!.getY();
        if (bridge1Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge1Support2.getY() === bridge1True!.getY();
      }
      if (bridge2Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge2Support.getY() === bridge1True!.getY();
        if (bridge2Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge2Support2.getY() === bridge1True!.getY();
      }
      if (sameRegionCounter) return Grid.getRegionAt(1, bridge1True!.getIndex());
    }
    // Settings.isBlocks() is frozen true.
    if ((sameRegionCounter = bridge1True!.getB() === bridge2True!.getB())) {
      if (bridge1Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge1Support.getB() === bridge1True!.getB();
        if (bridge1Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge1Support2.getB() === bridge1True!.getB();
      }
      if (bridge2Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge2Support.getB() === bridge1True!.getB();
        if (bridge2Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge2Support2.getB() === bridge1True!.getB();
      }
      if (sameRegionCounter) return Grid.getRegionAt(0, bridge1True!.getIndex());
    }
    return null;
  }

  private isSameLine(lineCell1: Cell, lineCell2: Cell): boolean {
    if (lineCell1.getX() === lineCell2.getX() || lineCell1.getY() === lineCell2.getY()) return true;
    return false;
  }

  private isRegionMinLex(sequence: Region[], order: number[]): boolean {
    const origin = new Array<number>(sequence.length);
    const temp = new Array<number>(sequence.length);
    for (let i = 0; i < sequence.length; i++) {
      temp[i] = sequence[i].toFullNumber();
      origin[i] = sequence[i].toFullNumber();
    }
    temp.sort((a, b) => a - b);
    return origin[order[0]] === temp[0];
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

  private andNotRegion(victims: CellSet, region: Region): void {
    for (const idx of region.regionCellsBitSet) victims.bits &= ~(1n << BigInt(idx));
  }

  private buildLinks(
    grid: Grid,
    digit: number,
    linkSet: number[],
    linksNumber: number,
    linksDepth: number,
    baseLinkRegions: Region[][],
    x: number,
    cells: (Cell | null)[],
    baseRegionsCells: (Cell | null)[],
    emptyRegionsCells: (Cell | null)[],
    baseLinkRegion: Region[],
    baseLinkEmptyRegion: boolean[],
    e: number[],
    result: StrongLinksHint[],
  ): void {
    let p1: number, p2: number;
    p1 = p2 = 0;
    if (linksDepth < linksNumber)
      for (
        let i = linksDepth > 0 && linkSet[linksDepth - 1] === linkSet[linksDepth] ? x + 1 : 0;
        i < baseLinkRegions[linksDepth].length;
        i++
      ) {
        const heartCells = new Array<Cell | null>(3);
        baseLinkEmptyRegion[linksDepth] = false;
        baseLinkRegion[linksDepth] = baseLinkRegions[linksDepth][i];
        const blr = baseLinkRegion[linksDepth];
        const baseLinkRegionPotentials = blr.getPotentialPositions(grid, digit);
        const baseLinkRegionPotentialsC = baseLinkRegionPotentials.cardinality();
        e[linksDepth] = 0;
        if (baseLinkRegionPotentialsC > 1) {
          if (baseLinkRegionPotentialsC > 6) continue;
          let baseLinkBlade1 = baseLinkRegionPotentials.clone();
          let baseLinkBlade2 = baseLinkRegionPotentials.clone();
          let beatingHeart = baseLinkRegionPotentials.clone();

          if (baseLinkRegionPotentialsC > 2) {
            // Grouped strong links in a box have 15 configurations but only 9 are ER.
            for (e[linksDepth] = 0; e[linksDepth] < (linkSet[linksDepth] < 1 ? 15 : 3); e[linksDepth]++) {
              if (e[linksDepth] > 8 && baseLinkRegionPotentialsC < 4) continue;
              heartCells[0] =
                (linkSet[linksDepth] === 0 || linkSet[linksDepth] === 3 || linkSet[linksDepth] === 4) &&
                e[linksDepth] < 9
                  ? blr.getCell(e[linksDepth])
                  : null;
              const baseLinkEmptyArea = baseLinkRegionPotentials.clone();
              baseLinkBlade1 = baseLinkRegionPotentials.clone();
              baseLinkBlade2 = baseLinkRegionPotentials.clone();
              beatingHeart = baseLinkRegionPotentials.clone();
              if (linkSet[linksDepth] === 0 || linkSet[linksDepth] === 3 || linkSet[linksDepth] === 4) {
                baseLinkEmptyArea.and(blr.Rectangle(e[linksDepth]));
              } else {
                baseLinkEmptyArea.and(blr.lineEmptyCells(e[linksDepth]));
              }
              if (baseLinkEmptyArea.cardinality() === 0) {
                if (linkSet[linksDepth] === 0 || linkSet[linksDepth] === 3 || linkSet[linksDepth] === 4) {
                  baseLinkBlade1.and(blr.crossBlade1(e[linksDepth]));
                  baseLinkBlade2.and(blr.crossBlade2(e[linksDepth]));
                  beatingHeart.and(blr.crossHeart(e[linksDepth]));
                } else {
                  baseLinkBlade1.and(blr.lineBlade1(e[linksDepth]));
                  baseLinkBlade2.and(blr.lineBlade2(e[linksDepth]));
                }
                if (baseLinkBlade1.cardinality() > 0 && baseLinkBlade2.cardinality() > 0)
                  baseLinkEmptyRegion[linksDepth] = true;
                break;
              }
            }
            if (!baseLinkEmptyRegion[linksDepth]) continue;
          }
          if (!baseLinkEmptyRegion[linksDepth] && baseLinkRegionPotentialsC > 2) continue;
          // Strong link found; process cells to deliver a start and bridge cell.
          const b = linksDepth * 2;
          const L2 = linksNumber * 2;
          const L4 = linksNumber * 4;
          for (let baseLinkGroupedLinkOrdinal = 0; baseLinkGroupedLinkOrdinal < 2; baseLinkGroupedLinkOrdinal++) {
            cells[b + L2 + 0] = null;
            cells[b + L4 + 0] = null;
            cells[b + L2 + 1] = null;
            cells[b + L4 + 1] = null;
            let EmL = false;
            if (baseLinkEmptyRegion[linksDepth]) {
              if (baseLinkBlade1.cardinality() === 1 || baseLinkBlade2.cardinality() === 1) {
                if (baseLinkGroupedLinkOrdinal === 0)
                  if (baseLinkBlade1.cardinality() === 1) {
                    if (
                      linkSet[linksDepth] === 0 ||
                      linkSet[linksDepth] === 3 ||
                      linkSet[linksDepth] === 4
                    ) {
                      cells[b + 0] = blr.getCell(baseLinkBlade1.nextSetBit(0));
                      cells[L2 + b + 1] = blr.getCell(blr.Heart(e[linksDepth]));
                      cells[L2 + b + 0] = null;
                      cells[b + L4 + 0] = null;
                      cells[b + L4 + 1] = null;
                      cells[b + 1] = blr.getCell((p1 = baseLinkBlade2.nextSetBit(0)));
                      if (baseLinkBlade2.cardinality() > 1)
                        cells[b + L4 + 1] = blr.getCell(baseLinkBlade2.nextSetBit(p1 + 1));
                    } else {
                      cells[b + 0] = blr.getCell(baseLinkBlade1.nextSetBit(0));
                      cells[b + 1] = blr.getCell((p1 = baseLinkBlade2.nextSetBit(0)));
                      cells[L2 + b + 0] = null;
                      cells[b + L4 + 0] = null;
                      cells[b + L4 + 1] = null;
                      cells[L2 + b + 1] = blr.getCell((p2 = baseLinkBlade2.nextSetBit(p1 + 1)));
                      if (baseLinkBlade2.cardinality() > 2)
                        cells[b + L4 + 1] = blr.getCell(baseLinkBlade2.nextSetBit(p2 + 1));
                    }
                    // Prevent duplication if both blade cardinalities are 1.
                    if (baseLinkBlade2.cardinality() === 1) {
                      cells[b + 0] = blr.getCell((p1 = baseLinkBlade1.nextSetBit(0)));
                      cells[b + 1] = blr.getCell((p2 = baseLinkBlade2.nextSetBit(0)));
                      cells[L2 + b + 1] = null;
                      cells[L2 + b + 0] = null;
                      cells[b + L4 + 0] = null;
                      cells[b + L4 + 1] = null;
                      baseLinkGroupedLinkOrdinal = 1;
                    }
                  } else continue;
                if (baseLinkGroupedLinkOrdinal === 1)
                  if (baseLinkBlade2.cardinality() === 1) {
                    if (
                      linkSet[linksDepth] === 0 ||
                      linkSet[linksDepth] === 3 ||
                      linkSet[linksDepth] === 4
                    ) {
                      cells[b + 0] = blr.getCell(baseLinkBlade2.nextSetBit(0));
                      cells[L2 + b + 1] = blr.getCell(blr.Heart(e[linksDepth]));
                      cells[b + 1] = blr.getCell((p1 = baseLinkBlade1.nextSetBit(0)));
                      cells[L2 + b + 0] = null;
                      cells[b + L4 + 0] = null;
                      cells[b + L4 + 1] = null;
                      if (baseLinkBlade1.cardinality() > 1)
                        cells[b + L4 + 1] = blr.getCell(baseLinkBlade1.nextSetBit(p1 + 1));
                    } else {
                      cells[b + 0] = blr.getCell(baseLinkBlade2.nextSetBit(0));
                      cells[b + 1] = blr.getCell((p2 = baseLinkBlade1.nextSetBit(0)));
                      cells[L2 + b + 1] = blr.getCell((p1 = baseLinkBlade1.nextSetBit(p2 + 1)));
                      cells[L2 + b + 0] = null;
                      cells[b + L4 + 0] = null;
                      cells[b + L4 + 1] = null;
                      if (baseLinkBlade1.cardinality() > 2)
                        cells[b + L4 + 1] = blr.getCell(baseLinkBlade1.nextSetBit(p1 + 1));
                    }
                  } else continue;
              } else {
                let p3: number, p4: number;
                cells[b + L4 + 0] = null;
                cells[b + L4 + 1] = null;
                cells[b + 0] = blr.getCell((p1 = baseLinkBlade1.nextSetBit(0)));
                cells[L2 + b + 0] = blr.getCell((p3 = baseLinkBlade1.nextSetBit(p1 + 1)));
                if (baseLinkBlade1.cardinality() > 2)
                  cells[b + L4 + 0] = blr.getCell(baseLinkBlade1.nextSetBit(p3 + 1));
                cells[b + 1] = blr.getCell((p2 = baseLinkBlade2.nextSetBit(0)));
                cells[L2 + b + 1] = blr.getCell((p4 = baseLinkBlade2.nextSetBit(p2 + 1)));
                if (baseLinkBlade2.cardinality() > 2)
                  cells[b + L4 + 1] = blr.getCell(baseLinkBlade2.nextSetBit(p4 + 1));
                // Extract the special case of reduced & equivalent EmL 3, 4.
                if (
                  e[linksDepth] > 8 &&
                  baseLinkRegionPotentialsC === 4 &&
                  this.isSameLine(cells[L2 + b + 0]!, cells[L2 + b + 1]!) &&
                  this.isSameLine(cells[b + 0]!, cells[b + 1]!)
                ) {
                  EmL = true;
                }
                if (EmL && baseLinkGroupedLinkOrdinal === 1)
                  if (cells[b + 1]!.equals(blr.getCell(baseLinkBlade2.nextSetBit(0)))) {
                    cells[b + 1] = blr.getCell(baseLinkBlade1.nextSetBit(p1 + 1));
                    cells[L2 + b + 0] = blr.getCell(baseLinkBlade2.nextSetBit(0));
                  }
                if (!EmL) {
                  baseLinkGroupedLinkOrdinal = 1;
                  if (e[linksDepth] < 9) {
                    if (baseLinkBlade1.cardinality() === 2 && beatingHeart.cardinality() === 1)
                      cells[b + L4 + 0] = blr.getCell(blr.Heart(e[linksDepth]));
                    if (baseLinkBlade2.cardinality() === 2 && beatingHeart.cardinality() === 1)
                      cells[b + L4 + 1] = blr.getCell(blr.Heart(e[linksDepth]));
                  }
                }
              }
            } else {
              baseLinkGroupedLinkOrdinal = 1;
              cells[b + 0] = blr.getCell((p2 = baseLinkRegionPotentials.nextSetBit(0)));
              cells[b + 1] = blr.getCell(baseLinkRegionPotentials.nextSetBit(p2 + 1));
              cells[b + L2 + 0] = null;
              cells[b + L2 + 1] = null;
              cells[b + L4 + 0] = null;
              cells[b + L4 + 1] = null;
              if (
                (linkSet[linksDepth] === 0 || linkSet[linksDepth] === 3 || linkSet[linksDepth] === 4) &&
                this.isSameLine(cells[b + 0]!, cells[b + 1]!)
              )
                continue;
            }
            let j: number, k: number, l: number, m: number;
            j = k = m = 0;
            while (baseRegionsCells[j] !== null) j++;
            while (emptyRegionsCells[k] !== null) k++;
            const n = j;
            for (l = 0; l < 9; l++) {
              const digitCell = blr.getCell(l);
              if (grid.hasCellPotentialValue(digitCell.getIndex(), digit)) {
                baseRegionsCells[j++] = digitCell;
                if (baseLinkEmptyRegion[linksDepth]) emptyRegionsCells[k++] = digitCell;
              }
            }
            // No same base region exists, no same base cells (endofins) exist.
            let next = false;
            for (l = 0; l < n && !next; l++) {
              for (m = n; m < j; m++) {
                if (baseRegionsCells[l]!.equals(baseRegionsCells[m]!)) {
                  next = true;
                  break;
                }
              }
            }
            m = n;
            if (!next) {
              this.buildLinks(
                grid,
                digit,
                linkSet,
                linksNumber,
                linksDepth + 1,
                baseLinkRegions,
                i,
                cells,
                baseRegionsCells,
                emptyRegionsCells,
                baseLinkRegion,
                baseLinkEmptyRegion,
                e,
                result,
              );
              if (linksDepth === linksNumber - 1) {
                // Permutation algorithm based on code by Phillip Paul Fuchs
                // https://quickperm.org/01example.php. isLex() reduces reversed
                // arrangements so only the min-lex n!/2 permutations are allowed.
                const q = new Array<number>(linksNumber);
                const r = new Array<number>(linksNumber + 1);
                let s: number, t: number, tmp: number;
                const shareRegion = new Array<Region>(linksNumber - 1);
                const bridge1 = new Array<Cell | null>(linksNumber - 1);
                const bridge1Support = new Array<Cell | null>(linksNumber - 1);
                const bridge1Support2 = new Array<Cell | null>(linksNumber - 1);
                const bridge2 = new Array<Cell | null>(linksNumber - 1);
                const bridge2Support = new Array<Cell | null>(linksNumber - 1);
                const bridge2Support2 = new Array<Cell | null>(linksNumber - 1);
                let w = 0;
                for (s = 0; s < linksNumber; s++) {
                  q[s] = s;
                  r[s] = s;
                }
                r[linksNumber] = linksNumber;
                let u = new Array<number>(linksNumber);
                const iterMax = 1; // 2 directions for linking
                let v = 0;

                const processPermutation = (): void => {
                  next = true;
                  for (w = 0; w < linksNumber - 1; w++) {
                    bridge1[w] = cells[2 * q[w] + (1 - u[w])];
                    bridge1Support[w] = cells[2 * q[w] + (1 - u[w]) + 2 * linksNumber];
                    bridge2[w] = cells[2 * q[w + 1] + u[w + 1]];
                    bridge2Support[w] = cells[2 * q[w + 1] + u[w + 1] + 2 * linksNumber];
                    bridge1Support2[w] = cells[2 * q[w] + (1 - u[w]) + 4 * linksNumber];
                    bridge2Support2[w] = cells[2 * q[w + 1] + u[w + 1] + 4 * linksNumber];
                    const sr = this.shareRegionOf(
                      grid,
                      bridge1[w],
                      bridge1Support[w],
                      bridge2[w],
                      bridge2Support[w],
                      bridge1Support2[w],
                      bridge2Support2[w],
                    );
                    if (sr === null) {
                      next = false;
                      break;
                    }
                    shareRegion[w] = sr;
                  }
                  if (next) {
                    const start = cells[2 * q[0] + u[0]];
                    const startSupport = cells[2 * q[0] + u[0] + 2 * linksNumber];
                    const startSupport2 = cells[2 * q[0] + u[0] + 4 * linksNumber];
                    const end = cells[2 * q[linksNumber - 1] + (1 - u[linksNumber - 1])];
                    const endSupport = cells[2 * q[linksNumber - 1] + (1 - u[linksNumber - 1]) + 2 * linksNumber];
                    const endSupport2 = cells[2 * q[linksNumber - 1] + (1 - u[linksNumber - 1]) + 4 * linksNumber];
                    const ringRegion = this.shareRegionOf(
                      grid,
                      start,
                      startSupport,
                      end,
                      endSupport,
                      startSupport2,
                      endSupport2,
                    );
                    if (ringRegion !== null) {
                      // We have a ring.
                      if (this.isRegionMinLex(baseLinkRegion, q) && u[0] === 0) {
                        const hint = this.createHint1(
                          grid,
                          digit,
                          start!,
                          end!,
                          startSupport,
                          endSupport,
                          emptyRegionsCells,
                          baseLinkRegion,
                          shareRegion,
                          bridge1,
                          bridge2,
                          q,
                          linkSet,
                          baseLinkEmptyRegion,
                          startSupport2,
                          endSupport2,
                          ringRegion,
                          [bridge1, bridge1Support, bridge1Support2, bridge2, bridge2Support, bridge2Support2],
                        );
                        if (hint.isWorth()) result.push(hint);
                      }
                    } else {
                      const hint = this.createHint(
                        grid,
                        digit,
                        start!,
                        end!,
                        startSupport,
                        endSupport,
                        emptyRegionsCells,
                        baseLinkRegion,
                        shareRegion,
                        bridge1,
                        bridge2,
                        q,
                        linkSet,
                        baseLinkEmptyRegion,
                        startSupport2,
                        endSupport2,
                        ringRegion,
                      );
                      if (hint.isWorth()) result.push(hint);
                    }
                  }
                };

                if (this.isLex(q)) {
                  // 2 directions for each link so 2^(number of links) possibilities.
                  while (v < linksNumber) u[v++] = 0;
                  processPermutation();
                  v--;
                  while (v >= 0) {
                    if (u[v] < iterMax) {
                      u[v]++;
                      v++;
                      while (v < linksNumber) u[v++] = 0;
                      processPermutation();
                      v--;
                    } else v--;
                  }
                }
                s = 1; // setup first swap points to be 1 and 0 respectively (s & t)
                while (s < linksNumber) {
                  r[s]--; // decrease index "weight" for s by one
                  t = ((s % 2) * r[s]) | 0; // if s is odd then t = r[s] otherwise t = 0
                  tmp = q[t]; // swap(q[t], q[s])
                  q[t] = q[s];
                  q[s] = tmp;
                  if (this.isLex(q)) {
                    u = new Array<number>(linksNumber);
                    v = 0;
                    while (v < linksNumber) u[v++] = 0;
                    processPermutation();
                    v--;
                    while (v >= 0) {
                      if (u[v] < iterMax) {
                        u[v]++;
                        v++;
                        while (v < linksNumber) u[v++] = 0;
                        processPermutation();
                        v--;
                      } else v--;
                    }
                  }
                  s = 1; // reset index s to 1 (assumed)
                  while (r[s] === 0) {
                    r[s] = s;
                    s++;
                  }
                }
              }
            }
            // From here is the finish.
            for (l = 0; l < 9; l++) {
              const digitCell = blr.getCell(l);
              if (grid.hasCellPotentialValue(digitCell.getIndex(), digit)) {
                baseRegionsCells[--j] = null;
                if (baseLinkEmptyRegion[linksDepth]) emptyRegionsCells[--k] = null;
              }
            }
          }
        }
      }
  }

  private getHintsForSet(grid: Grid, linkSet: number[]): StrongLinksHint[] {
    const result: StrongLinksHint[] = [];
    const linkNumber = linkSet.length;
    const baseLinkRegions: Region[][] = new Array(linkNumber);
    for (let i = 0; i < linkNumber; i++) baseLinkRegions[i] = Grid.getRegions(linkSet[i]);
    for (let digit = 1; digit <= 9; digit++) {
      const cells: (Cell | null)[] = new Array<Cell | null>(linkNumber * 6).fill(null);
      const baseRegionsCells: (Cell | null)[] = new Array<Cell | null>(linkNumber * 6).fill(null);
      const emptyRegionsCells: (Cell | null)[] = new Array<Cell | null>(linkNumber * 6).fill(null);
      const baseLinkRegion: Region[] = new Array<Region>(linkNumber);
      const baseLinkEmptyRegion: boolean[] = new Array<boolean>(linkNumber).fill(false);
      const e: number[] = new Array<number>(linkNumber).fill(0);
      this.buildLinks(
        grid,
        digit,
        linkSet,
        linkNumber,
        0,
        baseLinkRegions,
        0,
        cells,
        baseRegionsCells,
        emptyRegionsCells,
        baseLinkRegion,
        baseLinkEmptyRegion,
        e,
        result,
      );
    }
    return result;
  }

  private createHint(
    grid: Grid,
    value: number,
    start1: Cell,
    end3: Cell,
    start1Support: Cell | null,
    end3Support: Cell | null,
    emptyCells: (Cell | null)[],
    baseLinkRegion: Region[],
    shareRegion: Region[],
    bridge1: (Cell | null)[],
    bridge2: (Cell | null)[],
    q: number[],
    linkSet: number[],
    baseLinkEmptyRegion: boolean[],
    start1Support2: Cell | null,
    end3Support2: Cell | null,
    ringRegion: Region | null,
  ): StrongLinksHint {
    const removablePotentials = new Map<Cell, ReturnType<typeof SingletonBitSet.create>>();
    let eliminationsTotal = 0;
    const victims = new CellSet(start1.getVisibleCells());
    victims.retainAll(end3.getVisibleCells());
    if (baseLinkEmptyRegion[q[0]] && start1Support !== null) {
      victims.retainAll(start1Support.getVisibleCells());
      if (start1Support2 !== null) victims.retainAll(start1Support2.getVisibleCells());
    }
    if (baseLinkEmptyRegion[q[linkSet.length - 1]] && end3Support !== null) {
      victims.retainAll(end3Support.getVisibleCells());
      if (end3Support2 !== null) victims.retainAll(end3Support2.getVisibleCells());
    }
    victims.remove(start1);
    victims.remove(end3);
    for (let i = 0; i < linkSet.length; i++) this.andNotRegion(victims, baseLinkRegion[q[i]]);
    for (let i = 0; i < linkSet.length - 1; i++) this.andNotRegion(victims, shareRegion[i]);
    for (const cell of victims) {
      if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
        removablePotentials.set(cell, SingletonBitSet.create(value));
        eliminationsTotal++;
      }
    }
    return new StrongLinksHint(
      this,
      removablePotentials,
      start1,
      value,
      end3,
      emptyCells,
      eliminationsTotal,
      baseLinkRegion,
      shareRegion,
      bridge1,
      bridge2,
      q,
      linkSet,
      baseLinkEmptyRegion,
      ringRegion,
    );
  }

  private createHint1(
    grid: Grid,
    value: number,
    start1: Cell,
    end3: Cell,
    start1Support: Cell | null,
    end3Support: Cell | null,
    emptyCells: (Cell | null)[],
    baseLinkRegion: Region[],
    shareRegion: Region[],
    bridge1: (Cell | null)[],
    bridge2: (Cell | null)[],
    q: number[],
    linkSet: number[],
    baseLinkEmptyRegion: boolean[],
    start1Support2: Cell | null,
    end3Support2: Cell | null,
    ringRegion: Region | null,
    ringRegionCells: (Cell | null)[][],
  ): StrongLinksHint {
    const removablePotentials = new Map<Cell, ReturnType<typeof SingletonBitSet.create>>();
    let eliminationsTotal = 0;
    let victims = new CellSet(start1.getVisibleCells());
    victims.retainAll(end3.getVisibleCells());
    if (baseLinkEmptyRegion[q[0]] && start1Support !== null) {
      victims.retainAll(start1Support.getVisibleCells());
      if (start1Support2 !== null) victims.retainAll(start1Support2.getVisibleCells());
    }
    if (baseLinkEmptyRegion[q[linkSet.length - 1]] && end3Support !== null) {
      victims.retainAll(end3Support.getVisibleCells());
      if (end3Support2 !== null) victims.retainAll(end3Support2.getVisibleCells());
    }
    victims.remove(start1);
    victims.remove(end3);
    for (let i = 0; i < linkSet.length; i++) this.andNotRegion(victims, baseLinkRegion[q[i]]);
    for (const cell of victims) {
      if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
        removablePotentials.set(cell, SingletonBitSet.create(value));
        eliminationsTotal++;
      }
    }
    for (let w = 0; w < linkSet.length - 1; w++) {
      victims = new CellSet(ringRegionCells[0][w]!.getVisibleCells());
      victims.retainAll(ringRegionCells[3][w]!.getVisibleCells());
      if (ringRegionCells[1][w] !== null) {
        victims.retainAll(ringRegionCells[1][w]!.getVisibleCells());
        if (ringRegionCells[2][w] !== null) victims.retainAll(ringRegionCells[2][w]!.getVisibleCells());
      }
      if (ringRegionCells[4][w] !== null) {
        victims.retainAll(ringRegionCells[4][w]!.getVisibleCells());
        if (ringRegionCells[5][w] !== null) victims.retainAll(ringRegionCells[5][w]!.getVisibleCells());
      }
      victims.remove(ringRegionCells[0][w]!);
      victims.remove(ringRegionCells[3][w]!);
      for (let i = 0; i < linkSet.length; i++) this.andNotRegion(victims, baseLinkRegion[q[i]]);
      for (const cell of victims) {
        if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
          removablePotentials.set(cell, SingletonBitSet.create(value));
          eliminationsTotal++;
        }
      }
    }
    return new StrongLinksHint(
      this,
      removablePotentials,
      start1,
      value,
      end3,
      emptyCells,
      eliminationsTotal,
      baseLinkRegion,
      shareRegion,
      bridge1,
      bridge2,
      q,
      linkSet,
      baseLinkEmptyRegion,
      ringRegion,
    );
  }

  toString(): string {
    return this.degree + ' Strong links';
  }
}
