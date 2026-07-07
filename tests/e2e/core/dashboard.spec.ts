import { test, expect } from '@playwright/test';

// First web E2E increment — assert the dashboard loads and renders content.
// Resilient (no brittle selectors); next increments add /observation-lounge, /crew/memories, /agent, /innovation-lounge.
test('dashboard loads and renders', async ({ page }) => {
  const resp = await page.goto('/dashboard');
  expect(resp?.ok(), 'GET /dashboard should return a 2xx').toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toBeEmpty();
});
