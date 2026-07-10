import { fetchWorkflowStatuses } from '../aha';

const TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  statuses: { name: string; id: string }[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function getWorkflowStatuses(projectId: string): Promise<{ name: string; id: string }[] | null> {
  const cached = cache.get(projectId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.statuses;

  try {
    const statuses = await fetchWorkflowStatuses(projectId);
    if (!statuses.length) return null;
    cache.set(projectId, { statuses, fetchedAt: Date.now() });
    return statuses;
  } catch {
    return null;
  }
}
