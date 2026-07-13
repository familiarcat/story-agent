'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAhaEvents } from '@/hooks/useAhaEvents';

type ExecutionStatusResponse = {
  success: boolean;
  aggregate?: {
    today_count: number;
    today_success_rate: number;
    today_cost_usd: number;
    active_tasks_count: number;
  };
};

type ChatPulse = {
  type: 'turn_started' | 'turn_progress' | 'turn_completed' | 'turn_error';
  model?: string;
  costUSD?: number;
  stage?: string;
  at?: string;
};

function fmtAgo(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export function RealtimeOpsPanel() {
  const router = useRouter();
  const [activeTasks, setActiveTasks] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [todaySuccessRate, setTodaySuccessRate] = useState(0);
  const [todayCost, setTodayCost] = useState(0);
  const [lastAhaEventAt, setLastAhaEventAt] = useState<string | null>(null);
  const [lastChatEventAt, setLastChatEventAt] = useState<string | null>(null);
  const [lastChatModel, setLastChatModel] = useState<string>('n/a');
  const [lastChatStage, setLastChatStage] = useState<string>('idle');
  const [chatTurns, setChatTurns] = useState(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/crew/execution-status?limit=20', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as ExecutionStatusResponse;
        if (cancelled || !data.success || !data.aggregate) return;
        setActiveTasks(data.aggregate.active_tasks_count || 0);
        setTodayCount(data.aggregate.today_count || 0);
        setTodaySuccessRate(data.aggregate.today_success_rate || 0);
        setTodayCost(data.aggregate.today_cost_usd || 0);
      } catch {
        // best-effort live telemetry
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useAhaEvents(
    () => {
      setLastAhaEventAt(new Date().toISOString());
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => router.refresh(), 1200);
    },
    { intervalMs: 8000 },
  );

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('story-agent-chat');
      channel.onmessage = (ev) => {
        const pulse = ev.data as ChatPulse;
        if (!pulse || typeof pulse !== 'object') return;
        setLastChatEventAt(pulse.at || new Date().toISOString());
        if (pulse.model) setLastChatModel(pulse.model);
        setLastChatStage(pulse.stage || pulse.type);
        if (pulse.type === 'turn_started') setChatTurns((v) => v + 1);
      };
    } catch {
      // BroadcastChannel may be unavailable in hardened contexts.
    }
    return () => channel?.close();
  }, []);

  const liveLabel = useMemo(() => (activeTasks > 0 ? 'LIVE' : 'IDLE'), [activeTasks]);

  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>System Live Status</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Real-time crew execution + chat activity synced with dashboard refresh.
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: activeTasks > 0 ? 'var(--ok)' : 'var(--text-dim)' }}>
          {liveLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginTop: '0.9rem' }}>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activeTasks}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>active crew tasks</div>
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{todayCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>runs today</div>
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round(todaySuccessRate)}%</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>success rate</div>
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>${todayCost.toFixed(4)}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>cost today</div>
        </div>
      </div>

      <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-dim)', display: 'grid', gap: 4 }}>
        <div>Aha sync pulse: {fmtAgo(lastAhaEventAt)}</div>
        <div>Chat pulse: {fmtAgo(lastChatEventAt)} · {lastChatStage} · model {lastChatModel} · turns {chatTurns}</div>
      </div>
    </div>
  );
}

export default RealtimeOpsPanel;
