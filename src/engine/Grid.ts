import { BitSet32 } from './util/BitSet32.js';
import { Cell, _setGridRef } from './Cell.js';
import { CellSet } from './tools/CellSet.js';
import { Settings } from './Settings.js';

// Region type indexes, as fixed by Grid.java (Block.getRegionTypeIndex()==0,
// Row==1, Column==2) and by the order of the static `regions` array.
export const BLOCK = 0;
export const ROW = 1;
export const COLUMN = 2;

const cells: Cell[] = [];
for (let i = 0; i < 81; i++) cells.push(new Cell(i));

// Copied verbatim from Grid.java lines 125-207.
const visibleCellIndex: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72],
  [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 28, 37, 46, 55, 64, 73],
  [0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 29, 38, 47, 56, 65, 74],
  [0, 1, 2, 4, 5, 6, 7, 8, 12, 13, 14, 21, 22, 23, 30, 39, 48, 57, 66, 75],
  [0, 1, 2, 3, 5, 6, 7, 8, 12, 13, 14, 21, 22, 23, 31, 40, 49, 58, 67, 76],
  [0, 1, 2, 3, 4, 6, 7, 8, 12, 13, 14, 21, 22, 23, 32, 41, 50, 59, 68, 77],
  [0, 1, 2, 3, 4, 5, 7, 8, 15, 16, 17, 24, 25, 26, 33, 42, 51, 60, 69, 78],
  [0, 1, 2, 3, 4, 5, 6, 8, 15, 16, 17, 24, 25, 26, 34, 43, 52, 61, 70, 79],
  [0, 1, 2, 3, 4, 5, 6, 7, 15, 16, 17, 24, 25, 26, 35, 44, 53, 62, 71, 80],
  [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 27, 36, 45, 54, 63, 72],
  [0, 1, 2, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 37, 46, 55, 64, 73],
  [0, 1, 2, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 38, 47, 56, 65, 74],
  [3, 4, 5, 9, 10, 11, 13, 14, 15, 16, 17, 21, 22, 23, 30, 39, 48, 57, 66, 75],
  [3, 4, 5, 9, 10, 11, 12, 14, 15, 16, 17, 21, 22, 23, 31, 40, 49, 58, 67, 76],
  [3, 4, 5, 9, 10, 11, 12, 13, 15, 16, 17, 21, 22, 23, 32, 41, 50, 59, 68, 77],
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 24, 25, 26, 33, 42, 51, 60, 69, 78],
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 24, 25, 26, 34, 43, 52, 61, 70, 79],
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 25, 26, 35, 44, 53, 62, 71, 80],
  [0, 1, 2, 9, 10, 11, 19, 20, 21, 22, 23, 24, 25, 26, 27, 36, 45, 54, 63, 72],
  [0, 1, 2, 9, 10, 11, 18, 20, 21, 22, 23, 24, 25, 26, 28, 37, 46, 55, 64, 73],
  [0, 1, 2, 9, 10, 11, 18, 19, 21, 22, 23, 24, 25, 26, 29, 38, 47, 56, 65, 74],
  [3, 4, 5, 12, 13, 14, 18, 19, 20, 22, 23, 24, 25, 26, 30, 39, 48, 57, 66, 75],
  [3, 4, 5, 12, 13, 14, 18, 19, 20, 21, 23, 24, 25, 26, 31, 40, 49, 58, 67, 76],
  [3, 4, 5, 12, 13, 14, 18, 19, 20, 21, 22, 24, 25, 26, 32, 41, 50, 59, 68, 77],
  [6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 33, 42, 51, 60, 69, 78],
  [6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 34, 43, 52, 61, 70, 79],
  [6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 35, 44, 53, 62, 71, 80],
  [0, 9, 18, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 54, 63, 72],
  [1, 10, 19, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 55, 64, 73],
  [2, 11, 20, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 56, 65, 74],
  [3, 12, 21, 27, 28, 29, 31, 32, 33, 34, 35, 39, 40, 41, 48, 49, 50, 57, 66, 75],
  [4, 13, 22, 27, 28, 29, 30, 32, 33, 34, 35, 39, 40, 41, 48, 49, 50, 58, 67, 76],
  [5, 14, 23, 27, 28, 29, 30, 31, 33, 34, 35, 39, 40, 41, 48, 49, 50, 59, 68, 77],
  [6, 15, 24, 27, 28, 29, 30, 31, 32, 34, 35, 42, 43, 44, 51, 52, 53, 60, 69, 78],
  [7, 16, 25, 27, 28, 29, 30, 31, 32, 33, 35, 42, 43, 44, 51, 52, 53, 61, 70, 79],
  [8, 17, 26, 27, 28, 29, 30, 31, 32, 33, 34, 42, 43, 44, 51, 52, 53, 62, 71, 80],
  [0, 9, 18, 27, 28, 29, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 54, 63, 72],
  [1, 10, 19, 27, 28, 29, 36, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 55, 64, 73],
  [2, 11, 20, 27, 28, 29, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 56, 65, 74],
  [3, 12, 21, 30, 31, 32, 36, 37, 38, 40, 41, 42, 43, 44, 48, 49, 50, 57, 66, 75],
  [4, 13, 22, 30, 31, 32, 36, 37, 38, 39, 41, 42, 43, 44, 48, 49, 50, 58, 67, 76],
  [5, 14, 23, 30, 31, 32, 36, 37, 38, 39, 40, 42, 43, 44, 48, 49, 50, 59, 68, 77],
  [6, 15, 24, 33, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 51, 52, 53, 60, 69, 78],
  [7, 16, 25, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 51, 52, 53, 61, 70, 79],
  [8, 17, 26, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 51, 52, 53, 62, 71, 80],
  [0, 9, 18, 27, 28, 29, 36, 37, 38, 46, 47, 48, 49, 50, 51, 52, 53, 54, 63, 72],
  [1, 10, 19, 27, 28, 29, 36, 37, 38, 45, 47, 48, 49, 50, 51, 52, 53, 55, 64, 73],
  [2, 11, 20, 27, 28, 29, 36, 37, 38, 45, 46, 48, 49, 50, 51, 52, 53, 56, 65, 74],
  [3, 12, 21, 30, 31, 32, 39, 40, 41, 45, 46, 47, 49, 50, 51, 52, 53, 57, 66, 75],
  [4, 13, 22, 30, 31, 32, 39, 40, 41, 45, 46, 47, 48, 50, 51, 52, 53, 58, 67, 76],
  [5, 14, 23, 30, 31, 32, 39, 40, 41, 45, 46, 47, 48, 49, 51, 52, 53, 59, 68, 77],
  [6, 15, 24, 33, 34, 35, 42, 43, 44, 45, 46, 47, 48, 49, 50, 52, 53, 60, 69, 78],
  [7, 16, 25, 33, 34, 35, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 53, 61, 70, 79],
  [8, 17, 26, 33, 34, 35, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 62, 71, 80],
  [0, 9, 18, 27, 36, 45, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [1, 10, 19, 28, 37, 46, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [2, 11, 20, 29, 38, 47, 54, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [3, 12, 21, 30, 39, 48, 54, 55, 56, 58, 59, 60, 61, 62, 66, 67, 68, 75, 76, 77],
  [4, 13, 22, 31, 40, 49, 54, 55, 56, 57, 59, 60, 61, 62, 66, 67, 68, 75, 76, 77],
  [5, 14, 23, 32, 41, 50, 54, 55, 56, 57, 58, 60, 61, 62, 66, 67, 68, 75, 76, 77],
  [6, 15, 24, 33, 42, 51, 54, 55, 56, 57, 58, 59, 61, 62, 69, 70, 71, 78, 79, 80],
  [7, 16, 25, 34, 43, 52, 54, 55, 56, 57, 58, 59, 60, 62, 69, 70, 71, 78, 79, 80],
  [8, 17, 26, 35, 44, 53, 54, 55, 56, 57, 58, 59, 60, 61, 69, 70, 71, 78, 79, 80],
  [0, 9, 18, 27, 36, 45, 54, 55, 56, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74],
  [1, 10, 19, 28, 37, 46, 54, 55, 56, 63, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74],
  [2, 11, 20, 29, 38, 47, 54, 55, 56, 63, 64, 66, 67, 68, 69, 70, 71, 72, 73, 74],
  [3, 12, 21, 30, 39, 48, 57, 58, 59, 63, 64, 65, 67, 68, 69, 70, 71, 75, 76, 77],
  [4, 13, 22, 31, 40, 49, 57, 58, 59, 63, 64, 65, 66, 68, 69, 70, 71, 75, 76, 77],
  [5, 14, 23, 32, 41, 50, 57, 58, 59, 63, 64, 65, 66, 67, 69, 70, 71, 75, 76, 77],
  [6, 15, 24, 33, 42, 51, 60, 61, 62, 63, 64, 65, 66, 67, 68, 70, 71, 78, 79, 80],
  [7, 16, 25, 34, 43, 52, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 78, 79, 80],
  [8, 17, 26, 35, 44, 53, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 78, 79, 80],
  [0, 9, 18, 27, 36, 45, 54, 55, 56, 63, 64, 65, 73, 74, 75, 76, 77, 78, 79, 80],
  [1, 10, 19, 28, 37, 46, 54, 55, 56, 63, 64, 65, 72, 74, 75, 76, 77, 78, 79, 80],
  [2, 11, 20, 29, 38, 47, 54, 55, 56, 63, 64, 65, 72, 73, 75, 76, 77, 78, 79, 80],
  [3, 12, 21, 30, 39, 48, 57, 58, 59, 66, 67, 68, 72, 73, 74, 76, 77, 78, 79, 80],
  [4, 13, 22, 31, 40, 49, 57, 58, 59, 66, 67, 68, 72, 73, 74, 75, 77, 78, 79, 80],
  [5, 14, 23, 32, 41, 50, 57, 58, 59, 66, 67, 68, 72, 73, 74, 75, 76, 78, 79, 80],
  [6, 15, 24, 33, 42, 51, 60, 61, 62, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 80],
  [7, 16, 25, 34, 43, 52, 60, 61, 62, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80],
  [8, 17, 26, 35, 44, 53, 60, 61, 62, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
];

// Copied verbatim from Grid.java lines 1080-1162.
const forwardVisibleCellIndex: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 27, 36, 45, 54, 63, 72],
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 28, 37, 46, 55, 64, 73],
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 29, 38, 47, 56, 65, 74],
  [4, 5, 6, 7, 8, 12, 13, 14, 21, 22, 23, 30, 39, 48, 57, 66, 75],
  [5, 6, 7, 8, 12, 13, 14, 21, 22, 23, 31, 40, 49, 58, 67, 76],
  [6, 7, 8, 12, 13, 14, 21, 22, 23, 32, 41, 50, 59, 68, 77],
  [7, 8, 15, 16, 17, 24, 25, 26, 33, 42, 51, 60, 69, 78],
  [8, 15, 16, 17, 24, 25, 26, 34, 43, 52, 61, 70, 79],
  [15, 16, 17, 24, 25, 26, 35, 44, 53, 62, 71, 80],
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 27, 36, 45, 54, 63, 72],
  [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 28, 37, 46, 55, 64, 73],
  [12, 13, 14, 15, 16, 17, 18, 19, 20, 29, 38, 47, 56, 65, 74],
  [13, 14, 15, 16, 17, 21, 22, 23, 30, 39, 48, 57, 66, 75],
  [14, 15, 16, 17, 21, 22, 23, 31, 40, 49, 58, 67, 76],
  [15, 16, 17, 21, 22, 23, 32, 41, 50, 59, 68, 77],
  [16, 17, 24, 25, 26, 33, 42, 51, 60, 69, 78],
  [17, 24, 25, 26, 34, 43, 52, 61, 70, 79],
  [24, 25, 26, 35, 44, 53, 62, 71, 80],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 36, 45, 54, 63, 72],
  [20, 21, 22, 23, 24, 25, 26, 28, 37, 46, 55, 64, 73],
  [21, 22, 23, 24, 25, 26, 29, 38, 47, 56, 65, 74],
  [22, 23, 24, 25, 26, 30, 39, 48, 57, 66, 75],
  [23, 24, 25, 26, 31, 40, 49, 58, 67, 76],
  [24, 25, 26, 32, 41, 50, 59, 68, 77],
  [25, 26, 33, 42, 51, 60, 69, 78],
  [26, 34, 43, 52, 61, 70, 79],
  [35, 44, 53, 62, 71, 80],
  [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 54, 63, 72],
  [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 55, 64, 73],
  [30, 31, 32, 33, 34, 35, 36, 37, 38, 45, 46, 47, 56, 65, 74],
  [31, 32, 33, 34, 35, 39, 40, 41, 48, 49, 50, 57, 66, 75],
  [32, 33, 34, 35, 39, 40, 41, 48, 49, 50, 58, 67, 76],
  [33, 34, 35, 39, 40, 41, 48, 49, 50, 59, 68, 77],
  [34, 35, 42, 43, 44, 51, 52, 53, 60, 69, 78],
  [35, 42, 43, 44, 51, 52, 53, 61, 70, 79],
  [42, 43, 44, 51, 52, 53, 62, 71, 80],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 54, 63, 72],
  [38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 55, 64, 73],
  [39, 40, 41, 42, 43, 44, 45, 46, 47, 56, 65, 74],
  [40, 41, 42, 43, 44, 48, 49, 50, 57, 66, 75],
  [41, 42, 43, 44, 48, 49, 50, 58, 67, 76],
  [42, 43, 44, 48, 49, 50, 59, 68, 77],
  [43, 44, 51, 52, 53, 60, 69, 78],
  [44, 51, 52, 53, 61, 70, 79],
  [51, 52, 53, 62, 71, 80],
  [46, 47, 48, 49, 50, 51, 52, 53, 54, 63, 72],
  [47, 48, 49, 50, 51, 52, 53, 55, 64, 73],
  [48, 49, 50, 51, 52, 53, 56, 65, 74],
  [49, 50, 51, 52, 53, 57, 66, 75],
  [50, 51, 52, 53, 58, 67, 76],
  [51, 52, 53, 59, 68, 77],
  [52, 53, 60, 69, 78],
  [53, 61, 70, 79],
  [62, 71, 80],
  [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74],
  [58, 59, 60, 61, 62, 66, 67, 68, 75, 76, 77],
  [59, 60, 61, 62, 66, 67, 68, 75, 76, 77],
  [60, 61, 62, 66, 67, 68, 75, 76, 77],
  [61, 62, 69, 70, 71, 78, 79, 80],
  [62, 69, 70, 71, 78, 79, 80],
  [69, 70, 71, 78, 79, 80],
  [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74],
  [65, 66, 67, 68, 69, 70, 71, 72, 73, 74],
  [66, 67, 68, 69, 70, 71, 72, 73, 74],
  [67, 68, 69, 70, 71, 75, 76, 77],
  [68, 69, 70, 71, 75, 76, 77],
  [69, 70, 71, 75, 76, 77],
  [70, 71, 78, 79, 80],
  [71, 78, 79, 80],
  [78, 79, 80],
  [73, 74, 75, 76, 77, 78, 79, 80],
  [74, 75, 76, 77, 78, 79, 80],
  [75, 76, 77, 78, 79, 80],
  [76, 77, 78, 79, 80],
  [77, 78, 79, 80],
  [78, 79, 80],
  [79, 80],
  [80],
  [],
];

// [cell][regionTypeIndex] -> index of the cell within that region / that region's index.
const regionCellIndex: number[][] = Array.from({ length: 81 }, () => [0, 0, 0]);
const cellRegions: number[][] = Array.from({ length: 81 }, () => [0, 0, 0]);

// Cell-position configuration tables used by the strong-links producer, copied
// verbatim from Grid.Region (Grid.java lines 2630-2675).
// 4-cell set: cells in a block sharing exactly 2 columns and 2 rows.
const blocksEmptyCells: number[][] = [
  [4, 5, 7, 8],
  [3, 5, 6, 8],
  [3, 4, 6, 7],
  [1, 2, 7, 8],
  [0, 2, 6, 8],
  [0, 1, 6, 7],
  [1, 2, 4, 5],
  [0, 2, 3, 5],
  [0, 1, 3, 4],
  [6, 7, 8, -1],
  [3, 4, 5, -1],
  [0, 1, 2, -1],
  [2, 5, 8, -1],
  [1, 4, 7, -1],
  [0, 3, 6, -1],
];
// 4-cell set: cells in a block sharing exactly 1 column and 1 row (or 2 lines)
// without the cell at the intersection.
const blockGroupedCells: number[][] = [
  [3, 6, -1, 1, 2, -1],
  [4, 7, -1, 0, 2, -1],
  [5, 8, -1, 0, 1, -1],
  [0, 6, -1, 4, 5, -1],
  [1, 7, -1, 3, 5, -1],
  [2, 8, -1, 3, 4, -1],
  [0, 3, -1, 7, 8, -1],
  [1, 4, -1, 6, 8, -1],
  [2, 5, -1, 6, 7, -1],
  [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 6, 7, 8],
  [3, 4, 5, 6, 7, 8],
  [0, 3, 6, 1, 4, 7],
  [0, 3, 6, 2, 5, 8],
  [1, 4, 7, 2, 5, 8],
];
const LineEmptyCells: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];
const LineGroupedCells: number[][] = [
  [3, 4, 5, 6, 7, 8],
  [0, 1, 2, 6, 7, 8],
  [0, 1, 2, 3, 4, 5],
];
const blocksHeartCells: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// Ported from Grid.Region (vanilla surface only).
export abstract class Region {
  protected regionCells: number[] = new Array(9).fill(0);
  // Java uses a BitSet(81) here. 81 cell-index bits exceed BitSet32's capacity,
  // so membership is a Set of cell indexes. Reconciled with CellSet in step-005.
  readonly regionCellsBitSet = new Set<number>();

  abstract getRegionTypeIndex(): number;
  abstract getRegionIndex(): number;

  Rectangle(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 0; i < 4; i++) if (blocksEmptyCells[index][i] >= 0) result.set(blocksEmptyCells[index][i]);
    return result;
  }

  crossBlade1(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 0; i < 3; i++) if (blockGroupedCells[index][i] >= 0) result.set(blockGroupedCells[index][i]);
    return result;
  }

  crossBlade2(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 3; i < 6; i++) if (blockGroupedCells[index][i] >= 0) result.set(blockGroupedCells[index][i]);
    return result;
  }

  crossHeart(index: number): BitSet32 {
    const result = new BitSet32();
    result.set(index);
    return result;
  }

  Heart(index: number): number {
    return blocksHeartCells[index];
  }

  lineEmptyCells(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 0; i < 3; i++) result.set(LineEmptyCells[index][i]);
    return result;
  }

  lineBlade1(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 0; i < 3; i++) result.set(LineGroupedCells[index][i]);
    return result;
  }

  lineBlade2(index: number): BitSet32 {
    const result = new BitSet32();
    for (let i = 0; i < 3; i++) result.set(LineGroupedCells[index][i + 3]);
    return result;
  }

  getCell(index: number): Cell {
    return cells[this.regionCells[index]];
  }

  // The region's nine cell indices, for hot loops that avoid Cell objects.
  getRegionCells(): number[] {
    return this.regionCells;
  }

  indexOf(cell: Cell): number {
    return regionCellIndex[cell.getIndex()][this.getRegionTypeIndex()];
  }

  contains(cell: Cell): boolean;
  contains(grid: Grid, value: number): boolean;
  contains(a: Cell | Grid, value?: number): boolean {
    if (value === undefined) {
      return this.regionCellsBitSet.has((a as Cell).getIndex());
    }
    const grid = a as Grid;
    for (let i = 0; i < 9; i++) {
      const cell = this.getCell(i);
      if (grid.getCellValue(cell.getIndex()) === value) return true;
    }
    return false;
  }

  getPotentialPositions(grid: Grid, value: number): BitSet32 {
    const result = new BitSet32();
    for (let index = 0; index < 9; index++) {
      if (grid.hasCellPotentialValue(this.getCell(index).getIndex(), value)) result.set(index);
    }
    return result;
  }

  copyPotentialPositions(grid: Grid, value: number): BitSet32 {
    return this.getPotentialPositions(grid, value);
  }

  crosses(other: Region): boolean {
    for (const idx of this.regionCells) {
      if (other.regionCellsBitSet.has(idx)) return true;
    }
    return false;
  }

  getEmptyCellCount(grid: Grid): number {
    let result = 0;
    for (let i = 0; i < 9; i++) {
      if (grid.getCellValue(this.regionCells[i]) === 0) result++;
    }
    return result;
  }

  abstract toString(): string;
  abstract toFullString(): string;
  abstract toStringShort(): string;
  abstract toFullStringShort(): string;
  abstract toFullNumber(): number;
}

export class Row extends Region {
  private readonly rowNum: number;

  constructor(rowNum: number) {
    super();
    this.rowNum = rowNum;
    for (let i = 0; i < 9; i++) {
      this.regionCells[i] = 9 * rowNum + i;
      regionCellIndex[this.regionCells[i]][this.getRegionTypeIndex()] = i;
      this.regionCellsBitSet.add(this.regionCells[i]);
      cellRegions[this.regionCells[i]][1] = rowNum;
    }
  }

  getRegionTypeIndex(): number { return 1; }
  getRegionIndex(): number { return this.rowNum; }
  getRowNum(): number { return this.rowNum; }
  toString(): string { return 'row'; }
  // Java branches on isRCNotation here (and in toFullStringShort), but both
  // arms are identical: only columns get chess-style letters.
  toFullString(): string { return this.toString() + ' ' + (this.rowNum + 1); }
  toStringShort(): string { return 'r'; }
  toFullStringShort(): string { return this.toStringShort() + (this.rowNum + 1); }
  toFullNumber(): number { return this.getRegionTypeIndex() * 10 + (this.rowNum + 1); }
}

export class Column extends Region {
  private readonly columnNum: number;

  constructor(columnNum: number) {
    super();
    this.columnNum = columnNum;
    for (let i = 0; i < 9; i++) {
      this.regionCells[i] = 9 * i + columnNum;
      regionCellIndex[this.regionCells[i]][this.getRegionTypeIndex()] = i;
      this.regionCellsBitSet.add(this.regionCells[i]);
      cellRegions[this.regionCells[i]][2] = columnNum;
    }
  }

  getRegionTypeIndex(): number { return 2; }
  getRegionIndex(): number { return this.columnNum; }
  getColumnNum(): number { return this.columnNum; }
  toString(): string { return 'column'; }
  toFullString(): string {
    if (Settings.getInstance().isRCNotation()) return this.toString() + ' ' + (this.columnNum + 1);
    return this.toString() + ' ' + String.fromCharCode('A'.charCodeAt(0) + this.columnNum);
  }
  toStringShort(): string { return 'c'; }
  // Java's isRCNotation branch here has identical arms; the short form stays numeric.
  toFullStringShort(): string { return this.toStringShort() + (this.columnNum + 1); }
  toFullNumber(): number { return this.getRegionTypeIndex() * 10 + (this.columnNum + 1); }
}

export class Block extends Region {
  private readonly vNum: number;
  private readonly hNum: number;
  private readonly index: number;

  constructor(index: number) {
    super();
    const vNums = [0, 0, 0, 1, 1, 1, 2, 2, 2];
    const hNums = [0, 1, 2, 0, 1, 2, 0, 1, 2];
    this.vNum = vNums[index];
    this.hNum = hNums[index];
    this.index = index;
    for (let i = 0; i < 9; i++) {
      this.regionCells[i] = 9 * (this.vNum * 3 + Math.trunc(i / 3)) + (this.hNum * 3 + (i % 3));
      regionCellIndex[this.regionCells[i]][this.getRegionTypeIndex()] = i;
      this.regionCellsBitSet.add(this.regionCells[i]);
      cellRegions[this.regionCells[i]][0] = index;
    }
  }

  getRegionTypeIndex(): number { return 0; }
  getRegionIndex(): number { return this.index; }
  getVIndex(): number { return this.vNum; }
  getHIndex(): number { return this.hNum; }
  toString(): string { return 'block'; }
  toFullString(): string { return this.toString() + ' ' + (this.vNum * 3 + this.hNum + 1); }
  toStringShort(): string { return 'b'; }
  toFullStringShort(): string { return this.toStringShort() + (this.vNum * 3 + this.hNum + 1); }
  toFullNumber(): number { return this.getRegionTypeIndex() * 10 + (this.vNum * 3 + this.hNum + 1); }
}

const blocks: Block[] = [];
for (let i = 0; i < 9; i++) blocks.push(new Block(i));
const rows: Row[] = [];
for (let i = 0; i < 9; i++) rows.push(new Row(i));
const columns: Column[] = [];
for (let i = 0; i < 9; i++) columns.push(new Column(i));
const regions: Region[][] = [blocks, rows, columns];

/**
 * A Sudoku grid: the 9x9 array of cell values plus per-cell potential values.
 * Ported from diuf.sudoku.Grid, vanilla surface only.
 */
export class Grid {
  static visibleCellIndex: number[][] = visibleCellIndex;
  static forwardVisibleCellIndex: number[][] = forwardVisibleCellIndex;
  static regionCellIndex: number[][] = regionCellIndex;
  static cellRegions: number[][] = cellRegions;
  // Populated lazily (see initCellSets) to avoid a circular-import TDZ: CellSet
  // imports Grid, so Grid cannot build CellSets at module-eval time.
  static get visibleCellsSet(): CellSet[] {
    if (visibleCellsSetCache === null) initCellSets();
    return visibleCellsSetCache!;
  }

  static get forwardVisibleCellsSet(): CellSet[] {
    if (forwardVisibleCellsSetCache === null) initCellSets();
    return forwardVisibleCellsSetCache!;
  }

  private cellValues: number[] = new Array(81).fill(0);
  private cellPotentialValues: BitSet32[] = new Array(81);
  // Java field is named `isGiven`; renamed to avoid clashing with the method.
  private _isGiven: boolean[] = new Array(81).fill(false);
  // 1 = Sudoku (default), 0 = Sukaku (set when pencilmarks are loaded). Java
  // only reads it from its GUI; here the API reads it to decide whether loaded
  // marks may be rebuilt over (see EngineImpl.newSolver).
  private _isSudoku = 1;

  constructor() {
    for (let i = 0; i < 81; i++) this.cellPotentialValues[i] = new BitSet32();
  }

  isSudoku(): number {
    return this._isSudoku;
  }

  setSukaku(): void {
    this._isSudoku = 0;
  }

  static getCell(index: number): Cell {
    return cells[index];
  }

  static getCellXY(x: number, y: number): Cell {
    return cells[9 * y + x];
  }

  static getRegions(regionTypeIndex: number): Region[] {
    return regions[regionTypeIndex];
  }

  static getRegionAt(regionTypeIndex: number, cellIndex: number): Region {
    return regions[regionTypeIndex][cellRegions[cellIndex][regionTypeIndex]];
  }

  fixGivens(): void {
    for (let i = 0; i < 81; i++) {
      if (this.getCellValue(i) !== 0) this._isGiven[i] = true;
    }
  }

  isGiven(index: number): boolean {
    return this._isGiven[index];
  }

  private setGiven(index: number): void {
    this._isGiven[index] = true;
  }

  private resetGiven(index: number): void {
    this._isGiven[index] = false;
  }

  setCellValue(index: number, value: number): void;
  setCellValue(x: number, y: number, value: number): void;
  setCellValue(a: number, b: number, c?: number): void {
    if (c === undefined) this.cellValues[a] = b;
    else this.cellValues[b * 9 + a] = c;
  }

  getCellValue(index: number): number;
  getCellValue(x: number, y: number): number;
  getCellValue(a: number, b?: number): number {
    return b === undefined ? this.cellValues[a] : this.cellValues[9 * b + a];
  }

  getCellPotentialValues(cellIndex: number): BitSet32 {
    return this.cellPotentialValues[cellIndex];
  }

  hasCellPotentialValue(cellIndex: number, value: number): boolean {
    return this.cellPotentialValues[cellIndex].get(value);
  }

  // Raw potential-value bitmask for a cell (bit v set <=> value v is possible).
  // Fast path for hot chaining loops; equivalent to getCellPotentialValues().bits.
  cellPotentialBits(cellIndex: number): number {
    return this.cellPotentialValues[cellIndex].bits;
  }

  addCellPotentialValue(cellIndex: number, value: number): void {
    this.cellPotentialValues[cellIndex].set(value);
  }

  removeCellPotentialValue(cellIndex: number, value: number): void {
    this.cellPotentialValues[cellIndex].clear(value);
  }

  removeCellPotentialValues(cellIndex: number, valuesToRemove: BitSet32): void {
    this.cellPotentialValues[cellIndex].andNot(valuesToRemove);
  }

  clearCellPotentialValues(cellIndex: number): void {
    this.cellPotentialValues[cellIndex].clear();
  }

  setCellPotentialValues(index: number, values: BitSet32): void {
    this.cellPotentialValues[index].clear();
    this.cellPotentialValues[index].or(values);
  }

  getFirstCancellerOf(target: Cell, value: number): Cell | null {
    const visible = Grid.visibleCellIndex[target.getIndex()];
    // isBlocks is frozen true, so the visible-cell count is 20.
    for (let i = 0; i < 20; i++) {
      if (this.cellValues[visible[i]] === value) return Grid.getCell(visible[i]);
    }
    return null;
  }

  copyTo(other: Grid): void {
    for (let i = 0; i < 81; i++) {
      other.setCellValue(i, this.cellValues[i]);
      other.setCellPotentialValues(i, this.cellPotentialValues[i]);
      if (this.isGiven(i)) other.setGiven(i);
      else other.resetGiven(i);
    }
  }

  isSolved(): boolean {
    for (let i = 0; i < 81; i++) {
      if (this.cellValues[i] === 0) return false;
    }
    return true;
  }

  getCountOccurancesOfValue(value: number): number {
    let result = 0;
    for (let i = 0; i < 81; i++) {
      if (this.getCellValue(i) === value) result++;
    }
    return result;
  }

  /** Rebuilds the grid from either 81 givens or 729 pencilmarks. */
  fromString(s: string): void {
    const len = s.length;
    if (len < 81) return; // ignore

    for (let i = 0; i < 81; i++) this.setCellValue(i % 9, Math.trunc(i / 9), 0);

    if (len < 729) {
      for (let i = 0; i < 81; i++) {
        const ch = s.charAt(i);
        if (ch >= '1' && ch <= '9') {
          const value = ch.charCodeAt(0) - '0'.charCodeAt(0);
          this.setCellValue(i % 9, Math.trunc(i / 9), value);
        }
      }
    } else {
      for (let i = 0; i < 729; i++) {
        const ch = s.charAt(i);
        if (ch >= '1' && ch <= '9') {
          const value = ch.charCodeAt(0) - '0'.charCodeAt(0);
          // Java asserts the exact positional mapping value == 1 + i % 9.
          this.addCellPotentialValue(Math.trunc(i / 9), value);
        }
      }
    }
    this.fixGivens();
  }

  /**
   * Applies Naked Singles that cause no direct eliminations, to settle the board
   * immediately after loading pencilmarks. The Java version also has a forbidden
   * pairs (NC) branch, which is variant-gated and out of scope here.
   */
  adjustPencilmarks(): void {
    for (let i = 0; i < 81; i++) {
      const cell = Grid.getCell(i);
      const values = this.getCellPotentialValues(i);
      if (values.cardinality() === 1) {
        const singleclue = values.nextSetBit(0);
        let isnakedsingle = true;
        for (const cellIndex of cell.getVisibleCellIndexes()) {
          if (this.hasCellPotentialValue(cellIndex, singleclue)) {
            isnakedsingle = false;
            break;
          }
        }
        if (isnakedsingle) {
          this.setCellValue(i % 9, Math.trunc(i / 9), singleclue);
          this.clearCellPotentialValues(i);
        }
      }
    }
  }

  toString81(): string {
    let result = '';
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const value = this.getCellValue(x, y);
        result += value === 0 ? '.' : String(value);
      }
    }
    return result;
  }

  equals(o: unknown): boolean {
    if (!(o instanceof Grid)) return false;
    for (let i = 0; i < 81; i++) {
      if (this.cellValues[i] !== o.cellValues[i]) return false;
    }
    for (let i = 0; i < 81; i++) {
      if (!this.getCellPotentialValues(i).equals(o.getCellPotentialValues(i))) return false;
    }
    return true;
  }
}

// Give Cell a runtime handle on Grid without making Cell import Grid as a value
// (which would break the eval-order that lets Grid construct its cells).
_setGridRef(Grid);

let visibleCellsSetCache: CellSet[] | null = null;
let forwardVisibleCellsSetCache: CellSet[] | null = null;

// Mirrors the Grid.java static block that fills visibleCellsSet /
// forwardVisibleCellsSet from the *CellIndex tables (vanilla, isBlocks==true).
export function initCellSets(): void {
  visibleCellsSetCache = visibleCellIndex.map((idx) => new CellSet(idx));
  forwardVisibleCellsSetCache = forwardVisibleCellIndex.map((idx) => new CellSet(idx));
}
