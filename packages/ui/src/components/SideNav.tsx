'use client';
/**
 * Global left navigation guide — crew ruling (UI-GLOBAL-NAV): hoisted to the ROOT layout so it is
 * persistent on every route (no re-mounting on navigation). Consumes the same DOMAIN_GROUPS source
 * as the NavBar dropdowns so the information architecture never drifts between the two. Stacking
 * contract: NavBar (z 100) overlays; this rail sticks below it (z 10). Collapses away under 900px
 * where the NavBar dropdowns take over (see .app-shell in globals.css).
 */
import { usePathname } from 'next/navigation';
import { DOMAIN_GROUPS } from './domains';

export default function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="app-sidenav" aria-label="Global navigation">
      {DOMAIN_GROUPS.map((g) => (
        <section key={g.group} className="app-sidenav-group">
          <div className="app-sidenav-heading">
            <span>{g.group}</span>
            <span className="app-sidenav-owner">{g.owner}</span>
          </div>
          <nav>
            {g.items.map((s) => {
              const active = pathname === s.href || (s.href !== '/' && pathname?.startsWith(`${s.href}/`));
              return (
                <a key={s.href} href={s.href} className={`app-sidenav-link${active ? ' active' : ''}`} title={s.desc}>
                  <span aria-hidden>{s.icon}</span>
                  <span>{s.label}</span>
                  {s.hub ? <span className="app-sidenav-hub">HUB</span> : null}
                </a>
              );
            })}
          </nav>
        </section>
      ))}
    </aside>
  );
}
