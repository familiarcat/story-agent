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
  | 'figma:tokens-sync'
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
  TOKENS_STUDIO_GITHUB_PAT: { name: 'TOKENS_STUDIO_GITHUB_PAT', description: 'Fine-grained GitHub PAT for Tokens Studio Figma↔repo sync (this repo only; Contents R/W + Pull requests R/W). Centralized in ~/.alexai-secrets, brokered by WorfGate.', operations: ['figma:tokens-sync'], required: false },
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

// ── Pluggable secret providers ────────────────────────────────────────────────
//
// WorfGate is a FACADE: authorization + audit + Worf governance stay central, while resolution
// walks a priority-ordered chain of providers. The env provider (~/.zshrc) is the default;
// HashiCorp Vault, AWS Secrets Manager, or other backends register alongside it. The crew never
// learns which backend served a secret — only that WorfGate brokered it.

export interface CredentialProvider {
  /** Identifier, e.g. 'env' | 'vault' | 'aws-secrets-manager'. */
  name: string;
  /** Lower = consulted first. env defaults to 100; put external vaults below to override. */
  priority: number;
  /** Whether this provider is configured/active in the current environment. */
  isActive(): boolean;
  /** Resolve a credential by name; return undefined if absent. */
  get(name: string): Promise<string | undefined>;
}

const PROVIDERS: CredentialProvider[] = [];

/** Register a secret provider (sorted by priority; lower first). */
export function registerCredentialProvider(p: CredentialProvider): void {
  const i = PROVIDERS.findIndex(x => x.name === p.name);
  if (i >= 0) PROVIDERS.splice(i, 1);
  PROVIDERS.push(p);
  PROVIDERS.sort((a, b) => a.priority - b.priority);
}

/** Active providers in priority order (for status/inventory). */
export function listCredentialProviders(): Array<{ name: string; priority: number; active: boolean }> {
  return PROVIDERS.map(p => ({ name: p.name, priority: p.priority, active: p.isActive() }));
}

// Default provider: the process environment (loaded from ~/.zshrc / ~/.alexai-secrets).
registerCredentialProvider({
  name: 'env',
  priority: 100,
  isActive: () => true,
  get: async (name: string) => process.env[name] || undefined,
});

/** Shared authorization gate (no audit, no resolution). */
function checkAuthorization(name: string, operation: CredentialOperation, crewId: string): { authorized: boolean; reason: string } {
  const spec = CREW_CREDENTIAL_REGISTRY[name];
  if (!spec) return { authorized: false, reason: `'${name}' is not in the WorfGate credential registry` };
  if (!spec.operations.includes(operation)) return { authorized: false, reason: `'${name}' is not permitted for operation '${operation}'` };
  if (!AUTHORIZED_CREW.has(crewId)) return { authorized: false, reason: `crew member '${crewId}' is not authorized to broker credentials` };
  return { authorized: true, reason: 'authorized' };
}

/** Presence-only check across the env (sync, no value). */
export function worfGateHasCredential(name: string): boolean {
  return Boolean(process.env[name]);
}

/**
 * Resolve a credential through WorfGate (sync, ENV provider only — fast path for hot code).
 * For the full provider chain (Vault / Secrets Manager), use resolveWorfGateCredentialAsync.
 */
export function resolveWorfGateCredential(
  name: string,
  ctx: { operation: CredentialOperation; crewId?: string; clientId?: string | null },
): CredentialAccessResult {
  const crewId = (ctx.crewId || WORFGATE_OFFICER).toLowerCase();
  const value = process.env[name];
  const available = Boolean(value);
  const auth = checkAuthorization(name, ctx.operation, crewId);
  audit({ timestamp: new Date().toISOString(), name, operation: ctx.operation, crewId, authorized: auth.authorized, available });
  if (!auth.authorized) return { name, authorized: false, available, reason: auth.reason };
  if (!available) return { name, authorized: true, available: false, reason: `'${name}' not present in env — add to ~/.zshrc / ~/.alexai-secrets, or configure a provider (Vault/Secrets Manager)` };
  return { name, authorized: true, available: true, value, reason: `resolved by WorfGate for ${crewId} (${ctx.operation})` };
}

/**
 * Resolve a credential through WorfGate across the full provider chain (env → Vault → Secrets
 * Manager → …). Authorizes by crew identity, audits, and returns the value + which provider served
 * it ONLY to calling code. Use redactCredential() to serialize safely.
 */
export async function resolveWorfGateCredentialAsync(
  name: string,
  ctx: { operation: CredentialOperation; crewId?: string; clientId?: string | null },
): Promise<CredentialAccessResult & { source?: string }> {
  const crewId = (ctx.crewId || WORFGATE_OFFICER).toLowerCase();
  const auth = checkAuthorization(name, ctx.operation, crewId);
  if (!auth.authorized) {
    audit({ timestamp: new Date().toISOString(), name, operation: ctx.operation, crewId, authorized: false, available: false });
    return { name, authorized: false, available: false, reason: auth.reason };
  }
  for (const p of PROVIDERS.filter(x => x.isActive())) {
    let value: string | undefined;
    try { value = await p.get(name); } catch { value = undefined; }
    if (value) {
      audit({ timestamp: new Date().toISOString(), name, operation: ctx.operation, crewId, authorized: true, available: true });
      return { name, authorized: true, available: true, value, source: p.name, reason: `resolved by WorfGate via '${p.name}' for ${crewId} (${ctx.operation})` };
    }
  }
  audit({ timestamp: new Date().toISOString(), name, operation: ctx.operation, crewId, authorized: true, available: false });
  return { name, authorized: true, available: false, reason: `'${name}' not found in any active provider (${PROVIDERS.filter(p => p.isActive()).map(p => p.name).join(', ')})` };
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
