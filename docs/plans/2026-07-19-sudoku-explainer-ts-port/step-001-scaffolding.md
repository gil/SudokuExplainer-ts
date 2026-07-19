# Step 1: Project Scaffolding

> Read `step-000-overview.md` in this directory before starting. It has the
> goal, architecture, global constraints, and leftovers protocol that apply
> to every step. This file assumes you have read it.

**Depends on:** none

**Files:**

- Create: `package.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `LICENSE`, `src/index.ts`, `test/unit/smoke.test.ts`
- Modify: `.gitignore` (exists, untracked)

**Interfaces:**

- Consumes: nothing.
- Produces: the toolchain every later step uses (`pnpm test`, `pnpm typecheck`, `pnpm build`) and the `src/` + `test/` layout.

- [x] **Action 1: initialize pnpm project**

Run each command separately (avoid `&&`):

```bash
corepack enable
```

```bash
pnpm init
```

```bash
corepack use pnpm@latest-10
```

```bash
pnpm add -D typescript vitest tsdown tsx
```

- [x] **Action 2: write package.json**

Overwrite `package.json`, keeping the exact `packageManager` value and devDependency versions that the previous action wrote:

```json
{
  "name": "sudoku-explainer",
  "version": "0.1.0",
  "description": "TypeScript port of the SukakuExplainer Sudoku rating and hint engine (vanilla Sudoku)",
  "type": "module",
  "license": "LGPL-2.1-or-later",
  "packageManager": "<keep value written by corepack use>",
  "engines": { "node": ">=20" },
  "files": ["dist", "LICENSE", "README.md"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": { "<keep versions from pnpm add>": "" }
}
```

- [x] **Action 3: write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": [],
    "outDir": "dist"
  },
  "include": ["src", "test", "scripts/*.ts", "*.config.ts"]
}
```

Do not enable `noUncheckedIndexedAccess`. The port translates Java array indexing mechanically and that flag would force non-mechanical rewrites.

- [x] **Action 4: write tsdown.config.ts and vitest.config.ts**

`tsdown.config.ts`:

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

`vitest.config.ts` (the `SLOW` gate is used from step-016 on):

```ts
import { defineConfig } from 'vitest/config';

const exclude = ['**/node_modules/**', '**/dist/**'];
if (!process.env.SLOW) exclude.push('test/differential/slow/**');

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude,
    testTimeout: 120_000,
  },
});
```

- [x] **Action 5: LICENSE, .gitignore, src/index.ts**

```bash
curl -s -o LICENSE https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt
```

Ensure `.gitignore` contains at least:

```
node_modules/
dist/
scripts/java-driver/out/
```

Create `src/index.ts` with a placeholder export so builds work before step-018:

```ts
export const VERSION = '0.1.0';
```

- [x] **Action 6: smoke test**

`test/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VERSION } from '../../src/index.js';

describe('scaffolding', () => {
  it('resolves the library entry', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
```

- [x] **Action 7: verify toolchain**

Run each and confirm success:

```bash
pnpm test
```

Expected: 1 test file, 1 passed.

```bash
pnpm typecheck
```

Expected: exits 0 silently.

```bash
pnpm build
```

Expected: `dist/index.js` and `dist/index.d.ts` produced.

- [x] **Action 8: commit**

```bash
git add .gitignore package.json pnpm-lock.yaml tsconfig.json tsdown.config.ts vitest.config.ts LICENSE src test docs
```

```bash
git commit -m "chore: scaffold sudoku-explainer library (pnpm, tsdown, vitest)"
```

Note: this first commit also brings `docs/specs/` and `docs/plans/` into the repo. `SukakuExplainer/` stays as it is (already tracked or intentionally untracked, do not touch it).

## Step completion

- [x] Check this step off in the Steps list of `step-000-overview.md`
- [ ] Only if something could not be finished: record it in `step-999-leftovers.md` per the overview's Leftovers Protocol
