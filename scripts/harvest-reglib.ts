/**
 * Derives differential corpora from HoDoKu's regression library.
 *
 *   pnpm exec tsx scripts/harvest-reglib.ts <path-to-reglib-1.3.txt>
 *
 * The reglib file itself is HoDoKu's (GPLv3) and is deliberately NOT vendored
 * here: pass its path in. Only the derived puzzle strings are committed.
 *
 * Two corpora come out, because a reglib entry carries two different things:
 *
 *  - reglib-corpus.txt: the <givens> field as a plain 81-char puzzle. Cheap
 *    diversity, but SE rates from scratch and solves around whatever technique
 *    HoDoKu was targeting.
 *  - reglib-pm-corpus.txt: <givens> plus <deleted candidates> rendered as a
 *    729-char pencilmark grid. This is the state HoDoKu built the case for, so
 *    the targeted technique is usually the simplest move available.
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Entry {
  tech: string;
  givens: string;
  deletions: string;
}

function parseReglib(text: string): Entry[] {
  const entries: Entry[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith(':')) continue;
    const parts = line.split(':');
    entries.push({
      tech: parts[1] ?? '',
      givens: (parts[3] ?? '').replace(/\+/g, ''),
      deletions: parts[4] ?? '',
    });
  }
  return entries;
}

/** `<value><line><col>` -> cell index 0-80 plus the value. */
function parseCandToken(token: string): { index: number; value: number } {
  const value = token.charCodeAt(0) - 48;
  const line = token.charCodeAt(1) - 48;
  const col = token.charCodeAt(2) - 48;
  return { index: (line - 1) * 9 + (col - 1), value };
}

const peers: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.trunc(i / 9);
  const c = i % 9;
  const br = Math.trunc(r / 3) * 3;
  const bc = Math.trunc(c / 3) * 3;
  const set = new Set<number>();
  for (let k = 0; k < 9; k++) {
    set.add(r * 9 + k);
    set.add(k * 9 + c);
    set.add((br + Math.trunc(k / 3)) * 9 + (bc + (k % 3)));
  }
  set.delete(i);
  return [...set];
});

/**
 * Renders givens + deletions as SE's 729-char pencilmark string. Position
 * `cell * 9 + (value - 1)` holds the digit when that candidate is live, else '.'.
 * A placed cell is emitted as its single candidate; Grid.adjustPencilmarks then
 * turns it back into a value, which is how a Sukaku grid carries its givens.
 */
function toPencilmarks(givens: string, deletions: string): string {
  const values = [...givens].map((ch) => (ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0));
  const cands: Set<number>[] = values.map((v) => (v !== 0 ? new Set([v]) : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])));

  for (let i = 0; i < 81; i++) {
    if (values[i] === 0) continue;
    for (const p of peers[i]) if (values[p] === 0) cands[p].delete(values[i]);
  }
  for (const token of deletions.split(' ')) {
    if (token.length !== 3) continue;
    const { index, value } = parseCandToken(token);
    cands[index].delete(value);
  }

  let out = '';
  for (let i = 0; i < 81; i++) {
    for (let v = 1; v <= 9; v++) out += cands[i].has(v) ? String(v) : '.';
  }
  return out;
}

const HEADER = [
  '# Derived from HoDoKu\'s regression library reglib-1.3.txt (GPLv3), by',
  '# https://sourceforge.net/projects/hodoku/ - only the puzzle strings are',
  '# reproduced here, not the library file itself.',
  '# Regenerate only via: pnpm exec tsx scripts/harvest-reglib.ts <reglib-1.3.txt>',
];

function main(): void {
  const path = process.argv[2];
  if (path === undefined) {
    console.error('usage: tsx scripts/harvest-reglib.ts <path-to-reglib-1.3.txt>');
    process.exit(1);
  }

  const entries = parseReglib(readFileSync(path, 'utf8'));
  const bad = entries.filter((e) => e.givens.length !== 81);
  if (bad.length > 0) throw new Error(`${bad.length} entries whose givens are not 81 chars`);

  const plain = new Map<string, string>(); // grid -> id
  const pm = new Map<string, { id: string; tech: string }>(); // 729-char -> meta
  const source: string[] = ['id\ttechnique\tclues'];

  for (const e of entries) {
    const clues = 81 - (e.givens.match(/\./g)?.length ?? 0);

    if (!plain.has(e.givens)) {
      const id = `rl-${String(plain.size + 1).padStart(4, '0')}`;
      plain.set(e.givens, id);
      source.push(`${id}\t${e.tech}\t${clues}`);
    }

    if (e.deletions.trim() === '') continue;
    const marks = toPencilmarks(e.givens, e.deletions);
    if (!pm.has(marks)) {
      const id = `rlpm-${String(pm.size + 1).padStart(4, '0')}`;
      pm.set(marks, { id, tech: e.tech });
      source.push(`${id}\t${e.tech}\t${clues}`);
    }
  }

  const plainLines = [...plain].map(([grid, id]) => `${id} ${grid}`);
  const pmLines = [...pm].map(([marks, { id }]) => `${id} ${marks}`);

  writeFileSync('test/fixtures/reglib-corpus.txt', [...HEADER, '', ...plainLines, ''].join('\n'));
  writeFileSync('test/fixtures/reglib-pm-corpus.txt', [...HEADER, '', ...pmLines, ''].join('\n'));
  writeFileSync('test/fixtures/reglib-source.tsv', [...source, ''].join('\n'));

  console.log(`entries: ${entries.length}`);
  console.log(`unique grids: ${plain.size} -> test/fixtures/reglib-corpus.txt`);
  console.log(`unique pencilmark states: ${pm.size} -> test/fixtures/reglib-pm-corpus.txt`);
}

main();
