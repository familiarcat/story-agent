# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Theme Switching >> theme toggle switches between LCARS, dark, and light
- Location: src/__tests__/critical-path.e2e.ts:140:7

# Error details

```
TypeError: route.response is not a function
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/dashboard", waiting until "load"

```

# Test source

```ts
  43  | 
  44  |       // Verify sidebar is visible
  45  |       const sidebar = page.locator('[data-testid="app-sidenav"]').first();
  46  |       await expect(sidebar).toBeVisible({ timeout: 5000 });
  47  | 
  48  |       // Verify no credentials leaked
  49  |       await assertPageSourceSanitized(page);
  50  |       await assertNoCredentialLeaks(page);
  51  | 
  52  |       // Verify page loaded in reasonable time
  53  |       await assertResponseTimeAcceptable(page, 5000);
  54  |     });
  55  | 
  56  |     test(`${route.path} should have accessible main content area`, async ({
  57  |       page,
  58  |     }) => {
  59  |       await page.goto(route.path);
  60  | 
  61  |       // Verify main content area exists
  62  |       const mainContent = page.locator('main').first();
  63  |       await expect(mainContent).toBeVisible({ timeout: 5000 });
  64  | 
  65  |       // Verify no skipped main landmarks
  66  |       const headings = await page.locator('h1, h2').count();
  67  |       expect(headings).toBeGreaterThan(0);
  68  |     });
  69  |   });
  70  | });
  71  | 
  72  | test.describe('Sidebar Persistence', () => {
  73  |   test('sidebar collapse state persists across navigation', async ({ page }) => {
  74  |     // Start at dashboard
  75  |     await page.goto('/dashboard');
  76  | 
  77  |     const sidebar = page.locator('[data-testid="app-sidenav"]').first();
  78  |     const collapseButton = page
  79  |       .locator('[data-testid="sidebar-toggle"]')
  80  |       .first();
  81  | 
  82  |     // Verify sidebar is initially expanded
  83  |     await expect(sidebar).toBeVisible();
  84  | 
  85  |     // Get initial width to confirm expanded state
  86  |     const expandedWidth = await sidebar.boundingBox();
  87  | 
  88  |     // Collapse sidebar
  89  |     await collapseButton.click();
  90  |     await page.waitForTimeout(300); // Wait for animation
  91  | 
  92  |     // Verify collapsed (narrower or hidden)
  93  |     const collapsedWidth = await sidebar.boundingBox();
  94  |     expect(collapsedWidth?.width || 0).toBeLessThanOrEqual(
  95  |       expandedWidth?.width || 500
  96  |     );
  97  | 
  98  |     // Navigate to different route
  99  |     await page.goto('/sprint');
  100 |     await page.waitForLoadState('networkidle');
  101 | 
  102 |     // Verify sidebar state persisted (still collapsed)
  103 |     const sidebarAfterNav = page.locator('[data-testid="app-sidenav"]').first();
  104 |     const widthAfterNav = await sidebarAfterNav.boundingBox();
  105 |     expect(widthAfterNav?.width || 0).toBeLessThanOrEqual(
  106 |       expandedWidth?.width || 500
  107 |     );
  108 | 
  109 |     // Reload page
  110 |     await page.reload();
  111 | 
  112 |     // Verify sidebar still collapsed after reload
  113 |     const sidebarAfterReload = page
  114 |       .locator('[data-testid="app-sidenav"]')
  115 |       .first();
  116 |     const widthAfterReload = await sidebarAfterReload.boundingBox();
  117 |     expect(widthAfterReload?.width || 0).toBeLessThanOrEqual(
  118 |       expandedWidth?.width || 500
  119 |     );
  120 |   });
  121 | 
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
> 143 |     await page.goto('/dashboard');
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
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
  222 |     await page.goto('/agent');
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
```