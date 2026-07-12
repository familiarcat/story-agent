/**
 * Async status registry — a live, cross-process view of in-flight async work (crew missions,
 * agent-core runs, background jobs) so any CLI / natural-language prompt can surface a compact
 * PROGRESS REPORT of everything currently running.
 *
 * Design mirrors control-lane's ledger: an APPEND-ONLY JSONL event log at .claude/async-status.jsonl.
 * appendFileSync of a single small line is atomic on POSIX, so concurrent producers never clobber
 * each other (the read-modify-write hazard of a single mutable JSON blob is avoided entirely). The
 * current state is DERIVED by folding events by id (last event per id wins).
 *
 * Worf-safe: entries carry metrics only — id / kind / label / state / progress / timestamps /
 * optional clientId. NEVER prompt text or secrets. `label` is caller-supplied and must be safe.
 *
 * Reliability: a `running`/`queued` entry whose last heartbeat is older than its timeoutMs is
 * DERIVED as `timeout` on read — so a silent hang shows up as a terminal state with no writer
 * needed (this is the guardrail against the invisible-hang failure mode). Time is injected (`now`,
 * ms epoch) to keep the fold pure and testable. Every writer is best-effort and never throws.
 */
import { appendFileSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
const LOG = '.claude/async-status.jsonl';
export function asyncLogPath(dir) { return `${dir}/${LOG}`; }
/** No-heartbeat window after which a running entry is presumed stalled → derived `timeout`. */
export const DEFAULT_TIMEOUT_MS = 120000;
/** Terminal entries older than this are hidden from the snapshot (kept in the log until pruned). */
export const DEFAULT_STALE_TERMINAL_MS = 600000;
let seq = 0;
function append(dir, ev) {
    try {
        appendFileSync(asyncLogPath(dir), JSON.stringify(ev) + '\n');
    }
    catch { /* best-effort */ }
}
/** Start tracking a unit of async work. Returns the generated id for heartbeat/end. Never throws. */
export function beginAsync(dir, opts, now) {
    const id = `${opts.kind}-${now}-${++seq}`;
    append(dir, {
        ev: 'begin', id, kind: opts.kind, label: opts.label, state: 'running', ts: now,
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, ...(opts.clientId ? { clientId: opts.clientId } : {}),
    });
    return id;
}
/** Heartbeat / progress update — refreshes the entry's liveness so it isn't derived as timed-out. */
export function heartbeatAsync(dir, id, patch, now) {
    append(dir, { ev: 'beat', id, ts: now, ...(patch.progress != null ? { progress: patch.progress } : {}) });
}
/** Mark a unit terminal. Never throws. */
export function endAsync(dir, id, state, now) {
    append(dir, { ev: 'end', id, state, ts: now });
}
/** Tolerant read of the raw event log (chronological). Returns [] if absent/unreadable. */
export function readAsyncEvents(dir) {
    let raw = '';
    try {
        raw = readFileSync(asyncLogPath(dir), 'utf8');
    }
    catch {
        return [];
    }
    const out = [];
    for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t)
            continue;
        try {
            out.push(JSON.parse(t));
        }
        catch { /* skip malformed */ }
    }
    return out;
}
/**
 * Fold events into current entries (pure). Applies timeout derivation and hides stale terminal
 * entries. Sorted: active (running/queued) first, then most-recent terminal.
 */
export function foldAsyncEvents(events, now, opts) {
    const staleTerminalMs = opts?.staleTerminalMs ?? DEFAULT_STALE_TERMINAL_MS;
    const map = new Map();
    for (const e of events) {
        if (e.ev === 'begin') {
            map.set(e.id, {
                id: e.id, kind: e.kind ?? 'task', label: e.label ?? e.id,
                state: e.state ?? 'running', progress: e.progress,
                startedAt: e.ts, updatedAt: e.ts,
                timeoutMs: e.timeoutMs ?? DEFAULT_TIMEOUT_MS,
                ...(e.clientId ? { clientId: e.clientId } : {}),
            });
        }
        else {
            const cur = map.get(e.id);
            if (!cur)
                continue; // beat/end before begin — ignore
            cur.updatedAt = e.ts;
            if (e.progress != null)
                cur.progress = e.progress;
            if (e.ev === 'end' && e.state) {
                cur.state = e.state;
                cur.endedAt = e.ts;
            }
        }
    }
    const entries = [];
    for (const cur of map.values()) {
        // Derive timeout for anything still open past its heartbeat window.
        if ((cur.state === 'running' || cur.state === 'queued') && now - cur.updatedAt > cur.timeoutMs) {
            cur.state = 'timeout';
            cur.endedAt = cur.updatedAt + cur.timeoutMs;
        }
        // Hide old terminal entries from the snapshot (still retained in the log until pruned).
        const terminal = cur.state === 'done' || cur.state === 'failed' || cur.state === 'timeout';
        if (terminal && now - (cur.endedAt ?? cur.updatedAt) > staleTerminalMs)
            continue;
        entries.push(cur);
    }
    const rank = { running: 0, queued: 1, timeout: 2, failed: 3, done: 4 };
    entries.sort((a, b) => (rank[a.state] - rank[b.state]) || (b.updatedAt - a.updatedAt));
    return entries;
}
/** Read + fold in one call. */
export function readAsyncState(dir, now, opts) {
    return foldAsyncEvents(readAsyncEvents(dir), now, opts);
}
const ICON = { running: '▶', queued: '▷', done: '✓', failed: '✗', timeout: '⏱' };
function ago(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60)
        return `${s}s`;
    const m = Math.round(s / 60);
    return m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;
}
/**
 * Compact, human-readable snapshot for the terminal / prompt hook. Returns '' when nothing is
 * in-flight or recent (so quiet sessions stay quiet). `max` caps the lines shown.
 */
export function formatAsyncSnapshot(entries, now, opts) {
    if (!entries.length)
        return '';
    const max = opts?.max ?? 6;
    const active = entries.filter(e => e.state === 'running' || e.state === 'queued').length;
    const done = entries.filter(e => e.state === 'done').length;
    const bad = entries.filter(e => e.state === 'failed' || e.state === 'timeout').length;
    const lines = [];
    if (opts?.header !== false) {
        const parts = [active ? `${active} running` : '', done ? `${done} done` : '', bad ? `${bad} failed/timeout` : ''].filter(Boolean);
        lines.push(`🖖 async status — ${parts.join(' · ') || 'idle'} (last 10m)`);
    }
    for (const e of entries.slice(0, max)) {
        const pct = e.progress != null ? ` ${e.progress}%` : '';
        const t = e.state === 'running' || e.state === 'queued' ? `· ${ago(now - e.startedAt)}` : `· ${ago(now - (e.endedAt ?? e.updatedAt))} ago`;
        lines.push(`  ${ICON[e.state]} ${e.kind} ${e.label}${pct} ${t}`);
    }
    if (entries.length > max)
        lines.push(`  … +${entries.length - max} more`);
    return lines.join('\n');
}
/**
 * Compact the log: drop terminal events older than the retention window, rewritten atomically
 * (.tmp → rename). Best-effort; keeps the file from growing unbounded. Call opportunistically.
 */
export function pruneAsyncLog(dir, now, opts) {
    const retentionMs = opts?.retentionMs ?? DEFAULT_STALE_TERMINAL_MS;
    try {
        const events = readAsyncEvents(dir);
        if (!events.length)
            return;
        // Keep any event for an id that is still active OR whose last activity is within retention.
        const lastTs = new Map();
        const ended = new Set();
        for (const e of events) {
            lastTs.set(e.id, Math.max(lastTs.get(e.id) ?? 0, e.ts));
            if (e.ev === 'end')
                ended.add(e.id);
        }
        const keepIds = new Set();
        for (const [id, ts] of lastTs) {
            if (!ended.has(id) || now - ts <= retentionMs)
                keepIds.add(id);
        }
        if (keepIds.size === lastTs.size)
            return; // nothing to prune
        const kept = events.filter(e => keepIds.has(e.id)).map(e => JSON.stringify(e)).join('\n');
        const path = asyncLogPath(dir);
        const tmp = `${path}.tmp`;
        writeFileSync(tmp, kept ? kept + '\n' : '');
        renameSync(tmp, path);
    }
    catch { /* best-effort */ }
}
