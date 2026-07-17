# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.e2e.ts >> Theme Switching >> dark mode is visually distinct from light mode
- Location: src/__tests__/critical-path.e2e.ts:183:7

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "rgb(0, 0, 0)"
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
      - generic [ref=e19]:
        - generic [ref=e20]: LCARS · STORY AGENT
        - button "Collapse sidebar" [expanded] [ref=e21] [cursor=pointer]: ◀
      - navigation [ref=e22]:
        - link "DASHBOARD" [ref=e23] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e24]: 📊
          - generic [ref=e25]: DASHBOARD
        - link "SPRINT BOARD" [ref=e26] [cursor=pointer]:
          - /url: /sprint
          - generic [ref=e27]: 🗂️
          - generic [ref=e28]: SPRINT BOARD
        - link "NEW STORY" [ref=e29] [cursor=pointer]:
          - /url: /story/new
          - generic [ref=e30]: ➕
          - generic [ref=e31]: NEW STORY
        - link "AGENT WORKSPACE" [ref=e32] [cursor=pointer]:
          - /url: /agent
          - generic [ref=e33]: 🛠️
          - generic [ref=e34]: AGENT WORKSPACE
        - link "API DOCS" [ref=e35] [cursor=pointer]:
          - /url: /docs
          - generic [ref=e36]: 📜
          - generic [ref=e37]: API DOCS
        - link "VISION" [ref=e38] [cursor=pointer]:
          - /url: /vision
          - generic [ref=e39]: 🖼️
          - generic [ref=e40]: VISION
        - link "COST OBSERVATORY" [ref=e41] [cursor=pointer]:
          - /url: /cost
          - generic [ref=e42]: 💰
          - generic [ref=e43]: COST OBSERVATORY
        - link "LEARNINGS" [ref=e44] [cursor=pointer]:
          - /url: /learnings
          - generic [ref=e45]: 🧠
          - generic [ref=e46]: LEARNINGS
        - link "CREW MEMORIES" [ref=e47] [cursor=pointer]:
          - /url: /crew/memories
          - generic [ref=e48]: 👥
          - generic [ref=e49]: CREW MEMORIES
        - link "OBSERVATIONS" [ref=e50] [cursor=pointer]:
          - /url: /crew/observations
          - generic [ref=e51]: 👁️
          - generic [ref=e52]: OBSERVATIONS
        - link "OBSERVATION LOUNGE" [ref=e53] [cursor=pointer]:
          - /url: /observation-lounge
          - generic [ref=e54]: 🖖
          - generic [ref=e55]: OBSERVATION LOUNGE
    - main [ref=e56]:
      - generic [ref=e58]:
        - navigation "Breadcrumb" [ref=e59]:
          - generic [ref=e60]:
            - link "Home" [ref=e61] [cursor=pointer]:
              - /url: /
            - generic [ref=e62]: ›
          - generic [ref=e64]: Dashboard
        - generic [ref=e65]:
          - generic [ref=e66]:
            - heading "Delivery Command" [level=1] [ref=e67]
            - paragraph [ref=e68]: Client → Project → Sprint → Story visibility with security-aware delivery context.
          - link "+ New Story" [ref=e69] [cursor=pointer]:
            - /url: /story/new
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e72]:
              - heading "View Mode" [level=2] [ref=e73]
              - generic [ref=e74]: Switch between execution and stakeholder evaluation workflows.
            - generic [ref=e75]:
              - link "Delivery Mode" [ref=e76] [cursor=pointer]:
                - /url: /dashboard
              - link "Stakeholder Mode" [ref=e77] [cursor=pointer]:
                - /url: /dashboard?view=stakeholder
          - generic [ref=e78]:
            - generic [ref=e79]:
              - text: Client
              - combobox "Client" [ref=e80]:
                - option "All clients" [selected]
                - option "client int"
                - option "familiarcat"
            - generic [ref=e81]:
              - text: Sprint
              - combobox "Sprint" [ref=e82]:
                - option "All sprints" [selected]
                - option "Unscheduled"
            - generic [ref=e83]:
              - text: Delivery Status
              - combobox "Delivery Status" [ref=e84]:
                - option "All statuses" [selected]
                - option "pending"
                - option "implementing"
                - option "pr_open"
                - option "pr_revision"
                - option "pr_approved"
                - option "merged"
                - option "blocked"
            - generic [ref=e85]:
              - text: Acceptance
              - combobox "Acceptance" [ref=e86]:
                - option "All" [selected]
                - option "Strong"
                - option "Partial"
                - option "Missing"
            - generic [ref=e87]:
              - button "Apply" [ref=e88] [cursor=pointer]
              - link "Reset" [ref=e89] [cursor=pointer]:
                - /url: /dashboard
        - generic [ref=e90]:
          - generic [ref=e91]:
            - generic [ref=e92]:
              - heading "System Live Status" [level=2] [ref=e93]
              - generic [ref=e94]: Real-time crew execution + chat activity synced with dashboard refresh.
            - generic [ref=e95]: IDLE
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: "0"
              - generic [ref=e99]: active crew tasks
            - generic [ref=e100]:
              - generic [ref=e101]: "0"
              - generic [ref=e102]: runs today
            - generic [ref=e103]:
              - generic [ref=e104]: 0%
              - generic [ref=e105]: success rate
            - generic [ref=e106]:
              - generic [ref=e107]: $0.0000
              - generic [ref=e108]: cost today
          - generic [ref=e109]:
            - generic [ref=e110]: "Aha sync pulse: never"
            - generic [ref=e111]: "Chat pulse: never · idle · model n/a · turns 0"
            - generic [ref=e112]: "UI doctrine: okuda-inspired-story-agent-v1"
        - generic [ref=e113]:
          - generic [ref=e114]:
            - generic [ref=e115]:
              - generic [ref=e116]:
                - generic [ref=e117]: client int
                - generic [ref=e119]:
                  - generic [ref=e120]: product profile ui
                  - generic [ref=e121]: Unscheduled
              - generic [ref=e122]: standard
            - generic [ref=e123]:
              - generic [ref=e124]:
                - strong [ref=e125]: "3"
                - text: stories
              - generic [ref=e126]:
                - strong [ref=e127]: "0"
                - text: active
              - generic [ref=e128]:
                - strong [ref=e129]: "0"
                - text: blocked
            - generic [ref=e130]:
              - text: "Sprint completion:"
              - strong [ref=e131]: 0%
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]: LLM Route
                - generic [ref=e135]: default provider routing
              - generic [ref=e136]:
                - generic [ref=e137]: Data Plane
                - generic [ref=e138]: standard persistence path
              - generic [ref=e139]:
                - generic [ref=e140]: Security Notes
                - generic [ref=e141]: Client-specific controls not yet configured.
            - link "Stakeholder Review" [ref=e143] [cursor=pointer]:
              - /url: /observation-lounge
          - generic [ref=e144]:
            - generic [ref=e145]:
              - generic [ref=e146]:
                - generic [ref=e147]: familiarcat
                - generic [ref=e149]:
                  - generic [ref=e150]: story agent
                  - generic [ref=e151]: Unscheduled
              - generic [ref=e152]: standard
            - generic [ref=e153]:
              - generic [ref=e154]:
                - strong [ref=e155]: "1"
                - text: stories
              - generic [ref=e156]:
                - strong [ref=e157]: "0"
                - text: active
              - generic [ref=e158]:
                - strong [ref=e159]: "0"
                - text: blocked
            - generic [ref=e160]:
              - text: "Sprint completion:"
              - strong [ref=e161]: 0%
            - generic [ref=e162]:
              - generic [ref=e163]:
                - generic [ref=e164]: LLM Route
                - generic [ref=e165]: default provider routing
              - generic [ref=e166]:
                - generic [ref=e167]: Data Plane
                - generic [ref=e168]: standard persistence path
              - generic [ref=e169]:
                - generic [ref=e170]: Security Notes
                - generic [ref=e171]: Client-specific controls not yet configured.
            - link "Stakeholder Review" [ref=e173] [cursor=pointer]:
              - /url: /observation-lounge
        - generic [ref=e175]:
          - generic [ref=e176]:
            - heading "Project Status" [level=2] [ref=e177]
            - generic [ref=e178]: LIVE
          - list [ref=e180]:
            - listitem [ref=e181]:
              - generic [ref=e182]:
                - generic [ref=e183]: client int · product profile ui
                - generic [ref=e184]: MERGED · 0% complete
              - generic [ref=e185]:
                - generic "progress 0%" [ref=e186]
                - generic [ref=e187]: MERGED
            - listitem [ref=e188]:
              - generic [ref=e189]:
                - generic [ref=e190]: familiarcat · story agent
                - generic [ref=e191]: MERGED · 0% complete
              - generic [ref=e192]:
                - generic "progress 0%" [ref=e193]
                - generic [ref=e194]: MERGED
        - generic [ref=e195]:
          - generic [ref=e196]:
            - generic [ref=e197]: "4"
            - generic [ref=e198]: pending
          - generic [ref=e199]:
            - generic [ref=e200]: "0"
            - generic [ref=e201]: implementing
          - generic [ref=e202]:
            - generic [ref=e203]: "0"
            - generic [ref=e204]: pr open
          - generic [ref=e205]:
            - generic [ref=e206]: "0"
            - generic [ref=e207]: pr revision
          - generic [ref=e208]:
            - generic [ref=e209]: "0"
            - generic [ref=e210]: pr approved
          - generic [ref=e211]:
            - generic [ref=e212]: "0"
            - generic [ref=e213]: merged
          - generic [ref=e214]:
            - generic [ref=e215]: "0"
            - generic [ref=e216]: blocked
        - generic [ref=e217]:
          - heading "Stakeholder Story Evaluation" [level=2] [ref=e218]
          - paragraph [ref=e219]: Use this view during sprint reviews to assess Agile story readiness from delivery status, acceptance criteria, and Aha traceability.
          - table [ref=e221]:
            - rowgroup [ref=e222]:
              - row "Story Sprint Delivery Acceptance Aha Details" [ref=e223]:
                - columnheader "Story" [ref=e224]
                - columnheader "Sprint" [ref=e225]
                - columnheader "Delivery" [ref=e226]
                - columnheader "Acceptance" [ref=e227]
                - columnheader "Aha" [ref=e228]
                - columnheader "Details" [ref=e229]
            - rowgroup [ref=e230]:
              - row "JONAH-9 Unscheduled pending missing Open Inspect" [ref=e231]:
                - cell "JONAH-9" [ref=e232]
                - cell "Unscheduled" [ref=e233]
                - cell "pending" [ref=e234]:
                  - generic [ref=e235]: pending
                - cell "missing" [ref=e236]
                - cell "Open" [ref=e237]:
                  - link "Open" [ref=e238] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/JONAH-9
                - cell "Inspect" [ref=e239]:
                  - link "Inspect" [ref=e240] [cursor=pointer]:
                    - /url: /story/JONAH-9?clientId=client-int
              - row "PROD-10 Unscheduled pending missing Open Inspect" [ref=e241]:
                - cell "PROD-10" [ref=e242]
                - cell "Unscheduled" [ref=e243]
                - cell "pending" [ref=e244]:
                  - generic [ref=e245]: pending
                - cell "missing" [ref=e246]
                - cell "Open" [ref=e247]:
                  - link "Open" [ref=e248] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/PROD-10
                - cell "Inspect" [ref=e249]:
                  - link "Inspect" [ref=e250] [cursor=pointer]:
                    - /url: /story/PROD-10?clientId=client-int
              - row "JONAH-8 Unscheduled pending missing Open Inspect" [ref=e251]:
                - cell "JONAH-8" [ref=e252]
                - cell "Unscheduled" [ref=e253]
                - cell "pending" [ref=e254]:
                  - generic [ref=e255]: pending
                - cell "missing" [ref=e256]
                - cell "Open" [ref=e257]:
                  - link "Open" [ref=e258] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/JONAH-8
                - cell "Inspect" [ref=e259]:
                  - link "Inspect" [ref=e260] [cursor=pointer]:
                    - /url: /story/JONAH-8?clientId=client-int
              - row "PROD-11 Unscheduled pending missing Open Inspect" [ref=e261]:
                - cell "PROD-11" [ref=e262]
                - cell "Unscheduled" [ref=e263]
                - cell "pending" [ref=e264]:
                  - generic [ref=e265]: pending
                - cell "missing" [ref=e266]
                - cell "Open" [ref=e267]:
                  - link "Open" [ref=e268] [cursor=pointer]:
                    - /url: https://familiarcat.aha.io/features/PROD-11
                - cell "Inspect" [ref=e269]:
                  - link "Inspect" [ref=e270] [cursor=pointer]:
                    - /url: /story/PROD-11?clientId=familiarcat
        - table [ref=e272]:
          - rowgroup [ref=e273]:
            - row "Client Project Sprint Story ID Title Repository Branch Status Phase PR Updated" [ref=e274]:
              - columnheader "Client" [ref=e275]
              - columnheader "Project" [ref=e276]
              - columnheader "Sprint" [ref=e277]
              - columnheader "Story ID" [ref=e278]
              - columnheader "Title" [ref=e279]
              - columnheader "Repository" [ref=e280]
              - columnheader "Branch" [ref=e281]
              - columnheader "Status" [ref=e282]
              - columnheader "Phase" [ref=e283]
              - columnheader "PR" [ref=e284]
              - columnheader "Updated" [ref=e285]
              - columnheader [ref=e286]
          - rowgroup [ref=e287]:
            - row "client int product profile ui Unscheduled JONAH-9 Interior gut demolition — all 4 floors client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e288]:
              - cell "client int" [ref=e289]
              - cell "product profile ui" [ref=e290]
              - cell "Unscheduled" [ref=e291]
              - cell "JONAH-9" [ref=e292]:
                - link "JONAH-9" [ref=e293] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/JONAH-9
              - cell "Interior gut demolition — all 4 floors" [ref=e294]
              - cell "client-int/product-profile-ui" [ref=e295]
              - cell "UNASSIGNED" [ref=e296]
              - cell "pending" [ref=e297]:
                - generic [ref=e298]: pending
              - cell "Phase 1" [ref=e299]:
                - generic [ref=e300]: Phase 1
              - cell "—" [ref=e301]
              - cell "7/9/2026" [ref=e302]
              - cell "View →" [ref=e303]:
                - link "View →" [ref=e304] [cursor=pointer]:
                  - /url: /story/JONAH-9?clientId=client-int
            - row "client int product profile ui Unscheduled PROD-10 MCP Integration client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e305]:
              - cell "client int" [ref=e306]
              - cell "product profile ui" [ref=e307]
              - cell "Unscheduled" [ref=e308]
              - cell "PROD-10" [ref=e309]:
                - link "PROD-10" [ref=e310] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/PROD-10
              - cell "MCP Integration" [ref=e311]
              - cell "client-int/product-profile-ui" [ref=e312]
              - cell "UNASSIGNED" [ref=e313]
              - cell "pending" [ref=e314]:
                - generic [ref=e315]: pending
              - cell "Phase 1" [ref=e316]:
                - generic [ref=e317]: Phase 1
              - cell "—" [ref=e318]
              - cell "7/9/2026" [ref=e319]
              - cell "View →" [ref=e320]:
                - link "View →" [ref=e321] [cursor=pointer]:
                  - /url: /story/PROD-10?clientId=client-int
            - row "client int product profile ui Unscheduled JONAH-8 Property acquisition & closing client-int/product-profile-ui UNASSIGNED pending Phase 1 — 7/9/2026 View →" [ref=e322]:
              - cell "client int" [ref=e323]
              - cell "product profile ui" [ref=e324]
              - cell "Unscheduled" [ref=e325]
              - cell "JONAH-8" [ref=e326]:
                - link "JONAH-8" [ref=e327] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/JONAH-8
              - cell "Property acquisition & closing" [ref=e328]
              - cell "client-int/product-profile-ui" [ref=e329]
              - cell "UNASSIGNED" [ref=e330]
              - cell "pending" [ref=e331]:
                - generic [ref=e332]: pending
              - cell "Phase 1" [ref=e333]:
                - generic [ref=e334]: Phase 1
              - cell "—" [ref=e335]
              - cell "7/9/2026" [ref=e336]
              - cell "View →" [ref=e337]:
                - link "View →" [ref=e338] [cursor=pointer]:
                  - /url: /story/JONAH-8?clientId=client-int
            - row "familiarcat story agent Unscheduled PROD-11 [Agent-Core] Retry & error recovery in the tool-calling loop familiarcat/story-agent UNASSIGNED pending Phase 1 — 7/2/2026 View →" [ref=e339]:
              - cell "familiarcat" [ref=e340]
              - cell "story agent" [ref=e341]
              - cell "Unscheduled" [ref=e342]
              - cell "PROD-11" [ref=e343]:
                - link "PROD-11" [ref=e344] [cursor=pointer]:
                  - /url: https://familiarcat.aha.io/features/PROD-11
              - cell "[Agent-Core] Retry & error recovery in the tool-calling loop" [ref=e345]
              - cell "familiarcat/story-agent" [ref=e346]
              - cell "UNASSIGNED" [ref=e347]
              - cell "pending" [ref=e348]:
                - generic [ref=e349]: pending
              - cell "Phase 1" [ref=e350]:
                - generic [ref=e351]: Phase 1
              - cell "—" [ref=e352]
              - cell "7/2/2026" [ref=e353]
              - cell "View →" [ref=e354]:
                - link "View →" [ref=e355] [cursor=pointer]:
                  - /url: /story/PROD-11?clientId=familiarcat
  - button "Open Next.js Dev Tools" [ref=e361] [cursor=pointer]:
    - img [ref=e362]
  - alert [ref=e365]
```

# Test source

```ts
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
> 213 |     expect(darkBg).not.toBe(lightBg);
      |                        ^ Error: expect(received).not.toBe(expected) // Object.is equality
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
```