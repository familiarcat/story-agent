'use client';

/**
 * Client selector menu for the dashboard shell. Loads the dynamic client list (/api/clients) and lets
 * you jump to any client's presence (/clients/<id>). Token-driven (var(--*)); LCARS mono to match nav.
 */
import { useEffect, useRef, useState } from 'react';

type Client = { id: string; name: string; tier?: string; parent?: string | null };

export function ClientMenu() {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/clients').then((r) => r.json()).then((d) => setClients(d.clients ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const mono = 'ui-monospace, "Arial Narrow", sans-serif';
  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ background: 'var(--surface-2)', color: 'var(--accent2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', fontFamily: mono }}
      >
        ▾ Clients
      </button>
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 220, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontFamily: mono }}
        >
          <a href="/clients" role="menuitem" onClick={() => setOpen(false)}
            style={{ display: 'block', padding: '7px 10px', color: 'var(--accent4)', textDecoration: 'none', fontSize: '0.78rem', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ▦ All clients
          </a>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {clients.length === 0 && <div style={{ padding: '7px 10px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>Loading…</div>}
          {clients.map((c) => (
            <a key={c.id} href={`/clients/${c.id}`} role="menuitem" onClick={() => setOpen(false)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '7px 10px', color: 'var(--text)', textDecoration: 'none', fontSize: '0.82rem', borderRadius: 5 }}>
              <span>{c.name}</span>
              {c.tier && <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.tier}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClientMenu;
