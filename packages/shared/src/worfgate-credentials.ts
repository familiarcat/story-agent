/**
 * WorfGate Credential Broker.
 *
 * The crew obtains credentials for authorized operations THROUGH WorfGate, not by ad-hoc env
 * reads. WorfGate resolves a NAMED credential from the process environment (loaded from
 * ~/.zshrc / ~/.alexai-secrets — see [[worfgate-secrets-principle]]), authorizes the request by
 * crew identity, AUDITS every access, and NEVER logs or serializes the secret value.
 *
 * Worf is the owning officer: he holds the WorfGate skill, so the crew always has governed
 * access to this capability and its tools through him.
 */

export type CredentialOperation =
  | 'supabase:migrate' | 'supabase:link' | 'supabase:query'
  | 'aws:deploy' | 'aws:secrets'
  | 'aha:write' | 'aha:read'
  | 'github:push'
  | 'llm:call';

export interface CredentialSpec {
  /** Environment variable name (loaded from ~/.zshrc / ~/.alexai-secrets). */
  name: string;
  description: string;
  /** Operations this credential is permitted to serve. */
  operations: CredentialOperation[];
  /** Whether absence should be treated as a hard blocker for its operations. */
  required: boolean;
}

/** The officer who owns the WorfGate skill — always authorized to broker credentials. */
export const WORFGATE_OFFICER = 'worf';

/** Crew members permitted to broker credentials (the full bridge crew operate under Worf's governance). */
const AUTHORIZED_CREW = new Set([
  'worf', 'picard', 'riker', 'data', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark',
]);

/** Allowlisted credentials the crew may broker — keyed by env var name. */
export const CREW_CREDENTIAL_REGISTRY: Record<string, CredentialSpec> = {
  SUPABASE_ACCESS_TOKEN: { name: 'SUPABASE_ACCESS_TOKEN', description: 'Supabase CLI auth for link + db push', operations: ['supabase:migrate', 'supabase:link'], required: false },
  SUPABASE_DB_PASSWORD: { name: 'SUPABASE_DB_PASSWORD', description: 'Cloud Postgres password for db push', operations: ['supabase:migrate'], required: false },
  SUPABASE_DB_URL: { name: 'SUPABASE_DB_URL', description: 'Postgres connection string', operations: ['supabase:migrate', 'supabase:query'], required: false },
  SUPABASE_CLOUD_URL: { name: 'SUPABASE_CLOUD_URL', description: 'Cloud Supabase REST URL', operations: ['supabase:query'], required: false },
  SUPABASE_URL: { name: 'SUPABASE_URL', description: 'Supabase REST URL', operations: ['supabase:query'], required: false },
  SUPABASE_KEY: { name: 'SUPABASE_KEY', description: 'Supabase service role key', operations: ['supabase:query'], required: false },
  CREW_LLM_APPROVED_KEY: { name: 'CREW_LLM_APPROVED_KEY', description: 'OpenRouter API key', operations: ['llm:call'], required: true },
  CREW_LLM_APPROVED_URL: { name: 'CREW_LLM_APPROVED_URL', description: 'OpenRouter base URL', operations: ['llm:call'], required: false },
  AHA_API_KEY: { name: 'AHA_API_KEY', description: 'Aha! REST API key', operations: ['aha:write', 'aha:read'], required: false },
  AHA_DOMAIN: { name: 'AHA_DOMAIN', description: 'Aha! domain', operations: ['aha:write', 'aha:read'], required: false },
  AWS_ACCESS_KEY_ID: { name: 'AWS_ACCESS_KEY_ID', description: 'AWS access key', operations: ['aws:deploy', 'aws:secrets'], required: false },
  AWS_SECRET_ACCESS_KEY: { name: 'AWS_SECRET_ACCESS_KEY', description: 'AWS secret key', operations: ['aws:deploy', 'aws:secrets'], required: false },
  AWS_REGION: { name: 'AWS_REGION', description: 'AWS region', operations: ['aws:deploy', 'aws:secrets'], required: false },
  GITHUB_TOKEN: { name: 'GITHUB_TOKEN', description: 'GitHub PAT for branch/PR operations', operations: ['github:push'], required: false },
};

export interface CredentialAccessResult {
  name: string;
  authorized: boolean;
  available: boolean;
  /** The secret value — present ONLY when authorized && available. NEVER serialize this field. */
  value?: string;
  reason: string;
}

export interface CredentialAuditEntry {
  timestamp: string;
  name: string;
  operation: CredentialOperation;
  crewId: string;
  authorized: boolean;
  available: boolean;
}

const credentialAuditLog: CredentialAuditEntry[] = [];
const AUDIT_MAX = 500;

function audit(entry: CredentialAuditEntry): void {
  credentialAuditLog.push(entry);
  if (credentialAuditLog.length > AUDIT_MAX) credentialAuditLog.splice(0, credentialAuditLog.length - AUDIT_MAX);
}

/** The credential-access audit trail (no values, ever). */
export function getCredentialAuditLog(): CredentialAuditEntry[] {
  return [...credentialAuditLog];
}

/** Presence-only check — safe to expose; never returns the value. */
export function worfGateHasCredential(name: string): boolean {
  return Boolean(process.env[name]);
}

/**
 * Resolve a credential through WorfGate for an authorized crew operation. Reads from the process
 * environment (loaded from ~/.zshrc), authorizes by crew identity, audits the access, and returns
 * the value ONLY to the calling code. Callers must NOT log the result; use redactCredential() to
 * serialize it safely.
 */
export function resolveWorfGateCredential(
  name: string,
  ctx: { operation: CredentialOperation; crewId?: string; clientId?: string | null },
): CredentialAccessResult {
  const crewId = (ctx.crewId || WORFGATE_OFFICER).toLowerCase();
  const spec = CREW_CREDENTIAL_REGISTRY[name];
  const value = process.env[name];
  const available = Boolean(value);

  const stamp = (authorized: boolean): void =>
    audit({ timestamp: new Date().toISOString(), name, operation: ctx.operation, crewId, authorized, available });

  if (!spec) {
    stamp(false);
    return { name, authorized: false, available, reason: `'${name}' is not in the WorfGate credential registry` };
  }
  if (!spec.operations.includes(ctx.operation)) {
    stamp(false);
    return { name, authorized: false, available, reason: `'${name}' is not permitted for operation '${ctx.operation}'` };
  }
  if (!AUTHORIZED_CREW.has(crewId)) {
    stamp(false);
    return { name, authorized: false, available, reason: `crew member '${crewId}' is not authorized to broker credentials` };
  }

  stamp(true);
  if (!available) {
    return { name, authorized: true, available: false, reason: `'${name}' is not present in the environment — add it to ~/.zshrc / ~/.alexai-secrets` };
  }
  return { name, authorized: true, available: true, value, reason: `resolved by WorfGate for ${crewId} (${ctx.operation})` };
}

/** Safe serialization: strips the secret value, keeps the decision. */
export function redactCredential(r: CredentialAccessResult): Omit<CredentialAccessResult, 'value'> & { hasValue: boolean } {
  const { value, ...rest } = r;
  return { ...rest, hasValue: Boolean(value) };
}

/** Presence map for a set of credentials (no values) — for status/inventory views. */
export function credentialStatus(names?: string[]): Array<{ name: string; description: string; operations: CredentialOperation[]; available: boolean; required: boolean }> {
  const keys = names && names.length ? names : Object.keys(CREW_CREDENTIAL_REGISTRY);
  return keys
    .map(k => CREW_CREDENTIAL_REGISTRY[k])
    .filter(Boolean)
    .map(s => ({ name: s.name, description: s.description, operations: s.operations, available: worfGateHasCredential(s.name), required: s.required }));
}
