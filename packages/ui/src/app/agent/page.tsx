'use client';

import { useRef, useState } from 'react';
import { color, tier as TIER_COLOR, font } from '@/lib/tokens';
import { ChatMessage } from '@/components/ChatMessage';
import { Breadcrumbs } from '@/components/Breadcrumbs';
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

  function handleFrame(eventName: string | null, data: unknown) {
    if (!data) return;
    // Running cost is SET-wise (cost/done carry cumulative spend) — one reducer for every frame.
    setSessionCost(prev => cumulativeCost(prev, { eventName, data: data as Record<string, unknown> }));
    // The final `event: done` payload is the loop RESULT (finalText/totalCostUSD/model).
    if (eventName === 'done') {
      const done = data as { model: string; totalCostUSD: number; finalText: string };
      pushEv({ kind: 'done', model: done.model, costUSD: done.totalCostUSD, text: done.finalText });
      return;
    }
    const frame = data as Record<string, unknown>;
    switch (frame.type) {
      case 'model': setModel(frame.model as string | null); pushEv({ kind: 'model', model: frame.model as string }); break;
      case 'lens': pushEv({ kind: 'lens', text: frame.text as string }); break;
      case 'text': pushEv({ kind: 'text', text: frame.text as string }); break;
      case 'tool_call': pushEv({ kind: 'tool_call', tool: frame.tool as string, args: frame.args as Record<string, unknown> }); break;
      case 'gate': pushEv({ kind: 'gate', tool: frame.tool as string, tier: frame.tier as string, remediations: frame.remediations as string[], needsApproval: frame.needsApproval as boolean, approvalId: frame.approvalId as string }); break;
      case 'tool_result': pushEv({ kind: 'tool_result', tool: frame.tool as string, text: frame.text as string, tier: frame.tier as string }); break;
      case 'cost': pushEv({ kind: 'cost', costUSD: frame.costUSD as number, text: frame.text as string }); break;
      case 'escalation': pushEv({ kind: 'escalation', tool: frame.tool as string, text: frame.text as string }); break;
      case 'retry': pushEv({ kind: 'retry', text: frame.text as string }); break;
      case 'error': pushEv({ kind: 'error', text: frame.text as string }); break;
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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'stream failed';
      pushEv({ kind: 'error', text: errorMessage });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '1.5rem', fontFamily: font.sans }}>
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Agent' }]} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0 }}>🛠️ Story Agent — Agent Workspace</h1>
        <span style={{ fontSize: '0.8rem', color: color.muted, fontFamily: font.mono }}>
          {model ? `🤖 ${model}` : 'OpenRouter · Quark-selected'} · session ~${sessionCost.toFixed(4)}
        </span>
      </header>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 0 }}>
        A full coding loop on the crew — read/edit/run/search/git on the cheapest adequate OpenRouter model.
        Every tool call is governed by WorfGate (🟢 allow · 🟡 remediated · 🔴 blocked).
      </p>

      <div ref={scrollRef} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', height: '62vh', overflowY: 'auto', background: 'var(--surface)' }}>
        {events.length === 0 && (
          <p style={{ color: 'var(--text-dim)' }}>
            Give the agent a coding task — e.g. “List the files in packages/shared/src and summarize delegation-router.ts”,
            or “Add a comment to the top of README.md”. Quark picks the model; you watch the tool loop run live.
          </p>
        )}
        {events.map((e, i) => <EventRow key={i} e={e} decided={decided} onApprove={approve} />)}
        {busy && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>…working</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
          placeholder="Describe a coding task… (Enter to run, Shift+Enter for newline)"
          rows={2}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }}
        />
        <button onClick={run} disabled={busy || !input.trim()} style={{ padding: '0 1.25rem', borderRadius: 8, border: 'none', background: busy ? 'var(--text-dim)' : 'var(--accent4)', color: 'var(--on-accent)', fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}>
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
      return <ChatMessage role="user"><div style={{ whiteSpace: 'pre-wrap' }}>{e.text}</div></ChatMessage>;
    case 'model':
      return <div style={{ ...mono, color: 'var(--text-dim)', margin: '0.4rem 0' }}>🤖 model selected: {e.model}</div>;
    case 'lens':
      return <div style={{ ...mono, color: 'var(--text-dim)', margin: '0.2rem 0' }}>🔭 {e.text}</div>;
    case 'text':
      return <ChatMessage role="assistant" sender="Agent"><div style={{ whiteSpace: 'pre-wrap' }}>{e.text}</div></ChatMessage>;
    case 'tool_call':
      return (
        <div style={{ margin: '0.4rem 0', padding: '0.5rem 0.7rem', background: 'var(--surface-2)', borderRadius: 6, borderLeft: '3px solid var(--accent3)' }}>
          <div style={{ ...mono, color: 'var(--accent3)' }}>🔧 {e.tool}</div>
          <pre style={{ ...mono, margin: '0.3rem 0 0', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{safeJson(e.args)}</pre>
        </div>
      );
    case 'gate': {
      const c = TIER_COLOR[e.tier as keyof typeof TIER_COLOR] ?? color.muted;
      const icon = e.tier === 'green' ? '🟢' : e.tier === 'yellow' ? '🟡' : e.tier === 'red' ? '🔴' : '⚪';
      const decision = e.approvalId ? decided[e.approvalId] : undefined;
      return (
        <div style={{ ...mono, margin: '0.3rem 0', color: c }}>
          {icon} WorfGate [{e.tier}] {e.tool}
          {e.remediations?.length ? <span style={{ color: 'var(--text-dim)' }}> — {e.remediations.join('; ')}</span> : null}
          {e.needsApproval && e.approvalId && (
            decision
              ? <span style={{ marginLeft: 8, color: decision === 'approve' ? 'var(--ok)' : 'var(--danger)' }}>
                  {decision === 'approve' ? '✓ approved' : '✗ denied'}
                </span>
              : <span style={{ marginLeft: 8 }}>
                  <button onClick={() => onApprove(e.approvalId!, 'approve')} style={btn('var(--ok)')}>Approve</button>
                  <button onClick={() => onApprove(e.approvalId!, 'deny')} style={btn('var(--danger)')}>Deny</button>
                </span>
          )}
        </div>
      );
    }
    case 'tool_result':
      return (
        <div style={{ margin: '0.2rem 0 0.5rem', padding: '0.5rem 0.7rem', background: 'var(--surface-2)', borderRadius: 6, borderLeft: '3px solid var(--text-dim)', maxHeight: 280, overflow: 'auto' }}>
          <div style={{ ...mono, color: 'var(--text-dim)', marginBottom: 4 }}>⮑ {e.tool} result</div>
          {isDiff(e.tool, e.text)
            ? <DiffView text={e.text} mono={mono} />
            : <pre style={{ ...mono, margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{e.text}</pre>}
        </div>
      );
    case 'cost':
      return <div style={{ ...mono, color: 'var(--warn)', margin: '0.2rem 0' }}>💰 {e.text || `$${e.costUSD?.toFixed?.(4)}`}</div>;
    case 'escalation':
      return <div style={{ ...mono, color: 'var(--accent3)', margin: '0.3rem 0' }}>⏫ escalation{e.tool ? ` (${e.tool})` : ''}: {e.text}</div>;
    case 'retry':
      return <div style={{ ...mono, color: 'var(--text-dim)', margin: '0.2rem 0' }}>↻ {e.text}</div>;
    case 'done':
      return (
        <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
          {e.text && <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{e.text}</div>}
          <div style={{ ...mono, color: 'var(--ok)', marginTop: 4 }}>✅ done{e.model ? ` · ${e.model}` : ''}{typeof e.costUSD === 'number' ? ` · $${e.costUSD.toFixed(4)}` : ''}</div>
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

function btn(c: string): React.CSSProperties {
  return { marginLeft: 6, padding: '1px 8px', fontSize: '0.72rem', borderRadius: 5, border: `1px solid ${c}`, background: 'var(--surface)', color: c, cursor: 'pointer' };
}

/** Render a unified diff with colored add/remove lines. */
function DiffView({ text, mono }: { text: string; mono: React.CSSProperties }) {
  const lines = text.split('\n');
  const colorFor = (l: string) =>
    l.startsWith('+') && !l.startsWith('+++') ? { bg: 'color-mix(in srgb, var(--ok) 18%, var(--surface))', fg: 'var(--ok)' }
    : l.startsWith('-') && !l.startsWith('---') ? { bg: 'color-mix(in srgb, var(--danger) 18%, var(--surface))', fg: 'var(--danger)' }
    : l.startsWith('@@') ? { bg: 'color-mix(in srgb, var(--accent4) 18%, var(--surface))', fg: 'var(--accent4)' }
    : { bg: 'transparent', fg: 'var(--text)' };
  return (
    <pre style={{ ...mono, margin: 0 }}>
      {lines.map((l, i) => {
        const c = colorFor(l);
        return <div key={i} style={{ background: c.bg, color: c.fg, whiteSpace: 'pre-wrap' }}>{l || ' '}</div>;
      })}
    </pre>
  );
}
