// Port of tools/StrongReference.java.
export class StrongReference<T> {
  private value: T | undefined;

  constructor(value?: T) {
    this.value = value;
  }

  getValue(): T | undefined {
    return this.value;
  }

  setValue(value: T): void {
    this.value = value;
  }

  isValueSet(): boolean {
    return this.value !== null && this.value !== undefined;
  }
}
