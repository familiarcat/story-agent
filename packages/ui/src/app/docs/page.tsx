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
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 0 }}>
          The live API the UI, the VS Code extension, and clients consume — every endpoint on a
          Quark-selected OpenRouter model, governed by WorfGate.{' '}
          <a href="/api/openapi" style={{ color: 'var(--accent4)' }}>raw spec</a>
        </p>
      </div>
      {/* Embedded 3rd-party UI principle (crew ruling, RAG): Swagger ships light-designed CSS with
          dark-gray text that's invisible on our dark themes. Give it a CONTROLLED light surface (its
          native context) with color-scheme:light so it's legible in ANY app theme — parent theme
          tokens do NOT propagate past this wrapper. */}
      <div
        style={{
          background: '#ffffff',
          color: '#1b1b1b',
          colorScheme: 'light',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          margin: '0 1rem 2rem',
          overflow: 'hidden',
        }}
      >
        <div id="swagger-ui" />
      </div>
    </main>
  );
}
