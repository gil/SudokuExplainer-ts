import { defineConfig } from 'vitest/config';

declare const process: { env: Record<string, string | undefined> };

const exclude = ['**/node_modules/**', '**/dist/**'];
if (!process.env.SLOW) exclude.push('test/differential/slow/**');

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude,
    testTimeout: 120_000,
  },
});
