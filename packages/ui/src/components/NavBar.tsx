import { DOMAIN_GROUPS } from './domains';

/**
 * Unified shell navigation — domain-grouped, not a flat link list. Each group (Build / Plan /
 * Observe) is a labelled cluster owned by a crew domain; the orchestrating hub (Agent Workspace)
 * is emphasized. Server component (pure links) so it adds no client JS.
 */
export default function NavBar() {
  return (
    <nav style={{ padding: '0.75rem 2rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <a href="/" style={{ fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', color: '#111827' }}>🖖 Story Agent</a>
      {DOMAIN_GROUPS.map(g => (
        <div key={g.group} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }} title={g.owner}>
            {g.group}
          </span>
          <span style={{ display: 'flex', gap: '0.85rem' }}>
            {g.items.map(s => (
              <a
                key={s.href}
                href={s.href}
                title={s.desc}
                style={{ color: s.hub ? '#1d4ed8' : '#2563eb', textDecoration: 'none', fontSize: '0.9rem', fontWeight: s.hub ? 700 : 400 }}
              >
                {s.hub ? `${s.icon} ` : ''}{s.label}
              </a>
            ))}
          </span>
        </div>
      ))}
      <a href="/docs" style={{ color: '#6b7280', textDecoration: 'none', marginLeft: 'auto', fontSize: '0.8rem' }}>v1.0.0</a>
    </nav>
  );
}
