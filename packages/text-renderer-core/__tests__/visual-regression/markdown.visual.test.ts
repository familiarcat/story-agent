import { TextRenderer } from '../../src/index';
import { test, expect } from '@playwright/test';

test.describe('Markdown Visual Regression', () => {
  test('light theme', async ({ page }) => {
    const rendered = await TextRenderer.render('# Hello\n\n**bold** and *italic*', { theme: 'light' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('markdown-light.png');
  });

  test('dark theme', async ({ page }) => {
    const rendered = await TextRenderer.render('# Hello\n\n**bold** and *italic*', { theme: 'dark' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('markdown-dark.png');
  });
});