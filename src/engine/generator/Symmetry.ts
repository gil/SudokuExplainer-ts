import { Point } from './Point.js';

export class Symmetry {
  private constructor(
    readonly name: string,
    private readonly points: (x: number, y: number) => Point[],
    private readonly label?: string,
  ) {}

  getPoints(x: number, y: number): Point[] {
    return this.points(x, y);
  }

  toString(): string {
    return this.label ?? this.name;
  }

  static readonly Vertical = new Symmetry('Vertical', (x, y) => [
    new Point(x, y),
    new Point(8 - x, y),
  ]);

  static readonly Horizontal = new Symmetry('Horizontal', (x, y) => [
    new Point(x, y),
    new Point(x, 8 - y),
  ]);

  static readonly Diagonal = new Symmetry('Diagonal', (x, y) => [
    new Point(x, y),
    new Point(8 - y, 8 - x),
  ]);

  static readonly AntiDiagonal = new Symmetry('AntiDiagonal', (x, y) => [
    new Point(x, y),
    new Point(y, x),
  ], 'Anti-diagonal');

  static readonly BiDiagonal = new Symmetry('BiDiagonal', (x, y) => [
    new Point(x, y),
    new Point(y, x),
    new Point(8 - y, 8 - x),
    new Point(8 - x, 8 - y),
  ], 'Bi-diagonal');

  static readonly Orthogonal = new Symmetry('Orthogonal', (x, y) => [
    new Point(x, y),
    new Point(8 - x, y),
    new Point(x, 8 - y),
    new Point(8 - x, 8 - y),
  ]);

  static readonly Rotational180 = new Symmetry('Rotational180', (x, y) => [
    new Point(x, y),
    new Point(8 - x, 8 - y),
  ], '180° rotational');

  static readonly Rotational90 = new Symmetry('Rotational90', (x, y) => [
    new Point(x, y),
    new Point(8 - x, 8 - y),
    new Point(y, 8 - x),
    new Point(8 - y, x),
  ], '90° rotational');

  static readonly None = new Symmetry('None', (x, y) => [new Point(x, y)]);

  static readonly Full = new Symmetry('Full', (x, y) => [
    new Point(x, y),
    new Point(8 - x, y),
    new Point(x, 8 - y),
    new Point(8 - x, 8 - y),
    new Point(y, x),
    new Point(8 - y, x),
    new Point(y, 8 - x),
    new Point(8 - y, 8 - x),
  ]);

  static readonly Full32 = new Symmetry('Full32', (x, y) => [
    // q1
    new Point(x % 4, y % 4),
    new Point(4 - (x % 4), y % 4),
    new Point(x % 4, 4 - (y % 4)),
    new Point(4 - (x % 4), 4 - (y % 4)),
    new Point(y % 4, x % 4),
    new Point(4 - (y % 4), x % 4),
    new Point(y % 4, 4 - (x % 4)),
    new Point(4 - (y % 4), 4 - (x % 4)),
    // q2
    new Point((x % 4) + 4, y % 4),
    new Point(4 - (x % 4) + 4, y % 4),
    new Point((x % 4) + 4, 4 - (y % 4)),
    new Point(4 - (x % 4) + 4, 4 - (y % 4)),
    new Point((y % 4) + 4, x % 4),
    new Point(4 - (y % 4) + 4, x % 4),
    new Point((y % 4) + 4, 4 - (x % 4)),
    new Point(4 - (y % 4) + 4, 4 - (x % 4)),
    // q3
    new Point(x % 4, (y % 4) + 4),
    new Point(4 - (x % 4), (y % 4) + 4),
    new Point(x % 4, 4 - (y % 4) + 4),
    new Point(4 - (x % 4), 4 - (y % 4) + 4),
    new Point(y % 4, (x % 4) + 4),
    new Point(4 - (y % 4), (x % 4) + 4),
    new Point(y % 4, 4 - (x % 4) + 4),
    new Point(4 - (y % 4), 4 - (x % 4) + 4),
    // q4
    new Point((x % 4) + 4, (y % 4) + 4),
    new Point(4 - (x % 4) + 4, (y % 4) + 4),
    new Point((x % 4) + 4, 4 - (y % 4) + 4),
    new Point(4 - (x % 4) + 4, 4 - (y % 4) + 4),
    new Point((y % 4) + 4, (x % 4) + 4),
    new Point(4 - (y % 4) + 4, (x % 4) + 4),
    new Point((y % 4) + 4, 4 - (x % 4) + 4),
    new Point(4 - (y % 4) + 4, 4 - (x % 4) + 4),
  ]);

  static values(): Symmetry[] {
    return [
      Symmetry.Vertical,
      Symmetry.Horizontal,
      Symmetry.Diagonal,
      Symmetry.AntiDiagonal,
      Symmetry.BiDiagonal,
      Symmetry.Orthogonal,
      Symmetry.Rotational180,
      Symmetry.Rotational90,
      Symmetry.None,
      Symmetry.Full,
      Symmetry.Full32,
    ];
  }
}

export const DEFAULT_SYMMETRIES: Symmetry[] = [
  Symmetry.BiDiagonal,
  Symmetry.Orthogonal,
  Symmetry.Rotational180,
  Symmetry.Rotational90,
  Symmetry.Full,
];
