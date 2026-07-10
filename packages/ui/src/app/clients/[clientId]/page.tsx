/**
 * Generic client presence — for any client without a bespoke page. (Jonah has a bespoke /clients/jonah
 * which Next.js resolves via static-segment precedence over this dynamic route.) Dynamic from the
 * Supabase `clients` table; links onward to the client-scoped dashboard.
 */
import Link from 'next/link';
import { listClientsFromDb } from '@story-agent/shared';
import { ClientBreadcrumbs } from '@/components/ClientBreadcrumbs';

export const dynamic = 'force-dynamic';

type C = { id: string; name: string; security_tier?: string; parent_client_id?: string | null };

export default async function ClientPresence({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  let client: C | undefined;
  try {
    const rows = (await listClientsFromDb()) as C[];
    client = rows.find((r) => r.id === clientId || r.name?.toLowerCase() === clientId.toLowerCase());
  } catch { /* fall through to the id-only view */ }

  const name = client?.name ?? clientId;
  const tier = client?.security_tier;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <ClientBreadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: name }]} />
      <Link href="/clients" style={{ color: 'var(--text-dim)', fontSize: '0.82rem', textDecoration: 'none' }}>← All clients</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{name}</h1>
        {tier && <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent1)', fontWeight: 700 }}>{tier} tier</span>}
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: '0.5rem' }}>
        {client?.parent_client_id ? `Client under ${client.parent_client_id}.` : 'Client organization.'} A bespoke web
        presence has not been built for this client yet.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>Delivery dashboard →</Link>
        <Link href="/clients" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Back to clients</Link>
      </div>
    </div>
  );
}
