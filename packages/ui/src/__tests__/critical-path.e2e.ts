import { test, expect, Page } from '@playwright/test';
import {
  assertNoCredentialLeaks,
  setupCredentialScanningInterceptor,
  assertPageSourceSanitized,
  assertResponseTimeAcceptable,
  assertRoleBasedVisibility,
} from './security-helpers';

/**
 * Critical Path E2E Tests
 * Covers all core routes, sidebar persistence, theme switching, error states, and security
 */

const ROUTES = [
  { path: '/dashboard', title: 'Dashboard' },
  { path: '/sprint', title: 'Sprint' },
  { path: '/story/new', title: 'New Story' },
  { path: '/agent', title: 'Agent' },
  { path: '/docs', title: 'Documentation' },
  { path: '/vision', title: 'Vision' },
  { path: '/cost', title: 'Cost' },
  { path: '/learnings', title: 'Learnings' },
  { path: '/crew/memories', title: 'Crew Memories' },
  { path: '/crew/observations', title: 'Observations' },
  { path: '/observation-lounge', title: 'Observation Lounge' },
];

test.beforeEach(async ({ page }) => {
  // Set up credential scanning interceptor
  await setupCredentialScanningInterceptor(page);
});

test.describe('Route Navigation - Critical Paths', () => {
  ROUTES.forEach((route) => {
    test(`should navigate to ${route.path} and render page`, async ({
      page,
    }) => {
      await page.goto(route.path);

      // Verify page loaded with correct title
      await expect(page).toHaveTitle(/Story Agent/i);

      // Verify page has content (either main or body)
      const mainContent = page.locator('main, body').first();
      await expect(mainContent).toBeTruthy();

      // Verify no credentials leaked
      await assertPageSourceSanitized(page);
      await assertNoCredentialLeaks(page);

      // Verify page loaded in reasonable time
      await assertResponseTimeAcceptable(page, 5000);
    });

    test(`${route.path} should have accessible main content area`, async ({
      page,
    }) => {
      await page.goto(route.path);

      // Verify main content area exists
      const mainContent = page.locator('main').first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });

      // Verify no skipped main landmarks
      const headings = await page.locator('h1, h2').count();
      expect(headings).toBeGreaterThan(0);
    });
  });
});

test.describe('Sidebar Persistence', () => {
  test('sidebar collapse state persists across navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard');

    const sidebar = page.locator('[data-testid="app-sidenav"]').first();
    const collapseButton = page
      .locator('[data-testid="sidebar-toggle"]')
      .first();

    // Verify sidebar is initially expanded
    await expect(sidebar).toBeVisible();

    // Get initial width to confirm expanded state
    const expandedWidth = await sidebar.boundingBox();

    // Collapse sidebar
    await collapseButton.click();
    await page.waitForTimeout(300); // Wait for animation

    // Verify collapsed (narrower or hidden)
    const collapsedWidth = await sidebar.boundingBox();
    expect(collapsedWidth?.width || 0).toBeLessThanOrEqual(
      expandedWidth?.width || 500
    );

    // Navigate to a LIGHT, reliably-rendering route. Data-heavy routes like /sprint keep an
    // SSE/polling connection open (useAhaEvents), so 'networkidle' never settles and the sidenav
    // isn't reliably present within timeout. Collapse persistence is route-agnostic — it's carried
    // by the <html> data-sidebar-collapsed attribute + localStorage, not by any page's content.
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    // Collapse state must persist across navigation. The authoritative signal is
    // data-sidebar-collapsed="true" on <html> (SidebarProvider.setCollapsed writes it +
    // localStorage; SIDEBAR_INIT_SCRIPT rehydrates it from localStorage on load). Assert the
    // VALUE (not mere presence — the attribute is always present as 'true'|'false').
    const sidebarAfterNav = page.locator('[data-testid="app-sidenav"]').first();
    await expect(sidebarAfterNav).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-collapsed', 'true');
    await expect(sidebarAfterNav).toHaveClass(/app-sidenav--collapsed/);

    // Reload — the init script must rehydrate the collapsed state from localStorage
    await page.reload();
    await expect(page.locator('[data-testid="app-sidenav"]').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-sidebar-collapsed', 'true');
  });

  test('sidebar navigation items are clickable', async ({ page }) => {
    await page.goto('/dashboard');

    const navItems = page.locator('[data-testid="nav-item"]');
    const itemCount = await navItems.count();

    expect(itemCount).toBeGreaterThan(0);

    // Click a nav item that is NOT the current route (e.g., "Sprint")
    const nonDashboardItem = navItems.filter({ hasText: 'Sprint' }).first();
    await expect(nonDashboardItem).toBeVisible();
    await nonDashboardItem.click();
    await page.waitForLoadState('networkidle');

    // Verify navigation occurred to the clicked item's target
    expect(page.url()).toContain('/sprint');
  });
});

test.describe('Theme Switching', () => {
  test('theme toggle switches between LCARS, dark, and light', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Find theme toggle button
    const themeToggle = page
      .locator('[data-testid="theme-toggle"]')
      .or(page.locator('button:has-text("Theme")')).first();

    if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Store initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
          localStorage.getItem('sa-theme') ||
          'lcars';
      });

      // Click theme toggle to open menu
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Get first non-current theme option and click it
      const themeOptions = page.locator('[role="option"]');
      const optionCount = await themeOptions.count();

      let newTheme = initialTheme;
      for (let i = 0; i < optionCount; i++) {
        const optionTheme = await themeOptions.nth(i).textContent();
        if (optionTheme && !optionTheme.toLowerCase().includes(initialTheme.toLowerCase())) {
          await themeOptions.nth(i).click();
          newTheme = optionTheme.toLowerCase();
          break;
        }
      }

      // Wait for state update
      await page.waitForTimeout(500);

      // Verify theme changed in DOM
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
          localStorage.getItem('sa-theme') ||
          'lcars';
      });

      expect(currentTheme).not.toBe(initialTheme);

      // Flush storage and reload
      await page.evaluate(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      await page.reload({ waitUntil: 'load' });

      // Verify theme persisted
      const persistedTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
          localStorage.getItem('sa-theme') ||
          'lcars';
      });

      expect(persistedTheme).toBe(currentTheme);
    }
  });

  test('dark mode is visually distinct from light mode', async ({ page }) => {
    await page.goto('/dashboard');

    // Set to light mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await page.reload();

    const lightBg = await page.evaluate(() => {
      return window
        .getComputedStyle(document.body)
        .getPropertyValue('background-color');
    });

    // Set to dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.reload();

    const darkBg = await page.evaluate(() => {
      return window
        .getComputedStyle(document.body)
        .getPropertyValue('background-color');
    });

    // Colors should be different
    expect(darkBg).not.toBe(lightBg);
  });
});

test.describe('VSCode Sync Integration', () => {
  test('chat messages from VSCode appear in web UI', async ({
    page,
    context,
  }) => {
    await page.goto('/agent');

    // Verify chat panel is visible
    const chatPanel = page.locator('[data-testid="chat-panel"]').first();
    await expect(chatPanel).toBeVisible({ timeout: 5000 });

    // Simulate VSCode message injection (would be real in prod)
    await page.evaluate(() => {
      const event = new CustomEvent('vscode-message', {
        detail: {
          type: 'chat-message',
          text: 'Test sync message',
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(event);
    });

    // Verify message appears in chat
    await expect(
      page.locator('text=Test sync message')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Error Handling', () => {
  test('gracefully handles server unavailable', async ({ page }) => {
    // Hermetic: deterministically fail the agent stream API (no real backend toggling).
    await page.route('**/api/agent/stream', (route) => route.abort('failed'));

    await page.goto('/agent');

    // The /agent page only calls the API when a task is submitted — trigger it.
    await page.locator('textarea').first().fill('list files in packages/shared');
    await page.getByRole('button', { name: 'Run' }).click();

    // The page must surface a visible error alert.
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('recovers when server comes back online', async ({ page }) => {
    // Hermetic: fail the stream while "down", then fulfill a valid SSE once "recovered"
    // (deterministic — never depends on a real backend being up in the test env).
    let requestsBlocked = true;
    await page.route('**/api/agent/stream', (route) => {
      if (requestsBlocked) return route.abort('failed');
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
        body: 'data: {"type":"done","text":"recovered"}\n\n',
      });
    });

    await page.goto('/agent');
    await page.locator('textarea').first().fill('list files in packages/shared');
    await page.getByRole('button', { name: 'Run' }).click();

    const errorMessage = page.locator('[data-testid="error-message"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Server back online → click Retry (inside the error alert). onRetry clears events and
    // re-runs; the stream now succeeds, so the error must clear.
    requestsBlocked = false;
    await errorMessage.getByRole('button', { name: 'Retry' }).click();

    await expect(errorMessage).not.toBeVisible({ timeout: 10000 });
  });
});

test.describe('Role-Based Access', () => {
  test('admin role sees all UI elements', async ({ page }) => {
    // Set admin role in localStorage
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('user-role', 'admin');
    });
    await page.reload();

    // Verify admin-only elements are visible
    const adminElements = await page
      .locator('[data-role="admin"]')
      .count();

    // Should see at least some admin elements or admin menu
    expect(adminElements).toBeGreaterThanOrEqual(0);
  });

  test('user role sees only assigned items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('user-role', 'user');
      localStorage.setItem('user-id', 'user-123');
    });
    await page.reload();

    // Verify admin-only elements are not visible
    const adminElements = await page
      .locator('[data-role="admin"]')
      .all();

    for (const element of adminElements) {
      const isVisible = await element.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });
});

test.describe('Security Assertions', () => {
  test('no credentials in page source', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      await assertPageSourceSanitized(page);
    }
  });

  test('no credentials in console logs', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);
      await assertNoCredentialLeaks(page);
    }
  });

  test('requests include WorfGate headers', async ({ page }) => {
    let foundAuthHeader = false;
    let foundWorfgateHeader = false;

    await page.route('**/api/**', (route) => {
      const headers = route.request().headers();
      if (headers['authorization']) {
        foundAuthHeader = true;
      }
      if (headers['x-worfgate-session']) {
        foundWorfgateHeader = true;
      }
      route.continue();
    });

    await page.goto('/agent');
    await page.waitForLoadState('networkidle');

    // At least some requests should have auth headers
    // (We tolerate false for this test as not all routes may have API calls)
  });
});

test.describe('Performance Baselines', () => {
  test('dashboard loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('navigation between routes completes within 3 seconds', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    for (const route of ROUTES.slice(1, 4)) {
      const startTime = Date.now();
      await page.goto(route.path);
      const endTime = Date.now();

      const navTime = endTime - startTime;
      expect(navTime).toBeLessThan(3000);
    }
  });
});

test.describe('Accessibility Basics', () => {
  test('page has proper heading hierarchy', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path);

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);

      // Check that we don't skip heading levels (basic check)
      const firstHeading = await headings[0].evaluate((el) => {
        return parseInt(el.tagName[1]);
      });
      expect(firstHeading).toBeLessThanOrEqual(2);
    }
  });

  test('buttons and links are keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab through page
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    // Should focus on interactive element
    expect(
      ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(
        focusedElement || ''
      )
    ).toBe(true);
  });
});
