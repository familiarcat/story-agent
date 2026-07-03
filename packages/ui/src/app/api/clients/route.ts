import { NextResponse } from 'next/server';
import { listClientsFromDb } from '@story-agent/shared';

export const dynamic = 'force-dynamic';

/**
 * Dynamic client list for the dashboard client menu. Reads the Supabase `clients` table (clients are
 * never hardcoded — CLAUDE.md). Falls back to the code-bootstrap clients if the DB is unavailable so
 * the menu always renders.
 */
export async function GET() {
  try {
    const rows = await listClientsFromDb();
    const clients = rows.map((r) => ({ id: r.id, name: r.name, tier: r.security_tier, parent: r.parent_client_id }));
    return NextResponse.json({ clients, source: 'db' });
  } catch {
    return NextResponse.json({
      clients: [
        { id: 'familiarcat', name: 'familiarcat', tier: 'enterprise', parent: null },
        { id: 'jonah', name: 'Jonah', tier: 'standard', parent: 'familiarcat' },
        { id: 'client-int', name: 'Client (gold standard)', tier: 'regulated', parent: 'familiarcat' },
      ],
      source: 'fallback',
    });
  }
}
