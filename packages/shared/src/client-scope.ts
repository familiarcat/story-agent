import type { StoryRecord } from './index.js';

export type ClientRole =
  | 'client_admin'
  | 'client_delivery'
  | 'regulated_reader'
  | 'viewer'
  | 'unknown';

export type ClientScopeReason =
  | 'approved'
  | 'not_requested'
  | 'missing_client_selection'
  | 'client_mismatch'
  | 'insufficient_role'
  | 'missing_purpose';

export interface ClientAccessContext {
  selectedClientId: string | null;
  clientRole: ClientRole;
  purpose: string | null;
  includeControlled: boolean;
}

export interface ClientScopeAuditEvent {
  timestamp: string;
  selectedClientId: string | null;
  requestedClientId: string | null;
  clientRole: ClientRole;
  purpose: string | null;
  includeControlled: boolean;
  outcome: 'approved' | 'degraded';
  reason: ClientScopeReason;
}

export interface ClientScopeDecision {
  allowed: boolean;
  reason: ClientScopeReason;
  mode: 'authorized' | 'advisory_downgrade';
  audit: ClientScopeAuditEvent;
}

const CONTROLLED_ROLES = new Set<ClientRole>(['client_admin', 'client_delivery', 'regulated_reader']);
const CONTROLLED_PURPOSES = new Set(['ui_population', 'ui_story_detail', 'controlled_data']);

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toClientRole(value: string | null | undefined): ClientRole {
  const role = normalize(value);
  if (
    role === 'client_admin' ||
    role === 'client_delivery' ||
    role === 'regulated_reader' ||
    role === 'viewer'
  ) {
    return role;
  }
  return 'unknown';
}

export function inferClientIdFromStory(story: Pick<StoryRecord, 'clientId' | 'repoFullName'>): string | null {
  const explicit = normalize(story.clientId ?? null);
  if (explicit) return explicit;

  const owner = normalize(story.repoFullName.split('/')[0]);
  return owner;
}

export function buildClientAccessContext(input: {
  selectedClientId?: string | null;
  clientRole?: string | null;
  purpose?: string | null;
  includeControlled?: boolean;
}): ClientAccessContext {
  return {
    selectedClientId: normalize(input.selectedClientId ?? null),
    clientRole: toClientRole(input.clientRole ?? null),
    purpose: normalize(input.purpose ?? null),
    includeControlled: Boolean(input.includeControlled),
  };
}

export function evaluateControlledDataAccess(input: {
  context: ClientAccessContext;
  requestedClientId: string | null;
}): ClientScopeDecision {
  const requestedClientId = normalize(input.requestedClientId);
  const { context } = input;

  let reason: ClientScopeReason = 'approved';
  let allowed = true;

  if (!context.includeControlled) {
    allowed = false;
    reason = 'not_requested';
  } else if (!context.selectedClientId) {
    allowed = false;
    reason = 'missing_client_selection';
  } else if (requestedClientId && context.selectedClientId !== requestedClientId) {
    allowed = false;
    reason = 'client_mismatch';
  } else if (!CONTROLLED_ROLES.has(context.clientRole)) {
    allowed = false;
    reason = 'insufficient_role';
  } else if (!context.purpose || !CONTROLLED_PURPOSES.has(context.purpose)) {
    allowed = false;
    reason = 'missing_purpose';
  }

  const audit: ClientScopeAuditEvent = {
    timestamp: new Date().toISOString(),
    selectedClientId: context.selectedClientId,
    requestedClientId,
    clientRole: context.clientRole,
    purpose: context.purpose,
    includeControlled: context.includeControlled,
    outcome: allowed ? 'approved' : 'degraded',
    reason,
  };

  return {
    allowed,
    reason,
    mode: allowed ? 'authorized' : 'advisory_downgrade',
    audit,
  };
}

export function redactControlledStoryFields(story: StoryRecord): StoryRecord {
  return {
    ...story,
    storyUrl: '',
    prUrl: null,
    notes: null,
  };
}
