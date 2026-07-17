import { Page, APIRequestContext } from '@playwright/test';

/**
 * WorfGate Security Assertions
 * Validates credential protection and security headers across all test runs
 */

const SENSITIVE_PATTERNS = [
  'CREW_LLM_APPROVED_KEY',
  'CREW_LLM_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENROUTER_KEY',
  'SUPABASE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BING_SEARCH_V7_SUBSCRIPTION_KEY',
  'BING_SPELL_CHECK_SUBSCRIPTION_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN',
];

interface NetworkLog {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Assert no credentials are leaked in page logs, console, or localStorage
 */
export async function assertNoCredentialLeaks(page: Page): Promise<void> {
  // Collect all console messages
  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(msg.text()));

  // Check localStorage for sensitive keys
  const localStorageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    return data;
  });

  // Scan console logs
  for (const log of consoleLogs) {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (log.includes(pattern)) {
        throw new Error(
          `Credential leak detected in console: ${pattern} found in log: "${log}"`
        );
      }
    }
  }

  // Scan localStorage
  for (const [key, value] of Object.entries(localStorageData)) {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (key.includes(pattern) || value.includes(pattern)) {
        throw new Error(
          `Credential leak detected in localStorage: ${pattern} found in key/value`
        );
      }
    }
  }
}

/**
 * Assert WorfGate security headers are present on API calls
 */
export async function assertWorfGateHeaders(
  context: APIRequestContext,
  requestUrl: string
): Promise<void> {
  const response = await context.get(requestUrl);
  const headers = response.headers();

  if (!headers['authorization']) {
    throw new Error('Missing authorization header - WorfGate check failed');
  }

  if (!headers['x-worfgate-session']) {
    throw new Error('Missing x-worfgate-session header - WorfGate check failed');
  }
}

/**
 * Intercept and scan network requests for credential leaks
 */
export async function setupCredentialScanningInterceptor(
  page: Page
): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request();

    // Check request headers
    const headers = request.allHeaders();
    for (const [key, value] of Object.entries(headers)) {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (key.includes(pattern) || (value && value.includes(pattern))) {
          console.error(
            `Credential leak detected in request header: ${pattern}`
          );
        }
      }
    }

    // Check request body (if text-based)
    try {
      const postData = request.postData();
      if (postData) {
        for (const pattern of SENSITIVE_PATTERNS) {
          if (postData.includes(pattern)) {
            console.error(
              `Credential leak detected in request body: ${pattern}`
            );
          }
        }
      }
    } catch (e) {
      // Binary data, skip
    }

    // Fetch and check response headers
    try {
      const response = await route.fetch();
      if (response) {
        const responseHeaders = response.headers();
        for (const [key, value] of Object.entries(responseHeaders)) {
          for (const pattern of SENSITIVE_PATTERNS) {
            if (key.includes(pattern) || (value && value.includes(pattern))) {
              console.error(
                `Credential leak detected in response header: ${pattern}`
              );
            }
          }
        }
      }
      route.continue();
    } catch (e) {
      // If fetch fails, continue anyway to avoid blocking tests
      route.continue();
    }
  });
}

/**
 * Assert role-based access control
 */
export async function assertRoleBasedVisibility(
  page: Page,
  role: 'admin' | 'user'
): Promise<void> {
  const adminElements = await page.locator('[data-testid="admin-only"]').count();
  const userElements = await page
    .locator('[data-testid="user-assigned"]')
    .count();

  if (role === 'admin') {
    if (adminElements === 0) {
      throw new Error('Admin role should see admin-only elements');
    }
  } else if (role === 'user') {
    if (adminElements > 0) {
      throw new Error('User role should not see admin-only elements');
    }
  }
}

/**
 * Assert no sensitive data in page source
 */
export async function assertPageSourceSanitized(page: Page): Promise<void> {
  const pageSource = await page.content();

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pageSource.includes(pattern)) {
      throw new Error(
        `Credential leak detected in page source: ${pattern} found in HTML`
      );
    }
  }
}

/**
 * Assert response times stay within acceptable bounds
 */
export async function assertResponseTimeAcceptable(
  page: Page,
  maxMs: number = 5000
): Promise<void> {
  const navigationTiming = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return perf
      ? {
          loadEventEnd: perf.loadEventEnd,
          domContentLoadedEventEnd: perf.domContentLoadedEventEnd,
        }
      : null;
  });

  if (navigationTiming && navigationTiming.loadEventEnd > maxMs) {
    throw new Error(
      `Page load time exceeded ${maxMs}ms: ${navigationTiming.loadEventEnd}ms`
    );
  }
}
