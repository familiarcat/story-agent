'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AhaSprintStory } from '@story-agent/shared';

type SprintCalendarPlannerProps = {
  sprintId: string;
  sprintName: string;
  startDate: string | null;
  endDate: string | null;
  stories: AhaSprintStory[];
};

type PlanState = {
  backlog: string[];
  days: Record<string, string[]>;
};

type ExportPayload = {
  sprintId: string;
  sprintName: string;
  exportedAt: string;
  slotMinutes: number;
  dayCapacityHours: number;
  plan: PlanState;
};

type PersistedResponse = {
  found: boolean;
  payload?: ExportPayload;
};

function dateRange(start: string | null, end: string | null): string[] {
  if (!start || !end) return [];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return [];

  const out: string[] = [];
  const cursor = new Date(s);
  while (cursor <= e) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      out.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.slice(0, 15);
}

function estimateBlockHours(points: number | null): number {
  const p = points ?? 1;
  return Math.max(1, Math.min(16, Math.round(p * 1.8)));
}

function loadFactor(points: number | null): number {
  const p = points ?? 1;
  return p <= 3 ? p : p <= 8 ? p * 1.15 : p * 1.3;
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete') || s.includes('ship')) return 'var(--ok)';
  if (s.includes('progress') || s.includes('review')) return 'var(--accent4)';
  if (s.includes('block')) return 'var(--danger)';
  return 'var(--text-dim)';
}

export function SprintCalendarPlanner({ sprintId, sprintName, startDate, endDate, stories }: SprintCalendarPlannerProps) {
  const dayKeys = useMemo(() => dateRange(startDate, endDate), [startDate, endDate]);
  const byRef = useMemo(() => new Map(stories.map(s => [s.referenceNum, s])), [stories]);
  const localKey = `story-agent:calendar-plan:${sprintId}`;

  const [plan, setPlan] = useState<PlanState>({ backlog: stories.map(s => s.referenceNum), days: {} });
  const [dragRef, setDragRef] = useState<string | null>(null);
  const [slotMinutes, setSlotMinutes] = useState<number>(60);
  const [dayCapacityHours, setDayCapacityHours] = useState<number>(6);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fallback: PlanState = { backlog: stories.map(s => s.referenceNum), days: {} };
    for (const day of dayKeys) fallback.days[day] = [];

    const availableRefs = new Set(stories.map(s => s.referenceNum));

    const normalizePlan = (incoming: PlanState): PlanState => {
      const next: PlanState = {
        backlog: (incoming.backlog ?? []).filter(r => availableRefs.has(r)),
        days: {},
      };
      for (const day of dayKeys) {
        next.days[day] = (incoming.days?.[day] ?? []).filter(r => availableRefs.has(r));
      }
      const allocated = new Set<string>([...next.backlog, ...Object.values(next.days).flat()]);
      for (const ref of availableRefs) {
        if (!allocated.has(ref)) next.backlog.push(ref);
      }
      return next;
    };

    const localPlan = (() => {
      try {
        const raw = localStorage.getItem(localKey);
        if (!raw) return fallback;
        return normalizePlan(JSON.parse(raw) as PlanState);
      } catch {
        return fallback;
      }
    })();

    const load = async () => {
      try {
        const res = await fetch(`/api/sprint/calendar-plan?sprintId=${encodeURIComponent(sprintId)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('planner fetch failed');
        const data = (await res.json()) as PersistedResponse;
        if (!cancelled && data.found && data.payload?.plan) {
          setSlotMinutes(data.payload.slotMinutes || 60);
          setDayCapacityHours(data.payload.dayCapacityHours || 6);
          setPlan(normalizePlan(data.payload.plan));
          setHydrated(true);
          return;
        }
      } catch {
        // Fall back to local-only state when API is unavailable.
      }

      if (!cancelled) {
        setPlan(localPlan);
        setHydrated(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [localKey, stories, dayKeys]);

  useEffect(() => {
    localStorage.setItem(localKey, JSON.stringify(plan));
  }, [localKey, plan]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      void fetch('/api/sprint/calendar-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 1,
          sprintId,
          sprintName,
          slotMinutes,
          dayCapacityHours,
          plan,
          exportedAt: new Date().toISOString(),
        }),
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [hydrated, sprintId, sprintName, slotMinutes, dayCapacityHours, plan]);

  function dayCapacitySlots(): number {
    return Math.max(1, Math.floor((dayCapacityHours * 60) / slotMinutes));
  }

  function storySlots(points: number | null): number {
    const hours = estimateBlockHours(points);
    return Math.max(1, Math.ceil((hours * 60) / slotMinutes));
  }

  function moveTo(ref: string, target: string | 'backlog') {
    setPlan(prev => {
      const next: PlanState = {
        backlog: prev.backlog.filter(r => r !== ref),
        days: Object.fromEntries(Object.entries(prev.days).map(([k, list]) => [k, list.filter(r => r !== ref)])),
      };

      if (target === 'backlog') next.backlog.push(ref);
      else next.days[target] = [...(next.days[target] ?? []), ref];

      return next;
    });
  }

  function dayLoad(day: string): { points: number; load: number; hours: number } {
    const refs = plan.days[day] ?? [];
    return refs.reduce((acc, ref) => {
      const s = byRef.get(ref);
      if (!s) return acc;
      const pts = s.storyPoints ?? 0;
      return {
        points: acc.points + pts,
        load: acc.load + loadFactor(pts),
        hours: acc.hours + estimateBlockHours(pts),
      };
    }, { points: 0, load: 0, hours: 0 });
  }

  function daySlotsUsed(day: string): number {
    const refs = plan.days[day] ?? [];
    return refs.reduce((sum, ref) => {
      const s = byRef.get(ref);
      if (!s) return sum;
      return sum + storySlots(s.storyPoints ?? null);
    }, 0);
  }

  function exportPlan() {
    const payload: ExportPayload = {
      sprintId,
      sprintName,
      exportedAt: new Date().toISOString(),
      slotMinutes,
      dayCapacityHours,
      plan,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprintId}-calendar-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importPlan(file: File) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as Partial<ExportPayload>;
      if (!payload.plan) return;

      const refs = new Set(stories.map(s => s.referenceNum));
      const next: PlanState = { backlog: [], days: {} };
      for (const day of dayKeys) {
        next.days[day] = (payload.plan.days?.[day] ?? []).filter(r => refs.has(r));
      }
      next.backlog = (payload.plan.backlog ?? []).filter(r => refs.has(r));
      const allocated = new Set([...next.backlog, ...Object.values(next.days).flat()]);
      for (const ref of refs) if (!allocated.has(ref)) next.backlog.push(ref);

      if (typeof payload.slotMinutes === 'number' && payload.slotMinutes > 0) setSlotMinutes(payload.slotMinutes);
      if (typeof payload.dayCapacityHours === 'number' && payload.dayCapacityHours > 0) setDayCapacityHours(payload.dayCapacityHours);
      setPlan(next);
    } catch {
      // Keep existing state when import fails.
    }
  }

  const averageLoadTarget = dayKeys.length > 0
    ? stories.reduce((sum, s) => sum + loadFactor(s.storyPoints), 0) / dayKeys.length
    : 0;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Calendar Time Blocks</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
            Drag stories into days to shape delivery cadence for {sprintName}.
          </div>
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          Target load/day: {averageLoadTarget.toFixed(1)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          Slot
          <select
            value={slotMinutes}
            onChange={e => setSlotMinutes(Number(e.target.value))}
            style={{ marginLeft: 6, padding: '0.2rem 0.35rem', fontSize: '0.74rem' }}
          >
            <option value={30}>30m</option>
            <option value={60}>60m</option>
            <option value={120}>120m</option>
          </select>
        </label>
        <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          Day Capacity
          <select
            value={dayCapacityHours}
            onChange={e => setDayCapacityHours(Number(e.target.value))}
            style={{ marginLeft: 6, padding: '0.2rem 0.35rem', fontSize: '0.74rem' }}
          >
            <option value={4}>4h</option>
            <option value={6}>6h</option>
            <option value={8}>8h</option>
          </select>
        </label>
        <button type="button" className="btn" style={{ fontSize: '0.73rem', padding: '0.2rem 0.45rem' }} onClick={exportPlan}>Export Plan</button>
        <button
          type="button"
          className="btn"
          style={{ fontSize: '0.73rem', padding: '0.2rem 0.45rem' }}
          onClick={() => importRef.current?.click()}
        >
          Import Plan
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void importPlan(f);
            e.currentTarget.value = '';
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `220px repeat(${Math.max(1, dayKeys.length)}, minmax(160px, 1fr))`, gap: '0.65rem', overflowX: 'auto' }}>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const ref = e.dataTransfer.getData('text/story-ref') || dragRef;
            if (ref) moveTo(ref, 'backlog');
          }}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.55rem',
            background: 'var(--surface-2)',
            minHeight: 220,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.45rem' }}>Unscheduled</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {plan.backlog.map(ref => {
              const s = byRef.get(ref);
              if (!s) return null;
              return (
                <div
                  key={ref}
                  draggable
                  onDragStart={e => {
                    setDragRef(ref);
                    e.dataTransfer.setData('text/story-ref', ref);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  style={{
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${statusColor(s.workflowStatus)}`,
                    borderRadius: 8,
                    padding: '0.4rem 0.45rem',
                    background: 'var(--surface)',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700 }}>{s.referenceNum}</div>
                  <div style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {s.storyPoints ?? 0} pts · {estimateBlockHours(s.storyPoints)}h · {storySlots(s.storyPoints)} slots
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {dayKeys.map(day => {
          const load = dayLoad(day);
          const slotsUsed = daySlotsUsed(day);
          const slotsCap = dayCapacitySlots();
          const slotsOver = slotsUsed > slotsCap;
          const over = load.load > averageLoadTarget * 1.35 && averageLoadTarget > 0;

          return (
            <div
              key={day}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const ref = e.dataTransfer.getData('text/story-ref') || dragRef;
                if (ref) moveTo(ref, day);
              }}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '0.5rem',
                minHeight: 220,
                background: (over || slotsOver)
                  ? 'color-mix(in srgb, var(--surface) 82%, var(--warn) 18%)'
                  : 'color-mix(in srgb, var(--surface) 90%, var(--accent4) 10%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{shortDate(day)}</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)' }}>{load.points}pts</div>
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginBottom: '0.45rem' }}>
                load {load.load.toFixed(1)} · {load.hours}h
              </div>
              <div style={{ fontSize: '0.66rem', color: slotsOver ? 'var(--danger)' : 'var(--text-dim)', marginBottom: '0.45rem' }}>
                slots {slotsUsed}/{slotsCap}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(plan.days[day] ?? []).map(ref => {
                  const s = byRef.get(ref);
                  if (!s) return null;
                  return (
                    <div
                      key={ref}
                      draggable
                      onDragStart={e => {
                        setDragRef(ref);
                        e.dataTransfer.setData('text/story-ref', ref);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      style={{
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${statusColor(s.workflowStatus)}`,
                        borderRadius: 8,
                        padding: '0.35rem 0.42rem',
                        background: 'var(--surface)',
                        cursor: 'grab',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>{s.referenceNum}</div>
                      <div style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {s.storyPoints ?? 0} pts · {estimateBlockHours(s.storyPoints)}h · {storySlots(s.storyPoints)} slots
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
