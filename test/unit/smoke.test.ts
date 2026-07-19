import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index.js';

describe('scaffolding', () => {
  it('resolves the library entry', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
