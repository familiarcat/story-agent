'use client';

/**
 * Client Dashboard — organizes one client's projects for the crew, in two sensibilities:
 *
 *   Sprint  — a dense, data-first list (reference prefix, project id, link into /sprint) for the
 *             Agile/delivery read: what's in flight, where to open the board.
 *   Design  — a visual, card-first grid (brand accent swatch, larger type, generous spacing) for the
 *             graphic-design read: how this client's work presents, not just how it's tracked.
 *
 * Reuses buildClientProjectMap() (the same client<->Aha-project pairing the Observation Lounge
 * hierarchy picker uses) rather than re-deriving the relationship — one client-project model, two
 * renderers, same principle as the LCARS markdown unification.
 *
 * NOTE: project cards link to /sprint, not a project-scoped deep link — /sprint's project selection
 * lives in ClientScopeSelector's own state, it doesn't read a URL param yet. Wiring /sprint to accept
 * ?projectId= (and this dashboard to pass it) is a natural next step, not done here.
 *
 * This is internal crew tooling, not a public presentation (see ChromeController's INTERNAL_SUBROUTES
 * — /clients/<id>/dashboard always keeps full Story Agent chrome, even for clients with a bespoke
 * public brand like jonah). When the client has a bespoke design system (brandTheme), that scopes to
 * this page's [data-theme] the same pattern the jonah landing page uses — so the crew sees an accurate
 * preview of the client's visual identity while still working inside the Story Agent shell.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ClientBreadcrumbs } from '@/components/ClientBreadcrumbs';
import { buildClientProjectMap, type ClientNode } from '../../../observation-lounge/components/ClientProjectMap';

type ViewMode = 'sprint' | 'design';

export default function ClientDashboard() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? '';

  const [client, setClient] = useState<ClientNode | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('sprint');

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    buildClientProjectMap()
      .then((result) => {
        if (cancelled) return;
        const found = result.clients.find((c) => c.id === clientId || c.name.toLowerCase() === clientId.toLowerCase());
        setClient(found ?? { id: clientId, name: clientId, projects: [], brandTheme: null });
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load client projects');
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const themeAttr = client?.brandTheme ? { 'data-theme': client.brandTheme } : {};

  return (
    <div {...themeAttr} style={{ background: client?.brandTheme ? 'var(--bg)' : undefined, minHeight: client?.brandTheme ? '100vh' : undefined }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: client?.brandTheme ? '1.5rem 1.5rem 3rem' : 0 }}>
        <ClientBreadcrumbs
          crumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clients', href: '/clients' },
            { label: client?.name ?? clientId, href: `/clients/${clientId}` },
            { label: 'Project Dashboard' },
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {client?.name ?? clientId}
            {client?.brandTheme && (
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent1)', marginLeft: '0.75rem', verticalAlign: 'middle' }}>
                🎨 bespoke design system
              </span>
            )}
          </h1>

          <div role="group" aria-label="View sensibility" style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setView('sprint')}
              aria-pressed={view === 'sprint'}
              style={{
                padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none', cursor: 'pointer',
                background: view === 'sprint' ? 'var(--accent1)' : 'var(--surface)',
                color: view === 'sprint' ? 'var(--on-accent)' : 'var(--text)',
              }}
            >
              📋 Sprint view
            </button>
            <button
              type="button"
              onClick={() => setView('design')}
              aria-pressed={view === 'design'}
              style={{
                padding: '0.4rem 0.9rem', fontSize: '0.82rem', border: 'none', cursor: 'pointer',
                background: view === 'design' ? 'var(--accent1)' : 'var(--surface)',
                color: view === 'design' ? 'var(--on-accent)' : 'var(--text)',
              }}
            >
              🎨 Design view
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-dim)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          {view === 'sprint'
            ? 'Delivery read: what\u2019s in flight, ordered for triage.'
            : 'Visual read: how this client\u2019s work presents, not just how it\u2019s tracked.'}
        </p>

        {loadState === 'loading' && <p style={{ color: 'var(--text-dim)', marginTop: '2rem' }}>Loading projects…</p>}
        {loadState === 'error' && <p style={{ color: 'var(--danger)', marginTop: '2rem' }}>{error}</p>}

        {loadState === 'ready' && client && client.projects.length === 0 && (
          <p style={{ color: 'var(--text-dim)', marginTop: '2rem' }}>
            No Aha projects matched to this client yet. Client&ndash;project pairing is a soft, name-based
            match (see ClientProjectMap.ts) &mdash; if a project should belong here, check its name/reference
            prefix against the client id.
          </p>
        )}

        {loadState === 'ready' && client && client.projects.length > 0 && view === 'sprint' && (
          <div style={{ marginTop: '1.5rem', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {client.projects.map((p, i) => (
              <Link
                key={p.id}
                href="/sprint"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--text)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {p.referencePrefix && <code>{p.referencePrefix}</code>}
                  <span style={{ color: 'var(--accent4)' }}>Open sprint board →</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {loadState === 'ready' && client && client.projects.length > 0 && view === 'design' && (
          <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: '1.75rem' }}>
            {client.projects.map((p) => (
              <Link
                key={p.id}
                href="/sprint"
                className="card"
                style={{
                  textDecoration: 'none', color: 'var(--text)', display: 'block',
                  padding: '1.5rem', minHeight: 160, position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'var(--accent1)' }} />
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent3)', marginTop: '0.5rem' }}>
                  {p.referencePrefix ?? 'project'}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '0.5rem', lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ marginTop: '1rem', color: 'var(--accent4)', fontSize: '0.82rem' }}>Open sprint board →</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
