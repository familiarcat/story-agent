/**
 * Web research tools — the loop's only outbound network capability.
 *
 * SECURITY (Worf owns this): fetching a URL chosen by a model is an SSRF vector. An unguarded fetch
 * to http://169.254.169.254/ reads cloud instance metadata — i.e. credentials. So every request is
 * screened: https/http only, and private / loopback / link-local / metadata hosts are refused before
 * any connection is attempted. Responses are size-capped and reduced to text; we never execute
 * fetched content.
 */
import { z } from 'zod';
import { resolveWorfGateCredential } from '@story-agent/shared/worfgate-credentials';
import type { AgentTool } from './tools.js';

/** Hosts that must never be fetched — cloud metadata and anything inside the local network. */
const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^169\.254\./,            // link-local, incl. 169.254.169.254 cloud metadata
  /^10\./,                  // RFC1918
  /^192\.168\./,            // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /\.internal$/i,
  /\.local$/i,
  /^metadata\./i,
];

/** Validate a URL for egress. Returns an error string, or null when the URL is acceptable. */
export function screenUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return `not a valid URL: ${raw}`;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return `refusing non-http(s) scheme: ${u.protocol}`;
  }
  const host = u.hostname;
  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(host))) {
    return `refusing request to internal/metadata host: ${host}`;
  }
  return null;
}

/** Strip markup and scripts so the model receives readable text, not a DOM. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAX_CHARS = 20_000;

export const webFetchTool: AgentTool = {
  name: 'web_fetch',
  description: 'Fetch a public http(s) URL and return its readable text (markup stripped, size-capped). Use for docs, changelogs, API references. Internal/metadata hosts are refused.',
  schema: z.object({
    url: z.string().describe('Absolute http(s) URL to fetch.'),
    maxChars: z.number().optional().describe('Max characters of text to return (default 20000).'),
  }),
  handler: async (a) => {
    const url = String(a.url ?? '');
    const bad = screenUrl(url);
    if (bad) return `error: ${bad}`;
    const cap = Math.max(500, Math.min(MAX_CHARS, Number(a.maxChars ?? MAX_CHARS)));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const resp = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'story-agent/1.0 (+agent-core web_fetch)' } });
      const body = await resp.text();
      const text = /json|text\/plain/i.test(resp.headers.get('content-type') ?? '') ? body : htmlToText(body);
      const clipped = text.length > cap ? text.slice(0, cap) + `\n…[truncated at ${cap} chars]` : text;
      return `HTTP ${resp.status} ${url}\n\n${clipped}`;
    } catch (e: any) {
      return `error: fetch failed (${e?.name === 'AbortError' ? 'timed out' : e?.message || e})`;
    } finally {
      clearTimeout(timer);
    }
  },
};

export const webSearchTool: AgentTool = {
  name: 'web_search',
  description: 'Search the web and return ranked result titles, URLs and snippets. Use to FIND sources, then web_fetch to read one.',
  schema: z.object({
    query: z.string().describe('Search query.'),
    count: z.number().optional().describe('Number of results (default 5, max 15).'),
  }),
  handler: async (a) => {
    // Credential goes through the WorfGate broker: authorized by crew identity, audited, never logged.
    const cred = resolveWorfGateCredential('BING_SEARCH_V7_SUBSCRIPTION_KEY', { operation: 'web:search', crewId: 'uhura' });
    if (!cred.authorized) return `error: WorfGate denied web search (${cred.reason})`;
    if (!cred.available || !cred.value) return 'error: web search unavailable — BING_SEARCH_V7_SUBSCRIPTION_KEY is not configured. Use web_fetch with a known URL instead.';
    const count = Math.max(1, Math.min(15, Number(a.count ?? 5)));
    const endpoint = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(String(a.query ?? ''))}&count=${count}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const resp = await fetch(endpoint, { signal: ctrl.signal, headers: { 'Ocp-Apim-Subscription-Key': cred.value } });
      if (!resp.ok) return `error: search HTTP ${resp.status}`;
      const data: any = await resp.json();
      const items: any[] = data?.webPages?.value ?? [];
      if (!items.length) return '(no results)';
      return items.map((r, i) => `${i + 1}. ${r.name}\n   ${r.url}\n   ${r.snippet ?? ''}`).join('\n');
    } catch (e: any) {
      return `error: search failed (${e?.name === 'AbortError' ? 'timed out' : e?.message || e})`;
    } finally {
      clearTimeout(timer);
    }
  },
};