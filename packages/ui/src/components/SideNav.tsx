'use client';
/**
 * Global left navigation guide — crew ruling (UI-GLOBAL-NAV): hoisted to the ROOT layout so it is
 * persistent on every route (no re-mounting on navigation). Consumes the same DOMAIN_GROUPS source
 * as the NavBar dropdowns so the information architecture never drifts between the two. Stacking
 * contract: NavBar (z 100) overlays; this rail sticks below it (z 10). Collapses away under 900px
 * where the NavBar dropdowns take over (see .app-shell in globals.css).
 */
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarProvider';
import { DOMAIN_GROUPS } from './domains';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

export default function SideNav() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, setCollapsed } = useSidebar();
  const isHome = pathname === '/';
  const surfaces = DOMAIN_GROUPS.flatMap((g) => g.items);
  const palette = ['#f39b35', '#e7c066', '#bb93c7', '#86b0db'];

  useEffect(() => {
    document.documentElement.setAttribute('data-sidenav-hidden', isHome ? 'true' : 'false');
    if (isHome && isCollapsed) {
      setCollapsed(false);
    }
    return () => {
      document.documentElement.setAttribute('data-sidenav-hidden', 'false');
    };
  }, [isCollapsed, isHome, setCollapsed]);

  if (isHome) return null;

  return (
    <>
      <aside className={`app-sidenav${isCollapsed ? ' app-sidenav--collapsed' : ''}`} aria-label="Global navigation">
        <div className="app-sidenav-topbar">
          <div className="app-sidenav-brand">LCARS · STORY AGENT</div>
          <button
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            aria-expanded={!isCollapsed}
            className="app-sidenav-toggle-btn"
            title="Collapse navigation"
          >
            ◀
          </button>
        </div>

        <nav className="app-sidenav-stack">
          {surfaces.map((s, idx) => {
            const active = pathname === s.href || (s.href !== '/' && pathname?.startsWith(`${s.href}/`));
            const bg = s.hub ? '#e9d2ae' : palette[idx % palette.length];
            const chipStyle = { '--nav-chip-bg': bg } as CSSProperties;
            return (
              <a
                key={s.href}
                href={s.href}
                className={`app-sidenav-link app-sidenav-link--chip${active ? ' active' : ''}`}
                title={s.desc}
                style={chipStyle}
              >
                <span className="app-sidenav-link-icon" aria-hidden>{s.icon}</span>
                <span>{s.label.toUpperCase()}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      {isCollapsed ? (
        <button
          onClick={toggleCollapse}
          aria-label="Re-expand sidebar"
          className="app-sidenav-reopen"
          title="Expand navigation"
        >
          NAV ▶
        </button>
      ) : null}
    </>
  );
}
