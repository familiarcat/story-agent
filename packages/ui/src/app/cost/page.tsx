'use client';

import { useEffect, useState } from 'react';
import { lcars } from '../../lib/lcars';
import { headlineSystem, normalizeModelLabel } from '../../lib/headline-system';
import { LcarsScreen, LcarsPanel, LcarsStat, LcarsBar } from '../../components/Lcars';
import { Breadcrumbs } from '@/components/Breadcrumbs';

import type { LaneStatusMarker } from '@story-agent/shared';

interface Summary {
  turns: number;
  totalUSD: number;
  tokensIn: number;
  tokensOut: number;
  perProvider: Record<string, { costUSD: number; turns: number }>;
  perModel: Record<string, { costUSD: number; turns: number }>;
  baseline: { model: string; wouldCostUSD: number; savedUSD: number; savedPct: number };
  recent: Array<{ timestamp: string; surface: string; model: string; provider: string; costUSD: number }>;
  historical?: {
    totalCostUSD: number;
    crewRuns: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    daily: Array<{ day: string; costUSD: number; runs: number }>;
  };
}

interface CacheFallback {
  source: 'cache';
  offlineMarker: LaneStatusMarker;
  historical?: {
    totalCostUSD: number;
    crewRuns: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    daily: Array<{ day: string; costUSD: number; runs: number }>;
  };
  note?: string;
}

type CostResponse = Summary | CacheFallback;

export default function CostPage() {
  const [data, setData] = useState<CostResponse | null>(null);
  const [err, setErr] = useState<string>('');

  async function load() {
    try {
      const r = await fetch('/api/cost', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `HTTP ${r.status}`); return; }
      setErr(''); setData(d);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  return (
    <LcarsScreen title="💰 Cost Observatory" status="OpenRouter pool · auto-refresh 10s">
      <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cost' }]} />
      {err && !data && (
        <LcarsPanel title={headlineSystem.panels.signalLost} color={lcars.danger}>
          <div style={{ color: lcars.danger, fontSize: '0.85rem', letterSpacing: 'normal' }}>⚠️ {err}</div>
          <div style={{ fontSize: '0.72rem', color: lcars.textDim, marginTop: 6, letterSpacing: 'normal' }}>
            Start the crew brain (<code>STORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start</code>) or set <code>STORY_AGENT_AGENT_URL</code> to the deployed ALB.
          </div>
        </LcarsPanel>
      )}

      {data && 'offlineMarker' in data && (
        <LcarsPanel title={headlineSystem.panels.laneSnapshot} color={lcars.neonCarrot}>
          <div style={{ fontSize: '0.92rem', marginBottom: 10 }}>{data.note ?? 'Showing the last known lane status from .claude/control-lane-status.json.'}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current lane</span><strong>{data.offlineMarker.headline}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              <LcarsStat label={headlineSystem.stats.crewCostUsd} value={`$${data.offlineMarker.crewActualCostUSD.toFixed(4)}`} accent={lcars.goldenTanoi} />
              <LcarsStat label={headlineSystem.stats.crewDecisionCount} value={`${data.offlineMarker.crewDecisions}`} accent={lcars.anakiwa} />
              <LcarsStat label={headlineSystem.stats.delegationRatePct} value={`${data.offlineMarker.delegationRatePct}%`} accent={lcars.tanoi} />
            </div>
          </div>
        </LcarsPanel>
      )}

      {data && !('offlineMarker' in data) && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <LcarsStat label={headlineSystem.stats.totalCostTurns(data.turns)} value={`$${data.totalUSD.toFixed(4)}`} accent={lcars.goldenTanoi} />
            <LcarsStat label={headlineSystem.stats.savingsVsBaseline(normalizeModelLabel(data.baseline.model))} value={`${data.baseline.savedPct}%`} accent={lcars.anakiwa} />
            <LcarsStat label={headlineSystem.stats.tokenThroughput} value={`↑${data.tokensIn.toLocaleString()} ↓${data.tokensOut.toLocaleString()}`} accent={lcars.tanoi} />
            <LcarsStat label="System historical cost" value={`$${(data.historical?.totalCostUSD ?? 0).toFixed(4)}`} accent={lcars.lilac} />
          </div>

          <LcarsPanel title="Historical Ledger (All System Runs)" color={lcars.anakiwa}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginBottom: 10 }}>
              <LcarsStat label="Historical crew runs" value={`${data.historical?.crewRuns ?? 0}`} accent={lcars.tanoi} />
              <LcarsStat
                label="Range"
                value={data.historical?.firstSeenAt ? `${new Date(data.historical.firstSeenAt).toLocaleDateString()} → ${data.historical?.lastSeenAt ? new Date(data.historical.lastSeenAt).toLocaleDateString() : 'now'}` : 'n/a'}
                accent={lcars.neonCarrot}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {(data.historical?.daily ?? []).slice(-14).map((d) => {
                const max = Math.max(...(data.historical?.daily ?? [{ day: 'x', costUSD: 1, runs: 1 }]).map((x) => x.costUSD || 0), 0.000001);
                return (
                  <div key={d.day}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', letterSpacing: 'normal' }}>
                      <span style={{ color: lcars.tanoi }}>{d.day}</span>
                      <span style={{ color: lcars.textDim }}>{d.runs} runs · ${d.costUSD.toFixed(5)}</span>
                    </div>
                    <LcarsBar frac={d.costUSD / max} color={lcars.anakiwa} />
                  </div>
                );
              })}
              {!data.historical?.daily?.length && (
                <p style={{ color: lcars.textDim, fontSize: '0.8rem', letterSpacing: 'normal' }}>No historical ledger entries yet.</p>
              )}
            </div>
          </LcarsPanel>

          <LcarsPanel title={headlineSystem.panels.modelDistribution} color={lcars.neonCarrot}>
            {Object.entries(data.perModel).sort((a, b) => b[1].costUSD - a[1].costUSD).map(([m, v]) => (
              <div key={m} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', letterSpacing: 'normal' }}>
                  <span style={{ color: lcars.tanoi }}>{m}</span>
                  <span style={{ color: lcars.textDim }}>{v.turns} turns · ${v.costUSD.toFixed(4)}</span>
                </div>
                <div style={{ marginTop: 3 }}>
                  <LcarsBar frac={data.totalUSD ? v.costUSD / data.totalUSD : 0} color={m.startsWith('anthropic') ? lcars.lilac : lcars.neonCarrot} />
                </div>
              </div>
            ))}
            {!Object.keys(data.perModel).length && <p style={{ color: lcars.textDim, fontSize: '0.8rem', letterSpacing: 'normal' }}>No turns yet — use the chat or agent to populate.</p>}
          </LcarsPanel>

          <LcarsPanel title={headlineSystem.panels.recentEvents} color={lcars.lilac}>
            <div style={{ fontSize: '0.76rem', color: lcars.tanoi, letterSpacing: 'normal' }}>
              {data.recent.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: `1px solid ${lcars.eggplant}` }}>
                  <span>{e.surface} · {e.model}</span><span style={{ color: lcars.textDim }}>${e.costUSD.toFixed(5)}</span>
                </div>
              ))}
            </div>
          </LcarsPanel>
        </div>
      )}
    </LcarsScreen>
  );
}
