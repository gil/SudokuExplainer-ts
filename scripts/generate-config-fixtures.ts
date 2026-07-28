/**
 * Regenerates the Settings flag-matrix fixtures.
 *
 *   pnpm exec tsx scripts/generate-config-fixtures.ts [--slow]
 *
 * Each config varies exactly one factor from the Java defaults, so a divergence
 * from `baseline` pins that flag's effect. `--slow` also regenerates the monster
 * fixtures, which take several minutes each.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const run = (cmd: string): void => {
  console.log('$', cmd);
  execSync(cmd, { stdio: 'inherit' });
};

// id -> `--set` spec. An empty spec means the Java defaults.
const CONFIGS: Record<string, string> = {
  baseline: '',
  rr1: 'revisedRating=1',
  bbse121: 'isBringBackSE121=true',
  fcplus1: 'FCPlus=1',
  fcplus2: 'FCPlus=2',
  nobugfix: 'islkSudokuBUG=false',
  nourulfix: 'islkSudokuURUL=false',
  batch1: 'batchSolving=1',
  batch2: 'batchSolving=2',
};

// FCPlus only shows up at level >= 2 chaining nesting, which only the monsters reach.
const SLOW_CONFIGS = ['baseline', 'fcplus1', 'fcplus2'];

// Latin-1, as in generate-fixtures.ts. UTF-8 fails on Symmetry.java's degree signs.
run('javac -encoding ISO-8859-1 -sourcepath SukakuExplainer -d scripts/java-driver/out scripts/java-driver/Driver.java');

const rate = (corpus: string, dir: string, spec: string): void => {
  mkdirSync(dir, { recursive: true });
  const set = spec === '' ? '' : ` --set ${spec}`;
  run(`java -cp scripts/java-driver/out Driver rate ${corpus} ${dir}${set}`);
};

for (const [id, spec] of Object.entries(CONFIGS)) {
  rate('test/fixtures/config-corpus.txt', `test/fixtures/config/${id}`, spec);
}

if (process.argv.includes('--slow')) {
  for (const id of SLOW_CONFIGS) {
    rate('test/fixtures/config-slow-corpus.txt', `test/fixtures/config-slow/${id}`, CONFIGS[id]);
  }
}
