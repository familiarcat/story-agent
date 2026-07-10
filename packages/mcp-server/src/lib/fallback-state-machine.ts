/**
 * Auto-Fallback State Machine — YAR Task 2.3
 *
 * Implements fallback logic for when crew (:3103) is unavailable.
 * After 3 failed requests in 5 min window → fall back to Copilot
 * After 3 successful requests → recover back to crew routing
 *
 * Integrated into VSCode extension native chat provider.
 */

export interface FallbackState {
  isActive: boolean;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  fallbackStartTime?: number;
  failureWindow: number; // 5 min in ms
}

export const FAILURE_THRESHOLD = 3;
export const SUCCESS_THRESHOLD = 3;
export const FAILURE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize fallback state
 */
export function initFallbackState(): FallbackState {
  return {
    isActive: false,
    failureCount: 0,
    successCount: 0,
    failureWindow: FAILURE_WINDOW_MS,
  };
}

/**
 * Record a request failure
 * Returns true if fallback should now be activated
 */
export function recordFailure(state: FallbackState, now: number = Date.now()): boolean {
  const timeSinceLastFailure = state.lastFailureTime ? now - state.lastFailureTime : FAILURE_WINDOW_MS;

  // Reset counter if we're outside the 5-min window
  if (timeSinceLastFailure > FAILURE_WINDOW_MS) {
    state.failureCount = 0;
  }

  state.failureCount += 1;
  state.lastFailureTime = now;
  state.successCount = 0; // reset success count on failure

  // Check if we should activate fallback
  if (state.failureCount >= FAILURE_THRESHOLD && !state.isActive) {
    console.warn(
      `[FALLBACK] Activating fallback to Copilot (${state.failureCount} failures in ${FAILURE_WINDOW_MS}ms)`
    );
    state.isActive = true;
    state.fallbackStartTime = now;
    return true;
  }

  return false;
}

/**
 * Record a request success
 * Returns true if fallback should now be deactivated (recovery)
 */
export function recordSuccess(state: FallbackState, now: number = Date.now()): boolean {
  state.successCount += 1;
  state.lastSuccessTime = now;
  state.failureCount = 0; // reset failure count on success

  // Check if we should recover from fallback
  if (state.successCount >= SUCCESS_THRESHOLD && state.isActive) {
    const fallbackDuration = now - (state.fallbackStartTime || now);
    console.info(
      `[FALLBACK] Recovering to crew routing (${state.successCount} successes, fallback lasted ${fallbackDuration}ms)`
    );
    state.isActive = false;
    state.fallbackStartTime = undefined;
    return true;
  }

  return false;
}

/**
 * Mock test suite for fallback state machine
 */
export function runFallbackTests(): { passed: number; failed: number; tests: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const test = (name: string, fn: () => boolean) => {
    try {
      const result = fn();
      if (result) {
        results.push(`✓ ${name}`);
        passed++;
      } else {
        results.push(`✗ ${name}`);
        failed++;
      }
    } catch (e) {
      results.push(`✗ ${name}: ${e}`);
      failed++;
    }
  };

  // Test 1: Initial state should not be active
  test('Initial state is not active', () => {
    const state = initFallbackState();
    return !state.isActive && state.failureCount === 0;
  });

  // Test 2: 3 failures within window should activate fallback
  test('3 failures within window activates fallback', () => {
    const state = initFallbackState();
    const now = Date.now();
    recordFailure(state, now);
    recordFailure(state, now + 1000);
    const shouldActivate = recordFailure(state, now + 2000);
    return shouldActivate && state.isActive;
  });

  // Test 3: Failures outside window should reset counter
  test('Failures outside window reset counter', () => {
    const state = initFallbackState();
    const now = Date.now();
    recordFailure(state, now);
    recordFailure(state, now + 1000);
    // Advance past the 5-min window
    const outsideWindow = now + FAILURE_WINDOW_MS + 1000;
    recordFailure(state, outsideWindow);
    // Should only have 1 failure counted, not 3
    return state.failureCount === 1 && !state.isActive;
  });

  // Test 4: Success resets failure counter
  test('Success resets failure counter', () => {
    const state = initFallbackState();
    const now = Date.now();
    recordFailure(state, now);
    recordFailure(state, now + 1000);
    recordSuccess(state, now + 2000);
    return state.failureCount === 0 && state.successCount === 1 && !state.isActive;
  });

  // Test 5: 3 successes during fallback should recover
  test('3 successes during fallback initiates recovery', () => {
    const state = initFallbackState();
    const now = Date.now();
    // Activate fallback
    recordFailure(state, now);
    recordFailure(state, now + 1000);
    recordFailure(state, now + 2000);
    // Recover with successes
    recordSuccess(state, now + 3000);
    recordSuccess(state, now + 4000);
    const shouldRecover = recordSuccess(state, now + 5000);
    return shouldRecover && !state.isActive;
  });

  // Test 6: Fallback preserves state during failures
  test('Fallback state persists during failure window', () => {
    const state = initFallbackState();
    const now = Date.now();
    recordFailure(state, now);
    recordFailure(state, now + 1000);
    recordFailure(state, now + 2000);
    // Add another failure within window — state should stay active
    recordFailure(state, now + 3000);
    return state.isActive && state.failureCount === 4;
  });

  return { passed, failed, tests: results };
}

/**
 * Export for testing and integration
 */
export { FallbackState };
