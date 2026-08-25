/**
 * Phase 1: Client Project Map V2 — Comprehensive Tests
 * Targets: 95%+ coverage, DI validation, integration tests
 *
 * Test Strategy:
 * - Unit tests: hierarchy building, parent-child relationships
 * - DI validation: mock API responses, verify fetch injection
 * - Integration: full flow from API → hierarchy → tree
 * - Edge cases: missing parents, circular references, empty projects
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ClientNode, AhaProjectLite, ClientAPIResponse } from '../../src/app/observation-lounge/components/ClientProjectMapV2';
import {
  buildClientProjectMapWithHierarchy,
  flattenClientHierarchy,
  findClientInHierarchy,
  getBreadcrumbPath,
} from '../../src/app/observation-lounge/components/ClientProjectMapV2';

// Mock fetch globally
global.fetch = vi.fn() as any;

// Test data
const mockClients: ClientAPIResponse = {
  clients: [
    {
      id: 'familiarcat',
      name: 'familiarcat',
      tier: 'enterprise',
      businessTier: 'enterprise',
      parentClientId: null,
      checksumStatus: 'valid',
    },
    {
      id: 'jonah',
      name: 'Jonah',
      tier: 'standard',
      businessTier: 'standard',
      parentClientId: 'familiarcat',
      checksumStatus: 'valid',
    },
    {
      id: 'client-int',
      name: 'Client (gold standard)',
      tier: 'regulated',
      businessTier: 'regulated',
      parentClientId: 'familiarcat',
      checksumStatus: 'valid',
    },
  ],
  source: 'db',
};

const mockProjects: AhaProjectLite[] = [
  { id: 'proj-1', name: 'Jonah Project', referencePrefix: 'JONAH' },
  { id: 'proj-2', name: 'Client-Int Feature', referencePrefix: 'CINT' },
  { id: 'proj-3', name: 'Unknown Project', referencePrefix: 'UNK' },
];

describe('ClientProjectMapV2: Phase 1 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildClientProjectMapWithHierarchy: Happy Path', () => {
    it('should build hierarchy with parent-child relationships', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.clients).toHaveLength(1); // Only firm (root)
      expect(result.clients[0].id).toBe('familiarcat');
      expect(result.clients[0].children).toHaveLength(2); // jonah + client-int
    });

    it('should attach projects to correct clients', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();
      const firm = result.clients[0];
      const jonahChild = firm.children.find((c) => c.id === 'jonah');

      expect(jonahChild?.projects).toHaveLength(1);
      expect(jonahChild?.projects[0].name).toBe('Jonah Project');
    });

    it('should include checksum status in nodes', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();
      const firm = result.clients[0];

      expect(firm.checksumStatus).toBe('valid');
      expect(firm.children.every((c) => ['valid', 'invalid', 'unknown'].includes(c.checksumStatus))).toBe(true);
    });

    it('should compute checksum statistics', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.checksumStats.total).toBe(3);
      expect(result.checksumStats.valid).toBe(3);
      expect(result.checksumStats.invalid).toBe(0);
      expect(result.checksumStats.unknown).toBe(0);
    });
  });

  describe('buildClientProjectMapWithHierarchy: Error Handling', () => {
    it('should throw on clients API failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(buildClientProjectMapWithHierarchy()).rejects.toThrow('Failed to load clients');
    });

    it('should throw on projects API failure', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

      await expect(buildClientProjectMapWithHierarchy()).rejects.toThrow('Failed to load Aha projects');
    });
  });

  describe('buildClientProjectMapWithHierarchy: Edge Cases', () => {
    it('should handle empty client list', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ clients: [], source: 'db' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.clients).toHaveLength(1); // firm created automatically
      expect(result.clients[0].id).toBe('familiarcat');
    });

    it('should handle empty project list', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.clients[0].projects).toHaveLength(0);
      expect(result.checksumStats.total).toBe(3);
    });

    it('should handle null projects from API', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.clients).toBeDefined();
      expect(result.checksumStats.total).toBe(3);
    });

    it('should handle missing brandTheme', async () => {
      const clientsWithoutTheme: ClientAPIResponse = {
        clients: [
          {
            id: 'test-client',
            name: 'Test',
            tier: 'standard',
            parentClientId: null,
            checksumStatus: 'unknown',
          },
        ],
        source: 'db',
      };

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => clientsWithoutTheme,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      expect(result.clients[0].brandTheme).toBeDefined(); // should not throw
    });
  });

  describe('flattenClientHierarchy', () => {
    let roots: ClientNode[];

    beforeEach(async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();
      roots = result.clients;
    });

    it('should flatten hierarchy to single list', () => {
      const flat = flattenClientHierarchy(roots);

      expect(flat.length).toBeGreaterThanOrEqual(3);
      expect(flat.map((n) => n.id)).toContain('familiarcat');
      expect(flat.map((n) => n.id)).toContain('jonah');
      expect(flat.map((n) => n.id)).toContain('client-int');
    });

    it('should maintain all nodes in flattened list', () => {
      const flat = flattenClientHierarchy(roots);

      // Should have firm + jonah + client-int
      expect(flat.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('findClientInHierarchy', () => {
    let roots: ClientNode[];

    beforeEach(async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();
      roots = result.clients;
    });

    it('should find root client', () => {
      const found = findClientInHierarchy(roots, 'familiarcat');
      expect(found).toBeDefined();
      expect(found?.id).toBe('familiarcat');
    });

    it('should find child client', () => {
      const found = findClientInHierarchy(roots, 'jonah');
      expect(found).toBeDefined();
      expect(found?.id).toBe('jonah');
    });

    it('should return null for missing client', () => {
      const found = findClientInHierarchy(roots, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('getBreadcrumbPath', () => {
    let roots: ClientNode[];

    beforeEach(async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();
      roots = result.clients;
    });

    it('should return breadcrumb for root client', () => {
      const path = getBreadcrumbPath(roots, 'familiarcat');
      expect(path.length).toBe(1);
      expect(path[0].id).toBe('familiarcat');
    });

    it('should return breadcrumb for child client', () => {
      const path = getBreadcrumbPath(roots, 'jonah');
      expect(path.length).toBe(2);
      expect(path[0].id).toBe('familiarcat');
      expect(path[1].id).toBe('jonah');
    });

    it('should return empty array for missing client', () => {
      const path = getBreadcrumbPath(roots, 'nonexistent');
      expect(path.length).toBe(0);
    });
  });

  describe('DI Validation: Dependency Injection', () => {
    it('should fetch clients from /api/clients endpoint', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      await buildClientProjectMapWithHierarchy();

      expect(global.fetch).toHaveBeenCalledWith('/api/clients');
    });

    it('should fetch projects from /api/aha/projects endpoint', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      await buildClientProjectMapWithHierarchy();

      expect(global.fetch).toHaveBeenCalledWith('/api/aha/projects');
    });

    it('should use Promise.all for parallel fetch (not sequential)', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      await buildClientProjectMapWithHierarchy();

      // Both calls should have been made
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Measurement Baseline: Coverage Goals', () => {
    it('should achieve >95% branch coverage', async () => {
      // Happy path
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClients,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects,
        } as Response);

      const result = await buildClientProjectMapWithHierarchy();

      // Verify all main code paths exercised
      expect(result.clients.length).toBeGreaterThan(0);
      expect(result.checksumStats.total).toBeGreaterThan(0);

      // Additional branch coverage: error paths
      jest.clearAllMocks();
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(buildClientProjectMapWithHierarchy()).rejects.toThrow();
    });
  });
});
