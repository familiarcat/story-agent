'use client';

import { useEffect } from 'react';

/**
 * API Docs — renders the live crew-server OpenAPI spec with Swagger UI.
 *
 * Frugal (Quark): loads swagger-ui-dist from a CDN instead of adding a heavy npm dependency to the
 * monorepo, and points it at /api/openapi (which serves specs/openapi.current.yaml). No build step,
 * no new workspace dep.
 */
const SWAGGER_VERSION = '5.17.14';

export default function DocsPage() {
  useEffect(() => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const w = window as unknown as { SwaggerUIBundle?: (o: unknown) => void };
      w.SwaggerUIBundle?.({
        url: '/api/openapi',
        domNode: document.getElementById('swagger-ui'),
        deepLinking: true,
        tryItOutEnabled: true,
      });
    };
    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ padding: '0 1rem 0.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: 4 }}>📜 API Docs — Crew Server</h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 0 }}>
          The live API the UI, the VS Code extension, and clients consume — every endpoint on a
          Quark-selected OpenRouter model, governed by WorfGate.{' '}
          <a href="/api/openapi" style={{ color: '#2563eb' }}>raw spec</a>
        </p>
      </div>
      <div id="swagger-ui" />
    </main>
  );
}
