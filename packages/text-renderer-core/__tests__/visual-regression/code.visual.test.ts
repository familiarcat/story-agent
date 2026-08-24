import { TextRenderer } from '../../src/index';
import { test, expect } from '@playwright/test';

test.describe('Code Visual Regression', () => {
  test('light theme', async ({ page }) => {
    const rendered = await TextRenderer.render('```javascript\nconst x = 42;\n```', { theme: 'light' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('code-light.png');
  });

  test('dark theme', async ({ page }) => {
    const rendered = await TextRenderer.render('```javascript\nconst x = 42;\n```', { theme: 'dark' });
    await page.setContent(rendered);
    await expect(page).toHaveScreenshot('code-dark.png');
  });
});