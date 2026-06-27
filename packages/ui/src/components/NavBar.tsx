import { DOMAIN_GROUPS } from './domains';
import { lcars, RAIL_COLORS } from '../lib/lcars';
import { ThemeSwitcher } from './ThemeProvider';

/**
 * Unified shell navigation — LCARS motif (crew design-unification ruling). A black banner with a
 * neon-carrot elbow brand block and domain-grouped clusters (Build / Plan / Observe), so every web
 * surface shares the same Library Computer Access/Retrieval System identity as the dashboard home.
 * Server component (pure links) — no client JS.
 */
const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

export default function NavBar() {
  return (
    <nav style={{ background: lcars.black, color: lcars.text, fontFamily: MONO, padding: '6px 10px', display: 'flex', gap: '0.9rem', alignItems: 'stretch', flexWrap: 'wrap', letterSpacing: '0.03em' }}>
      <a href="/" style={{ background: lcars.neonCarrot, color: lcars.onAccent, textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', padding: '8px 14px', borderTopLeftRadius: 'var(--radius-elbow)', borderBottomLeftRadius: 6, borderTopRightRadius: 6, borderBottomRightRadius: 6, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
        🖖 Story Agent
      </a>
      {DOMAIN_GROUPS.map((g, gi) => {
        const c = RAIL_COLORS[gi % RAIL_COLORS.length];
        return (
          <div key={g.group} style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
            <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: c, fontWeight: 700 }} title={g.owner}>{g.group}</span>
            <span style={{ display: 'flex', gap: '0.7rem' }}>
              {g.items.map((s) => (
                <a key={s.href} href={s.href} title={s.desc}
                  style={{ color: s.hub ? lcars.paleCanary : lcars.tanoi, textDecoration: 'none', fontSize: '0.82rem', fontWeight: s.hub ? 700 : 400, textTransform: 'uppercase' }}>
                  {s.hub ? `${s.icon} ` : ''}{s.label}
                </a>
              ))}
            </span>
          </div>
        );
      })}
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ThemeSwitcher />
        <a href="/docs" style={{ color: lcars.textDim, textDecoration: 'none', fontSize: '0.72rem', textTransform: 'uppercase' }}>v1.0.0</a>
      </span>
    </nav>
  );
}
