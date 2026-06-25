/**
 * Aha! over the crew server — exposes the Aha products list (the nav tree's top level) via HTTP so
 * the VS Code extension / web read from a SINGLE source (the crew's resolved Aha credentials, with
 * caching) instead of each surface holding the key. Per the crew Aha-nav plan: fetch top-level
 * products first, cached; deeper hierarchy is lazy. Mounted at GET /aha/products on the agent server.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { resolveAhaCredentials } from '@story-agent/shared/aha-credentials';

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

/** Serve GET /aha/products. Returns true if it handled the request. */
export async function handleAhaRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = (req.url || '').split('?')[0];
  if (!(req.method === 'GET' && url === '/aha/products')) return false;
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
