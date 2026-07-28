import type { Cell } from '../../Cell.js';
import { Grid, type Region } from '../../Grid.js';
import { Settings } from '../../Settings.js';
import { CellSet } from '../../tools/CellSet.js';
import { SingletonBitSet } from '../../tools/SingletonBitSet.js';
import type { BitSet32 } from '../../util/BitSet32.js';
import type { IndirectHintProducer, HintsAccumulator } from '../HintProducer.js';
import { TurbotFishHint } from './TurbotFishHint.js';

// Base/cover region-type pairs. Java lists 50 of them; entries past index 4 are
// variant-only (DG, Windows, X, Girandola, Asterisk, CD) and the vanilla loop
// bound below never reaches them.
const SETS: number[][] = [
  // Skyscrapers
  [1, 1],
  [2, 2],
  // Two-string Kites
  [2, 1],
  // Turbot Crane
  [1, 0],
  [2, 0],
];

/**
 * Ported from diuf.sudoku.solver.rules.TurbotFish. Registered for
 * SolvingTechnique.TurbotFish only when Settings.revisedRating() == 1; the
 * default rating path uses StrongLinks(2) for the same technique instead.
 *
 * `base`/`cover` of 3 or 4 mean DG/Window regions, which are variant-only. The
 * conditions that mention them are kept verbatim so the shape matches Java, but
 * SETS never produces those values under the vanilla baseline.
 */
export class TurbotFish implements IndirectHintProducer {
  getHints(grid: Grid, accu: HintsAccumulator): void {
    const hintsFinal: TurbotFishHint[] = [];
    // Settings.isVLatin() is frozen true, so the bound is 5 and the variant
    // `continue` guards inside the Java loop (all gated on !isVanilla()) are
    // unreachable.
    for (let i = 0; i < 5; i++) {
      const hintsStart = this.getHintsForSet(grid, SETS[i][0], SETS[i][1]);
      for (const hint of hintsStart) hintsFinal.push(hint);
    }
    hintsFinal.sort((h1, h2) => {
      const d1 = h1.getDifficulty();
      const d2 = h2.getDifficulty();
      const e1 = h1.getEliminationsTotal();
      const e2 = h2.getEliminationsTotal();
      const s1 = h1.getSuffix();
      const s2 = h2.getSuffix();
      // difficulty ascending
      if (d1 < d2) return -1;
      else if (d1 > d2) return 1;
      // eliminations descending
      if (e2 - e1 !== 0) return e2 - e1;
      // suffix lexicographic
      return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
    });
    for (const hint of hintsFinal) accu.add(hint);
  }

  // Note: unlike StrongLinks.shareRegionOf, this has no bridge1True/bridge2True
  // null fallback. It reads bridge1/bridge2 directly, as Java does.
  private shareRegionOf(
    grid: Grid,
    bridge1: Cell,
    bridge1Support: Cell | null,
    bridge2: Cell,
    bridge2Support: Cell | null,
    bridge1Support2: Cell | null,
    bridge2Support2: Cell | null,
  ): Region | null {
    let sameRegionCounter = true;

    if ((sameRegionCounter = bridge1.getX() === bridge2.getX())) {
      if (bridge1Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge1Support.getX() === bridge1.getX();
        if (bridge1Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge1Support2.getX() === bridge1.getX();
      }
      if (bridge2Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge2Support.getX() === bridge1.getX();
        if (bridge2Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge2Support2.getX() === bridge1.getX();
      }
      if (sameRegionCounter) return Grid.getRegionAt(2, bridge1.getIndex());
    }
    if ((sameRegionCounter = bridge1.getY() === bridge2.getY())) {
      if (bridge1Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge1Support.getY() === bridge1.getY();
        if (bridge1Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge1Support2.getY() === bridge1.getY();
      }
      if (bridge2Support !== null && sameRegionCounter) {
        sameRegionCounter = bridge2Support.getY() === bridge1.getY();
        if (bridge2Support2 !== null && sameRegionCounter)
          sameRegionCounter = bridge2Support2.getY() === bridge1.getY();
      }
      if (sameRegionCounter) return Grid.getRegionAt(1, bridge1.getIndex());
    }
    // Settings.isBlocks() is frozen true; the !isVLatin() variant block after it
    // is unreachable.
    if (Settings.getInstance().isBlocks())
      if ((sameRegionCounter = bridge1.getB() === bridge2.getB())) {
        if (bridge1Support !== null && sameRegionCounter) {
          sameRegionCounter = bridge1Support.getB() === bridge1.getB();
          if (bridge1Support2 !== null && sameRegionCounter)
            sameRegionCounter = bridge1Support2.getB() === bridge1.getB();
        }
        if (bridge2Support !== null && sameRegionCounter) {
          sameRegionCounter = bridge2Support.getB() === bridge1.getB();
          if (bridge2Support2 !== null && sameRegionCounter)
            sameRegionCounter = bridge2Support2.getB() === bridge1.getB();
        }
        if (sameRegionCounter) return Grid.getRegionAt(0, bridge1.getIndex());
      }
    return null;
  }

  private getHintsForSet(grid: Grid, base: number, cover: number): TurbotFishHint[] {
    const result: TurbotFishHint[] = [];
    let e1 = 0;
    let e2 = 0;
    const isBoxLike = (t: number): boolean => t === 0 || t === 3 || t === 4;

    for (let digit = 1; digit <= 9; digit++) {
      let coverEmptyRegion = false;
      let coverEmptyRegionBlades = false;
      const baseRegions = Grid.getRegions(base);
      const coverRegions = Grid.getRegions(cover);
      for (let i1 = 0; i1 < baseRegions.length; i1++) {
        const baseRegion = baseRegions[i1];
        const baseRegionPotentials = baseRegion.getPotentialPositions(grid, digit);
        const baseRegionPotentialsCardinality = baseRegionPotentials.cardinality();
        if (baseRegionPotentialsCardinality < 2) continue;
        if (
          baseRegionPotentialsCardinality > 6 ||
          (isBoxLike(base) && baseRegionPotentialsCardinality > 5)
        )
          continue;
        let baseEmptyRegion = false;
        let baseEmptyRegionBlades = false;
        let baseBlade1 = baseRegionPotentials.clone();
        let baseBlade2 = baseRegionPotentials.clone();
        const heartCells: (Cell | null)[] = new Array(2).fill(null);
        if (baseRegionPotentialsCardinality > 2) {
          // Grouped strong links in a box have 15 configurations, but only the 9
          // ER configurations are useful in 2-strong-link patterns.
          for (e1 = 0; e1 < (isBoxLike(base) ? 9 : 3); e1++) {
            heartCells[0] = isBoxLike(base) ? baseRegion.getCell(e1) : null;
            const baseEmptyArea = baseRegionPotentials.clone();
            baseBlade1 = baseRegionPotentials.clone();
            baseBlade2 = baseRegionPotentials.clone();
            // A block has 9 cells: 4 "Cross", 4 "Rectangle" and 1 "Heart", so
            // there are 9 empty-rectangle configurations per block.
            if (isBoxLike(base)) baseEmptyArea.and(baseRegion.Rectangle(e1));
            else baseEmptyArea.and(baseRegion.lineEmptyCells(e1));
            if (baseEmptyArea.cardinality() === 0) {
              if (isBoxLike(base)) {
                baseBlade1.and(baseRegion.crossBlade1(e1));
                baseBlade2.and(baseRegion.crossBlade2(e1));
              } else {
                baseBlade1.and(baseRegion.lineBlade1(e1));
                baseBlade2.and(baseRegion.lineBlade2(e1));
              }
              // The 4 "Cross" cells are 2 Blade1 cells in a row and 2 Blade2
              // cells in a column; an empty blade makes the configuration useless.
              if (baseBlade1.cardinality() > 0 && baseBlade2.cardinality() > 0) baseEmptyRegion = true;
              // Only one configuration is useful when cardinality > 2.
              break;
            }
          }
          if (!baseEmptyRegion) continue;
        }
        // Strong link found: walk its cells to produce a start and a bridge cell.
        let p1: number;
        let p2: number;
        for (let baseGroupedLinkOrdinal = 0; baseGroupedLinkOrdinal < 2; baseGroupedLinkOrdinal++) {
          const cells: (Cell | null)[] = new Array(12).fill(null);
          if (baseEmptyRegion) {
            if (baseBlade1.cardinality() === 1 || baseBlade2.cardinality() === 1) {
              if (baseGroupedLinkOrdinal === 0) {
                if (baseBlade1.cardinality() === 1) {
                  baseEmptyRegionBlades = true;
                  if (isBoxLike(base)) {
                    cells[0] = baseRegion.getCell(baseBlade1.nextSetBit(0));
                    cells[1] = baseRegion.getCell(baseRegion.Heart(e1));
                    cells[4] = cells[8] = cells[9] = null;
                    cells[5] = baseRegion.getCell((p1 = baseBlade2.nextSetBit(0)));
                    if (baseBlade2.cardinality() > 1) cells[9] = baseRegion.getCell(baseBlade2.nextSetBit(p1 + 1));
                  } else {
                    cells[0] = baseRegion.getCell(baseBlade1.nextSetBit(0));
                    cells[1] = baseRegion.getCell((p1 = baseBlade2.nextSetBit(0)));
                    cells[4] = cells[8] = cells[9] = null;
                    cells[5] = baseRegion.getCell((p2 = baseBlade2.nextSetBit(p1 + 1)));
                    if (baseBlade2.cardinality() > 2) cells[9] = baseRegion.getCell(baseBlade2.nextSetBit(p2 + 1));
                  }
                } else continue;
              }
              if (baseGroupedLinkOrdinal === 1) {
                if (baseBlade2.cardinality() === 1) {
                  baseEmptyRegionBlades = true;
                  if (isBoxLike(base)) {
                    cells[0] = baseRegion.getCell(baseBlade2.nextSetBit(0));
                    cells[1] = baseRegion.getCell(baseRegion.Heart(e1));
                    cells[4] = cells[8] = cells[9] = null;
                    cells[5] = baseRegion.getCell((p1 = baseBlade1.nextSetBit(0)));
                    if (baseBlade1.cardinality() > 1) cells[9] = baseRegion.getCell(baseBlade1.nextSetBit(p1 + 1));
                  } else {
                    cells[0] = baseRegion.getCell(baseBlade2.nextSetBit(0));
                    cells[1] = baseRegion.getCell((p2 = baseBlade1.nextSetBit(0)));
                    cells[4] = cells[8] = cells[9] = null;
                    cells[5] = baseRegion.getCell((p1 = baseBlade1.nextSetBit(p2 + 1)));
                    if (baseBlade1.cardinality() > 2) cells[9] = baseRegion.getCell(baseBlade1.nextSetBit(p1 + 1));
                  }
                } else continue;
              }
            } else {
              baseGroupedLinkOrdinal = 1;
              cells[8] = cells[9] = null;
              cells[0] = baseRegion.getCell((p2 = baseBlade1.nextSetBit(0)));
              cells[4] = baseRegion.getCell((p1 = baseBlade1.nextSetBit(p2 + 1)));
              if (baseBlade1.cardinality() > 2) cells[8] = baseRegion.getCell(baseBlade1.nextSetBit(p1 + 1));
              cells[1] = baseRegion.getCell((p2 = baseBlade2.nextSetBit(0)));
              cells[5] = baseRegion.getCell((p1 = baseBlade2.nextSetBit(p2 + 1)));
              if (baseBlade2.cardinality() > 2) cells[9] = baseRegion.getCell(baseBlade2.nextSetBit(p1 + 1));
            }
          } else {
            baseGroupedLinkOrdinal = 1;
            cells[0] = baseRegion.getCell((p2 = baseRegionPotentials.nextSetBit(0)));
            cells[1] = baseRegion.getCell(baseRegionPotentials.nextSetBit(p2 + 1));
          }

          for (let i2 = base === cover ? i1 + 1 : 0; i2 < coverRegions.length; i2++) {
            const coverRegion = coverRegions[i2];
            const coverRegionPotentials = coverRegion.getPotentialPositions(grid, digit);
            const coverRegionPotentialsCardinality = coverRegionPotentials.cardinality();
            // A strong link has cardinality 2. An empty rectangle needs a block
            // with cardinality > 2 (else it is just a strong link in a block)
            // and < 6, since 4 empty cells are needed in the Rectangle cells.
            if (coverRegionPotentialsCardinality < 2) continue;
            if (
              coverRegionPotentialsCardinality > 6 ||
              (isBoxLike(cover) && coverRegionPotentialsCardinality > 5)
            )
              continue;
            coverEmptyRegion = false;
            coverEmptyRegionBlades = false;
            let coverBlade1 = coverRegionPotentials.clone();
            let coverBlade2 = coverRegionPotentials.clone();
            if (coverRegionPotentialsCardinality > 2) {
              for (e2 = 0; e2 < (isBoxLike(cover) ? 9 : 3); e2++) {
                // Java indexes baseRegion here, not coverRegion. Kept as-is:
                // heartCells is only ever written, never read.
                heartCells[1] = isBoxLike(cover) ? baseRegion.getCell(e2) : null;
                const coverEmptyArea = coverRegionPotentials.clone();
                coverBlade1 = coverRegionPotentials.clone();
                coverBlade2 = coverRegionPotentials.clone();
                if (isBoxLike(cover)) coverEmptyArea.and(coverRegion.Rectangle(e2));
                else coverEmptyArea.and(coverRegion.lineEmptyCells(e2));
                if (coverEmptyArea.cardinality() === 0) {
                  if (isBoxLike(cover)) {
                    coverBlade1.and(coverRegion.crossBlade1(e2));
                    coverBlade2.and(coverRegion.crossBlade2(e2));
                  } else {
                    coverBlade1.and(coverRegion.lineBlade1(e2));
                    coverBlade2.and(coverRegion.lineBlade2(e2));
                  }
                  if (coverBlade1.cardinality() > 0 && coverBlade2.cardinality() > 0) coverEmptyRegion = true;
                  break;
                }
              }
              if (!coverEmptyRegion) continue;
            }
            // Strong link found: produce the bridge and end cells.
            for (let coverGroupedLinkOrdinal = 0; coverGroupedLinkOrdinal < 2; coverGroupedLinkOrdinal++) {
              cells[6] = null;
              cells[10] = null;
              cells[7] = null;
              cells[11] = null;
              if (coverEmptyRegion) {
                if (coverBlade1.cardinality() === 1 || coverBlade2.cardinality() === 1) {
                  if (coverGroupedLinkOrdinal === 0) {
                    if (coverBlade1.cardinality() === 1) {
                      coverEmptyRegionBlades = true;
                      if (isBoxLike(cover)) {
                        cells[2] = coverRegion.getCell(coverBlade1.nextSetBit(0));
                        cells[3] = coverRegion.getCell(coverRegion.Heart(e2));
                        cells[6] = cells[10] = cells[11] = null;
                        cells[7] = coverRegion.getCell((p1 = coverBlade2.nextSetBit(0)));
                        if (coverBlade2.cardinality() > 1)
                          cells[11] = coverRegion.getCell(coverBlade2.nextSetBit(p1 + 1));
                      } else {
                        cells[2] = coverRegion.getCell(coverBlade1.nextSetBit(0));
                        cells[3] = coverRegion.getCell((p2 = coverBlade2.nextSetBit(0)));
                        cells[6] = cells[10] = cells[11] = null;
                        cells[7] = coverRegion.getCell((p1 = coverBlade2.nextSetBit(p2 + 1)));
                        if (coverBlade2.cardinality() > 2)
                          cells[11] = coverRegion.getCell(coverBlade2.nextSetBit(p1 + 1));
                      }
                    } else continue;
                  }
                  if (coverGroupedLinkOrdinal === 1) {
                    if (coverBlade2.cardinality() === 1) {
                      coverEmptyRegionBlades = true;
                      if (isBoxLike(cover)) {
                        cells[2] = coverRegion.getCell(coverBlade2.nextSetBit(0));
                        cells[3] = coverRegion.getCell(coverRegion.Heart(e2));
                        cells[6] = cells[10] = cells[11] = null;
                        cells[7] = coverRegion.getCell((p1 = coverBlade1.nextSetBit(0)));
                        if (coverBlade1.cardinality() > 1)
                          cells[11] = coverRegion.getCell(coverBlade1.nextSetBit(p1 + 1));
                      } else {
                        cells[2] = coverRegion.getCell(coverBlade2.nextSetBit(0));
                        cells[3] = coverRegion.getCell((p2 = coverBlade1.nextSetBit(0)));
                        cells[6] = cells[10] = cells[11] = null;
                        cells[7] = coverRegion.getCell((p1 = coverBlade1.nextSetBit(p2 + 1)));
                        if (coverBlade1.cardinality() > 2)
                          cells[11] = coverRegion.getCell(coverBlade1.nextSetBit(p1 + 1));
                      }
                    } else continue;
                  }
                } else {
                  coverGroupedLinkOrdinal = 1;
                  cells[10] = cells[11] = null;
                  cells[2] = coverRegion.getCell((p2 = coverBlade1.nextSetBit(0)));
                  cells[6] = coverRegion.getCell((p1 = coverBlade1.nextSetBit(p2 + 1)));
                  if (coverBlade1.cardinality() > 2) cells[10] = coverRegion.getCell(coverBlade1.nextSetBit(p1 + 1));
                  cells[3] = coverRegion.getCell((p2 = coverBlade2.nextSetBit(0)));
                  cells[7] = coverRegion.getCell((p1 = coverBlade2.nextSetBit(p2 + 1)));
                  if (coverBlade2.cardinality() > 2) cells[11] = coverRegion.getCell(coverBlade2.nextSetBit(p1 + 1));
                }
              } else {
                coverGroupedLinkOrdinal = 1;
                cells[2] = coverRegion.getCell((p2 = coverRegionPotentials.nextSetBit(0)));
                cells[3] = coverRegion.getCell(coverRegionPotentials.nextSetBit(p2 + 1));
              }

              // A cell carrying the digit may occur only once across the base
              // regions. A strong link uses 2 cells; a grouped strong link uses
              // at most 5 in a box and 6 in a line. Only one cover region, so no
              // shared-region check is needed.
              const baseRegionsCells: (Cell | null)[] = new Array(12).fill(null);
              const emptyRegionCells: (Cell | null)[] = new Array(12).fill(null);
              let j = 0;
              let k = 0;
              for (let i = 0; i < 9; i++) {
                let digitCell = baseRegion.getCell(i);
                if (grid.hasCellPotentialValue(digitCell.getIndex(), digit)) {
                  baseRegionsCells[j++] = digitCell;
                  if (baseEmptyRegion) emptyRegionCells[k++] = digitCell;
                }
                digitCell = coverRegion.getCell(i);
                if (grid.hasCellPotentialValue(digitCell.getIndex(), digit)) {
                  baseRegionsCells[j++] = digitCell;
                  if (coverEmptyRegion) emptyRegionCells[k++] = digitCell;
                }
              }
              let next = false;
              for (let i = 0; i < j - 1; i++) {
                for (k = i + 1; k < j; k++) {
                  if (baseRegionsCells[i]!.equals(baseRegionsCells[k]!)) {
                    next = true;
                    break;
                  }
                }
              }
              if (next) continue;

              // Check the shared region (weak link).
              for (let i = 0; i < 2; i++) {
                for (j = 2; j < 4; j++) {
                  const bridge1 = cells[1 - i]!;
                  const bridge1Support = cells[1 - i + 4];
                  const bridge2 = cells[j]!;
                  const bridge2Support = cells[j + 4];
                  const bridge1Support2 = cells[1 - i + 8];
                  const bridge2Support2 = cells[j + 8];
                  const shareRegion = this.shareRegionOf(
                    grid,
                    bridge1,
                    bridge1Support,
                    bridge2,
                    bridge2Support,
                    bridge1Support2,
                    bridge2Support2,
                  );
                  if (shareRegion !== null && shareRegion !== baseRegion && shareRegion !== coverRegion) {
                    // Turbot fish found
                    const start = cells[i]!;
                    const startSupport = cells[i + 4];
                    const startSupport2 = cells[i + 8];
                    const end = cells[5 - j]!;
                    const endSupport = cells[5 - j + 4];
                    const endSupport2 = cells[5 - j + 8];
                    const ringRegion = this.shareRegionOf(
                      grid,
                      start,
                      startSupport,
                      end,
                      endSupport,
                      startSupport2,
                      endSupport2,
                    );
                    let hint: TurbotFishHint;
                    if (ringRegion !== null) {
                      // we have a ring
                      hint = this.createHint1(
                        grid, digit, start, end, bridge1, bridge2,
                        baseRegion, coverRegion, shareRegion, baseEmptyRegion, coverEmptyRegion,
                        startSupport, endSupport, baseEmptyRegionBlades, coverEmptyRegionBlades,
                        emptyRegionCells, startSupport2, endSupport2,
                        [bridge1, bridge1Support, bridge1Support2, bridge2, bridge2Support, bridge2Support2],
                        ringRegion,
                      );
                    } else {
                      hint = this.createHint(
                        grid, digit, start, end, bridge1, bridge2,
                        baseRegion, coverRegion, shareRegion, baseEmptyRegion, coverEmptyRegion,
                        startSupport, endSupport, baseEmptyRegionBlades, coverEmptyRegionBlades,
                        emptyRegionCells, startSupport2, endSupport2, ringRegion,
                      );
                    }
                    if (hint.isWorth()) result.push(hint);
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

  private andNotRegion(victims: CellSet, region: Region): void {
    for (const idx of region.regionCellsBitSet) victims.bits &= ~(1n << BigInt(idx));
  }

  private collectVictims(
    grid: Grid,
    value: number,
    a: Cell,
    b: Cell,
    aSupport: Cell | null,
    aSupport2: Cell | null,
    bSupport: Cell | null,
    bSupport2: Cell | null,
    gateA: boolean,
    gateB: boolean,
    baseSet: Region,
    coverSet: Region,
    removablePotentials: Map<Cell, BitSet32>,
  ): number {
    const victims = new CellSet(a.getVisibleCells());
    victims.retainAll(b.getVisibleCells());
    if (gateA && aSupport !== null) {
      victims.retainAll(aSupport.getVisibleCells());
      if (aSupport2 !== null) victims.retainAll(aSupport2.getVisibleCells());
    }
    if (gateB && bSupport !== null) {
      victims.retainAll(bSupport.getVisibleCells());
      if (bSupport2 !== null) victims.retainAll(bSupport2.getVisibleCells());
    }
    victims.remove(a);
    victims.remove(b);
    this.andNotRegion(victims, coverSet);
    this.andNotRegion(victims, baseSet);
    let eliminations = 0;
    for (const cell of victims) {
      if (grid.hasCellPotentialValue(cell.getIndex(), value)) {
        eliminations++;
        removablePotentials.set(cell, SingletonBitSet.create(value));
      }
    }
    return eliminations;
  }

  private createHint(
    grid: Grid, value: number, start: Cell, end: Cell, bridgeCell1: Cell, bridgeCell2: Cell,
    baseSet: Region, coverSet: Region, shareRegion: Region,
    baseEmptyRegion: boolean, coverEmptyRegion: boolean,
    startSupport: Cell | null, endSupport: Cell | null,
    baseEmptyRegionBlades: boolean, coverEmptyRegionBlades: boolean,
    emptyRegionCells: (Cell | null)[], startSupport2: Cell | null, endSupport2: Cell | null,
    ringRegion: Region | null,
  ): TurbotFishHint {
    const removablePotentials = new Map<Cell, BitSet32>();
    const eliminationsTotal = this.collectVictims(
      grid, value, start, end, startSupport, startSupport2, endSupport, endSupport2,
      baseEmptyRegion, coverEmptyRegion, baseSet, coverSet, removablePotentials,
    );
    return new TurbotFishHint(
      this, removablePotentials, start, end, bridgeCell1, bridgeCell2, value,
      baseSet, coverSet, shareRegion, baseEmptyRegion, coverEmptyRegion,
      emptyRegionCells, eliminationsTotal, ringRegion,
    );
  }

  private createHint1(
    grid: Grid, value: number, start: Cell, end: Cell, bridgeCell1: Cell, bridgeCell2: Cell,
    baseSet: Region, coverSet: Region, shareRegion: Region,
    baseEmptyRegion: boolean, coverEmptyRegion: boolean,
    startSupport: Cell | null, endSupport: Cell | null,
    baseEmptyRegionBlades: boolean, coverEmptyRegionBlades: boolean,
    emptyRegionCells: (Cell | null)[], startSupport2: Cell | null, endSupport2: Cell | null,
    ringRegionCells: (Cell | null)[], ringRegion: Region | null,
  ): TurbotFishHint {
    const removablePotentials = new Map<Cell, BitSet32>();
    let eliminationsTotal = this.collectVictims(
      grid, value, start, end, startSupport, startSupport2, endSupport, endSupport2,
      baseEmptyRegion, coverEmptyRegion, baseSet, coverSet, removablePotentials,
    );
    // The ring adds a second set of victims. Its two support gates are plain
    // null checks in Java, not gated on the empty-region flags.
    eliminationsTotal += this.collectVictims(
      grid, value, ringRegionCells[0]!, ringRegionCells[3]!,
      ringRegionCells[1], ringRegionCells[2], ringRegionCells[4], ringRegionCells[5],
      true, true, baseSet, coverSet, removablePotentials,
    );
    return new TurbotFishHint(
      this, removablePotentials, start, end, bridgeCell1, bridgeCell2, value,
      baseSet, coverSet, shareRegion, baseEmptyRegion, coverEmptyRegion,
      emptyRegionCells, eliminationsTotal, ringRegion,
    );
  }

  toString(): string {
    return 'Turbot Fishes';
  }
}
