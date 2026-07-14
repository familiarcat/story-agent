'use client';

import React from 'react';
import { workflowStatusTone, workflowStatusLine, type WorkflowStatusData } from '@story-agent/shared/workflow-status';
import { lcars } from '@/lib/lcars';

/**
 * <WorkflowStatus> — the reusable crew-feedback primitive (universal UI/UX strategy, OBS 569ec582:
 * surface crew run results consistently across surfaces). Driven by the shared WorkflowStatusData
 * contract and the semantic theme tokens (var(--*) via lcars), so it re-skins with [data-theme]
 * (LCARS / dark / light) and renders identically wherever it's used — both persona shells reuse it,
 * and the VS Code extension mirrors the same line via workflowStatusLine().
 */
const TONE_COLOR: Record<string, string> = { ok: lcars.ok, warn: lcars.goldenTanoi, danger: lcars.danger };

export interface WorkflowStatusProps {
  status: WorkflowStatusData;
  /** 'card' = full chip row (dashboards); 'line' = single compact line (tight spaces). */
  variant?: 'card' | 'line';
  label?: string;
}

export function WorkflowStatus({ status, variant = 'card', label }: WorkflowStatusProps) {
  const tone = workflowStatusTone(status);
  const accent = TONE_COLOR[tone] ?? lcars.ok;

  if (variant === 'line') {
    return (
      <span style={{ color: lcars.textDim, fontSize: '0.8rem' }}>
        <span style={{ color: accent }}>●</span> {label ? `${label}: ` : ''}{workflowStatusLine(status)}
      </span>
    );
  }

  const chip = (text: string, color: string = lcars.text) => (
    <span style={{
      fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '0.4rem',
      border: `1px solid ${lcars.border}`, color, background: lcars.space, whiteSpace: 'nowrap',
    }}>{text}</span>
  );

  const p = status.posture;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
      padding: '0.5rem 0.65rem', borderRadius: '0.5rem',
      border: `1px solid ${accent}`, borderLeft: `4px solid ${accent}`, background: lcars.space,
    }}>
      <span style={{ fontWeight: 700, color: accent, marginRight: '0.25rem' }}>
        {label ?? 'Crew run'}
      </span>
      {status.model && chip(status.model, lcars.text)}
      {status.iterations != null && chip(`${status.iterations} turns`)}
      {status.toolCount != null && chip(`${status.toolCount} tools`)}
      {status.costUSD != null && chip(`$${status.costUSD.toFixed(5)}`, lcars.ok)}
      {p && chip(`🟢${p.green} 🟡${p.yellow} 🔴${p.red}`)}
      {status.escalated && chip('escalated', lcars.goldenTanoi)}
      {status.stalled && chip('stalled', lcars.danger)}
      {status.budgetExceeded && chip('budget-capped', lcars.goldenTanoi)}
    </div>
  );
}
