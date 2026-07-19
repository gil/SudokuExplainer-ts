import { describe, expect, it } from 'vitest';
import { format } from '../../src/templates/format.js';
import * as rules from '../../src/templates/rules.js';
import * as chaining from '../../src/templates/rulesChaining.js';
import * as unique from '../../src/templates/rulesUnique.js';
import * as checks from '../../src/templates/checks.js';

describe('format', () => {
  it('replaces placeholders sequentially', () => {
    expect(format('{0} sees {1} and {0}', 'A', 'B')).toBe('A sees B and A');
  });
  it('leaves unmatched placeholders alone', () => {
    expect(format('{0} and {5}', 'A')).toBe('A and {5}');
  });
});

describe('converted templates', () => {
  const all = { ...rules, ...chaining, ...unique, ...checks };
  it('exports a non-trivial set of templates', () => {
    expect(Object.keys(all).length).toBeGreaterThan(40);
  });
  it('contains no unconverted structural HTML', () => {
    for (const [name, tpl] of Object.entries(all)) {
      expect(tpl, name).not.toMatch(/<(html|body|h2|p|ul|li|b|i)>/i);
      expect(tpl, name).not.toMatch(/<\/(html|body|h2|p|ul|li|b|i)>/i);
    }
  });
  it('keeps placeholders verbatim', () => {
    expect(all.NakedSetHint).toContain('{0}');
  });
});
