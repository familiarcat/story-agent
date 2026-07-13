'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/components/ChatMessage';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const META = '␞ META ␞';

interface Meta {
  model: string;
  tier: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  sources: string[];
}

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  meta?: Meta;
}

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastProgressPulseAtRef = useRef<number>(0);

  function emitChatPulse(payload: {
    type: 'turn_started' | 'turn_progress' | 'turn_completed' | 'turn_error';
    model?: string;
    costUSD?: number;
    stage?: string;
  }) {
    try {
      if (!channelRef.current) channelRef.current = new BroadcastChannel('story-agent-chat');
      channelRef.current.postMessage({ ...payload, at: new Date().toISOString() });
    } catch {
      // BroadcastChannel can be unavailable in some environments; chat still works without it.
    }
  }

  useEffect(() => {
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    emitChatPulse({ type: 'turn_started', stage: 'dispatching' });
    // Multi-turn: send recent conversation so the crew chat has memory.
    const history = turns
      .filter(t => t.text)
      .slice(-8)
      .map(t => ({ role: t.role, content: t.text }));
    setTurns(t => [...t, { role: 'user', text: message }, { role: 'assistant', text: '' }]);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      emitChatPulse({ type: 'turn_progress', stage: 'response_opened' });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        emitChatPulse({ type: 'turn_error', stage: 'http_error' });
        setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: `⚠️ ${err.error}` }; return c; });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      let lastMeta: Meta | undefined;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const [answer, metaStr] = acc.split(META);
        let meta: Meta | undefined;
        if (metaStr) { try { meta = JSON.parse(metaStr); } catch { /* partial */ } }
        if (meta) lastMeta = meta;
        const now = Date.now();
        if (now - lastProgressPulseAtRef.current > 750) {
          emitChatPulse({ type: 'turn_progress', model: meta?.model, costUSD: meta?.costUSD, stage: 'streaming' });
          lastProgressPulseAtRef.current = now;
        }
        setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: answer, meta }; return c; });
        scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
      }
      emitChatPulse({ type: 'turn_completed', model: lastMeta?.model, costUSD: lastMeta?.costUSD, stage: 'completed' });
    } catch (e) {
      emitChatPulse({ type: 'turn_error', stage: 'exception' });
      setTurns(t => { const c = [...t]; c[c.length - 1] = { role: 'assistant', text: `⚠️ ${e instanceof Error ? e.message : String(e)}` }; return c; });
    } finally {
      setBusy(false);
    }
  }

  const sessionCost = turns.reduce((s, t) => s + (t.meta?.costUSD ?? 0), 0);

  // Lightweight, dependency-free markdown: fenced code blocks + inline code. Keeps a code assistant
  // readable without pulling in a renderer.
  function renderText(text: string) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      const fence = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
      if (fence) {
        return (
          <pre key={i} style={{ background: 'var(--text)', color: 'var(--border)', padding: '0.75rem', borderRadius: 6, overflowX: 'auto', fontSize: '0.82rem', margin: '0.5rem 0' }}>
            <code>{fence[2].replace(/\n$/, '')}</code>
          </pre>
        );
      }
      const inline = part.split(/(`[^`]+`)/g).map((seg, j) =>
        seg.startsWith('`') && seg.endsWith('`')
          ? <code key={j} style={{ background: 'var(--surface-2)', padding: '0 4px', borderRadius: 3, fontSize: '0.85em' }}>{seg.slice(1, -1)}</code>
          : <span key={j}>{seg}</span>
      );
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{inline}</span>;
    });
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Chat' }]} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🖖 Story Agent — Crew Assistant</h1>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          OpenRouter · Quark-optimized · session ~${sessionCost.toFixed(4)}
          {turns.length > 0 && (
            <button onClick={() => setTurns([])} disabled={busy} style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: busy ? 'default' : 'pointer' }}>
              + New chat
            </button>
          )}
        </span>
      </header>

      <div ref={scrollRef} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', height: '60vh', overflowY: 'auto', background: 'var(--surface)' }}>
        {turns.length === 0 && (
          <p style={{ color: 'var(--text-dim)' }}>Ask anything.</p>
        )}
        {turns.map((t, i) => (
          <ChatMessage
            key={i}
            role={t.role}
            meta={t.meta && (
              <>
                🤖 {t.meta.model} · {t.meta.provider} · {t.meta.tier} route · ↑{t.meta.tokensIn} ↓{t.meta.tokensOut} tok · ~${t.meta.costUSD.toFixed(4)}
                {t.meta.sources?.length ? <><br />📎 {t.meta.sources.join(', ')}</> : null}
              </>
            )}
          >
            {t.text ? renderText(t.text) : (busy && i === turns.length - 1 ? '…' : '')}
          </ChatMessage>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask the crew… (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
        />
        <button onClick={send} disabled={busy || !input.trim()} style={{ padding: '0 1.25rem', borderRadius: 8, border: 'none', background: busy ? 'var(--text-dim)' : 'var(--ok)', color: 'var(--on-accent)', fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </main>
  );
}
