import { describe, it, expect, vi } from 'vitest';
import { awaitApproval, resolveApproval } from './approval-registry.js';

vi.mock('@story-agent/shared/db', () => ({ getRedis: () => Promise.resolve(null) }));

/**
 * In-process fallback (no REDIS_URL): awaitApproval registers a waiter and resolveApproval
 * delivers the decision. Real timers — both functions `await getRedis()` before touching the
 * in-process Map, so the timeout's setTimeout is registered only after that microtask; fake timers
 * advanced synchronously would race ahead of it. A short real timeout keeps the timeout case fast.
 */
describe('approval-registry in-process fallback', () => {
  it('resolveApproval delivers an approve decision to a pending awaitApproval', async () => {
    const id = 'approve-id';
    const decision = awaitApproval(id, 1000);
    // Let awaitApproval register its waiter (it awaits getRedis() first) before resolving.
    await new Promise(r => setTimeout(r, 0));
    const reached = await resolveApproval(id, 'approve');
    expect(reached).toBe(true);
    await expect(decision).resolves.toBe('approve');
  });

  it('resolveApproval delivers a deny decision to a pending awaitApproval', async () => {
    const id = 'deny-id';
    const decision = awaitApproval(id, 1000);
    await Promise.resolve();
    const reached = await resolveApproval(id, 'deny');
    expect(reached).toBe(true);
    await expect(decision).resolves.toBe('deny');
  });

  it('awaitApproval resolves deny on timeout when no decision arrives', async () => {
    const id = 'timeout-id';
    await expect(awaitApproval(id, 30)).resolves.toBe('deny');
  });

  it('resolveApproval returns false when no waiter exists', async () => {
    const reached = await resolveApproval('nobody-home', 'approve');
    expect(reached).toBe(false);
  });
});
