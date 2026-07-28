/**
 * Regenerates the reglib-derived differential fixtures.
 *
 *   pnpm exec tsx scripts/generate-reglib-fixtures.ts <path-to-reglib-1.3.txt>
 *
 * Separate from generate-fixtures.ts because it needs the reglib path and takes
 * far longer. Runs the harvest first, so this is the only command you need.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const reglib = process.argv[2];
if (reglib === undefined) {
  console.error('usage: tsx scripts/generate-reglib-fixtures.ts <path-to-reglib-1.3.txt>');
  process.exit(1);
}

const run = (cmd: string): void => {
  console.log('$', cmd);
  execSync(cmd, { stdio: 'inherit' });
};

run(`pnpm exec tsx scripts/harvest-reglib.ts ${JSON.stringify(reglib)}`);

// Latin-1, as in generate-fixtures.ts. UTF-8 fails on Symmetry.java's degree signs.
run('javac -encoding ISO-8859-1 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java');

// '' is the 81-char givens corpus, '-pm' the 729-char pencilmark states.
const KINDS = ['', '-pm'];

for (const kind of KINDS) {
  mkdirSync(`test/fixtures/reglib${kind}`, { recursive: true });
  run(
    'java -cp scripts/java-driver/out Driver rate' +
      ` test/fixtures/reglib${kind}-corpus.txt test/fixtures/reglib${kind}` +
      ` test/fixtures/reglib${kind}-timings.tsv`,
  );
}

// Anything Java took longer than this on goes to the slow tier, mirroring the
// SLOW_IDS split for the monsters. The timings artifact itself stays gitignored;
// only this derived id list is committed, so it churns just when a puzzle
// crosses the threshold.
const SLOW_MS = 5000;
for (const kind of KINDS) {
  const slow = readFileSync(`test/fixtures/reglib${kind}-timings.tsv`, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => l.split('\t'))
    .filter(([, ms]) => Number(ms) > SLOW_MS)
    .map(([id]) => id)
    .sort();
  writeFileSync(
    `test/fixtures/reglib${kind}-slow-ids.txt`,
    [
      `# Puzzles whose Java rating exceeded the ${SLOW_MS}ms slow threshold.`,
      '# Derived from the timings artifact by generate-reglib-fixtures.ts.',
      ...slow,
      '',
    ].join('\n'),
  );
  console.log(`reglib${kind}: ${slow.length} slow puzzles`);
}
