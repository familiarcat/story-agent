import { MarkdownRenderer } from '../index';
import { test, expect } from '@playwright/test';

test.describe('MarkdownRenderer Visual Regression', () => {
  test('renders markdown in default theme', async ({ page }) => {
    const renderer = new MarkdownRenderer({ theme: {}, sanitize: true });
    const html = await renderer.render('# Hello, World!\n\nThis is **markdown**.');
    await page.setContent(html);
    await expect(page).toHaveScreenshot('default-theme.png');
  });

  test('renders markdown in dark theme', async ({ page }) => {
    const renderer = new MarkdownRenderer({
      theme: { '--text-color': '#ffffff', '--background-color': '#000000' },
      sanitize: true,
    });
    const html = await renderer.render('# Hello, World!\n\nThis is **markdown**.');
    await page.setContent(html);
    await expect(page).toHaveScreenshot('dark-theme.png');
  });
});