import { DOMAIN_GROUPS, HUB } from '../components/domains';
import { lcars, CREW_ROSTER, RAIL_COLORS } from '../lib/lcars';

/**
 * LCARS dashboard home — the single entry point, styled in the Library Computer Access/Retrieval
 * System aesthetic (crew unified-nav mission). Reuses DOMAIN_GROUPS (the single IA source) for the
 * left rail + panels, and the crew roster for identity. Black ground, rounded elbows, condensed
 * all-caps type. Pure server component.
 */
const MONO = 'ui-monospace, "Helvetica Neue Condensed", "Arial Narrow", sans-serif';
const ALL_SURFACES = DOMAIN_GROUPS.flatMap((g) => g.items);

export default function Home() {
  return (
    <main style={{ background: lcars.black, color: lcars.text, fontFamily: MONO, minHeight: '100vh', padding: '0.75rem', letterSpacing: '0.03em' }}>
      {/* Top elbow header */}
      <header style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 10 }}>
        <div style={{ width: 180, background: lcars.neonCarrot, color: lcars.onAccent, borderTopLeftRadius: 28, borderBottomLeftRadius: 6, padding: '10px 14px', fontWeight: 800, display: 'flex', alignItems: 'flex-end', textTransform: 'uppercase' }}>
          LCARS · Story Agent
        </div>
        <div style={{ flex: 1, background: lcars.eggplant, borderRadius: 6, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', fontSize: '0.8rem', color: lcars.tanoi }}>
          <span>Sovereign Factory · familiarcat</span>
          <span style={{ color: lcars.paleCanary }}>OpenRouter Crew · WorfGate Online</span>
        </div>
        <div style={{ width: 90, background: lcars.goldenTanoi, color: lcars.onAccent, borderTopRightRadius: 28, borderBottomRightRadius: 6, padding: '10px', fontWeight: 800, textAlign: 'right' }}>
          47·∞
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10 }}>
        {/* Left rail — nav (single IA source) */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a href={HUB.href} style={railBtn(lcars.paleCanary, true)}>{HUB.icon} {HUB.label}</a>
          {ALL_SURFACES.filter((s) => !s.hub).map((s, i) => (
            <a key={s.href} href={s.href} style={railBtn(RAIL_COLORS[i % RAIL_COLORS.length])}>{s.label}</a>
          ))}
          <div style={{ flex: 1, minHeight: 12, background: lcars.eggplant, borderBottomLeftRadius: 20, marginTop: 6 }} />
        </nav>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Hub panel */}
          <a href={HUB.href} style={{ textDecoration: 'none', display: 'block', background: lcars.space, border: `2px solid ${lcars.neonCarrot}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ color: lcars.neonCarrot, fontWeight: 800, fontSize: '1.05rem', textTransform: 'uppercase' }}>{HUB.icon} {HUB.label} →</div>
            <div style={{ color: lcars.tanoi, fontSize: '0.85rem', marginTop: 6, lineHeight: 1.5, letterSpacing: 'normal' }}>{HUB.desc}</div>
          </a>

          {/* Hierarchy strip — firm → client → project → story (Aha parity layer) */}
          <section style={panel(lcars.lilac)}>
            <h2 style={panelTitle(lcars.lilac)}>Mission Hierarchy</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 2px', fontSize: '0.78rem' }}>
              {['Firm: familiarcat', 'Client', 'Project', 'Epic', 'Story', 'Task', 'Sprint'].map((h, i) => (
                <span key={h} style={{ background: i === 0 ? lcars.goldenTanoi : lcars.eggplant, color: i === 0 ? lcars.onAccent : lcars.tanoi, padding: '4px 12px', borderRadius: 12, textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            <div style={{ color: lcars.textDim, fontSize: '0.72rem', marginTop: 6, letterSpacing: 'normal' }}>
              Served by the dynamic UI↔Aha parity layer (/api/aha/resource/&lt;resource&gt;) — reads open, writes Worf-gated.
            </div>
          </section>

          {/* Domain group panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {DOMAIN_GROUPS.map((g, gi) => {
              const c = RAIL_COLORS[gi % RAIL_COLORS.length];
              return (
                <section key={g.group} style={panel(c)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h2 style={panelTitle(c)}>{g.group}</h2>
                    <span style={{ fontSize: '0.62rem', color: lcars.textDim, textTransform: 'uppercase' }}>{g.owner}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.items.map((s) => (
                      <li key={s.href}>
                        <a href={s.href} style={{ textDecoration: 'none', color: lcars.tanoi, fontSize: '0.82rem', display: 'block' }}>
                          <span style={{ color: c, textTransform: 'uppercase', fontWeight: 700 }}>{s.label}</span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: lcars.textDim, lineHeight: 1.4, letterSpacing: 'normal' }}>{s.desc}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* Crew roster */}
          <section style={panel(lcars.anakiwa)}>
            <h2 style={panelTitle(lcars.anakiwa)}>Bridge Crew · 11 Officers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginTop: 6 }}>
              {CREW_ROSTER.map((m) => (
                <div key={m.id} style={{ background: lcars.space, borderLeft: `4px solid ${m.color}`, borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ color: m.color, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>{m.name}</div>
                  <div style={{ color: lcars.textDim, fontSize: '0.66rem', textTransform: 'uppercase' }}>{m.role}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function railBtn(color: string, hub = false): React.CSSProperties {
  return {
    background: color, color: lcars.onAccent, textDecoration: 'none', textTransform: 'uppercase',
    fontWeight: 800, fontSize: '0.74rem', padding: '12px 12px', borderRadius: 6,
    borderTopLeftRadius: hub ? 20 : 6, textAlign: 'right', lineHeight: 1.1,
  };
}
function panel(color: string): React.CSSProperties {
  return { background: lcars.space, borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 14px' };
}
function panelTitle(color: string): React.CSSProperties {
  return { color, fontSize: '0.9rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' };
}
