// Port of the control-flow role of java.lang.InterruptedException.
export class InterruptedError extends Error {
  constructor() {
    super('interrupted');
    this.name = 'InterruptedError';
  }
}
