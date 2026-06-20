import type { StoryRecord } from './index.js';
export type ClientRole = 'client_admin' | 'client_delivery' | 'regulated_reader' | 'viewer' | 'unknown';
export type ClientScopeReason = 'approved' | 'not_requested' | 'missing_client_selection' | 'client_mismatch' | 'insufficient_role' | 'missing_purpose';
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
export declare function inferClientIdFromStory(story: Pick<StoryRecord, 'clientId' | 'repoFullName'>): string | null;
export declare function buildClientAccessContext(input: {
    selectedClientId?: string | null;
    clientRole?: string | null;
    purpose?: string | null;
    includeControlled?: boolean;
}): ClientAccessContext;
export declare function evaluateControlledDataAccess(input: {
    context: ClientAccessContext;
    requestedClientId: string | null;
}): ClientScopeDecision;
export declare function redactControlledStoryFields(story: StoryRecord): StoryRecord;
//# sourceMappingURL=client-scope.d.ts.map