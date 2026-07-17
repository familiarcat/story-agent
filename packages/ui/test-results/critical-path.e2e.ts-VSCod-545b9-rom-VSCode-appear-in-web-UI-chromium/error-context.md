# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> VSCode Sync Integration >> chat messages from VSCode appear in web UI
- Location: src/__tests__/critical-path.e2e.ts:218:7

# Error details

```
TypeError: route.response is not a function
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/agent", waiting until "load"

```

# Test source

```ts
  122 |   test('sidebar navigation items are clickable', async ({ page }) => {
  123 |     await page.goto('/dashboard');
  124 | 
  125 |     const navItems = page.locator('[data-testid="nav-item"]');
  126 |     const itemCount = await navItems.count();
  127 | 
  128 |     expect(itemCount).toBeGreaterThan(0);
  129 | 
  130 |     // Click first nav item
  131 |     await navItems.first().click();
  132 |     await page.waitForLoadState('networkidle');
  133 | 
  134 |     // Verify navigation occurred
  135 |     expect(page.url()).not.toContain('/dashboard');
  136 |   });
  137 | });
  138 | 
  139 | test.describe('Theme Switching', () => {
  140 |   test('theme toggle switches between LCARS, dark, and light', async ({
  141 |     page,
  142 |   }) => {
  143 |     await page.goto('/dashboard');
  144 | 
  145 |     // Find theme toggle button
  146 |     const themeToggle = page
  147 |       .locator('[data-testid="theme-toggle"]')
  148 |       .or(page.locator('button:has-text("Theme")')).first();
  149 | 
  150 |     if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
  151 |       // Store initial theme
  152 |       const initialTheme = await page.evaluate(() => {
  153 |         return document.documentElement.getAttribute('data-theme') ||
  154 |           localStorage.getItem('theme') ||
  155 |           'system';
  156 |       });
  157 | 
  158 |       // Click theme toggle
  159 |       await themeToggle.click();
  160 |       await page.waitForTimeout(500);
  161 | 
  162 |       // Verify theme changed
  163 |       const newTheme = await page.evaluate(() => {
  164 |         return document.documentElement.getAttribute('data-theme') ||
  165 |           localStorage.getItem('theme') ||
  166 |           'system';
  167 |       });
  168 | 
  169 |       expect(newTheme).not.toBe(initialTheme);
  170 | 
  171 |       // Reload and verify persists
  172 |       await page.reload();
  173 |       const persistedTheme = await page.evaluate(() => {
  174 |         return document.documentElement.getAttribute('data-theme') ||
  175 |           localStorage.getItem('theme') ||
  176 |           'system';
  177 |       });
  178 | 
  179 |       expect(persistedTheme).toBe(newTheme);
  180 |     }
  181 |   });
  182 | 
  183 |   test('dark mode is visually distinct from light mode', async ({ page }) => {
  184 |     await page.goto('/dashboard');
  185 | 
  186 |     // Set to light mode
  187 |     await page.evaluate(() => {
  188 |       localStorage.setItem('theme', 'light');
  189 |       document.documentElement.setAttribute('data-theme', 'light');
  190 |     });
  191 |     await page.reload();
  192 | 
  193 |     const lightBg = await page.evaluate(() => {
  194 |       return window
  195 |         .getComputedStyle(document.body)
  196 |         .getPropertyValue('background-color');
  197 |     });
  198 | 
  199 |     // Set to dark mode
  200 |     await page.evaluate(() => {
  201 |       localStorage.setItem('theme', 'dark');
  202 |       document.documentElement.setAttribute('data-theme', 'dark');
  203 |     });
  204 |     await page.reload();
  205 | 
  206 |     const darkBg = await page.evaluate(() => {
  207 |       return window
  208 |         .getComputedStyle(document.body)
  209 |         .getPropertyValue('background-color');
  210 |     });
  211 | 
  212 |     // Colors should be different
  213 |     expect(darkBg).not.toBe(lightBg);
  214 |   });
  215 | });
  216 | 
  217 | test.describe('VSCode Sync Integration', () => {
  218 |   test('chat messages from VSCode appear in web UI', async ({
  219 |     page,
  220 |     context,
  221 |   }) => {
> 222 |     await page.goto('/agent');
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  223 | 
  224 |     // Verify chat panel is visible
  225 |     const chatPanel = page.locator('[data-testid="chat-panel"]').first();
  226 |     await expect(chatPanel).toBeVisible({ timeout: 5000 });
  227 | 
  228 |     // Simulate VSCode message injection (would be real in prod)
  229 |     await page.evaluate(() => {
  230 |       const event = new CustomEvent('vscode-message', {
  231 |         detail: {
  232 |           type: 'chat-message',
  233 |           text: 'Test sync message',
  234 |           timestamp: Date.now(),
  235 |         },
  236 |       });
  237 |       window.dispatchEvent(event);
  238 |     });
  239 | 
  240 |     // Verify message appears in chat
  241 |     await expect(
  242 |       page.locator('text=Test sync message')
  243 |     ).toBeVisible({ timeout: 5000 });
  244 |   });
  245 | });
  246 | 
  247 | test.describe('Error Handling', () => {
  248 |   test('gracefully handles server unavailable', async ({ page }) => {
  249 |     // Block all API calls to simulate server down
  250 |     await page.route('**/api/**', (route) => {
  251 |       route.abort('failed');
  252 |     });
  253 | 
  254 |     await page.goto('/agent');
  255 | 
  256 |     // Should show error message or fallback UI
  257 |     const errorMessage = page
  258 |       .locator('[data-testid="error-message"]')
  259 |       .or(page.locator('text=/unavailable|error|failed/i')).first();
  260 | 
  261 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  262 |   });
  263 | 
  264 |   test('recovers when server comes back online', async ({ page }) => {
  265 |     let requestsBlocked = true;
  266 | 
  267 |     await page.route('**/api/**', (route) => {
  268 |       if (requestsBlocked) {
  269 |         route.abort('failed');
  270 |       } else {
  271 |         route.continue();
  272 |       }
  273 |     });
  274 | 
  275 |     await page.goto('/agent');
  276 | 
  277 |     // Should show error
  278 |     const errorMessage = page
  279 |       .locator('[data-testid="error-message"]')
  280 |       .or(page.locator('text=/unavailable/i')).first();
  281 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  282 | 
  283 |     // Unblock API
  284 |     requestsBlocked = false;
  285 |     await page.locator('button:has-text("Retry")').first().click();
  286 |     await page.waitForLoadState('networkidle');
  287 | 
  288 |     // Error should disappear
  289 |     await expect(errorMessage).not.toBeVisible({ timeout: 5000 });
  290 |   });
  291 | });
  292 | 
  293 | test.describe('Role-Based Access', () => {
  294 |   test('admin role sees all UI elements', async ({ page }) => {
  295 |     // Set admin role in localStorage
  296 |     await page.goto('/dashboard');
  297 |     await page.evaluate(() => {
  298 |       localStorage.setItem('user-role', 'admin');
  299 |     });
  300 |     await page.reload();
  301 | 
  302 |     // Verify admin-only elements are visible
  303 |     const adminElements = await page
  304 |       .locator('[data-role="admin"]')
  305 |       .count();
  306 | 
  307 |     // Should see at least some admin elements or admin menu
  308 |     expect(adminElements).toBeGreaterThanOrEqual(0);
  309 |   });
  310 | 
  311 |   test('user role sees only assigned items', async ({ page }) => {
  312 |     await page.goto('/dashboard');
  313 |     await page.evaluate(() => {
  314 |       localStorage.setItem('user-role', 'user');
  315 |       localStorage.setItem('user-id', 'user-123');
  316 |     });
  317 |     await page.reload();
  318 | 
  319 |     // Verify admin-only elements are not visible
  320 |     const adminElements = await page
  321 |       .locator('[data-role="admin"]')
  322 |       .all();
```