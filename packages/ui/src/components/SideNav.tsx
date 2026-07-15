'use client';
/**
 * Global left navigation guide — crew ruling (UI-GLOBAL-NAV): hoisted to the ROOT layout so it is
 * persistent on every route (no re-mounting on navigation). Consumes the same DOMAIN_GROUPS source
 * as the NavBar dropdowns so the information architecture never drifts between the two. Stacking
 * contract: NavBar (z 100) overlays; this rail sticks below it (z 10). Collapses away under 900px
 * where the NavBar dropdowns take over (see .app-shell in globals.css).
 */
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSidebar } from './SidebarProvider';
import { DOMAIN_GROUPS } from './domains';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useLoadingState } from './LoadingStateProvider';

export default function SideNav() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, setCollapsed } = useSidebar();
  const { beginNavigationLoading } = useLoadingState();
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const surfaces = DOMAIN_GROUPS.flatMap((g) => g.items);
  const palette = ['#f39b35', '#e7c066', '#bb93c7', '#86b0db'];

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => {
      const compact = media.matches;
      setIsCompactViewport(compact);
      if (compact) {
        setCollapsed(true);
      }
    };

    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, [setCollapsed]);

  const toggleTitle = isCollapsed ? 'Expand navigation' : 'Collapse navigation';

  return (
    <aside className={`app-sidenav${isCollapsed ? ' app-sidenav--collapsed' : ''}`} aria-label="Global navigation">
      <div className="app-sidenav-topbar">
        <div className="app-sidenav-brand">LCARS · STORY AGENT</div>
        <button
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className="app-sidenav-toggle-btn"
          title={toggleTitle}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="app-sidenav-stack">
        {surfaces.map((s, idx) => {
          const active = pathname === s.href || (s.href !== '/' && pathname?.startsWith(`${s.href}/`));
          const bg = s.hub ? '#e9d2ae' : palette[idx % palette.length];
          const chipStyle = { '--nav-chip-bg': bg } as CSSProperties;
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => {
                if (!active) {
                  beginNavigationLoading(s.label, 'Global Navigation');
                }
              }}
              className={`app-sidenav-link app-sidenav-link--chip${active ? ' active' : ''}`}
              title={s.label}
              data-label={s.label.toUpperCase()}
              style={chipStyle}
            >
              <span className="app-sidenav-link-icon" aria-hidden>{s.icon}</span>
              <span className="app-sidenav-link-label">{s.label.toUpperCase()}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
