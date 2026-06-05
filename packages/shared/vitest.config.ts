import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Allow .js imports to resolve to .ts source files (TypeScript ESM pattern)
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
