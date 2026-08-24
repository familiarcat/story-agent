import { TextRenderer } from '../../src/index';
import { test, expect } from '@playwright/test';

test.describe('Plaintext Visual Regression', () => {
  test('light theme', async ({ page }) => {
    const rendered = await TextRenderer.render('Line 1\n  Line 2 (indented)\nLine 3', { theme: 'light' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('plaintext-light.png');
  });

  test('dark theme', async ({ page }) => {
    const rendered = await TextRenderer.render('Line 1\n  Line 2 (indented)\nLine 3', { theme: 'dark' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('plaintext-dark.png');
  });
});