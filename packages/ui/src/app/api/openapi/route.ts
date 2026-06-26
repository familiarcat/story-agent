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

export function GET() {
  for (const path of CANDIDATES) {
    try {
      const yaml = readFileSync(path, 'utf8');
      return new Response(yaml, {
        headers: { 'Content-Type': 'application/yaml; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    } catch { /* try next */ }
  }
  return Response.json({ error: 'openapi.current.yaml not found' }, { status: 404 });
}
