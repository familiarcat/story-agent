import type { StoryStatus } from './index.js';

/**
 * Concise status buckets rendered across dashboard + extension surfaces.
 */
export type SystemStatusBucket = 'pending' | 'active' | 'blocked' | 'done';

export const SYSTEM_STATUS_ORDER: SystemStatusBucket[] = ['pending', 'active', 'blocked', 'done'];

export const SYSTEM_STATUS_LABEL: Record<SystemStatusBucket, string> = {
  pending: 'Pending',
  active: 'Active',
  blocked: 'Blocked',
  done: 'Done',
};

/** Map tracked story lifecycle states into concise system-status buckets. */
export function systemBucketFromStoryStatus(status: StoryStatus): SystemStatusBucket {
  switch (status) {
    case 'blocked':
      return 'blocked';
    case 'merged':
      return 'done';
    case 'pending':
    case 'discovery':
      return 'pending';
    case 'implementing':
    case 'pr_open':
    case 'pr_revision':
    case 'pr_approved':
    default:
      return 'active';
  }
}

/**
 * Normalize free-form Aha workflow names into concise system-status buckets.
 * This keeps Aha-side status naming differences from fragmenting UI groupings.
 */
export function systemBucketFromWorkflowStatus(workflowStatus: string | null | undefined): SystemStatusBucket {
  const s = (workflowStatus || '').trim().toLowerCase();
  if (!s) return 'pending';

  if (
    s.includes('block') ||
    s.includes('hold') ||
    s.includes('stuck') ||
    s.includes('risk')
  ) {
    return 'blocked';
  }

  if (
    s.includes('done') ||
    s.includes('complete') ||
    s.includes('closed') ||
    s.includes('merged') ||
    s.includes('released') ||
    s.includes('resolved')
  ) {
    return 'done';
  }

  if (
    s.includes('new') ||
    s.includes('todo') ||
    s.includes('to do') ||
    s.includes('backlog') ||
    s.includes('plan') ||
    s.includes('draft') ||
    s.includes('ready')
  ) {
    return 'pending';
  }

  return 'active';
}
