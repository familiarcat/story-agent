/**
 * Clients index — the dashboard's client selector as a page. Dynamic grid from the Supabase `clients`
 * table (never hardcoded); each card opens that client's presence. Token-driven (LCARS default theme).
 */
import Link from 'next/link';
import { listClientsFromDb } from '@story-agent/shared';
import { ClientBreadcrumbs } from '@/components/ClientBreadcrumbs';

export const dynamic = 'force-dynamic';

type C = { id: string; name: string; security_tier?: string; parent_client_id?: string | null };

const FALLBACK: C[] = [
  { id: 'familiarcat', name: 'familiarcat', security_tier: 'enterprise', parent_client_id: null },
  { id: 'jonah', name: 'Jonah', security_tier: 'standard', parent_client_id: 'familiarcat' },
  { id: 'client-int', name: 'Client (gold standard)', security_tier: 'regulated', parent_client_id: 'familiarcat' },
];

export default async function ClientsIndex() {
  let clients: C[] = [];
  let source = 'db';
  try { clients = (await listClientsFromDb()) as C[]; } catch { clients = FALLBACK; source = 'fallback'; }
  if (!clients.length) { clients = FALLBACK; source = 'fallback'; }

  return (
    <div>
      <ClientBreadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients' }]} />
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Clients</h1>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          Select a client to open their presence. {source === 'fallback' && '(demo list — configure Supabase for live clients)'}
        </p>
      </div>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {clients.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="card" style={{ textDecoration: 'none', color: 'var(--text)', display: 'block', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{c.name}</div>
              {c.security_tier && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent1)', fontWeight: 700 }}>{c.security_tier}</span>}
            </div>
            <div style={{ marginTop: '0.5rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              {c.parent_client_id ? `under ${c.parent_client_id}` : 'root org'}
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--accent4)', fontSize: '0.82rem' }}>Open presence →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
