'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HierarchyNode } from '@story-agent/shared';

/**
 * Headless data layer for the selection-first tree (crew mission `persona-workflow-strategy`). It
 * fetches the firm→client→project→story hierarchy from the existing Aha API routes and exposes it as
 * shared-contract HierarchyNodes, with progressive disclosure (load a node's children on expand).
 * Both persona shells (management dashboard + developer workspace) reuse this hook — the "shared
 * headless core" the crew converged on. v1 depth = project → story; epic/task levels are deferred.
 */
export interface UseHierarchy {
  projects: HierarchyNode[];
  childrenByParent: Record<string, HierarchyNode[]>;
  loadingRoot: boolean;
  loadingParent: string | null;
  error: string | null;
  loadChildren: (node: HierarchyNode) => Promise<void>;
}

export function useHierarchy(): UseHierarchy {
  const [projects, setProjects] = useState<HierarchyNode[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<string, HierarchyNode[]>>({});
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [loadingParent, setLoadingParent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingRoot(true);
    fetch('/api/aha/projects')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rows: Array<{ id: string; name: string; referencePrefix: string | null; url: string }>) => {
        if (!active) return;
        setProjects((rows ?? []).map(p => ({
          level: 'project' as const,
          id: String(p.id),
          ref: p.referencePrefix ?? undefined,
          name: p.name,
          url: p.url,
        })));
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (active) setLoadingRoot(false); });
    return () => { active = false; };
  }, []);

  const loadChildren = useCallback(async (node: HierarchyNode) => {
    // v1: only project → story is fetchable; deeper levels are deferred (see contract CHILD_LEVEL).
    if (node.level !== 'project' || childrenByParent[node.id]) return;
    setLoadingParent(node.id);
    try {
      const r = await fetch(`/api/aha/stories?projectId=${encodeURIComponent(node.id)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const rows: Array<{ id: string; referenceNum: string; name: string; url: string }> = await r.json();
      setChildrenByParent(prev => ({
        ...prev,
        [node.id]: (rows ?? []).map(s => ({
          level: 'story' as const,
          id: String(s.id),
          ref: s.referenceNum,
          name: s.name,
          parentId: node.id,
          url: s.url,
        })),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingParent(null);
    }
  }, [childrenByParent]);

  return { projects, childrenByParent, loadingRoot, loadingParent, error, loadChildren };
}
