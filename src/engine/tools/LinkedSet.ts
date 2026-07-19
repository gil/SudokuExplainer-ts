// Port of tools/LinkedSet.java, a LinkedHashSet whose `get` returns the stored
// element equal to the argument (used to retrieve a Potential complete with its
// parents). Java dedups by hashCode/equals; here dedup and get scan by equals in
// insertion order. Engine adds are always guarded by contains, so each element's
// stored version equals its key and iteration order stays insertion order.
export class LinkedSet<T extends { equals(o: unknown): boolean }> implements Iterable<T> {
  private readonly items: T[] = [];

  add(o: T): boolean {
    const i = this.indexOf(o);
    if (i >= 0) {
      this.items[i] = o;
      return true;
    }
    this.items.push(o);
    return false;
  }

  clear(): void {
    this.items.length = 0;
  }

  contains(o: T): boolean {
    return this.indexOf(o) >= 0;
  }

  get(o: T): T | null {
    const i = this.indexOf(o);
    return i >= 0 ? this.items[i] : null;
  }

  remove(o: T): boolean {
    const i = this.indexOf(o);
    if (i < 0) return false;
    this.items.splice(i, 1);
    return true;
  }

  size(): number {
    return this.items.length;
  }

  private indexOf(o: T): number {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].equals(o)) return i;
    }
    return -1;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
