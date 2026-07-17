# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Theme Switching >> theme toggle switches between LCARS, dark, and light
- Location: src/__tests__/critical-path.e2e.ts:140:7

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "lcars"
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
        - 'button "Theme: LCARS ▾" [expanded] [active] [ref=e15] [cursor=pointer]'
        - listbox "Theme selection" [ref=e16]:
          - generic [ref=e17]: "Control Layer: core → client → project → aspect"
          - option "LCARS" [selected] [ref=e18] [cursor=pointer]
          - option "Dark" [ref=e19] [cursor=pointer]
          - option "Light" [ref=e20] [cursor=pointer]
          - generic [ref=e21]:
            - generic [ref=e22]:
              - text: Client Theme
              - combobox "Client Theme" [ref=e23]:
                - option "none" [selected]
                - option "regulated"
                - option "executive"
                - option "consumer"
            - generic [ref=e24]:
              - text: Project Theme
              - combobox "Project Theme" [ref=e25]:
                - option "none" [selected]
                - option "operations"
                - option "research"
                - option "delivery"
            - generic [ref=e26]:
              - text: Aspect Variant
              - combobox "Aspect Variant" [ref=e27]:
                - option "none" [selected]
                - option "telemetry"
                - option "planning"
                - option "analysis"
      - link "v1.0.0" [ref=e28] [cursor=pointer]:
        - /url: /docs
  - generic [ref=e29]:
    - complementary "Global navigation" [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]: LCARS · STORY AGENT
        - button "Collapse sidebar" [expanded] [ref=e33] [cursor=pointer]: ◀
      - navigation [ref=e34]:
        - link "DASHBOARD" [ref=e35] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e36]: 📊
          - generic [ref=e37]: DASHBOARD
        - link "SPRINT BOARD" [ref=e38] [cursor=pointer]:
          - /url: /sprint
          - generic [ref=e39]: 🗂️
          - generic [ref=e40]: SPRINT BOARD
        - link "NEW STORY" [ref=e41] [cursor=pointer]:
          - /url: /story/new
          - generic [ref=e42]: ➕
          - generic [ref=e43]: NEW STORY
        - link "AGENT WORKSPACE" [ref=e44] [cursor=pointer]:
          - /url: /agent
          - generic [ref=e45]: 🛠️
          - generic [ref=e46]: AGENT WORKSPACE
        - link "API DOCS" [ref=e47] [cursor=pointer]:
          - /url: /docs
          - generic [ref=e48]: 📜
          - generic [ref=e49]: API DOCS
        - link "VISION" [ref=e50] [cursor=pointer]:
          - /url: /vision
          - generic [ref=e51]: 🖼️
          - generic [ref=e52]: VISION
        - link "COST OBSERVATORY" [ref=e53] [cursor=pointer]:
          - /url: /cost
          - generic [ref=e54]: 💰
          - generic [ref=e55]: COST OBSERVATORY
        - link "LEARNINGS" [ref=e56] [cursor=pointer]:
          - /url: /learnings
          - generic [ref=e57]: 🧠
          - generic [ref=e58]: LEARNINGS
        - link "CREW MEMORIES" [ref=e59] [cursor=pointer]:
          - /url: /crew/memories
          - generic [ref=e60]: 👥
          - generic [ref=e61]: CREW MEMORIES
        - link "OBSERVATIONS" [ref=e62] [cursor=pointer]:
          - /url: /crew/observations
          - generic [ref=e63]: 👁️
          - generic [ref=e64]: OBSERVATIONS
        - link "OBSERVATION LOUNGE" [ref=e65] [cursor=pointer]:
          - /url: /observation-lounge
          - generic [ref=e66]: 🖖
          - generic [ref=e67]: OBSERVATION LOUNGE
    - main [ref=e68]:
      - generic [ref=e70]:
        - navigation "Breadcrumb" [ref=e71]:
          - generic [ref=e72]:
            - link "Home" [ref=e73] [cursor=pointer]:
              - /url: /
            - generic [ref=e74]: ›
          - generic [ref=e76]: Dashboard
        - generic [ref=e77]:
          - generic [ref=e78]:
            - heading "Delivery Command" [level=1] [ref=e79]
            - paragraph [ref=e80]: Client → Project → Sprint → Story visibility with security-aware delivery context.
          - link "+ New Story" [ref=e81] [cursor=pointer]:
            - /url: /story/new
        - generic [ref=e82]:
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "View Mode" [level=2] [ref=e85]
              - generic [ref=e86]: Switch between execution and stakeholder evaluation workflows.
            - generic [ref=e87]:
              - link "Delivery Mode" [ref=e88] [cursor=pointer]:
                - /url: /dashboard
              - link "Stakeholder Mode" [ref=e89] [cursor=pointer]:
                - /url: /dashboard?view=stakeholder
          - generic [ref=e90]:
            - generic [ref=e91]:
              - text: Client
              - combobox "Client" [ref=e92]:
                - option "All clients" [selected]
                - option "client int"
                - option "familiarcat"
            - generic [ref=e93]:
              - text: Sprint
              - combobox "Sprint" [ref=e94]:
                - option "All sprints" [selected]
                - option "Unscheduled"
            - generic [ref=e95]:
              - text: Delivery Status
              - combobox "Delivery Status" [ref=e96]:
                - option "All statuses" [selected]
                - option "pending"
                - option "implementing"
                - option "pr_open"
                - option "pr_revision"
                - option "pr_approved"
                - option "merged"
                - option "blocked"
            - generic [ref=e97]:
              - text: Acceptance
              - combobox "Acceptance" [ref=e98]:
                - option "All" [selected]
                - option "Strong"
                - option "Partial"
                - option "Missing"
            - generic [ref=e99]:
              - button "Apply" [ref=e100] [cursor=pointer]
              - link "Reset" [ref=e101] [cursor=pointer]:
                - /url: /dashboard
        - generic [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]:
              - heading "System Live Status" [level=2] [ref=e105]
              - generic [ref=e106]: Real-time crew execution + chat activity synced with dashboard refresh.
            - generic [ref=e107]: IDLE
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]: "0"
              - generic [ref=e111]: active crew tasks
            - generic [ref=e112]:
              - generic [ref=e113]: "18"
              - generic [ref=e114]: runs today
            - generic [ref=e115]:
              - generic [ref=e116]: 1%
              - generic [ref=e117]: success rate
            - generic [ref=e118]:
              - generic [ref=e119]: $0.0000
              - generic [ref=e120]: cost today
          - generic [ref=e121]:
            - generic [ref=e122]: "Aha sync pulse: never"
            - generic [ref=e123]: "Chat pulse: never · idle · model n/a · turns 0"
            - generic [ref=e124]: "UI doctrine: okuda-inspired-story-agent-v1"
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]: client int
                - generic [ref=e131]:
                  - generic [ref=e132]: product profile ui
                  - generic [ref=e133]: Unscheduled
              - generic [ref=e134]: standard
            - generic [ref=e135]:
              - generic [ref=e136]:
                - strong [ref=e137]: "3"
                - text: stories
              - generic [ref=e138]:
                - strong [ref=e139]: "0"
                - text: active
              - generic [ref=e140]:
                - strong [ref=e141]: "0"
                - text: blocked
            - generic [ref=e142]:
              - text: "Sprint completion:"
              - strong [ref=e143]: 0%
            - generic [ref=e144]:
              - generic [ref=e145]:
                - generic [ref=e146]: LLM Route
                - generic [ref=e147]: default provider routing
              - generic [ref=e148]:
                - generic [ref=e149]: Data Plane
                - generic [ref=e150]: standard persistence path
              - generic [ref=e151]:
                - generic [ref=e152]: Security Notes
                - generic [ref=e153]: Client-specific controls not yet configured.
            - link "Stakeholder Review" [ref=e155] [cursor=pointer]:
              - /url: /observation-lounge
          - generic [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e158]:
                - generic [ref=e159]: familiarcat
                - generic [ref=e161]:
                  - generic [ref=e162]: story agent
                  - generic [ref=e163]: Unscheduled
              - generic [ref=e164]: standard
            - generic [ref=e165]:
              - generic [ref=e166]:
                - strong [ref=e167]: "1"
                - text: stories
              - generic [ref=e168]:
                - strong [ref=e169]: "0"
                - text: active
              - generic [ref=e170]:
                - strong [ref=e171]: "0"
                - text: blocked
            - generic [ref=e172]:
              - text: "Sprint completion:"
              - strong [ref=e173]: 0%
            - generic [ref=e174]:
              - generic [ref=e175]:
                - generic [ref=e176]: LLM Route
                - generic [ref=e177]: default provider routing
              - generic [ref=e178]:
                - generic [ref=e179]: Data Plane
                - generic [ref=e180]: standard persistence path
              - generic [ref=e181]:
                - generic [ref=e182]: Security Notes
                - generic [ref=e183]: Client-specific controls not yet configured.
            - link "Stakeholder Review" [ref=e185] [cursor=pointer]:
              - /url: /observation-lounge
        - generic [ref=e187]:
          - generic [ref=e188]:
            - heading "Project Status" [level=2] [ref=e189]
            - generic [ref=e190]: LIVE
          - list [ref=e192]:
            - listitem [ref=e193]:
              - generic [ref=e194]:
                - generic [ref=e195]: client int · product profile ui
                - generic [ref=e196]: MERGED · 0% complete
              - generic [ref=e197]:
                - generic "progress 0%" [ref=e198]
                - generic [ref=e199]: MERGED
            - listitem [ref=e200]:
              - generic [ref=e201]:
                - generic [ref=e202]: familiarcat · story agent
                - generic [ref=e203]: MERGED · 0% complete
              - generic [ref=e204]:
                - generic "progress 0%" [ref=e205]
                - generic [ref=e206]: MERGED
        - generic [ref=e207]:
          - generic [ref=e208]:
            - generic [ref=e209]: "4"
            - generic [ref=e210]: pending
          - generic [ref=e211]:
            - generic [ref=e212]: "0"
            - generic [ref=e213]: implementing
          - generic [ref=e214]:
            - generic [ref=e215]: "0"
            - generic [ref=e216]: pr open
          - generic [ref=e217]:
            - generic [ref=e218]: "0"
            - generic [ref=e219]: pr revision
          - generic [ref=e220]:
            - generic [ref=e221]: "0"
            - generic [ref=e222]: pr approved
          - generic [ref=e223]:
            - generic [ref=e224]: "0"
            - generic [ref=e225]: merged
          - generic [ref=e226]:
            - generic [ref=e227]: "0"
            - generic [ref=e228]: blocked
        - generic [ref=e229]:
          - heading "Stakeholder Story Evaluation" [level=2] [ref=e230]
          - paragraph [ref=e231]: Use this view during sprint reviews to assess Agile story readiness from delivery status, acceptance criteria, and Aha traceability.
          - table [ref=e233]:
            - rowgroup [ref=e234]:
              - row "Story Sprint Delivery Acceptance Aha Details" [ref=e235]:
                - columnheader "Story" [ref=e236]
                - columnheader "Sprint" [ref=e237]
                - columnheader "Delivery" [ref=e238]
                - columnheader "Acceptance" [ref=e239]
                - columnheader "Aha" [ref=e240]
                - columnheader "Details" [ref=e241]
            - rowgroup [ref=e242]:
              - row "JONAH-9 Unscheduled pending missing Open Inspect" [ref=e243]:
                - cell "JONAH-9" [ref=e244]
                - cell "Unscheduled" [ref=e245]
                - cell "pending" [ref=e246]:
                  - generic [ref=e247]: pending
                - cell "missing" [ref=e248]
                - cell "Open" [ref=e249]:
                  - link "Open" [ref=e250] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/JONAH-9
                - cell "Inspect" [ref=e251]:
                  - link "Inspect" [ref=e252] [cursor=pointer]:
                    - /url: /story/JONAH-9?clientId=client-int
              - row "PROD-10 Unscheduled pending missing Open Inspect" [ref=e253]:
                - cell "PROD-10" [ref=e254]
                - cell "Unscheduled" [ref=e255]
                - cell "pending" [ref=e256]:
                  - generic [ref=e257]: pending
                - cell "missing" [ref=e258]
                - cell "Open" [ref=e259]:
                  - link "Open" [ref=e260] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/PROD-10
                - cell "Inspect" [ref=e261]:
                  - link "Inspect" [ref=e262] [cursor=pointer]:
                    - /url: /story/PROD-10?clientId=client-int
              - row "JONAH-8 Unscheduled pending missing Open Inspect" [ref=e263]:
                - cell "JONAH-8" [ref=e264]
                - cell "Unscheduled" [ref=e265]
                - cell "pending" [ref=e266]:
                  - generic [ref=e267]: pending
                - cell "missing" [ref=e268]
                - cell "Open" [ref=e269]:
                  - link "Open" [ref=e270] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/JONAH-8
                - cell "Inspect" [ref=e271]:
                  - link "Inspect" [ref=e272] [cursor=pointer]:
                    - /url: /story/JONAH-8?clientId=client-int
              - row "PROD-11 Unscheduled pending missing Open Inspect" [ref=e273]:
                - cell "PROD-11" [ref=e274]
                - cell "Unscheduled" [ref=e275]
                - cell "pending" [ref=e276]:
                  - generic [ref=e277]: pending
                - cell "missing" [ref=e278]
                - cell "Open" [ref=e279]:
                  - link "Open" [ref=e280] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/PROD-11
                - cell "Inspect" [ref=e281]:
                  - link "Inspect" [ref=e282] [cursor=pointer]:
                    - /url: /story/PROD-11?clientId=familiarcat
        - table [ref=e284]:
          - rowgroup [ref=e285]:
            - row "Client Project Sprint Story ID Title Repository Branch Status Phase PR Updated" [ref=e286]:
              - columnheader "Client" [ref=e287]
              - columnheader "Project" [ref=e288]
              - columnheader "Sprint" [ref=e289]
              - columnheader "Story ID" [ref=e290]
              - columnheader "Title" [ref=e291]
              - columnheader "Repository" [ref=e292]
              - columnheader "Branch" [ref=e293]
              - columnheader "Status" [ref=e294]
              - columnheader "Phase" [ref=e295]
              - columnheader "PR" [ref=e296]
              - columnheader "Updated" [ref=e297]
              - columnheader [ref=e298]
          - rowgroup [ref=e299]:
            - row "client int product profile ui Unscheduled JONAH-9 Interior gut demolition — all 4 floors client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e300]:
              - cell "client int" [ref=e301]
              - cell "product profile ui" [ref=e302]
              - cell "Unscheduled" [ref=e303]
              - cell "JONAH-9" [ref=e304]:
                - link "JONAH-9" [ref=e305] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/JONAH-9
              - cell "Interior gut demolition — all 4 floors" [ref=e306]
              - cell "client-int/product-profile-ui" [ref=e307]
              - cell "UNASSIGNED" [ref=e308]
              - cell "pending" [ref=e309]:
                - generic [ref=e310]: pending
              - cell "Phase 1" [ref=e311]:
                - generic [ref=e312]: Phase 1
              - cell "—" [ref=e313]
              - cell "7/9/2026" [ref=e314]
              - cell "View →" [ref=e315]:
                - link "View →" [ref=e316] [cursor=pointer]:
                  - /url: /story/JONAH-9?clientId=client-int
            - row "client int product profile ui Unscheduled PROD-10 MCP Integration client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e317]:
              - cell "client int" [ref=e318]
              - cell "product profile ui" [ref=e319]
              - cell "Unscheduled" [ref=e320]
              - cell "PROD-10" [ref=e321]:
                - link "PROD-10" [ref=e322] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/PROD-10
              - cell "MCP Integration" [ref=e323]
              - cell "client-int/product-profile-ui" [ref=e324]
              - cell "UNASSIGNED" [ref=e325]
              - cell "pending" [ref=e326]:
                - generic [ref=e327]: pending
              - cell "Phase 1" [ref=e328]:
                - generic [ref=e329]: Phase 1
              - cell "—" [ref=e330]
              - cell "7/9/2026" [ref=e331]
              - cell "View →" [ref=e332]:
                - link "View →" [ref=e333] [cursor=pointer]:
                  - /url: /story/PROD-10?clientId=client-int
            - row "client int product profile ui Unscheduled JONAH-8 Property acquisition & closing client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e334]:
              - cell "client int" [ref=e335]
              - cell "product profile ui" [ref=e336]
              - cell "Unscheduled" [ref=e337]
              - cell "JONAH-8" [ref=e338]:
                - link "JONAH-8" [ref=e339] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/JONAH-8
              - cell "Property acquisition & closing" [ref=e340]
              - cell "client-int/product-profile-ui" [ref=e341]
              - cell "UNASSIGNED" [ref=e342]
              - cell "pending" [ref=e343]:
                - generic [ref=e344]: pending
              - cell "Phase 1" [ref=e345]:
                - generic [ref=e346]: Phase 1
              - cell "—" [ref=e347]
              - cell "7/9/2026" [ref=e348]
              - cell "View →" [ref=e349]:
                - link "View →" [ref=e350] [cursor=pointer]:
                  - /url: /story/JONAH-8?clientId=client-int
            - row "familiarcat story agent Unscheduled PROD-11 [Agent-Core] Retry & error recovery in the tool-calling loop familiarcat/story-agent UNASSIGNED pending Phase 1 — 7/2/2026 View →" [ref=e351]:
              - cell "familiarcat" [ref=e352]
              - cell "story agent" [ref=e353]
              - cell "Unscheduled" [ref=e354]
              - cell "PROD-11" [ref=e355]:
                - link "PROD-11" [ref=e356] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/PROD-11
              - cell "[Agent-Core] Retry & error recovery in the tool-calling loop" [ref=e357]
              - cell "familiarcat/story-agent" [ref=e358]
              - cell "UNASSIGNED" [ref=e359]
              - cell "pending" [ref=e360]:
                - generic [ref=e361]: pending
              - cell "Phase 1" [ref=e362]:
                - generic [ref=e363]: Phase 1
              - cell "—" [ref=e364]
              - cell "7/2/2026" [ref=e365]
              - cell "View →" [ref=e366]:
                - link "View →" [ref=e367] [cursor=pointer]:
                  - /url: /story/PROD-11?clientId=familiarcat
  - button "Open Next.js Dev Tools" [ref=e373] [cursor=pointer]:
    - img [ref=e374]
  - alert [ref=e377]
```

# Test source

```ts
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
> 169 |       expect(newTheme).not.toBe(initialTheme);
      |                            ^ Error: expect(received).not.toBe(expected) // Object.is equality
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
  261 |     await expect(errorMessage).toBeVisible({ timeout: 5000 });
  262 |   });
  263 | 
  264 |   test('recovers when server comes back online', async ({ page }) => {
  265 |     let requestsBlocked = true;
  266 | 
  267 |     await page.route('**/api/**', (route) => {
  268 |       if (requestsBlocked) {
  269 |         route.abort('failed');
```