import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './src/__tests__',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  outputDir: './test-results/artifacts',
  reporter: [
    ['html', { outputFolder: './test-results/html' }],
    ['json', { outputFile: './test-results/results.json' }],
    ['junit', { outputFile: './test-results/junit.xml' }],
    ['list'],
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  projects: isCI
    ? [
        {
          name: 'chromium',
          use: { ...devices.chromium },
        },
        {
          name: 'firefox',
          use: { ...devices.firefox },
        },
        {
          name: 'webkit',
          use: { ...devices.webkit },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices.chromium },
        },
      ],
});
