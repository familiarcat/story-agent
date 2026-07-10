'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DOMAIN_GROUPS } from './domains';
import { lcars, RAIL_COLORS } from '../lib/lcars';

/**
 * Domain dropdowns for the shell header (crew nav-dropdown ruling, RAG 973704cb): Build / Plan /
 * Observe each open a screen picker. Client-state so only one menu is open at a time and menus
 * close on outside click / Escape — behaviors the crew required that CSS-only menus can't provide.
 */
export function NavDropdowns() {
  const [open, setOpen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div ref={rootRef} style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
      {DOMAIN_GROUPS.map((g, gi) => {
        const c = RAIL_COLORS[gi % RAIL_COLORS.length];
        const expanded = open === g.group;
        const groupActive = g.items.some((s) => isActive(s.href));
        return (
          <div key={g.group} style={{ position: 'relative', display: 'flex' }}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={expanded}
              title={`${g.owner} — ${g.intent}`}
              onClick={() => setOpen(expanded ? null : g.group)}
              style={{
                background: expanded ? c : 'transparent',
                color: expanded ? lcars.onAccent : c,
                border: `1px solid ${groupActive || expanded ? c : lcars.border}`,
                borderRadius: 6,
                padding: '6px 12px',
                fontFamily: 'inherit',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: 'pointer',
              }}
            >
              {g.group} {expanded ? '▴' : '▾'}
            </button>
            {expanded && (
              <div
                role="menu"
                aria-label={`${g.group} screens`}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  minWidth: 280,
                  background: lcars.black,
                  border: `1px solid ${c}`,
                  borderTopWidth: 3,
                  borderRadius: 8,
                  padding: 6,
                  zIndex: 200,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ padding: '4px 10px 8px', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: c, fontWeight: 700 }}>
                  {g.owner} · {g.intent}
                </div>
                {g.items.map((s) => {
                  const active = isActive(s.href);
                  return (
                    <a
                      key={s.href}
                      role="menuitem"
                      href={s.href}
                      title={s.desc}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpen(null)}
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'baseline',
                        padding: '8px 10px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        background: active ? lcars.eggplant : 'transparent',
                        color: s.hub ? lcars.paleCanary : lcars.tanoi,
                        fontSize: '0.82rem',
                        fontWeight: s.hub || active ? 700 : 400,
                        textTransform: 'uppercase',
                        borderLeft: `3px solid ${active ? c : 'transparent'}`,
                      }}
                    >
                      <span>{s.icon}</span>
                      <span style={{ display: 'grid', gap: 2 }}>
                        {s.label}
                        <span style={{ fontSize: '0.65rem', color: lcars.textDim, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                          {s.desc}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
