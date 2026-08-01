import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index.js';

describe('scaffolding', () => {
  it('resolves the library entry', () => {
    expect(VERSION).toBe('0.2.0');
  });
  it('keeps VERSION in step with package.json', () => {
    expect(VERSION).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
  });
});
