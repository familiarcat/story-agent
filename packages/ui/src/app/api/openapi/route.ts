/**
 * Serves the live OpenAPI spec to the /docs Swagger UI.
 *
 * Monorepo note: the spec lives at repo-root specs/, while this UI runs from packages/ui (both in
 * `next dev` and in the Docker image, whose WORKDIR is /app/packages/ui and which COPYs the whole
 * repo). So we resolve a couple of candidate paths relative to cwd rather than bundling a copy.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CANDIDATES = [
  join(process.cwd(), '..', '..', 'specs', 'openapi.current.yaml'), // packages/ui → repo root
  join(process.cwd(), 'specs', 'openapi.current.yaml'),             // run from repo root
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function hostFromRequest(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return host.split(':')[0].trim().toLowerCase();
}

function shouldUseUiServers(request: Request, surface: string | null): boolean {
  if (surface === 'ui') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return LOCAL_HOSTS.has(hostFromRequest(request));
}

function rewriteServersForUi(yaml: string): string {
  // For local Swagger UI, force same-origin API calls through Next.js (/api/*) to avoid CORS.
  const uiServers = [
    'servers:',
    '  - url: /api',
    '    description: Local UI proxy (same-origin, no CORS)',
    '  - url: http://localhost:3103',
    '    description: Local crew server direct (outside browser CORS constraints)',
  ].join('\n');

  const serversBlock = /(^|\n)servers:\n(?:[ \t]+-\s+url:[^\n]*\n(?:[ \t]+[^\n]*\n)*)+/m;
  if (serversBlock.test(yaml)) {
    return yaml.replace(serversBlock, `\n${uiServers}\n`);
  }
  return yaml;
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const surface = url.searchParams.get('surface');
  const uiSurface = shouldUseUiServers(request, surface);

  for (const path of CANDIDATES) {
    try {
      let yaml = readFileSync(path, 'utf8');
      if (uiSurface) {
        yaml = rewriteServersForUi(yaml);
        if (!yaml.includes('url: /api')) {
          return Response.json({ error: 'failed to enforce same-origin OpenAPI servers' }, { status: 500 });
        }
      }
      return new Response(yaml, {
        headers: {
          'Content-Type': 'application/yaml; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-OpenAPI-Surface': uiSurface ? 'ui' : 'raw',
        },
      });
    } catch { /* try next */ }
  }
  return Response.json({ error: 'openapi.current.yaml not found' }, { status: 404 });
}
