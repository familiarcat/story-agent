import * as vscode from 'vscode';
import { createAhaClient, type AhaClient } from '@story-agent/shared/aha-client';

// Types come from the canonical domain package (esbuild bundles only the lean client/mappers; the
// type-only re-export erases at build, so no heavy @story-agent/shared runtime dep is pulled in).
export type { AhaProject, AhaSprint, AhaSprintStory, AhaStory } from '@story-agent/shared';
import type { AhaStory } from '@story-agent/shared';

/**
 * VS Code Aha adapter — now built on the canonical createAhaClient (@story-agent/shared/aha-client)
 * so the field-mapping is shared (no fork), BUT it keeps this surface's deliberate PROXY-FIRST
 * transport via an injected fetchImpl: GET reads route through the crew server's single-source cache
 * (/aha/raw) first, then fall back to direct Aha REST with local creds. This is "both options" from
 * the dedup investigation (OBS memory 112): Option B (shared mappers) + Option A (proxy fetchImpl),
 * so we get full dedup with zero regression to the single-source proxy.
 */

function getConfigSafe(): { domain: string; apiKey: string } {
  const cfg = vscode.workspace.getConfiguration('storyAgent');
  // env (AWS/SSM or terminal launch) → VS Code settings. First non-empty wins (empty ≠ unset).
  const pick = (...vals: Array<string | undefined>): string =>
    vals.map(v => (v ?? '').trim()).find(v => v.length > 0) ?? '';
  return {
    domain: pick(process.env.AHA_DOMAIN, cfg.get<string>('ahaDomain')),
    apiKey: pick(process.env.AHA_API_KEY, process.env.AHA_API_TOKEN, cfg.get<string>('ahaApiKey')),
  };
}

function requireConfig(): { domain: string; apiKey: string } {
  const c = getConfigSafe();
  if (!c.domain || !c.apiKey) {
    throw new Error(
      'Aha credentials not configured. Set AHA_DOMAIN + AHA_API_KEY (or AHA_API_TOKEN) in your ' +
      'environment, or "Story Agent: Aha Api Key" / "Aha Domain" in VS Code settings.',
    );
  }
  return c;
}

export function isConfigured(): boolean {
  const c = getConfigSafe();
  return !!(c.domain && c.apiKey);
}

/** Crew server bases for the Aha single-source proxy — configured/cloud first, then the local loop. */
function agentBases(): string[] {
  const configured = (vscode.workspace.getConfiguration('storyAgent').get<string>('chat.agentServiceUrl') || process.env.STORY_AGENT_AGENT_URL || '').replace(/\/$/, '');
  const local = 'http://localhost:3103';
  return configured && configured !== local ? [configured, local] : [local];
}

/** A JSON Response-shim so createAhaClient (which calls res.ok/res.json/res.text) can consume proxy hits. */
function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) } as unknown as Response;
}

/**
 * Proxy-first fetch injected into createAhaClient. The path is reconstructed from the URL createAhaClient
 * built (`https://<domain>/api/v1/<path>`) — it is INTERNAL (created by the client from typed args, never
 * user input), so there is no traversal surface. GET reads try the crew proxy first; writes and proxy
 * misses fall through to direct Aha REST with local creds.
 */
function proxyFirstFetch(): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const marker = '/api/v1/';
    const at = url.indexOf(marker);
    const path = at >= 0 ? url.slice(at + marker.length) : '';

    if (method === 'GET' && path) {
      for (const base of agentBases()) {
        try {
          const r = await fetch(`${base}/aha/raw?path=${encodeURIComponent(path)}`);
          if (r.ok) {
            const d: unknown = await r.json();
            if (d && !(d as Record<string, unknown>).error) return jsonResponse(d);
          }
        } catch { /* fall through to direct REST */ }
      }
    }

    // Direct REST fallback (writes always; reads when the proxy is unreachable). Requires creds.
    const { domain, apiKey } = requireConfig();
    const directUrl = at >= 0 ? `https://${domain}${url.slice(at)}` : url;
    return fetch(directUrl, { ...init, headers: { ...(init?.headers as Record<string, string> | undefined), Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
  }) as typeof fetch;
}

/** Build the canonical client wired to this surface's proxy-first transport. Token rides via fetchImpl. */
function client(): AhaClient {
  const { domain } = getConfigSafe();
  return createAhaClient({ domain, token: '', fetchImpl: proxyFirstFetch() });
}

export async function fetchAhaStory(referenceNum: string, _token?: vscode.CancellationToken): Promise<AhaStory> {
  return client().getStory(referenceNum);
}

export async function listAhaProjects() {
  return client().listProjects();
}

export async function getProjectHierarchy(projectId: string) {
  return client().getHierarchy(projectId);
}
