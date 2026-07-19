// Port of tools/Pair.java.
export class Pair<T1, T2> {
  private readonly value1: T1;
  private readonly value2: T2;

  constructor(value1: T1, value2: T2) {
    this.value1 = value1;
    this.value2 = value2;
  }

  getValue1(): T1 {
    return this.value1;
  }

  getValue2(): T2 {
    return this.value2;
  }

  private eq(o1: unknown, o2: unknown): boolean {
    if (o1 === null || o1 === undefined) return o2 === null || o2 === undefined;
    if (typeof (o1 as { equals?: unknown }).equals === 'function') {
      return (o1 as { equals(o: unknown): boolean }).equals(o2);
    }
    return o1 === o2;
  }

  equals(o: unknown): boolean {
    if (o instanceof Pair) {
      return this.eq(this.value1, o.value1) && this.eq(this.value2, o.value2);
    }
    return false;
  }
}
