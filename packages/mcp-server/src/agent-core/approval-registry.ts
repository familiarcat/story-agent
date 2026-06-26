/**
 * Interactive-approval registry — multi-task safe.
 *
 * The SSE /agent stream and the POST /agent/approve are separate requests that, on multi-task
 * Fargate, can land on DIFFERENT tasks. So a pending gate is brokered through Redis pub/sub: the task
 * holding the stream subscribes to `approval:<id>` and awaits one message; whichever task receives
 * the approve POST publishes the decision to that channel. Falls back to an in-process Map when no
 * REDIS_URL (local dev / single instance) so nothing breaks without Redis.
 */
import { getRedis } from '@story-agent/shared/db';

type Decision = 'approve' | 'deny';

const local = new Map<string, (d: Decision) => void>();
const CHANNEL = (id: string) => `approval:${id}`;

/** Await an operator decision for a pending gate. Resolves 'deny' on timeout (a closed tab can't hang it). */
export async function awaitApproval(id: string, timeoutMs: number): Promise<Decision> {
  const redis = await getRedis().catch(() => null);

  if (redis) {
    // node-redis v4 requires a dedicated connection for subscriptions.
    const sub = redis.duplicate();
    await sub.connect();
    return new Promise<Decision>((resolve) => {
      let done = false;
      const finish = (d: Decision) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        sub.unsubscribe(CHANNEL(id)).catch(() => {});
        sub.quit().catch(() => {});
        resolve(d);
      };
      const timer = setTimeout(() => finish('deny'), timeoutMs);
      sub.subscribe(CHANNEL(id), (msg: string) => finish(msg === 'approve' ? 'approve' : 'deny')).catch(() => finish('deny'));
    });
  }

  // In-process fallback.
  return new Promise<Decision>((resolve) => {
    const timer = setTimeout(() => { local.delete(id); resolve('deny'); }, timeoutMs);
    local.set(id, (d) => { clearTimeout(timer); local.delete(id); resolve(d); });
  });
}

/** Resolve a pending gate from any task. Returns true if a waiter was reached. */
export async function resolveApproval(id: string, decision: Decision): Promise<boolean> {
  const redis = await getRedis().catch(() => null);
  if (redis) {
    const receivers = await redis.publish(CHANNEL(id), decision).catch(() => 0);
    return receivers > 0;
  }
  const fn = local.get(id);
  if (fn) { fn(decision); return true; }
  return false;
}
