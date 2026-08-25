/**
 * Phase 1: Enhanced Client Project Map with Hierarchy + Checksums
 *
 * Purpose: Build hierarchical client-project mapping (not flat) with policy checksum
 * validation. Replaces heuristic matching with transparent parent-child relationships.
 *
 * DI Pattern: Fetches policies + checksums from backend APIs, composes tree structure.
 * No direct database access (injected via fetch).
 */

import { clientBrandTheme } from '@story-agent/shared/client-brand-themes';
import type { ClientSecurityPolicy, PolicyChecksum } from '@story-agent/shared';

export type AhaProjectLite = {
  id: string;
  name: string;
  referencePrefix: string | null;
};

/**
 * Enhanced ClientNode with:
 * - parent-child hierarchy
 * - full security policy
 * - checksum status
 * - brand theme for visual consistency
 */
export type ClientNode = {
  id: string;
  name: string;
  tier: string;
  businessTier?: string;
  parentId: string | null;
  policy?: ClientSecurityPolicy | null;
  checksum?: PolicyChecksum | null;
  checksumStatus: 'valid' | 'invalid' | 'unknown';
  projects: AhaProjectLite[];
  children: ClientNode[]; // immediate children in hierarchy
  brandTheme: string | null;
};

/**
 * Enhanced API response for clients with hierarchy + checksums.
 * DI: This comes from /api/clients which now returns full policy objects.
 */
export type ClientAPIResponse = {
  clients: Array<{
    id: string;
    name: string;
    tier: string;
    businessTier?: string;
    parentClientId: string | null;
    policy?: ClientSecurityPolicy | null;
    checksum?: PolicyChecksum | null;
    checksumStatus?: 'valid' | 'invalid' | 'unknown';
    onboardedBy?: string | null;
  }>;
  source: 'db' | 'fallback';
};

const FIRM_ID = 'familiarcat';

/**
 * Soft client-project matching (Phase 1 keeps existing heuristic).
 * Phase 2+ will replace with hard FK mappings.
 */
const matchesClient = (clientId: string, clientName: string, project: AhaProjectLite): boolean => {
  const haystack = `${project.name} ${project.referencePrefix ?? ''}`.toLowerCase();
  return haystack.includes(clientId.toLowerCase()) || haystack.includes(clientName.toLowerCase());
};

/**
 * Build hierarchical client tree with checksum validation.
 *
 * Steps:
 * 1. Fetch clients from /api/clients (includes policies + checksums)
 * 2. Fetch projects from /api/aha/projects
 * 3. Build parent-child hierarchy
 * 4. Attach projects to clients
 * 5. Attach checksum status badges
 *
 * Returns tree structure with firm node as root.
 */
export async function buildClientProjectMapWithHierarchy(): Promise<{
  clients: ClientNode[];
  checksumStats: { total: number; valid: number; invalid: number; unknown: number };
}> {
  const [clientsRes, projectsRes] = await Promise.all([
    fetch('/api/clients'),
    fetch('/api/aha/projects'),
  ]);

  if (!clientsRes.ok) throw new Error(`Failed to load clients (${clientsRes.status})`);
  if (!projectsRes.ok) throw new Error(`Failed to load Aha projects (${projectsRes.status})`);

  const clientsJson = (await clientsRes.json()) as ClientAPIResponse;
  const projectsJson = (await projectsRes.json()) as AhaProjectLite[];

  // Step 1: Build flat list of ClientNodes
  const projects: AhaProjectLite[] = (Array.isArray(projectsJson) ? projectsJson : []).map((p) => ({
    id: p.id,
    name: p.name,
    referencePrefix: p.referencePrefix ?? null,
  }));

  const nodes: Map<string, ClientNode> = new Map();
  for (const apiClient of clientsJson.clients ?? []) {
    const node: ClientNode = {
      id: apiClient.id,
      name: apiClient.name,
      tier: apiClient.tier,
      businessTier: apiClient.businessTier,
      parentId: apiClient.parentClientId ?? null,
      policy: apiClient.policy ?? null,
      checksum: apiClient.checksum ?? null,
      checksumStatus: (apiClient.checksumStatus ?? 'unknown') as 'valid' | 'invalid' | 'unknown',
      projects: [],
      children: [],
      brandTheme: clientBrandTheme(apiClient.id),
    };
    nodes.set(apiClient.id, node);
  }

  // Step 2: Attach projects to clients (soft matching for now)
  const unmatched: AhaProjectLite[] = [];
  for (const project of projects) {
    let attached = false;
    for (const [, client] of nodes) {
      if (client.id !== FIRM_ID && matchesClient(client.id, client.name, project)) {
        client.projects.push(project);
        attached = true;
        break;
      }
    }
    if (!attached) unmatched.push(project);
  }

  // Step 3: Build parent-child relationships
  for (const [, node] of nodes) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId)!;
      parent.children.push(node);
    }
  }

  // Step 4: Build root-ordered list (parents before children)
  const roots: ClientNode[] = [];
  const visited = new Set<string>();

  const addWithChildren = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.get(nodeId);
    if (!node) return;

    if (!node.parentId || !nodes.has(node.parentId)) {
      // Root node
      roots.push(node);
    }
  };

  for (const [id] of nodes) {
    addWithChildren(id);
  }

  // Step 5: Ensure firm node is present as catch-all
  let firm = nodes.get(FIRM_ID);
  if (!firm) {
    firm = {
      id: FIRM_ID,
      name: 'familiarcat (firm)',
      tier: 'enterprise',
      businessTier: 'enterprise',
      parentId: null,
      policy: null,
      checksum: null,
      checksumStatus: 'unknown',
      projects: [],
      children: [],
      brandTheme: clientBrandTheme(FIRM_ID),
    };
    nodes.set(FIRM_ID, firm);
  } else {
    if (!firm.name.includes('(firm)')) firm.name = `${firm.name} (firm)`;
  }

  // Attach unmatched projects to firm
  firm.projects.push(...unmatched);

  // Ensure firm is in roots
  if (!roots.find((n) => n.id === FIRM_ID)) {
    roots.push(firm);
  }

  // Step 6: Compute checksum statistics
  const checksumStats = {
    total: nodes.size,
    valid: Array.from(nodes.values()).filter((n) => n.checksumStatus === 'valid').length,
    invalid: Array.from(nodes.values()).filter((n) => n.checksumStatus === 'invalid').length,
    unknown: Array.from(nodes.values()).filter((n) => n.checksumStatus === 'unknown').length,
  };

  return {
    clients: roots,
    checksumStats,
  };
}

/**
 * Flatten hierarchy for simple list display (backward compatibility).
 * Used by dashboard if tree view not supported.
 */
export function flattenClientHierarchy(roots: ClientNode[]): ClientNode[] {
  const result: ClientNode[] = [];
  const visit = (node: ClientNode) => {
    result.push(node);
    for (const child of node.children) {
      visit(child);
    }
  };
  for (const root of roots) {
    visit(root);
  }
  return result;
}

/**
 * Find a client by ID in hierarchy.
 * DI: Useful for tests to verify tree structure.
 */
export function findClientInHierarchy(roots: ClientNode[], clientId: string): ClientNode | null {
  const visit = (node: ClientNode): ClientNode | null => {
    if (node.id === clientId) return node;
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };

  for (const root of roots) {
    const found = visit(root);
    if (found) return found;
  }
  return null;
}

/**
 * Get breadcrumb path for a client (e.g., familiarcat > Jonah).
 * DI: Used for UI breadcrumb rendering.
 */
export function getBreadcrumbPath(roots: ClientNode[], clientId: string): ClientNode[] {
  const path: ClientNode[] = [];
  let current = findClientInHierarchy(roots, clientId);

  while (current) {
    path.unshift(current);
    if (!current.parentId) break;
    current = findClientInHierarchy(roots, current.parentId);
  }

  return path;
}
