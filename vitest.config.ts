import { defineConfig } from 'vitest/config';

declare const process: { env: Record<string, string | undefined> };

const exclude = ['**/node_modules/**', '**/dist/**'];
if (!process.env.SLOW) exclude.push('test/differential/slow/**');

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude,
    // Diabolical corpus puzzles replay nested (level 3-4) dynamic forcing
    // chains, which take a few minutes each to reproduce faithfully.
    testTimeout: 300_000,
  },
});
