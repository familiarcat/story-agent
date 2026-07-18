# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Sidebar Persistence >> sidebar collapse state persists across navigation
- Location: src/__tests__/critical-path.e2e.ts:73:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "🖖 Story Agent" [ref=e3] [cursor=pointer]:
      - /url: /
    - generic [ref=e4]:
      - button "Plan ▾" [ref=e6] [cursor=pointer]
      - button "Build ▾" [ref=e8] [cursor=pointer]
      - button "Observe ▾" [ref=e10] [cursor=pointer]
    - generic [ref=e11]:
      - button "▾ Clients" [ref=e13] [cursor=pointer]
      - generic "UI theme" [ref=e14]:
        - 'button "Theme: LCARS ▾" [ref=e15] [cursor=pointer]'
      - link "v1.0.0" [ref=e16] [cursor=pointer]:
        - /url: /docs
  - generic [ref=e17]:
    - complementary "Global navigation" [ref=e18]:
      - button "Expand sidebar" [ref=e20] [cursor=pointer]: ▶
      - navigation [ref=e21]:
        - link "Dashboard" [ref=e22] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e23]: 📊
        - link "Sprint Board" [ref=e24] [cursor=pointer]:
          - /url: /sprint
          - generic [ref=e25]: 🗂️
        - link "New Story" [ref=e26] [cursor=pointer]:
          - /url: /story/new
          - generic [ref=e27]: ➕
        - link "Agent Workspace" [ref=e28] [cursor=pointer]:
          - /url: /agent
          - generic [ref=e29]: 🛠️
        - link "API Docs" [ref=e30] [cursor=pointer]:
          - /url: /docs
          - generic [ref=e31]: 📜
        - link "Vision" [ref=e32] [cursor=pointer]:
          - /url: /vision
          - generic [ref=e33]: 🖼️
        - link "Cost Observatory" [ref=e34] [cursor=pointer]:
          - /url: /cost
          - generic [ref=e35]: 💰
        - link "Learnings" [ref=e36] [cursor=pointer]:
          - /url: /learnings
          - generic [ref=e37]: 🧠
        - link "Crew Memories" [ref=e38] [cursor=pointer]:
          - /url: /crew/memories
          - generic [ref=e39]: 👥
        - link "Observations" [ref=e40] [cursor=pointer]:
          - /url: /crew/observations
          - generic [ref=e41]: 👁️
        - link "Observation Lounge" [ref=e42] [cursor=pointer]:
          - /url: /observation-lounge
          - generic [ref=e43]: 🖖
    - main [ref=e44]:
      - generic [ref=e46]:
        - navigation "Breadcrumb" [ref=e47]:
          - generic [ref=e48]:
            - link "Dashboard" [ref=e49] [cursor=pointer]:
              - /url: /dashboard
            - generic [ref=e50]: ›
          - generic [ref=e52]: Sprint
        - generic [ref=e53]:
          - generic [ref=e54]: Client Scope For Sprint Planning
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]: Selected Client
              - textbox "Selected Client" [ref=e58]:
                - /placeholder: e.g. client-int
            - generic [ref=e59]:
              - generic [ref=e60]: Role
              - combobox "Role" [ref=e61]:
                - option "client_admin"
                - option "client_delivery" [selected]
                - option "regulated_reader"
                - option "viewer"
            - button "Save Scope" [ref=e62] [cursor=pointer]
        - generic [ref=e63]:
          - generic [ref=e64]:
            - heading "Sprint Board" [level=1] [ref=e65]
            - paragraph [ref=e66]: View sprints, story point capacity, and agile ritual dates from Aha.
          - link "+ New Mission" [ref=e67] [cursor=pointer]:
            - /url: /observation-lounge
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e72]: Aha Project
            - combobox "Aha Project" [ref=e73]:
              - option "Bayer (BAYER)" [selected]
              - option "familiarcat (COMPANY)"
              - option "Fredwin Cycling Product (Demo) (DEMO)"
              - option "Fredwin Software (Demo) (DEMOCO)"
              - option "Jonah (JONAH)"
              - option "Story Agent (PROD)"
          - generic [ref=e74]:
            - generic [ref=e75]: Sprint / Release
            - combobox "Sprint / Release" [ref=e76]:
              - option "Parking lot" [selected]
        - generic [ref=e77]:
          - generic [ref=e78]: Aha Control Panel (Dashboard)
          - generic [ref=e79]: "Full control actions are Worf-gated: each mutation runs dry-run preview, then applies on confirmation."
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82]: Create Sprint in selected project
              - textbox "Sprint name" [ref=e83]
              - textbox "Start YYYY-MM-DD" [ref=e84]
              - textbox "End YYYY-MM-DD" [ref=e85]
              - button "Create Sprint" [disabled] [ref=e86] [cursor=pointer]
            - generic [ref=e87]:
              - generic [ref=e88]: Create Story in selected sprint
              - textbox "Story name" [ref=e89]
              - textbox "Description (optional)" [ref=e90]
              - button "Create Story" [disabled] [ref=e91] [cursor=pointer]
            - generic [ref=e92]:
              - generic [ref=e93]: Create Task under a story
              - textbox "Story ref (e.g. PROD-22)" [ref=e94]
              - textbox "Task name" [ref=e95]
              - button "Create Task" [disabled] [ref=e96] [cursor=pointer]
        - generic [ref=e98]:
          - generic [ref=e99]:
            - generic [ref=e100]:
              - generic [ref=e102]: Parking lot
              - link "Open in Aha ↗" [ref=e103] [cursor=pointer]:
                - /url: https://familiarcat.aha.io/releases/BAYER-R-1
            - generic [ref=e106]: 0/0 pts (0%)
            - generic "Einstein-Fibonacci gravity estimate for sprint velocity load" [ref=e107]:
              - generic [ref=e108]: Gravity Load
              - generic [ref=e109]: "0.0"
              - generic [ref=e110]: Drag
              - generic [ref=e111]: 0%
              - generic [ref=e112]: Adj Velocity
              - generic [ref=e113]: "0"
            - generic [ref=e114]:
              - generic [ref=e115]: 📋 0 stories
              - generic [ref=e116]: ✅ 0 pts done
              - generic [ref=e117]: 🔄 0 pts remaining
              - generic [ref=e118]: 📊 0 pts total capacity
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]:
                - generic [ref=e122]: Calendar Time Blocks
                - generic [ref=e123]: Drag stories into days to shape delivery cadence for Parking lot.
              - generic [ref=e124]: "Target load/day: 0.0"
            - generic [ref=e125]:
              - generic [ref=e126]:
                - text: Slot
                - combobox "Slot" [ref=e127]:
                  - option "30m"
                  - option "60m" [selected]
                  - option "120m"
              - generic [ref=e128]:
                - text: Day Capacity
                - combobox "Day Capacity" [ref=e129]:
                  - option "4h"
                  - option "6h" [selected]
                  - option "8h"
              - button "Export Plan" [ref=e130] [cursor=pointer]
              - button "Import Plan" [ref=e131] [cursor=pointer]
            - generic [ref=e134]: Unscheduled
          - generic [ref=e135]:
            - table [ref=e136]:
              - rowgroup [ref=e137]:
                - row "Reference Title Owner Points Status" [ref=e138]:
                  - columnheader "Reference" [ref=e139]
                  - columnheader "Title" [ref=e140]
                  - columnheader "Owner" [ref=e141]
                  - columnheader "Points" [ref=e142]
                  - columnheader "Status" [ref=e143]
                  - columnheader [ref=e144]
              - rowgroup
            - generic [ref=e145]: No stories in this sprint.
          - generic [ref=e146]:
            - generic [ref=e147]:
              - generic [ref=e148]: Aha Workflow Integration
              - generic [ref=e149]: Updated 6:06:25 PM
            - generic [ref=e150]: Crew ownership, task progression, and latest autonomous Aha comments for this sprint.
            - generic [ref=e151]: No workflow stories found for this sprint.
  - button "Open Next.js Dev Tools" [ref=e157] [cursor=pointer]:
    - img [ref=e158]
  - alert [ref=e161]
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
  39  |       await page.goto(route.path);
  40  | 
  41  |       // Verify page loaded with correct title
  42  |       await expect(page).toHaveTitle(/Story Agent/i);
  43  | 
  44  |       // Verify page has content (either main or body)
  45  |       const mainContent = page.locator('main, body').first();
  46  |       await expect(mainContent).toBeTruthy();
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
> 100 |     await page.waitForLoadState('networkidle');
      |                ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
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
  154 |           localStorage.getItem('sa-theme') ||
  155 |           'lcars';
  156 |       });
  157 | 
  158 |       // Click theme toggle to open menu
  159 |       await themeToggle.click();
  160 |       await page.waitForTimeout(300);
  161 | 
  162 |       // Get first non-current theme option and click it
  163 |       const themeOptions = page.locator('[role="option"]');
  164 |       const optionCount = await themeOptions.count();
  165 | 
  166 |       let newTheme = initialTheme;
  167 |       for (let i = 0; i < optionCount; i++) {
  168 |         const optionTheme = await themeOptions.nth(i).textContent();
  169 |         if (optionTheme && !optionTheme.toLowerCase().includes(initialTheme.toLowerCase())) {
  170 |           await themeOptions.nth(i).click();
  171 |           newTheme = optionTheme.toLowerCase();
  172 |           break;
  173 |         }
  174 |       }
  175 | 
  176 |       // Wait for state update
  177 |       await page.waitForTimeout(500);
  178 | 
  179 |       // Verify theme changed in DOM
  180 |       const currentTheme = await page.evaluate(() => {
  181 |         return document.documentElement.getAttribute('data-theme') ||
  182 |           localStorage.getItem('sa-theme') ||
  183 |           'lcars';
  184 |       });
  185 | 
  186 |       expect(currentTheme).not.toBe(initialTheme);
  187 | 
  188 |       // Flush storage and reload
  189 |       await page.evaluate(() => {
  190 |         return new Promise(resolve => setTimeout(resolve, 100));
  191 |       });
  192 |       await page.reload({ waitUntil: 'load' });
  193 | 
  194 |       // Verify theme persisted
  195 |       const persistedTheme = await page.evaluate(() => {
  196 |         return document.documentElement.getAttribute('data-theme') ||
  197 |           localStorage.getItem('sa-theme') ||
  198 |           'lcars';
  199 |       });
  200 | 
```