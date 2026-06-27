'use client';

import React from 'react';
import { actionsForPersona, type HierarchyNode, type Persona, type ActionIntent } from '@story-agent/shared';

/**
 * Reusable per-node action bar — the SAME primitive both persona shells render (the crew's shared
 * headless core). Actions come from the canonical contract via actionsForPersona(level, persona):
 * management sees reads + approval-style writes; developer sees the full code lifecycle. Reads are
 * plain; WRITES are badged "gated" (WorfGate dry-run → confirm). The shell supplies onAction.
 */
export interface NodeActionsProps {
  node: HierarchyNode;
  persona: Persona;
  onAction: (node: HierarchyNode, intent: ActionIntent) => void;
}

export function NodeActions({ node, persona, onAction }: NodeActionsProps) {
  const actions = actionsForPersona(node.level, persona);
  if (!actions.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {actions.map(a => (
        <button
          key={a.intent}
          onClick={() => onAction(node, a.intent)}
          title={a.write ? `${a.label} — WorfGate-gated (dry-run, you confirm)` : a.label}
          style={{
            fontSize: '0.72rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '0.4rem',
            border: '1px solid var(--border, #3a3a4a)',
            background: a.write ? 'var(--accent-dim, #3a2a1a)' : 'var(--surface, #1e1e28)',
            color: 'var(--text, #e6e6ef)',
            cursor: 'pointer',
          }}
        >
          {a.label}{a.write ? ' 🔒' : ''}
        </button>
      ))}
    </span>
  );
}
