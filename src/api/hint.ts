import type { Cell } from '../engine/Cell.js';
import type { Grid, Region } from '../engine/Grid.js';
import type { BitSet32 } from '../engine/util/BitSet32.js';
import { Hint as EngineHint } from '../engine/solver/Hint.js';
import { DirectHint } from '../engine/solver/DirectHint.js';
import { IndirectHint } from '../engine/solver/IndirectHint.js';
import type { Rule } from '../engine/solver/Rule.js';
import type { SolvingTechnique } from '../engine/SolvingTechnique.js';
import {
  toCellRef,
  toCandidateRef,
  toRegionRef,
  type CandidateRef,
  type CellRef,
  type RegionRef,
} from './refs.js';

export interface Highlights {
  greenCells?: CellRef[];
  redCells?: CellRef[];
  greenCandidates?: CandidateRef[];
  redCandidates?: CandidateRef[];
  orangeCandidates?: CandidateRef[];
  regions?: RegionRef[];
  links?: { from: CandidateRef; to: CandidateRef }[];
}

export interface Hint {
  technique: SolvingTechnique;
  name: string;
  shortName: string;
  difficulty: number;
  isDirect: boolean;
  cell?: CellRef;
  value?: number;
  removals: { cell: CellRef; values: number[] }[];
  highlights: Highlights;
  explain(): string; // markdown, placeholders resolved
  toString(): string; // compact one-liner (Java Hint.toString)
}

function mapCandidates(m: Map<Cell, BitSet32>): CandidateRef[] {
  const out: CandidateRef[] = [];
  const entries = [...m.entries()].sort((a, b) => a[0].getIndex() - b[0].getIndex());
  for (const [cell, bits] of entries) {
    for (const value of bits.toArray()) out.push(toCandidateRef(cell.getIndex(), value));
  }
  return out;
}

function mapCells(cells: Array<Cell | null>): CellRef[] {
  return cells.filter((c): c is Cell => c != null).map((c) => toCellRef(c.getIndex()));
}

function mapRegions(regions: Array<Region | null> | null): RegionRef[] {
  if (regions === null) return [];
  return regions.filter((r): r is Region => r != null).map(toRegionRef);
}

function buildHighlights(hint: EngineHint, grid: Grid): Highlights {
  const h: Highlights = {};
  const regions = mapRegions(hint.getRegions());
  if (regions.length > 0) h.regions = regions;

  if (hint instanceof IndirectHint) {
    const selected = hint.getSelectedCells();
    if (selected !== null && selected.length > 0) h.greenCells = mapCells(selected);

    const green = mapCandidates(hint.getGreenPotentials(grid, 0));
    if (green.length > 0) h.greenCandidates = green;

    const red = mapCandidates(hint.getRedPotentials(grid, 0));
    if (red.length > 0) h.redCandidates = red;

    const orange = mapCandidates(hint.getBluePotentials(grid, 0));
    if (orange.length > 0) h.orangeCandidates = orange;

    const links = hint.getLinks(grid, 0);
    if (links !== null && links.length > 0) {
      h.links = links.map((l) => ({
        from: toCandidateRef(l.getSrcCell().getIndex(), l.getSrcValue()),
        to: toCandidateRef(l.getDstCell().getIndex(), l.getDstValue()),
      }));
    }
  } else {
    // DirectHint (Hidden/Naked Single): no view potentials, just the placement.
    const cell = hint.getCell();
    if (cell !== null) h.greenCells = [toCellRef(cell.getIndex())];
  }
  return h;
}

// Maps an engine hint to the public Hint shape. Everything grid-dependent
// (explain markdown, highlights) is materialised eagerly against the passed
// grid, so the result stays correct after later hints mutate the grid.
export function toPublicHint(hint: EngineHint, grid: Grid, technique: SolvingTechnique): Hint {
  const rule = hint as unknown as Rule;
  const cellObj = hint.getCell();

  const removals: { cell: CellRef; values: number[] }[] = [];
  if (hint instanceof IndirectHint) {
    const entries = [...hint.getRemovablePotentials().entries()]
      .map(([c, v]) => ({ index: c.getIndex(), values: v.toArray() }))
      .sort((a, b) => a.index - b.index);
    for (const e of entries) removals.push({ cell: toCellRef(e.index), values: e.values });
  }

  const explanation = hint.toHtml(grid);
  const str = hint.toString();

  return {
    technique,
    name: rule.getName(),
    shortName: rule.getShortName(),
    difficulty: rule.getDifficulty(),
    isDirect: hint instanceof DirectHint,
    cell: cellObj !== null ? toCellRef(cellObj.getIndex()) : undefined,
    value: cellObj !== null ? hint.getValue() : undefined,
    removals,
    highlights: buildHighlights(hint, grid),
    explain: () => explanation,
    toString: () => str,
  };
}
