/**
 * Story Agent application-bucket key structure.
 *
 * The bucket ITSELF is resolved through WorfGate (STORY_AGENT_S3_BUCKET — see
 * worfgate-credentials.ts and scripts/setup-app-bucket.sh), never hardcoded. This module is the
 * single source of truth for the KEY LAYOUT inside that bucket, so every caller (agent-core tools,
 * scripts, the dashboard) builds identical paths instead of each inventing its own convention.
 *
 * Layout:
 *   clients/{clientId}/projects/{projectId}/sprints/{sprintId}/{...}
 *   clients/{clientId}/projects/{projectId}/artifacts/{...}       (project-level, no sprint)
 *   static/crew/{crewId}/{...}                                     (per-officer reference files
 *                                                                    RAG cannot accommodate — large
 *                                                                    binaries, design assets, etc.)
 *   static/design-tokens/{...}
 *
 * scripts/setup-app-bucket.sh lays down the top-level prefixes; this module MUST stay in sync with
 * that script's skeleton.
 */
import { resolveWorfGateCredential } from './worfgate-credentials.js';

export interface BucketResolution {
  bucket: string | null;
  reason: string;
}

/** Resolve the application bucket name through WorfGate. Never hardcode the bucket elsewhere. */
export function resolveStoryAgentBucket(crewId = 'agent'): BucketResolution {
  const r = resolveWorfGateCredential('STORY_AGENT_S3_BUCKET', { operation: 'aws:deploy', crewId });
  if (r.authorized && r.available && r.value) return { bucket: r.value, reason: 'resolved via WorfGate' };
  return {
    bucket: null,
    reason: r.available
      ? r.reason
      : `STORY_AGENT_S3_BUCKET not set — run scripts/setup-app-bucket.sh once to provision + persist it (${r.reason})`,
  };
}

const clean = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '-');

export function clientPrefix(clientId: string): string {
  return `clients/${clean(clientId)}/`;
}

export function projectPrefix(clientId: string, projectId: string): string {
  return `${clientPrefix(clientId)}projects/${clean(projectId)}/`;
}

export function sprintPrefix(clientId: string, projectId: string, sprintId: string): string {
  return `${projectPrefix(clientId, projectId)}sprints/${clean(sprintId)}/`;
}

export function projectArtifactsPrefix(clientId: string, projectId: string): string {
  return `${projectPrefix(clientId, projectId)}artifacts/`;
}

/** Static, non-RAG-able reference files a specific crew member needs (design assets, large binaries,
 *  reference decks, etc.) — separate from the observation-memory RAG corpus by design. */
export function crewStaticPrefix(crewId: string): string {
  return `static/crew/${clean(crewId)}/`;
}

export function designTokensPrefix(): string {
  return 'static/design-tokens/';
}

/** Build a full key under a sprint (or project/client, when sprintId/projectId are omitted). */
export function buildKey(opts: { clientId: string; projectId?: string; sprintId?: string; filename: string }): string {
  const { clientId, projectId, sprintId, filename } = opts;
  if (projectId && sprintId) return `${sprintPrefix(clientId, projectId, sprintId)}${filename}`;
  if (projectId) return `${projectArtifactsPrefix(clientId, projectId)}${filename}`;
  return `${clientPrefix(clientId)}${filename}`;
}
