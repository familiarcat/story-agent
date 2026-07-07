import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  retries: 2,
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000' }
});