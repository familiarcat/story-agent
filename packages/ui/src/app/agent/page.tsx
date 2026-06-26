'use client';

import { useRef, useState } from 'react';
import { color, tier as TIER_COLOR, font } from '@/lib/tokens';
import { parseSSEFrame, cumulativeCost, sanitizeError, isDiff, safeJson } from './transcript';

/**
 * Agent Workspace — a Claude-Code-grade coding loop in the browser, running entirely on the
 * OpenRouter/Quark crew. Streams the agent-core /agent SSE loop and renders each step: the model
 * Quark picked, the assistant's reasoning, every tool call (read/edit/run/search/git), the WorfGate
 * governance decision, tool output, and running cost. Wave 1 (MVP): transcript view. Wave 2: file
 * tree + diff-apply + interactive approvals.
 */

type Ev =
  | { kind: 'user'; text: string }
  | { kind: 'model'; model: string }
  | { kind: 'lens'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'tool_call'; tool: string; args: unknown }
  | { kind: 'gate'; tool: string; tier: string; remediations?: string[]; needsApproval?: boolean; approvalId?: string }
  | { kind: 'tool_result'; tool: string; text: string; tier?: string }
  | { kind: 'cost'; costUSD: number; text?: string }
  | { kind: 'escalation'; tool?: string; text: string }
  | { kind: 'retry'; text: string }
  | { kind: 'done'; model?: string; costUSD?: number; text?: string }
  | { kind: 'error'; text: string };

export default function AgentPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [sessionCost, setSessionCost] = useState(0);
  const [decided, setDecided] = useState<Record<string, 'approve' | 'deny'>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  async function approve(id: string, decision: 'approve' | 'deny') {
    setDecided(d => ({ ...d, [id]: decision }));
    try {
      await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision }),
      });
    } catch { /* the loop auto-denies on timeout if this fails */ }
  }

  function pushEv(e: Ev) {
    setEvents(prev => [...prev, e]);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  function handleFrame(eventName: string | null, data: any) {
    if (!data) return;
    // Running cost is SET-wise (cost/done carry cumulative spend) — one reducer for every frame.
    setSessionCost(prev => cumulativeCost(prev, { eventName, data }));
    // The final `event: done` payload is the loop RESULT (finalText/totalCostUSD/model).
    if (eventName === 'done') {
      pushEv({ kind: 'done', model: data.model, costUSD: data.totalCostUSD, text: data.finalText });
      return;
    }
    switch (data.type) {
      case 'model': setModel(data.model); pushEv({ kind: 'model', model: data.model }); break;
      case 'lens': pushEv({ kind: 'lens', text: data.text }); break;
      case 'text': pushEv({ kind: 'text', text: data.text }); break;
      case 'tool_call': pushEv({ kind: 'tool_call', tool: data.tool, args: data.args }); break;
      case 'gate': pushEv({ kind: 'gate', tool: data.tool, tier: data.tier, remediations: data.remediations, needsApproval: data.needsApproval, approvalId: data.approvalId }); break;
      case 'tool_result': pushEv({ kind: 'tool_result', tool: data.tool, text: data.text, tier: data.tier }); break;
      case 'cost': pushEv({ kind: 'cost', costUSD: data.costUSD, text: data.text }); break;
      case 'escalation': pushEv({ kind: 'escalation', tool: data.tool, text: data.text }); break;
      case 'retry': pushEv({ kind: 'retry', text: data.text }); break;
      case 'error': pushEv({ kind: 'error', text: data.text }); break;
      // NOTE: 'done' is a NAMED SSE event (handled above), never a data.type — no case needed here.
      default: break;
    }
  }

  async function run() {
    const task = input.trim();
    if (!task || busy) return;
    setInput('');
    setBusy(true);
    setModel(null);
    setEvents([{ kind: 'user', text: task }]);
    setSessionCost(0);
    setDecided({});

    try {
      const resp = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: task, requireApproval: true }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        pushEv({ kind: 'error', text: err.error || `HTTP ${resp.status}` });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // SSE frames are separated by a blank line.
        const blocks = buf.split('\n\n');
        buf = blocks.pop() ?? '';
        for (const block of blocks) {
          const frame = parseSSEFrame(block);
          if (frame) handleFrame(frame.eventName, frame.data);
        }
      }
    } catch (e: any) {
      pushEv({ kind: 'error', text: e?.message || 'stream failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '1.5rem', fontFamily: font.sans }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🛠️ Story Agent — Agent Workspace</h1>
        <span style={{ fontSize: '0.8rem', color: color.muted, fontFamily: font.mono }}>
          {model ? `🤖 ${model}` : 'OpenRouter · Quark-selected'} · session ~${sessionCost.toFixed(4)}
        </span>
      </header>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 0 }}>
        A full coding loop on the crew — read/edit/run/search/git on the cheapest adequate OpenRouter model.
        Every tool call is governed by WorfGate (🟢 allow · 🟡 remediated · 🔴 blocked).
      </p>

      <div ref={scrollRef} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', height: '62vh', overflowY: 'auto', background: '#fafafa' }}>
        {events.length === 0 && (
          <p style={{ color: '#9ca3af' }}>
            Give the agent a coding task — e.g. “List the files in packages/shared/src and summarize delegation-router.ts”,
            or “Add a comment to the top of README.md”. Quark picks the model; you watch the tool loop run live.
          </p>
        )}
        {events.map((e, i) => <EventRow key={i} e={e} decided={decided} onApprove={approve} />)}
        {busy && <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>…working</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
          placeholder="Describe a coding task… (Enter to run, Shift+Enter for newline)"
          rows={2}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #d1d5db', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
        />
        <button onClick={run} disabled={busy || !input.trim()} style={{ padding: '0 1.25rem', borderRadius: 8, border: 'none', background: busy ? '#9ca3af' : '#2563eb', color: 'white', fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '…' : 'Run'}
        </button>
      </div>
    </main>
  );
}

function EventRow({ e, decided, onApprove }: { e: Ev; decided: Record<string, 'approve' | 'deny'>; onApprove: (id: string, d: 'approve' | 'deny') => void }) {
  const mono: React.CSSProperties = { fontFamily: font.mono, fontSize: '0.8rem' };
  switch (e.kind) {
    case 'user':
      return <Block label="You" color="#2563eb"><div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{e.text}</div></Block>;
    case 'model':
      return <div style={{ ...mono, color: '#6b7280', margin: '0.4rem 0' }}>🤖 model selected: {e.model}</div>;
    case 'lens':
      return <div style={{ ...mono, color: '#9ca3af', margin: '0.2rem 0' }}>🔭 {e.text}</div>;
    case 'text':
      return <Block label="Agent" color="#059669"><div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{e.text}</div></Block>;
    case 'tool_call':
      return (
        <div style={{ margin: '0.4rem 0', padding: '0.5rem 0.7rem', background: '#eef2ff', borderRadius: 6, borderLeft: '3px solid #6366f1' }}>
          <div style={{ ...mono, color: '#4338ca' }}>🔧 {e.tool}</div>
          <pre style={{ ...mono, margin: '0.3rem 0 0', whiteSpace: 'pre-wrap', color: '#374151' }}>{safeJson(e.args)}</pre>
        </div>
      );
    case 'gate': {
      const c = TIER_COLOR[e.tier as keyof typeof TIER_COLOR] ?? color.muted;
      const icon = e.tier === 'green' ? '🟢' : e.tier === 'yellow' ? '🟡' : e.tier === 'red' ? '🔴' : '⚪';
      const decision = e.approvalId ? decided[e.approvalId] : undefined;
      return (
        <div style={{ ...mono, margin: '0.3rem 0', color: c }}>
          {icon} WorfGate [{e.tier}] {e.tool}
          {e.remediations?.length ? <span style={{ color: '#6b7280' }}> — {e.remediations.join('; ')}</span> : null}
          {e.needsApproval && e.approvalId && (
            decision
              ? <span style={{ marginLeft: 8, color: decision === 'approve' ? '#059669' : '#dc2626' }}>
                  {decision === 'approve' ? '✓ approved' : '✗ denied'}
                </span>
              : <span style={{ marginLeft: 8 }}>
                  <button onClick={() => onApprove(e.approvalId!, 'approve')} style={btn('#059669')}>Approve</button>
                  <button onClick={() => onApprove(e.approvalId!, 'deny')} style={btn('#dc2626')}>Deny</button>
                </span>
          )}
        </div>
      );
    }
    case 'tool_result':
      return (
        <div style={{ margin: '0.2rem 0 0.5rem', padding: '0.5rem 0.7rem', background: '#f3f4f6', borderRadius: 6, borderLeft: '3px solid #9ca3af', maxHeight: 280, overflow: 'auto' }}>
          <div style={{ ...mono, color: '#6b7280', marginBottom: 4 }}>⮑ {e.tool} result</div>
          {isDiff(e.tool, e.text)
            ? <DiffView text={e.text} mono={mono} />
            : <pre style={{ ...mono, margin: 0, whiteSpace: 'pre-wrap', color: '#111827' }}>{e.text}</pre>}
        </div>
      );
    case 'cost':
      return <div style={{ ...mono, color: '#d97706', margin: '0.2rem 0' }}>💰 {e.text || `$${e.costUSD?.toFixed?.(4)}`}</div>;
    case 'escalation':
      return <div style={{ ...mono, color: '#7c3aed', margin: '0.3rem 0' }}>⏫ escalation{e.tool ? ` (${e.tool})` : ''}: {e.text}</div>;
    case 'retry':
      return <div style={{ ...mono, color: '#9ca3af', margin: '0.2rem 0' }}>↻ {e.text}</div>;
    case 'done':
      return (
        <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #e5e7eb' }}>
          {e.text && <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{e.text}</div>}
          <div style={{ ...mono, color: '#059669', marginTop: 4 }}>✅ done{e.model ? ` · ${e.model}` : ''}{typeof e.costUSD === 'number' ? ` · $${e.costUSD.toFixed(4)}` : ''}</div>
        </div>
      );
    case 'error':
      return (
        <div role="alert" style={{ margin: '0.4rem 0', padding: '0.6rem 0.8rem', background: color.errBg, border: `1px solid ${color.errBorder}`, borderRadius: 6, color: color.errText, fontSize: '0.85rem', lineHeight: 1.5 }}>
          ⚠️ <strong>Error:</strong> {sanitizeError(e.text)}
        </div>
      );
    default:
      return null;
  }
}

function Block({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.78rem', color }}>{label}</div>
      {children}
    </div>
  );
}

function btn(c: string): React.CSSProperties {
  return { marginLeft: 6, padding: '1px 8px', fontSize: '0.72rem', borderRadius: 5, border: `1px solid ${c}`, background: 'white', color: c, cursor: 'pointer' };
}

/** Render a unified diff with colored add/remove lines. */
function DiffView({ text, mono }: { text: string; mono: React.CSSProperties }) {
  const lines = text.split('\n');
  const colorFor = (l: string) =>
    l.startsWith('+') && !l.startsWith('+++') ? { bg: '#e6ffed', fg: '#03543f' }
    : l.startsWith('-') && !l.startsWith('---') ? { bg: '#ffeef0', fg: '#86181d' }
    : l.startsWith('@@') ? { bg: '#f1f8ff', fg: '#005cc5' }
    : { bg: 'transparent', fg: '#374151' };
  return (
    <pre style={{ ...mono, margin: 0 }}>
      {lines.map((l, i) => {
        const c = colorFor(l);
        return <div key={i} style={{ background: c.bg, color: c.fg, whiteSpace: 'pre-wrap' }}>{l || ' '}</div>;
      })}
    </pre>
  );
}
