/**
 * Aha cross-surface sync events (crew ruling AHA-SYNC-TIERS, RAG afa2fbb9).
 *
 * Riker's sync ruling (c): a durable `aha_events` table in Supabase is the contract; every write
 * path (dashboard API routes, MCP crew tools, extension via the dashboard) emits one row, and each
 * surface polls `listAhaEventsSince` to learn that another surface changed something, then refetches
 * the affected resource from Aha. Worf's rulings: events carry only resource pointers (never Aha
 * payload data), and the table is service-role-only — surfaces read it through server endpoints.
 */
import { getSupabaseClient } from './db.js';

export type AhaResourceType = 'story' | 'epic' | 'release' | 'requirement' | 'sprint' | 'project';
export type AhaOperation = 'created' | 'updated' | 'deleted' | 'status_changed' | 'linked';
export type AhaActor = 'dashboard' | 'mcp' | 'extension';

export interface AhaEventMeta {
  sprint_id?: string;
  project_id?: string;
  status_from?: string;
  status_to?: string;
}

export interface AhaEventRecord {
  id: string;
  createdAt: string;
  resourceType: AhaResourceType;
  resourceId: string;
  operation: AhaOperation;
  actor: AhaActor;
  meta: AhaEventMeta;
}

export interface AhaEventInput {
  resourceType: AhaResourceType;
  resourceId: string;
  operation: AhaOperation;
  actor: AhaActor;
  meta?: AhaEventMeta;
}

function mapRow(row: Record<string, unknown>): AhaEventRecord {
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    resourceType: row.resource_type as AhaResourceType,
    resourceId: String(row.resource_id),
    operation: row.operation as AhaOperation,
    actor: row.actor as AhaActor,
    meta: (row.meta as AhaEventMeta) ?? {},
  };
}

/** Append one sync event. Throws if the store is unreachable or the insert fails. */
export async function emitAhaEvent(input: AhaEventInput): Promise<AhaEventRecord> {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('aha_events')
    .insert({
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      operation: input.operation,
      actor: input.actor,
      meta: input.meta ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`aha_events insert failed: ${error.message}`);
  return mapRow(data as Record<string, unknown>);
}

/**
 * Best-effort emit for write paths where the Aha mutation already succeeded — event loss means a
 * stale UI until the next manual refresh, not data corruption, so don't fail the caller's write.
 */
export async function emitAhaEventSafe(input: AhaEventInput): Promise<AhaEventRecord | null> {
  try {
    return await emitAhaEvent(input);
  } catch (error) {
    console.warn(`[aha-events] emit failed (sync will lag): ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Poll contract for all surfaces: pass the `now` from the previous call as `sinceIso` (null on the
 * first call returns only `now`, so pollers start from the present instead of replaying history).
 */
export async function listAhaEventsSince(
  sinceIso: string | null,
  limit = 100,
): Promise<{ events: AhaEventRecord[]; now: string }> {
  const now = new Date().toISOString();
  if (!sinceIso) return { events: [], now };
  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('aha_events')
    .select('*')
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`aha_events read failed: ${error.message}`);
  return { events: ((data ?? []) as Record<string, unknown>[]).map(mapRow), now };
}
