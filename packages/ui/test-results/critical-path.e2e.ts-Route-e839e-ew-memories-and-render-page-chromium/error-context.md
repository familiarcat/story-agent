# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Route Navigation - Critical Paths >> should navigate to /crew/memories and render page
- Location: src/__tests__/critical-path.e2e.ts:36:9

# Error details

```
TypeError: route.response is not a function
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/crew/memories", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import {
  3   |   assertNoCredentialLeaks,
  4   |   setupCredentialScanningInterceptor,
  5   |   assertPageSourceSanitized,
  6   |   assertResponseTimeAcceptable,
  7   |   assertRoleBasedVisibility,
  8   | } from './security-helpers';
  9   | 
  10  | /**
  11  |  * Critical Path E2E Tests
  12  |  * Covers all core routes, sidebar persistence, theme switching, error states, and security
  13  |  */
  14  | 
  15  | const ROUTES = [
  16  |   { path: '/dashboard', title: 'Dashboard' },
  17  |   { path: '/sprint', title: 'Sprint' },
  18  |   { path: '/story/new', title: 'New Story' },
  19  |   { path: '/agent', title: 'Agent' },
  20  |   { path: '/docs', title: 'Documentation' },
  21  |   { path: '/vision', title: 'Vision' },
  22  |   { path: '/cost', title: 'Cost' },
  23  |   { path: '/learnings', title: 'Learnings' },
  24  |   { path: '/crew/memories', title: 'Crew Memories' },
  25  |   { path: '/crew/observations', title: 'Observations' },
  26  |   { path: '/observation-lounge', title: 'Observation Lounge' },
  27  | ];
  28  | 
  29  | test.beforeEach(async ({ page }) => {
  30  |   // Set up credential scanning interceptor
  31  |   await setupCredentialScanningInterceptor(page);
  32  | });
  33  | 
  34  | test.describe('Route Navigation - Critical Paths', () => {
  35  |   ROUTES.forEach((route) => {
  36  |     test(`should navigate to ${route.path} and render page`, async ({
  37  |       page,
  38  |     }) => {
> 39  |       await page.goto(route.path);
      |                  ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  40  | 
  41  |       // Verify page loaded
  42  |       await expect(page).toHaveTitle(/Story Agent/i);
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
```