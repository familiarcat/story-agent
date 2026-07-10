/**
 * Aha! over the crew server — exposes the Aha products list (the nav tree's top level) via HTTP so
 * the VS Code extension / web read from a SINGLE source (the crew's resolved Aha credentials, with
 * caching) instead of each surface holding the key. Per the crew Aha-nav plan: fetch top-level
 * products first, cached; deeper hierarchy is lazy. Mounted at GET /aha/products on the agent server.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { resolveAhaCredentials } from '@story-agent/shared/aha-credentials';
import { listAhaEventsSince } from '@story-agent/shared/aha-events';

async function aha(path: string): Promise<any> {
  const { domain, apiKey } = await resolveAhaCredentials();
  const resp = await fetch(`https://${domain}/api/v1/${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Aha ${resp.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

// Simple TTL cache (the crew plan's "local cache" — read-instant, reconcile in the background).
let cache: { at: number; products: any[] } | null = null;
const TTL_MS = 60_000;

async function listProducts(): Promise<any[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.products;
  const d = await aha('products?per_page=100');
  const products = (d.products ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    referencePrefix: p.reference_prefix ?? null,
    url: p.product_url ?? p.url ?? '',
  }));
  cache = { at: Date.now(), products };
  return products;
}

// Read-only proxy cache for arbitrary Aha GET paths (per-path TTL). Lets every surface read Aha
// through the single resolved key without each holding it. Constrained to GET + the Aha host.
const rawCache = new Map<string, { at: number; data: any }>();
// Only resource-ish paths (no host override, no scheme) — read-only GET, scoped to the Aha domain.
const SAFE_PATH = /^[A-Za-z0-9/_\-.]+(\?[A-Za-z0-9/_\-.=&%]*)?$/;

/** Serve GET /aha/products and GET /aha/raw?path=<aha-api-path>. Returns true if handled. */
export async function handleAhaRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const [path, qs] = (req.url || '').split('?');
  if (req.method !== 'GET') return false;

  if (path === '/aha/products') {
    try {
      const products = await listProducts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ products, cachedAt: cache?.at ?? null }));
    } catch (e: any) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e?.message || 'aha_unavailable' }));
    }
    return true;
  }

  if (path === '/aha/raw') {
    const params = new URLSearchParams(qs || '');
    const ahaPath = params.get('path') || '';
    if (!ahaPath || !SAFE_PATH.test(ahaPath) || ahaPath.includes('..')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_path' }));
      return true;
    }
    try {
      const cached = rawCache.get(ahaPath);
      let data: any;
      if (cached && Date.now() - cached.at < TTL_MS) data = cached.data;
      else { data = await aha(ahaPath); rawCache.set(ahaPath, { at: Date.now(), data }); }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e: any) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e?.message || 'aha_unavailable' }));
    }
    return true;
  }

  if (path === '/aha/events') {
    // Cross-surface sync poll (crew ruling AHA-SYNC-TIERS): ?since=<ISO from previous `now`>.
    const params = new URLSearchParams(qs || '');
    try {
      const result = await listAhaEventsSince(params.get('since'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e: any) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e?.message || 'events_unavailable' }));
    }
    return true;
  }

  return false;
}
