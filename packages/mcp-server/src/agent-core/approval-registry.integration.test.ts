import { describe, it, expect } from 'vitest';
import { awaitApproval, resolveApproval } from './approval-registry';

/**
 * Crew infra-integration #3 — prove the Redis-backed approval round-trip (the path that is unverified
 * on cloud). awaitApproval subscribes on a DEDICATED duplicated connection (node-redis requires this
 * for SUBSCRIBE) and resolveApproval PUBLISHES on the main connection — so a decision crosses
 * connections exactly as it would cross two Fargate tasks holding the SSE stream vs. the approve POST.
 *
 * Runs only under RUN_MODE=integration with a reachable REDIS_URL (CI provisions a redis service /
 * `rediss://` against ElastiCache). Skips cleanly when REDIS_URL is unset so it never fails the suite
 * in environments without Redis. Caveat: a single process exercises the pub/sub channel across two
 * connections; a true cross-process test would run the two halves in separate workers.
 */
const hasRedis = Boolean(process.env.REDIS_URL);
const uid = (p: string) => `${p}-${process.pid}-${process.hrtime.bigint()}`;

describe.skipIf(!hasRedis)('approval-registry Redis pub/sub round-trip', () => {
  it('delivers an approve decision across connections', async () => {
    const id = uid('approve');
    const decision = awaitApproval(id, 5000);
    await new Promise((r) => setTimeout(r, 150)); // let the subscriber attach before publishing
    const reached = await resolveApproval(id, 'approve');
    expect(reached).toBe(true);
    await expect(decision).resolves.toBe('approve');
  });

  it('delivers a deny decision across connections', async () => {
    const id = uid('deny');
    const decision = awaitApproval(id, 5000);
    await new Promise((r) => setTimeout(r, 150));
    const reached = await resolveApproval(id, 'deny');
    expect(reached).toBe(true);
    await expect(decision).resolves.toBe('deny');
  });

  it('resolves deny on timeout when no decision is published', async () => {
    const id = uid('timeout');
    await expect(awaitApproval(id, 300)).resolves.toBe('deny');
  });

  it('publish reaches zero subscribers when no waiter exists', async () => {
    const reached = await resolveApproval(uid('nobody'), 'approve');
    expect(reached).toBe(false);
  });
});
