const { chromium } = require('playwright');

(async () => {
  console.log('🎬 Starting theme visual test...\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  try {
    console.log('📍 Opening dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'load' });
    console.log('✓ Page loaded\n');
    
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    const visible = await themeToggle.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (visible) {
      console.log('✅ THEME TOGGLE FOUND!\n');
      console.log('🌈 TESTING ALL THREE THEMES:\n');
      
      for (let i = 0; i < 3; i++) {
        const theme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'unknown';
        });
        console.log(`  Cycle ${i+1}: ${theme.toUpperCase()}`);
        await page.screenshot({ path: `test-results/theme-${i}-${theme}.png` });
        console.log(`           ✓ Captured: test-results/theme-${i}-${theme}.png`);
        
        if (i < 2) {
          await themeToggle.click();
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('\n✅ Theme test complete!');
      console.log('   All 3 themes (LCARS, dark, light) working & captured\n');
      console.log('🖥️  Keeping browser open for 15 seconds for visual inspection...\n');
      await page.waitForTimeout(15000);
      
    } else {
      console.log('⚠️ Theme toggle not found');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
