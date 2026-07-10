'use client';

/**
 * Vision — multimodal image analysis. Upload/paste a screenshot, pick an intent, analyze via a
 * Quark-selected OpenRouter vision model (same runVisionAnalysis as the MCP analyze_image tool).
 * SECURITY: images egress to a 3rd-party vision provider — use non-controlled UI only.
 */
import { useCallback, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

type Img = { type: 'base64'; data: string; mimeType: string };
const INTENTS = [
  ['describe', 'Describe'],
  ['screenshot_to_story', 'Screenshot → stories'],
  ['ui_review', 'UI / a11y review'],
  ['diagram_to_tasks', 'Diagram → tasks'],
  ['extract_text', 'Extract text (OCR)'],
  ['custom', 'Custom prompt'],
] as const;
const OK_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function VisionPage() {
  const [img, setImg] = useState<Img | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [intent, setIntent] = useState<string>('describe');
  const [customPrompt, setCustomPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ analysis: string; model: string } | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback((file: File) => {
    setErr(''); setResult(null);
    if (!OK_MIME.includes(file.type)) { setErr(`unsupported type ${file.type || '?'} — use png/jpeg/gif/webp`); return; }
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      const b64 = url.split(',')[1] ?? '';
      setImg({ type: 'base64', data: b64, mimeType: file.type });
      setPreview(url);
    };
    r.readAsDataURL(file);
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const f = Array.from(e.clipboardData.files)[0];
    if (f) load(f);
  }, [load]);

  async function analyze() {
    if (!img) return;
    setBusy(true); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img, intent, customPrompt: intent === 'custom' ? customPrompt : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || `HTTP ${res.status}`); return; }
      setResult(data);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' };
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }} onPaste={onPaste}>
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Vision' }]} />
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>🖼️ Vision — analyze an image</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
        Upload or paste a screenshot, pick an intent, and the crew’s Quark-selected vision model analyzes it.
      </p>
      <div style={{ ...card, borderLeft: '3px solid var(--warn)', marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
        ⚠️ Images are sent to a 3rd-party vision provider. Use <strong style={{ color: 'var(--text)' }}>non-controlled UI only</strong> — no client/secret/sa_ data in screenshots.
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', marginTop: '1.25rem' }}>
        <div style={card}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Image</label>
          <input type="file" accept={OK_MIME.join(',')} onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-dim)', fontSize: '0.82rem' }} />
          <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>…or paste an image anywhere on this page.</div>
          {preview && <img src={preview} alt="preview" style={{ marginTop: '0.75rem', maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />}
        </div>
        <div style={card}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Intent</label>
          <select value={intent} onChange={(e) => setIntent(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
            {INTENTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          {intent === 'custom' && (
            <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Custom prompt for the vision model…"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', minHeight: 80, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem' }} />
          )}
          <button onClick={analyze} disabled={!img || busy} style={{ marginTop: '0.75rem', width: '100%', padding: '0.7rem', borderRadius: 'var(--radius)', border: 'none', background: !img || busy ? 'var(--text-dim)' : 'var(--accent1)', color: 'var(--on-accent)', fontWeight: 700, cursor: !img || busy ? 'default' : 'pointer' }}>
            {busy ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {err && <div style={{ ...card, borderColor: 'var(--danger)', color: 'var(--danger)', marginTop: '1rem' }}>⚠️ {err}</div>}
      {result && (
        <div style={{ ...card, marginTop: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace', marginBottom: '0.5rem' }}>◇ {result.model}</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, color: 'var(--text)' }}>{result.analysis}</div>
        </div>
      )}
    </main>
  );
}
