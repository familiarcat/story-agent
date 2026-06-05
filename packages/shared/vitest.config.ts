import { defineConfig } from 'vitest/config';

const RUN_MODE = process.env.RUN_MODE || 'all';

// Determine which test files to include
const getIncludePattern = (): string[] => {
  switch (RUN_MODE) {
    case 'unit':
      return ['src/**/*.test.ts'];
    case 'integration':
      return ['src/**/*.integration.test.ts'];
    default: // 'all'
      return ['src/**/*.test.ts', 'src/**/*.integration.test.ts'];
  }
};

export default defineConfig({
  resolve: {
    // Allow .js imports to resolve to .ts source files (TypeScript ESM pattern)
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: getIncludePattern(),
  },
});
