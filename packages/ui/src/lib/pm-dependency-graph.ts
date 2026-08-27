/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Cyclical Dependency Detection
 * 
 * Detects cycles in task/story dependencies using DFS
 * Prevents A→B→A and A→B→C→A patterns
 */

export interface DependencyNode {
  id: string;
  blockedBy?: string[]; // Array of task/story IDs this entity depends on
  blocks?: string[]; // Array of task/story IDs blocked by this entity
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycle?: string[];
  message: string;
}

/**
 * Detect cycle in dependency graph using DFS
 */
export function detectCycle(
  nodes: Map<string, DependencyNode>,
  newDependencyId?: string
): CycleDetectionResult {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycleDFS = (nodeId: string, path: string[]): string[] | null => {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = nodes.get(nodeId);
    if (!node) {
      recursionStack.delete(nodeId);
      return null;
    }

    const dependencies = node.blockedBy ?? [];

    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        const cycle = hasCycleDFS(depId, [...path]);
        if (cycle) return cycle;
      } else if (recursionStack.has(depId)) {
        // Found a cycle
        const cycleStart = path.indexOf(depId);
        return path.slice(cycleStart).concat([depId]);
      }
    }

    recursionStack.delete(nodeId);
    return null;
  };

  // Check for cycles starting from each node
  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      const cycle = hasCycleDFS(nodeId, []);
      if (cycle) {
        return {
          hasCycle: true,
          cycle,
          message: `Cyclical dependency detected: ${cycle.join(' → ')}`,
        };
      }
    }
  }

  return {
    hasCycle: false,
    message: 'No cycles detected',
  };
}

/**
 * Build dependency graph from array of entities
 */
export function buildDependencyGraph(
  entities: DependencyNode[]
): Map<string, DependencyNode> {
  const graph = new Map<string, DependencyNode>();

  for (const entity of entities) {
    graph.set(entity.id, entity);
  }

  return graph;
}

/**
 * Validate new dependency doesn't create cycle
 */
export function validateNewDependency(
  entities: DependencyNode[],
  nodeId: string,
  newDependency: string
): CycleDetectionResult {
  // Find the node being modified
  const node = entities.find((e) => e.id === nodeId);
  if (!node) {
    return {
      hasCycle: false,
      message: 'Node not found',
    };
  }

  // Create updated graph with new dependency
  const updatedEntities = entities.map((e) =>
    e.id === nodeId
      ? {
          ...e,
          blockedBy: [...(e.blockedBy ?? []), newDependency],
        }
      : e
  );

  const graph = buildDependencyGraph(updatedEntities);
  return detectCycle(graph);
}

/**
 * Get all transitive dependencies (including indirect)
 */
export function getTransitiveDependencies(
  graph: Map<string, DependencyNode>,
  nodeId: string
): Set<string> {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;

    visited.add(current);
    const node = graph.get(current);
    if (node?.blockedBy) {
      for (const dep of node.blockedBy) {
        if (!visited.has(dep)) {
          queue.push(dep);
        }
      }
    }
  }

  visited.delete(nodeId); // Remove self
  return visited;
}

/**
 * Check if one entity blocks another (directly or transitively)
 */
export function doesBlock(
  graph: Map<string, DependencyNode>,
  blockerId: string,
  blockedId: string
): boolean {
  const dependencies = getTransitiveDependencies(graph, blockedId);
  return dependencies.has(blockerId);
}

/**
 * Validate entity doesn't block itself (self-cycle)
 */
export function validateNoSelfBlock(
  entities: DependencyNode[],
  nodeId: string,
  blockedByIds: string[]
): { valid: boolean; message: string } {
  if (blockedByIds.includes(nodeId)) {
    return {
      valid: false,
      message: `Cannot create self-blocking dependency: ${nodeId} cannot depend on itself`,
    };
  }

  return {
    valid: true,
    message: 'No self-blocking detected',
  };
}

/**
 * Validation errors for cycle detection
 */
export function cycleDetectionErrorResponse(result: CycleDetectionResult): {
  status: number;
  body: any;
} {
  return {
    status: 400,
    body: {
      success: false,
      error: 'VALIDATION_ERROR: Cyclical dependency detected',
      details: {
        message: result.message,
        cycle: result.cycle,
      },
    },
  };
}
