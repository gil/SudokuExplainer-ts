// Port of tools/LinkedSet.java, a LinkedHashSet whose `get` returns the stored
// element equal to the argument (used to retrieve a Potential complete with its
// parents). Java dedups by hashCode/equals; here dedup, contains and get use a
// primitive `hashKey()` when the element provides one (consistent with equals),
// falling back to an equals() scan otherwise. Insertion order is preserved.
export class LinkedSet<T extends { equals(o: unknown): boolean; hashKey?(): number }>
  implements Iterable<T>
{
  private items: T[] = [];
  private readonly byKey = new Map<number, T>();

  private keyOf(o: T): number | undefined {
    return typeof o.hashKey === 'function' ? o.hashKey() : undefined;
  }

  add(o: T): boolean {
    const k = this.keyOf(o);
    if (k !== undefined) {
      if (this.byKey.has(k)) {
        // Match the reference LinkedSet: put on an existing key replaces the
        // stored element (both iteration and get() then yield the new one).
        const i = this.items.findIndex((x) => x.hashKey!() === k);
        this.items[i] = o;
        this.byKey.set(k, o);
        return true;
      }
      this.items.push(o);
      this.byKey.set(k, o);
      return false;
    }
    const i = this.scanIndexOf(o);
    if (i >= 0) {
      this.items[i] = o;
      return true;
    }
    this.items.push(o);
    return false;
  }

  addAll(c: Iterable<T>): boolean {
    let changed = false;
    for (const o of c) if (!this.add(o)) changed = true;
    return changed;
  }

  retainAll(other: LinkedSet<T>): boolean {
    let changed = false;
    const kept: T[] = [];
    for (const it of this.items) {
      if (other.contains(it)) kept.push(it);
      else changed = true;
    }
    if (changed) {
      this.items = kept;
      this.rebuildIndex();
    }
    return changed;
  }

  clear(): void {
    this.items.length = 0;
    this.byKey.clear();
  }

  contains(o: T): boolean {
    const k = this.keyOf(o);
    if (k !== undefined) return this.byKey.has(k);
    return this.scanIndexOf(o) >= 0;
  }

  get(o: T): T | null {
    const k = this.keyOf(o);
    if (k !== undefined) return this.byKey.get(k) ?? null;
    const i = this.scanIndexOf(o);
    return i >= 0 ? this.items[i] : null;
  }

  remove(o: T): boolean {
    const k = this.keyOf(o);
    if (k !== undefined) {
      if (!this.byKey.has(k)) return false;
      this.byKey.delete(k);
      const i = this.items.findIndex((x) => x.hashKey!() === k);
      this.items.splice(i, 1);
      return true;
    }
    const i = this.scanIndexOf(o);
    if (i < 0) return false;
    this.items.splice(i, 1);
    return true;
  }

  size(): number {
    return this.items.length;
  }

  private scanIndexOf(o: T): number {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].equals(o)) return i;
    }
    return -1;
  }

  private rebuildIndex(): void {
    this.byKey.clear();
    for (const it of this.items) {
      const k = this.keyOf(it);
      if (k !== undefined) this.byKey.set(k, it);
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }
}
