/**
 * Jonah — client web presence. A startling, editorial real-estate landing built on the LCARS token
 * design system via the client brand theme [data-theme="jonah"] (charcoal / bronze / cream / serif).
 * Server component: pulls live crew RAG memories (tagged jonah) for provenance, renders curated,
 * marketing-safe copy (Worf: no confidential/sa_* data) derived from the ingested dossier.
 */
import { getRelevantObservationMemories } from '@/lib/db';
import { ClientBreadcrumbs } from '@/components/ClientBreadcrumbs';

export const dynamic = 'force-dynamic';

const STATS = [
  { k: '$485–565K', v: 'Invested per rebuild' },
  { k: '$680K+', v: 'Realized value' },
  { k: 'up to 22%', v: 'Equity position' },
  { k: '6 months', v: 'Concept to complete' },
  { k: '$300–350', v: 'Per square foot' },
];

const MODEL = [
  { n: '01', t: 'Acquire', d: 'Deeply distressed, long-overlooked St. Louis buildings — bought below the neighborhood’s trajectory.' },
  { n: '02', t: 'Transform', d: 'A demo-first, engineer-led deep rehab: foundations rebuilt, systems replaced, structure made sound.' },
  { n: '03', t: 'Realize', d: 'Forced appreciation into a real equity spread — with the flexibility to flip, hold, or refinance.' },
];

const PHASES = [
  ['Month 1', 'Acquisition, planning & demolition'],
  ['Month 2', 'Demolition completion & engineering'],
  ['Month 3', 'Foundation & structural work'],
  ['Month 4', 'Structural completion & building envelope'],
  ['Month 5', 'MEP installation & insulation'],
  ['Month 6', 'Interior finishes & completion'],
];

const TEAM = [
  'Owner / developer', 'Licensed structural engineer (PE)', 'General contractor', 'Foundation & masonry specialist', 'MEP trades', 'Finishing trades',
];

export default async function JonahPage() {
  let memCount = 0;
  try {
    const mems = await getRelevantObservationMemories({
      queryText: 'Jonah real estate developer renovation business model value-add',
      limit: 8,
    });
    memCount = mems.length;
  } catch {
    memCount = 0; // graceful fallback — the curated content stands on its own
  }

  const wrap: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', padding: '0 1.5rem' };
  const eyebrow: React.CSSProperties = { fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--accent1)', fontFamily: 'system-ui, sans-serif' };
  const rule: React.CSSProperties = { height: 1, background: 'var(--border)', border: 'none', margin: 0 };

  return (
    <div data-theme="jonah" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: 'var(--font)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '1rem 1.5rem 0' }}>
        <ClientBreadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Clients', href: '/clients' }, { label: 'Jonah' }]} />
      </div>
      {/* Wordmark */}
      <header style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
        <div style={{ fontSize: '1.15rem', letterSpacing: '0.24em', fontWeight: 600 }}>JONAH</div>
        <div style={{ ...eyebrow }}>St. Louis · Real Estate Development</div>
      </header>
      <hr style={rule} />

      {/* Hero */}
      <section style={{ ...wrap, padding: '5.5rem 1.5rem 4rem' }}>
        <div style={eyebrow}>Distressed → Distinguished</div>
        <h1 style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)', lineHeight: 1.02, margin: '1.25rem 0 0', fontWeight: 600, letterSpacing: '-0.01em' }}>
          We rebuild the buildings<br />St. Louis forgot.
        </h1>
        <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-dim)', maxWidth: 640, marginTop: '1.5rem' }}>
          Acquisition, engineering, and a demo-first deep renovation — turning distressed structures into
          distinguished homes, and undervalued blocks into realized equity.
        </p>
        <div style={{ display: 'flex', gap: '0.9rem', marginTop: '2.25rem', flexWrap: 'wrap' }}>
          <a href="#project" style={{ background: 'var(--accent1)', color: 'var(--on-accent)', padding: '0.85rem 1.6rem', borderRadius: 'var(--radius)', fontWeight: 600, textDecoration: 'none' }}>See a transformation</a>
          <a href="#model" style={{ border: '1px solid var(--border)', color: 'var(--text)', padding: '0.85rem 1.6rem', borderRadius: 'var(--radius)', textDecoration: 'none' }}>How it works</a>
        </div>
      </section>

      {/* Stats band */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', padding: '2.5rem 1.5rem' }}>
          {STATS.map((s) => (
            <div key={s.k}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--accent1)' }}>{s.k}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'system-ui, sans-serif', marginTop: '0.25rem' }}>{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Model */}
      <section id="model" style={{ ...wrap, padding: '4.5rem 1.5rem' }}>
        <div style={eyebrow}>The model</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', margin: '0.75rem 0 2.5rem', fontWeight: 600 }}>Buy low. Build right. Realize the spread.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {MODEL.map((m) => (
            <div key={m.n} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '2rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--accent3)', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.1em' }}>{m.n}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0.5rem 0 0.75rem' }}>{m.t}</div>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{m.d}</p>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--text-dim)', marginTop: '1.75rem', fontStyle: 'italic' }}>
          Powered by local craft and a referral-vetted trade network — quality where it counts, value where it matters.
        </p>
      </section>

      {/* Featured project */}
      <section id="project" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...wrap, padding: '4.5rem 1.5rem' }}>
          <div style={eyebrow}>Featured transformation</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', margin: '0.75rem 0 2rem', fontWeight: 600 }}>A 4-story landmark, reclaimed.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ borderLeft: '3px solid var(--danger)', paddingLeft: '1.25rem' }}>
              <div style={{ ...eyebrow, color: 'var(--danger)' }}>Before</div>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginTop: '0.75rem' }}>
                Vacant ~15 years. Collapsed rear foundation, compromised beams, water & fire damage, no working
                systems. A distressed shell most would walk past.
              </p>
            </div>
            <div style={{ borderLeft: '3px solid var(--ok)', paddingLeft: '1.25rem' }}>
              <div style={{ ...eyebrow, color: 'var(--ok)' }}>After</div>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, marginTop: '0.75rem' }}>
                Foundation rebuilt, structure sound, all-new systems, code-compliant and finished — a
                <strong style={{ color: 'var(--text)' }}> $680K+</strong> home on a $300–350/sq&nbsp;ft build.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section style={{ ...wrap, padding: '4.5rem 1.5rem' }}>
        <div style={eyebrow}>The 6-month plan</div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', margin: '0.75rem 0 2.5rem', fontWeight: 600 }}>A disciplined, phased build.</h2>
        <div style={{ display: 'grid', gap: 0 }}>
          {PHASES.map(([m, d], i) => (
            <div key={m} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '1.5rem', padding: '1.1rem 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--accent1)', fontWeight: 600 }}>{m}</div>
              <div style={{ color: 'var(--text-dim)' }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ ...wrap, padding: '4.5rem 1.5rem' }}>
          <div style={eyebrow}>The team</div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', margin: '0.75rem 0 2rem', fontWeight: 600 }}>Engineer-led, referral-vetted.</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {TEAM.map((t) => (
              <span key={t} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.6rem 1rem', color: 'var(--text-dim)', fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + provenance */}
      <section style={{ ...wrap, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 600, margin: 0 }}>Have a building worth saving?</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.15rem', margin: '1rem auto 2rem', maxWidth: 520 }}>
          Let’s assess it, engineer it, and realize its value.
        </p>
        <a href="mailto:hello@jonah.dev" style={{ background: 'var(--accent1)', color: 'var(--on-accent)', padding: '0.95rem 2rem', borderRadius: 'var(--radius)', fontWeight: 600, textDecoration: 'none' }}>Start a conversation</a>
      </section>

      <footer style={{ ...wrap, padding: '2rem 1.5rem 3rem', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontFamily: 'system-ui, sans-serif', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span>© Jonah — St. Louis real estate development</span>
        <span title="This presence is generated by the Story Agent crew from stored insights.">
          ✦ Crafted by the Story Agent crew{memCount ? ` · from ${memCount} live memories` : ''}
        </span>
      </footer>
    </div>
  );
}
