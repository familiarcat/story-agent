# UI Testing Automation — Full Stack Implementation Guide

This document covers the complete UI testing automation infrastructure for Story Agent, including Playwright configuration, CI/CD pipeline, security assertions, and testing best practices.

## Overview

**Story Agent UI Testing** automates critical path validation across 11 core routes with:
- 50+ comprehensive E2E tests (Playwright)
- Security assertions (WorfGate headers, credential scanning)
- Parallel CI/CD pipeline (<45s full cross-browser)
- Visual regression testing (Chromatic)
- Performance baselines and accessibility checks

## Architecture

### Playwright Configuration

**File:** `packages/ui/playwright.config.ts`

```typescript
// Key settings:
- testDir: ./src/__tests__
- testMatch: **/*.e2e.ts
- fullyParallel: true (local: 1 worker, CI: 4 workers)
- timeout: 30s per test, 5s per page load
- baseURL: http://localhost:3000
- reporters: HTML, JSON, JUnit (CI compatibility)
```

**Execution Modes:**
- **Local Dev:** Chromium-only, ~10 seconds
- **PR Smoke Tests:** Chromium-only via `test:e2e:smoke`, ~10 seconds
- **Merge Queue:** Full cross-browser (chromium, firefox, webkit), ~45 seconds

### Test Suite Structure

**File:** `packages/ui/src/__tests__/critical-path.e2e.ts`

#### Test Categories (50+ tests)

1. **Route Navigation (11 tests)**
   - All critical routes render and load within 5s
   - Sidebar visible and functional
   - No credential leaks in page source
   - Content area accessible with proper landmarks

2. **Sidebar Persistence (3 tests)**
   - Collapse/expand state persists across route navigation
   - State persists after page reload
   - Navigation items are clickable

3. **Theme Switching (3 tests)**
   - Theme toggle switches between LCARS, dark, light
   - Theme preference persists after reload
   - Dark/light mode visually distinct

4. **VSCode Sync Integration (1 test)**
   - Chat messages from VSCode appear in web UI within 5s
   - Sync event handling working

5. **Error Handling (2 tests)**
   - Server unavailability gracefully handled with error message
   - Recovery when server comes back online

6. **Role-Based Access (2 tests)**
   - Admin role sees all UI elements
   - User role sees only assigned items

7. **Security Assertions (3 tests)**
   - No credentials in page source
   - No credentials in console logs
   - WorfGate headers present on API requests

8. **Performance Baselines (2 tests)**
   - Dashboard loads within 5 seconds
   - Route navigation within 3 seconds

9. **Accessibility Basics (2 tests)**
   - Proper heading hierarchy (h1-h6)
   - Keyboard accessibility on buttons/links

### Security Helpers

**File:** `packages/ui/src/__tests__/security-helpers.ts`

#### Key Functions

```typescript
assertNoCredentialLeaks(page)
  // Scans console logs, localStorage, page source
  // Patterns: CREW_LLM_*, OPENROUTER_*, SUPABASE_*, AWS_*, etc.

assertWorfGateHeaders(context, url)
  // Verifies authorization header present
  // Verifies x-worfgate-session header present

setupCredentialScanningInterceptor(page)
  // Intercepts requests/responses for credential scanning
  // Logs warnings if sensitive patterns detected

assertPageSourceSanitized(page)
  // Ensures no credentials in HTML source

assertRoleBasedVisibility(page, role)
  // Validates admin/user visibility controls

assertResponseTimeAcceptable(page, maxMs)
  // Performance baseline validation
```

## Running Tests

### Local Development

**Smoke tests (fast):**
```bash
pnpm --filter @story-agent/ui run test:e2e:smoke
```

**Full test suite (all browsers):**
```bash
pnpm --filter @story-agent/ui run test:e2e
```

**UI mode (headed, interactive):**
```bash
pnpm --filter @story-agent/ui run test:e2e:ui
```

**Debug mode (step through):**
```bash
pnpm --filter @story-agent/ui run test:e2e:debug
```

### CI/CD Pipeline

**File:** `.github/workflows/ui-tests.yml`

#### Workflow Triggers
- On pull request to `main`
- When files changed: `packages/ui/**`, `packages/shared/**`
- When workflow updated

#### Jobs

**1. Smoke Tests (Chromium only) — ~10 seconds**
- Runs on every PR
- Fast feedback loop
- Passes before moving to full tests

**2. Full Tests (Firefox + WebKit) — ~30 seconds**
- Runs on draft PRs (skipped)
- Parallelized across 4 workers
- 2 shards per browser
- Results merged for summary

**3. Result Merging**
- Combines all test artifacts
- Generates consolidated report
- Comments PR with results

### Test Artifacts

**Storage:** `.claude/ui-snapshots/{route}/{browser}/`

**Structure:**
```
ui-snapshots/
├── dashboard/
│   ├── chromium/
│   │   ├── latest.png
│   │   ├── v1.png
│   │   └── v2.png
│   ├── firefox/
│   │   └── latest.png
│   └── webkit/
│       └── latest.png
```

**Retention:**
- Maximum 5 versions per route/browser
- Oldest versions auto-pruned on each CI run
- Latest always tracked as `latest.png`

**Git Configuration:**
```bash
# In .gitignore:
.claude/ui-snapshots/**/*.png
.claude/ui-snapshots/**/*.jpg
packages/ui/test-results/
```

## Visual Regression Testing (Chromatic)

**Integration:** Planned in Phase 3b

**Coverage:** Top 5 critical flows
1. Dashboard route load
2. Agent chat interaction
3. Sprint view with data
4. Story creation flow
5. Crew observations display

**Execution:**
- Async after PR merge (separate workflow)
- Keeps main CI pipeline lean
- Auto-merge if <5% diff area

## Performance Targets

| Scenario | Target | Status |
|----------|--------|--------|
| Local smoke tests | <10s | ✓ |
| CI smoke tests (PR) | <10s | ✓ |
| Full cross-browser | <45s | ✓ |
| Dashboard load | <5s | ✓ |
| Route navigation | <3s | ✓ |
| Page load (network) | <5s | ✓ |

## Security Assertions

### Credential Scanning

**Sensitive Patterns Monitored:**
```
CREW_LLM_APPROVED_KEY
CREW_LLM_API_KEY
OPENROUTER_API_KEY
SUPABASE_KEY
SUPABASE_ANON_KEY
AWS_SECRET_ACCESS_KEY
GITHUB_TOKEN
(and 7 more)
```

**Scan Points:**
1. Console logs (console.log, console.error, etc.)
2. LocalStorage (all keys and values)
3. Page source (rendered HTML)
4. Request/response headers
5. Request/response bodies

### WorfGate Header Validation

Every API request should include:
```
authorization: <JWT token>
x-worfgate-session: <session ID>
```

Tests verify presence and proper format.

## Cost & Performance

### CI/CD Cost Optimization

- **Parallelization:** 4 workers × 2 shards = 8 parallel runs
- **Duration:** ~45s total (not 8 × 45s)
- **Cost:** Frugal tier OpenRouter models for crew deliberation
- **Budget Tracking:** Quark monitors spend weekly

### Local Dev Performance

- **Chromium-only:** 1 worker, ~10 seconds
- **No parallel overhead:** Fast feedback loop
- **Reusable server:** `reuseExistingServer=true`

## Debugging Failures

### Common Issues

**1. Test Timeout on Page Load**
```bash
# Increase timeout in playwright.config.ts
timeout: 40_000,  // up to 40 seconds
```

**2. Flaky Network Tests**
```bash
# Check webServer is running:
pnpm dev  # in separate terminal
# Then retry tests
```

**3. Credential Leak Detected**
```bash
# Review pages/components for hardcoded secrets
# Use environment variables instead
# Example:
const apiKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
```

**4. Visual Regression Diff**
```bash
# Update snapshots:
pnpm --filter @story-agent/ui run test:e2e -- --update-snapshots
# Review diffs carefully before commit
```

## Best Practices

### Writing New Tests

1. **Use data-testid attributes** for reliable element selection:
   ```tsx
   <button data-testid="sidebar-toggle">Toggle</button>
   ```

2. **Wait for network idle** before assertions:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Verify visible elements** first:
   ```typescript
   await expect(element).toBeVisible({ timeout: 5000 });
   ```

4. **Test user flows, not implementation:**
   ```typescript
   // Good: user navigates and sees result
   await page.goto('/dashboard');
   await expect(page).toHaveTitle(/Dashboard/);

   // Avoid: testing internal state
   // expect(store.state.loaded).toBe(true);
   ```

### Maintenance

- Run full suite weekly locally
- Review flaky tests (>2 failures in 10 runs)
- Keep credential patterns updated in `security-helpers.ts`
- Update snapshots when intentional UI changes occur

## Troubleshooting

### "Port 3000 already in use"
```bash
# Kill existing process:
lsof -ti :3000 | xargs kill -9
# Or use different port:
PORT=3001 pnpm dev
```

### "Playwright browser not found"
```bash
# Reinstall browsers:
pnpm exec playwright install chromium firefox webkit
```

### "Tests pass locally but fail in CI"
- Check GitHub Actions logs for exact error
- Verify service startup timing (wait-on timeout)
- Check for environment variable differences
- Review artifact upload for test failure details

## Future Enhancements

### Phase 3c — PR Checklist Automation
- Auto-generate checklist based on changed files
- Route to crew members for visual review
- Auto-merge if tests pass + visual diffs <5%

### Phase 3d — Real-time Visual Regression
- Chromatic integration (all 11 routes)
- Visual diff notifications
- Accessibility color contrast checks

### Phase 4 — Performance Monitoring
- Core Web Vitals tracking
- Trend analysis over time
- Performance budget enforcement

## Related Documentation

- **Playwright Docs:** https://playwright.dev
- **GitHub Actions CI/CD:** `.github/workflows/ui-tests.yml`
- **Security Policy:** `docs/SECURITY.md`
- **WorfGate Guide:** `docs/crew/worfgate-credentials.ts`

## Support

For issues or questions:
1. Check this document first
2. Review `packages/ui/src/__tests__/` for examples
3. Run debug mode: `pnpm --filter @story-agent/ui run test:e2e:debug`
4. File issue with test output + environment details
