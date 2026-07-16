import Link from 'next/link';
import { lcars } from '../lib/lcars';
import { ThemeSwitcher } from './ThemeProvider';
import { ClientMenu } from './ClientMenu';
import { NavDropdowns } from './NavDropdowns';

/**
 * Unified shell navigation — LCARS motif (crew design-unification ruling). A black banner with a
 * neon-carrot elbow brand block and Build / Plan / Observe domain DROPDOWNS (crew nav-dropdown
 * ruling): each category opens a screen picker instead of showing every link flat.
 */
const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

export default function NavBar() {
  return (
    <nav data-dev-tour="nav" style={{
      background: lcars.black,
      color: lcars.text,
      fontFamily: MONO,
      padding: '6px 10px',
      display: 'flex',
      gap: '0.9rem',
      alignItems: 'stretch',
      flexWrap: 'wrap',
      letterSpacing: '0.03em',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: `1px solid ${lcars.border}`,
    }}>
      <Link href="/" style={{ background: lcars.neonCarrot, color: lcars.onAccent, textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', padding: '8px 14px', borderTopLeftRadius: 'var(--radius-elbow)', borderBottomLeftRadius: 6, borderTopRightRadius: 6, borderBottomRightRadius: 6, textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>
        🖖 Story Agent
      </Link>
      <NavDropdowns />
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClientMenu />
        <ThemeSwitcher />
        <a href="/docs" style={{ color: lcars.textDim, textDecoration: 'none', fontSize: '0.72rem', textTransform: 'uppercase' }}>v1.0.0</a>
      </span>
    </nav>
  );
}
