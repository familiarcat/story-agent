/**
 * MCP Registry client — read-only discovery against the official MCP Registry
 * (registry.modelcontextprotocol.io, REST API v0). This is the "sensor array" feed: it LISTS/SEARCHES
 * published MCP servers so the crew can discover capability they don't yet have. It NEVER executes a
 * server — discovery is catalog-only; execution stays human-gated downstream (Worf consensus).
 *
 * API shape (v0): GET /v0/servers?search=&limit=&cursor= →
 *   { servers: [{ name, description, title, version, remotes:[{type,url}], packages:[...],
 *                 _meta: { "io.modelcontextprotocol.registry/official": { status, isLatest, ... } } }],
 *     metadata: { nextCursor, count } }
 */

const REGISTRY_BASE = (process.env.MCP_REGISTRY_URL || 'https://registry.modelcontextprotocol.io').replace(/\/$/, '');

export interface McpRegistryRemote {
  type: string; // streamable-http | sse | stdio
  url: string;
}

export interface McpRegistryPackage {
  registryType?: string; // npm | pypi | oci | ...
  identifier?: string;
  version?: string;
  [k: string]: unknown;
}

export interface McpRegistryServer {
  name: string;
  description: string;
  title?: string;
  version?: string;
  remotes?: McpRegistryRemote[];
  packages?: McpRegistryPackage[];
  status?: string; // active | deprecated | ...
  isLatest?: boolean;
}

export interface McpRegistrySearchResult {
  servers: McpRegistryServer[];
  nextCursor?: string;
  count: number;
}

/** Normalize a raw registry entry into our flat McpRegistryServer (pure — unit-testable). */
export function normalizeServer(raw: any): McpRegistryServer {
  const meta = raw?._meta?.['io.modelcontextprotocol.registry/official'] ?? {};
  return {
    name: String(raw?.name ?? ''),
    description: String(raw?.description ?? ''),
    title: typeof raw?.title === 'string' ? raw.title : undefined,
    version: typeof raw?.version === 'string' ? raw.version : undefined,
    remotes: Array.isArray(raw?.remotes)
      ? raw.remotes.map((r: any) => ({ type: String(r?.type ?? ''), url: String(r?.url ?? '') })).filter((r: McpRegistryRemote) => r.url)
      : undefined,
    packages: Array.isArray(raw?.packages) ? (raw.packages as McpRegistryPackage[]) : undefined,
    status: typeof meta?.status === 'string' ? meta.status : undefined,
    isLatest: typeof meta?.isLatest === 'boolean' ? meta.isLatest : undefined,
  };
}

/**
 * Search the official MCP registry. `fetchImpl` is injectable so callers/tests can supply a mock or a
 * WorfGate-brokered fetch. Returns normalized servers + the pagination cursor.
 */
export async function searchMcpRegistry(
  opts: { search?: string; limit?: number; cursor?: string; fetchImpl?: typeof fetch } = {},
): Promise<McpRegistrySearchResult> {
  const { search, limit = 20, cursor, fetchImpl = fetch } = opts;
  const url = new URL(`${REGISTRY_BASE}/v0/servers`);
  if (search) url.searchParams.set('search', search);
  if (limit) url.searchParams.set('limit', String(limit));
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetchImpl(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`MCP registry HTTP ${res.status}`);
  const json: any = await res.json();
  const servers = Array.isArray(json?.servers) ? json.servers.map(normalizeServer) : [];
  return {
    servers,
    nextCursor: json?.metadata?.nextCursor,
    count: typeof json?.metadata?.count === 'number' ? json.metadata.count : servers.length,
  };
}
