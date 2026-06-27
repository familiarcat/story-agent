import type { ReactNode, CSSProperties } from 'react';
import { lcars } from '../lib/lcars';

/**
 * Shared LCARS primitives (crew design-unification ruling, RAG MEM 49). Every web surface reskins
 * THROUGH these — pages must not hardcode off-palette colors. Dark ground, rounded "elbow" frames,
 * condensed all-caps headers, tanoi text on black (≥4.5:1 contrast — Worf/Yar legibility floor).
 */
const MONO = 'ui-monospace, "Arial Narrow", sans-serif';

/** Full-bleed black LCARS page ground with an elbow title header. */
export function LcarsScreen({ title, status, children }: { title: string; status?: string; children: ReactNode }) {
  return (
    <main style={{ background: lcars.black, color: lcars.text, fontFamily: MONO, minHeight: '100vh', padding: '0.75rem', letterSpacing: '0.03em' }}>
      <header style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ background: lcars.neonCarrot, color: lcars.black, borderTopLeftRadius: 24, borderBottomLeftRadius: 6, borderTopRightRadius: 6, borderBottomRightRadius: 6, padding: '8px 16px', fontWeight: 800, textTransform: 'uppercase' }}>{title}</div>
        {status ? <div style={{ flex: 1, background: lcars.eggplant, borderRadius: 6, padding: '8px 14px', color: lcars.tanoi, fontSize: '0.78rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>{status}</div> : <div style={{ flex: 1 }} />}
      </header>
      {children}
    </main>
  );
}

/** A bordered LCARS panel with a colored elbow header. */
export function LcarsPanel({ title, color = lcars.goldenTanoi, children, style }: { title?: string; color?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ background: lcars.space, borderTop: `3px solid ${color}`, borderRadius: 10, padding: '10px 14px', ...style }}>
      {title ? <h2 style={{ color, fontSize: '0.9rem', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2> : null}
      {children}
    </section>
  );
}

/** A rounded LCARS pill button / link. */
export function LcarsButton({ href, color = lcars.goldenTanoi, children, onClick }: { href?: string; color?: string; children: ReactNode; onClick?: () => void }) {
  const style: CSSProperties = { background: color, color: lcars.black, textDecoration: 'none', textTransform: 'uppercase', fontWeight: 800, fontSize: '0.74rem', padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'inline-block' };
  return href ? <a href={href} style={style}>{children}</a> : <button type="button" onClick={onClick} style={style}>{children}</button>;
}

/** A stat cell: small label + large value (value in pale canary for max legibility on black). */
export function LcarsStat({ label, value, accent = lcars.paleCanary }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div style={{ background: lcars.space, borderLeft: `4px solid ${accent}`, borderRadius: 6, padding: '8px 12px' }}>
      <div style={{ fontSize: '0.66rem', color: lcars.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

/** Horizontal LCARS bar (replaces low-contrast charts; sits on dark ground). */
export function LcarsBar({ frac, color = lcars.neonCarrot }: { frac: number; color?: string }) {
  return <div style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%`, height: 10, background: color, borderRadius: 5 }} />;
}
