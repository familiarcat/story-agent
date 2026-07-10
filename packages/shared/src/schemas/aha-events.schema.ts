/**
 * Aha event schema contract v1.0 (crew phased plan, Phase 1 — AhaSync team).
 *
 * SINGLE SOURCE OF TRUTH for the cross-surface Aha event shape. WorfGate's WGIM validation suite
 * validates every event AGAINST this contract before it reaches the pipeline. Extend only via the
 * schema-extension RFC process (docs/rfc/); bump the MAJOR version on any breaking change.
 */

export const AHA_EVENTS_SCHEMA_VERSION = '1.0.0';

export const AHA_RESOURCE_TYPES = ['story', 'epic', 'release', 'requirement', 'sprint', 'project'] as const;
export const AHA_OPERATIONS = ['created', 'updated', 'deleted', 'status_changed', 'linked'] as const;
export const AHA_ACTORS = ['dashboard', 'mcp', 'extension'] as const;
export const AHA_META_KEYS = ['sprint_id', 'project_id', 'status_from', 'status_to'] as const;

export type AhaResourceType = typeof AHA_RESOURCE_TYPES[number];
export type AhaOperation = typeof AHA_OPERATIONS[number];
export type AhaActor = typeof AHA_ACTORS[number];

export interface AhaEventMeta {
  sprint_id?: string;
  project_id?: string;
  status_from?: string;
  status_to?: string;
}

export interface AhaEventInput {
  resourceType: AhaResourceType;
  resourceId: string;
  operation: AhaOperation;
  actor: AhaActor;
  meta?: AhaEventMeta;
}

export type AhaEventValidation =
  | { ok: true; version: string }
  | { ok: false; version: string; errors: string[] };

const oneOf = (values: readonly string[], v: unknown): boolean =>
  typeof v === 'string' && values.includes(v);

/** WGIM entry point — pure, no I/O. Collects ALL violations rather than stopping at the first. */
export function validateAhaEventInput(input: unknown): AhaEventValidation {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, version: AHA_EVENTS_SCHEMA_VERSION, errors: ['input must be a non-null object'] };
  }
  const o = input as Record<string, unknown>;

  if (!oneOf(AHA_RESOURCE_TYPES, o.resourceType)) {
    errors.push(`resourceType must be one of [${AHA_RESOURCE_TYPES.join(', ')}], got ${JSON.stringify(o.resourceType)}`);
  }
  if (!oneOf(AHA_OPERATIONS, o.operation)) {
    errors.push(`operation must be one of [${AHA_OPERATIONS.join(', ')}], got ${JSON.stringify(o.operation)}`);
  }
  if (!oneOf(AHA_ACTORS, o.actor)) {
    errors.push(`actor must be one of [${AHA_ACTORS.join(', ')}], got ${JSON.stringify(o.actor)}`);
  }
  if (typeof o.resourceId !== 'string' || o.resourceId.length === 0) {
    errors.push('resourceId must be a non-empty string');
  }
  if (o.meta !== undefined) {
    if (typeof o.meta !== 'object' || o.meta === null || Array.isArray(o.meta)) {
      errors.push('meta must be a plain object when present');
    } else {
      for (const [key, value] of Object.entries(o.meta as Record<string, unknown>)) {
        if (!(AHA_META_KEYS as readonly string[]).includes(key)) {
          errors.push(`meta key "${key}" is not in the v${AHA_EVENTS_SCHEMA_VERSION} contract (allowed: ${AHA_META_KEYS.join(', ')})`);
        } else if (typeof value !== 'string') {
          errors.push(`meta.${key} must be a string, got ${typeof value}`);
        }
      }
    }
  }

  return errors.length === 0
    ? { ok: true, version: AHA_EVENTS_SCHEMA_VERSION }
    : { ok: false, version: AHA_EVENTS_SCHEMA_VERSION, errors };
}

/** Compatible when the MAJOR component matches the contract's major version. */
export function isCompatibleSchemaVersion(version: string): boolean {
  const major = version.split('.')[0];
  return major !== '' && major === AHA_EVENTS_SCHEMA_VERSION.split('.')[0];
}
