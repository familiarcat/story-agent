'use client';

import React, { useState } from 'react';
import { childLevel, type HierarchyNode, type Persona, type ActionIntent } from '@story-agent/shared/selection-contract';
import { useHierarchy } from '@/hooks/useHierarchy';
import { NodeActions } from './NodeActions';

/**
 * Selection-first hierarchy tree — the shared, persona-parameterized component reused by BOTH the
 * management dashboard and the developer workspace (crew mission `persona-workflow-strategy`: one
 * shared headless core, two thin persona shells). A user SELECTS firm→client→project→story and the
 * per-level/per-persona actions appear inline (reads free; writes WorfGate-gated). Data comes from
 * useHierarchy (existing Aha API routes); presentation + actions come from the canonical contract.
 *
 * The VS Code extension mirrors this structurally (story-agent.nodeActions QuickPick on its tree).
 */
export interface HierarchyTreeProps {
  persona: Persona;
  /** Invoked when an action is chosen on a node. The shell routes it (read = navigate/open, write = gated). */
  onAction: (node: HierarchyNode, intent: ActionIntent) => void;
  /** Optional: highlight + scope to a single story (developer "story tunnel"). */
  focusStoryRef?: string;
  title?: string;
}

export function HierarchyTree({ persona, onAction, focusStoryRef, title }: HierarchyTreeProps) {
  const { projects, childrenByParent, loadingRoot, loadingParent, error, loadChildren } = useHierarchy();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (node: HierarchyNode) => {
    const open = !expanded[node.id];
    setExpanded(prev => ({ ...prev, [node.id]: open }));
    if (open) void loadChildren(node);
  };

  return (
    <div className="card" style={{ padding: '0.85rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>{title ?? (persona === 'management' ? 'Portfolio' : 'Story Hierarchy')}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #9a9aae)' }}>
          {persona === 'management' ? 'Management view' : 'Developer view'}
        </span>
      </div>

      {loadingRoot && <div style={{ color: 'var(--text-dim, #9a9aae)' }}>Loading projects…</div>}
      {error && <div style={{ color: 'var(--danger, #e06c75)' }}>⚠️ {error}</div>}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {projects.map(project => {
          const open = !!expanded[project.id];
          const kids = childrenByParent[project.id] ?? [];
          const hasChildren = childLevel(project.level) !== null;
          return (
            <li key={project.id} style={{ marginBottom: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => toggle(project)}
                  aria-expanded={open}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text, #e6e6ef)', fontWeight: 600 }}
                >
                  {hasChildren ? (open ? '▾' : '▸') : '•'} {project.ref ? `${project.ref} · ` : ''}{project.name}
                </button>
                <NodeActions node={project} persona={persona} onAction={onAction} />
              </div>

              {open && (
                <ul style={{ listStyle: 'none', margin: '0.25rem 0 0.25rem 1.25rem', padding: 0 }}>
                  {loadingParent === project.id && <li style={{ color: 'var(--text-dim, #9a9aae)' }}>Loading stories…</li>}
                  {kids
                    .filter(s => !focusStoryRef || s.ref === focusStoryRef)
                    .map(story => (
                      <li
                        key={story.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                          marginBottom: '0.2rem',
                          background: focusStoryRef && story.ref === focusStoryRef ? 'var(--surface-hl, #26263400)' : undefined,
                        }}
                      >
                        <span style={{ color: 'var(--text, #e6e6ef)' }}>
                          ↳ {story.ref ? `${story.ref}: ` : ''}{story.name}
                        </span>
                        <NodeActions node={story} persona={persona} onAction={onAction} />
                      </li>
                    ))}
                  {open && loadingParent !== project.id && kids.length === 0 && (
                    <li style={{ color: 'var(--text-dim, #9a9aae)' }}>No stories.</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
