/**
 * Story Agent: Dependency Tracking Graph
 * Owned by: Data (Architecture)
 * 
 * Builds a DAG of all story dependencies, detects cycles, exports visualization.
 * Used to prevent phase 1 → phase 2 blocking conditions (7Q Question 3 pattern).
 * 
 * Success criteria:
 * - All dependencies expressible as (phase1_story) -> (phase2_story)
 * - Cycle detection with alert
 * - GraphQL schema for querying
 * - Cost: <$0.001/query
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface StoryNode {
  id: string;
  reference: string;
  phase: 'phase_1' | 'phase_2';
  status: string;
}

interface DependencyEdge {
  source: string;
  target: string;
  type: 'blocking' | 'related' | 'data_flow';
  weight: number; // 0-1, higher = more critical
}

interface DependencyGraph {
  nodes: Map<string, StoryNode>;
  edges: DependencyEdge[];
  cycles: string[][];
  criticalPath: string[];
  timestamp: string;
}

/**
 * Build dependency graph from Supabase stories table
 */
export async function buildDependencyGraph(
  supabase: SupabaseClient
): Promise<DependencyGraph> {
  const graph: DependencyGraph = {
    nodes: new Map(),
    edges: [],
    cycles: [],
    criticalPath: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Fetch all stories
    const { data: stories, error: storiesError } = await supabase
      .from('sa_stories')
      .select('id, reference, phase, status');

    if (storiesError) throw storiesError;

    // Build nodes
    stories?.forEach(story => {
      graph.nodes.set(story.id, {
        id: story.id,
        reference: story.reference,
        phase: story.phase,
        status: story.status
      });
    });

    // Fetch explicit dependencies
    const { data: dependencies, error: depsError } = await supabase
      .from('sa_story_dependencies')
      .select('source_story_id, target_story_id, dependency_type');

    if (depsError) throw depsError;

    // Build edges
    dependencies?.forEach((dep: any) => {
      graph.edges.push({
        source: dep.source_story_id,
        target: dep.target_story_id,
        type: dep.dependency_type,
        weight: dep.dependency_type === 'blocking' ? 1.0 : 0.5
      });
    });

    // Infer implicit dependencies (phase 1 → phase 2 only)
    for (const edge of graph.edges) {
      const sourceNode = graph.nodes.get(edge.source);
      const targetNode = graph.nodes.get(edge.target);

      if (sourceNode?.phase === 'phase_1' && targetNode?.phase === 'phase_2') {
        // Valid phase transition
        continue;
      }

      if (
        sourceNode?.phase === 'phase_2' &&
        targetNode?.phase === 'phase_1'
      ) {
        console.warn(
          `Invalid backward dependency detected: ${edge.source} → ${edge.target}`
        );
        edge.weight = 0.1; // Mark as low priority
      }
    }

    // Detect cycles using DFS
    graph.cycles = detectCycles(graph);

    // Compute critical path (longest blocking path)
    graph.criticalPath = computeCriticalPath(graph);

    return graph;
  } catch (error) {
    console.error('Failed to build dependency graph:', error);
    throw error;
  }
}

/**
 * Detect cycles in the DAG using DFS
 */
function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.edges
      .filter(e => e.source === nodeId && e.weight > 0.5)
      .map(e => e.target);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

/**
 * Compute critical path (longest sequence of blocking dependencies)
 */
function computeCriticalPath(graph: DependencyGraph): string[] {
  const blockingEdges = graph.edges.filter(e => e.type === 'blocking');
  const inDegree = new Map<string, number>();

  // Initialize in-degrees
  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, 0);
  }

  for (const edge of blockingEdges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Topological sort with longest path
  const queue: string[] = [];
  const pathLength = new Map<string, number>();
  const predecessor = new Map<string, string>();

  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
      pathLength.set(nodeId, 1);
    }
  }

  let maxLength = 0;
  let maxNode = '';

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLength = pathLength.get(current) || 0;

    if (currentLength > maxLength) {
      maxLength = currentLength;
      maxNode = current;
    }

    for (const edge of blockingEdges.filter(e => e.source === current)) {
      const targetLength = currentLength + 1;
      if (!pathLength.has(edge.target) || targetLength > pathLength.get(edge.target)!) {
        pathLength.set(edge.target, targetLength);
        predecessor.set(edge.target, current);
      }

      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) - 1);
      if (inDegree.get(edge.target) === 0) {
        queue.push(edge.target);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current = maxNode;
  while (current) {
    path.unshift(current);
    current = predecessor.get(current) || '';
  }

  return path;
}

/**
 * Identify blocking stories (phase 1 complete, blocking phase 2)
 */
export async function getBlockingStories(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data: blockingEdges } = await supabase
    .from('sa_story_dependencies')
    .select('target_story_id')
    .eq('dependency_type', 'blocking');

  if (!blockingEdges?.length) return [];

  const blockedStoryIds = new Set(blockingEdges.map((e: any) => e.target_story_id));
  const { data: unblockedPhase1Stories } = await supabase
    .from('sa_stories')
    .select('id')
    .eq('phase', 'phase_1')
    .eq('status', 'complete')
    .not('id', 'in', `(${Array.from(blockedStoryIds).join(',')})`);

  return unblockedPhase1Stories?.map((s: any) => s.id) || [];
}

/**
 * Export graph for visualization (Graphviz DOT format)
 */
export function exportGraphvizDOT(graph: DependencyGraph): string {
  const lines: string[] = ['digraph StoryDependencies {'];

  // Graph attributes
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box];');

  // Nodes by phase (subgraph for clustering)
  lines.push('  subgraph cluster_phase1 {');
  lines.push('    label="Phase 1 (Execution)";');
  for (const [nodeId, node] of graph.nodes) {
    if (node.phase === 'phase_1') {
      lines.push(`    "${nodeId}" [label="${node.reference}"];`);
    }
  }
  lines.push('  }');

  lines.push('  subgraph cluster_phase2 {');
  lines.push('    label="Phase 2 (Revision)";');
  for (const [nodeId, node] of graph.nodes) {
    if (node.phase === 'phase_2') {
      lines.push(`    "${nodeId}" [label="${node.reference}"];`);
    }
  }
  lines.push('  }');

  // Edges
  for (const edge of graph.edges) {
    const style =
      edge.type === 'blocking'
        ? '[style=bold, color=red]'
        : edge.type === 'data_flow'
        ? '[color=blue]'
        : '[style=dotted, color=gray]';

    lines.push(`  "${edge.source}" -> "${edge.target}" ${style};`);
  }

  // Highlight cycles in red
  for (const cycle of graph.cycles) {
    lines.push(
      `  // CYCLE DETECTED: ${cycle.join(' → ')}`
    );
  }

  // Highlight critical path
  for (let i = 0; i < graph.criticalPath.length - 1; i++) {
    lines.push(
      `  "${graph.criticalPath[i]}" -> "${graph.criticalPath[i + 1]}" [style=bold, color=green];`
    );
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Query interface (replaces GraphQL for MVP)
 */
export async function queryDependencies(
  supabase: SupabaseClient,
  query: {
    storyId?: string;
    phase?: 'phase_1' | 'phase_2';
    includeTransitive?: boolean;
  }
): Promise<{ nodes: StoryNode[]; edges: DependencyEdge[] }> {
  const graph = await buildDependencyGraph(supabase);

  let filteredNodes: StoryNode[] = Array.from(graph.nodes.values());
  let filteredEdges = graph.edges;

  if (query.storyId) {
    const transitiveNodeIds = new Set<string>();
    const visited = new Set<string>();

    function collectTransitive(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      transitiveNodeIds.add(nodeId);

      for (const edge of graph.edges.filter(e => e.source === nodeId)) {
        if (query.includeTransitive) {
          collectTransitive(edge.target);
        }
      }

      for (const edge of graph.edges.filter(e => e.target === nodeId)) {
        if (query.includeTransitive) {
          collectTransitive(edge.source);
        }
      }
    }

    collectTransitive(query.storyId);
    filteredNodes = filteredNodes.filter(n => transitiveNodeIds.has(n.id));
    filteredEdges = filteredEdges.filter(
      e => transitiveNodeIds.has(e.source) && transitiveNodeIds.has(e.target)
    );
  }

  if (query.phase) {
    filteredNodes = filteredNodes.filter(n => n.phase === query.phase);
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges
  };
}

/**
 * MCP Tool registration (for crew access)
 */
export const dependencyGraphSkillTheory = {
  name: 'dependency_graph',
  domain: 'architecture',
  who: 'Data (crew member responsible for architecture validation)',
  what: 'Build and analyze dependency graphs for story orchestration',
  when: 'Per commit, or on-demand for phase transition validation',
  where: 'Supabase `sa_stories` + `sa_story_dependencies` tables',
  why: 'Prevent phase 1 → phase 2 blocking conditions; detect cycles early',
  how: 'Topological sort (DAG), DFS cycle detection, critical path computation'
};
