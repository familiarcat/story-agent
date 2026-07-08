import { describe, it, expect } from 'vitest';
import { foldAsyncEvents, formatAsyncSnapshot, DEFAULT_TIMEOUT_MS, type AsyncEvent } from './async-status.js';

const T0 = 1_000_000;

describe('async-status fold', () => {
  it('folds begin → beat → end into a terminal entry with latest progress', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'm1', kind: 'mission', label: 'run', state: 'running', ts: T0, timeoutMs: DEFAULT_TIMEOUT_MS },
      { ev: 'beat', id: 'm1', progress: 40, ts: T0 + 1000 },
      { ev: 'beat', id: 'm1', progress: 90, ts: T0 + 2000 },
      { ev: 'end', id: 'm1', state: 'done', ts: T0 + 3000 },
    ];
    const [e] = foldAsyncEvents(ev, T0 + 3000);
    expect(e.state).toBe('done');
    expect(e.progress).toBe(90);
    expect(e.startedAt).toBe(T0);
    expect(e.endedAt).toBe(T0 + 3000);
  });

  it('derives timeout for a running entry past its heartbeat window (the invisible-hang guardrail)', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'stuck', kind: 'mission', label: 'hung', state: 'running', ts: T0, timeoutMs: 5000 },
      { ev: 'beat', id: 'stuck', progress: 10, ts: T0 + 1000 },
    ];
    const now = T0 + 1000 + 5001; // 5001ms since last heartbeat > 5000 timeout
    const [e] = foldAsyncEvents(ev, now);
    expect(e.state).toBe('timeout');
    expect(e.endedAt).toBe(T0 + 1000 + 5000);
  });

  it('does NOT time out a running entry still within its window', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'ok', kind: 'mission', label: 'live', state: 'running', ts: T0, timeoutMs: 10_000 },
      { ev: 'beat', id: 'ok', ts: T0 + 1000 },
    ];
    const [e] = foldAsyncEvents(ev, T0 + 2000);
    expect(e.state).toBe('running');
  });

  it('hides terminal entries older than the stale window but keeps fresh ones', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'old', kind: 'mission', label: 'old', ts: T0, timeoutMs: DEFAULT_TIMEOUT_MS },
      { ev: 'end', id: 'old', state: 'done', ts: T0 + 1000 },
      { ev: 'begin', id: 'new', kind: 'mission', label: 'new', ts: T0 + 2000, timeoutMs: DEFAULT_TIMEOUT_MS },
      { ev: 'end', id: 'new', state: 'done', ts: T0 + 3000 },
    ];
    const now = T0 + 1000 + 600_001; // 'old' ended > 10m ago; 'new' still fresh-ish relative to now
    const ids = foldAsyncEvents(ev, now, { staleTerminalMs: 600_000 }).map(e => e.id);
    expect(ids).toContain('new'); // ended more recently
    expect(ids).not.toContain('old');
  });

  it('ignores beat/end events that arrive before their begin', () => {
    const ev: AsyncEvent[] = [
      { ev: 'beat', id: 'ghost', progress: 50, ts: T0 },
      { ev: 'end', id: 'ghost', state: 'done', ts: T0 + 1 },
    ];
    expect(foldAsyncEvents(ev, T0 + 1)).toHaveLength(0);
  });

  it('sorts running before terminal', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'done1', kind: 'x', label: 'a', ts: T0, timeoutMs: DEFAULT_TIMEOUT_MS },
      { ev: 'end', id: 'done1', state: 'done', ts: T0 + 10 },
      { ev: 'begin', id: 'run1', kind: 'x', label: 'b', ts: T0 + 20, timeoutMs: DEFAULT_TIMEOUT_MS },
    ];
    const order = foldAsyncEvents(ev, T0 + 30).map(e => e.id);
    expect(order[0]).toBe('run1');
  });
});

describe('async-status snapshot', () => {
  it('returns empty string when nothing is in-flight (quiet stays quiet)', () => {
    expect(formatAsyncSnapshot([], T0)).toBe('');
  });

  it('renders a header + one line per entry', () => {
    const ev: AsyncEvent[] = [
      { ev: 'begin', id: 'm1', kind: 'mission', label: 'run_crew_mission_pipeline', state: 'running', ts: T0, timeoutMs: DEFAULT_TIMEOUT_MS },
      { ev: 'beat', id: 'm1', progress: 65, ts: T0 + 1000 },
    ];
    const out = formatAsyncSnapshot(foldAsyncEvents(ev, T0 + 1000), T0 + 1000);
    expect(out).toContain('async status');
    expect(out).toContain('run_crew_mission_pipeline');
    expect(out).toContain('65%');
  });
});
