import { DOMAIN_GROUPS, HUB } from '../components/domains';

/**
 * Orchestrating home — the unified-UI entry point (crew-decided). Leads with the hub (Agent
 * Workspace, which can drive every domain), then groups all surfaces by domain + intent so the user
 * picks where to go by what they want to do. Pure server component; reuses every existing page.
 */
export default function Home() {
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ padding: '0.5rem 0 1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem' }}>Your crew-run coding assistant</h1>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>
          A full Claude-Code-grade agent running entirely on the OpenRouter crew — Quark picks the cheapest adequate model, WorfGate governs every action.
        </p>
      </section>

      {/* Hub */}
      <a href={HUB.href} style={{ display: 'block', textDecoration: 'none', border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 12, padding: '1.1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d4ed8' }}>{HUB.icon} {HUB.label} →</div>
        <div style={{ color: '#374151', fontSize: '0.9rem', marginTop: 4 }}>{HUB.desc}</div>
        <div style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: 6 }}>The orchestrating hub — start here, or pick a domain below.</div>
      </a>

      {/* Domain groups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {DOMAIN_GROUPS.map(g => (
          <section key={g.group} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '0.9rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: '1rem', margin: 0 }}>{g.group}</h2>
              <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{g.owner}</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.15rem 0 0.6rem' }}>{g.intent}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {g.items.map(s => (
                <li key={s.href}>
                  <a href={s.href} style={{ textDecoration: 'none', color: '#1f2937' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: s.hub ? '#1d4ed8' : '#1f2937' }}>{s.icon} {s.label}</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>{s.desc}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
