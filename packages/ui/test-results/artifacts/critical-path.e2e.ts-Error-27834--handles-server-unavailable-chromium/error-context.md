# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Error Handling >> gracefully handles server unavailable
- Location: src/__tests__/critical-path.e2e.ts:248:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="error-message"]').or(locator('text=/unavailable|error|failed/i')).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="error-message"]').or(locator('text=/unavailable|error|failed/i')).first()

```

```yaml
- navigation:
  - link "🖖 Story Agent":
    - /url: /
  - button "Plan ▾"
  - button "Build ▾"
  - button "Observe ▾"
  - button "▾ Clients"
  - 'button "Theme: LCARS ▾"'
  - link "v1.0.0":
    - /url: /docs
- complementary "Global navigation":
  - text: LCARS · STORY AGENT
  - button "Collapse sidebar" [expanded]: ◀
  - navigation:
    - link "DASHBOARD":
      - /url: /dashboard
    - link "SPRINT BOARD":
      - /url: /sprint
    - link "NEW STORY":
      - /url: /story/new
    - link "AGENT WORKSPACE":
      - /url: /agent
    - link "API DOCS":
      - /url: /docs
    - link "VISION":
      - /url: /vision
    - link "COST OBSERVATORY":
      - /url: /cost
    - link "LEARNINGS":
      - /url: /learnings
    - link "CREW MEMORIES":
      - /url: /crew/memories
    - link "OBSERVATIONS":
      - /url: /crew/observations
    - link "OBSERVATION LOUNGE":
      - /url: /observation-lounge
- main:
  - main:
    - navigation "Breadcrumb":
      - link "Dashboard":
        - /url: /dashboard
      - text: › Agent
    - heading "🛠️ Story Agent — Agent Workspace" [level=1]
    - text: OpenRouter · Quark-selected · session ~$0.0000
    - paragraph: A full coding loop on the crew — read/edit/run/search/git on the cheapest adequate OpenRouter model. Every tool call is governed by WorfGate (🟢 allow · 🟡 remediated · 🔴 blocked).
    - paragraph: Give the agent a coding task — e.g. “List the files in packages/shared/src and summarize delegation-router.ts”, or “Add a comment to the top of README.md”. Quark picks the model; you watch the tool loop run live.
    - textbox "Describe a coding task… (Enter to run, Shift+Enter for newline)"
    - button "Run" [disabled]
- alert
```

# Test source

```ts
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
> 261 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
      |                                ^ Error: expect(locator).toBeVisible() failed
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
  323 | 
  324 |     for (const element of adminElements) {
  325 |       const isVisible = await element.isVisible().catch(() => false);
  326 |       expect(isVisible).toBe(false);
  327 |     }
  328 |   });
  329 | });
  330 | 
  331 | test.describe('Security Assertions', () => {
  332 |   test('no credentials in page source', async ({ page }) => {
  333 |     for (const route of ROUTES) {
  334 |       await page.goto(route.path);
  335 |       await assertPageSourceSanitized(page);
  336 |     }
  337 |   });
  338 | 
  339 |   test('no credentials in console logs', async ({ page }) => {
  340 |     for (const route of ROUTES) {
  341 |       await page.goto(route.path);
  342 |       await assertNoCredentialLeaks(page);
  343 |     }
  344 |   });
  345 | 
  346 |   test('requests include WorfGate headers', async ({ page }) => {
  347 |     let foundAuthHeader = false;
  348 |     let foundWorfgateHeader = false;
  349 | 
  350 |     await page.route('**/api/**', (route) => {
  351 |       const headers = route.request().headers();
  352 |       if (headers['authorization']) {
  353 |         foundAuthHeader = true;
  354 |       }
  355 |       if (headers['x-worfgate-session']) {
  356 |         foundWorfgateHeader = true;
  357 |       }
  358 |       route.continue();
  359 |     });
  360 | 
  361 |     await page.goto('/agent');
```