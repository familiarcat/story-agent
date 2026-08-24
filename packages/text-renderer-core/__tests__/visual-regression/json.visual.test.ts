import { TextRenderer } from '../../src/index';
import { test, expect } from '@playwright/test';

test.describe('JSON Visual Regression', () => {
  test('light theme', async ({ page }) => {
    const rendered = await TextRenderer.render('{"name": "Alice", "age": 30}', { theme: 'light' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('json-light.png');
  });

  test('dark theme', async ({ page }) => {
    const rendered = await TextRenderer.render('{"name": "Alice", "age": 30}', { theme: 'dark' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('json-dark.png');
  });
});