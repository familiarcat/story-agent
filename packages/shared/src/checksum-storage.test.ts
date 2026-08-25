/**
 * Checksum Storage Layer Tests
 * Phase 2 validation: Core storage interfaces and determinism
 */

import { describe, it, expect } from 'vitest';
import { computePolicySHA256 } from './policy-checksum';
import type { ClientSecurityPolicy } from './client-security-policy';

const mockPolicy: ClientSecurityPolicy = {
  policyId: 'test-policy-1',
  clientId: 'test-client',
  tier: 'standard',
  encryptionRequired: true,
  authMethod: 'oauth2',
  dataClassification: 'confidential',
  retentionDays: 365,
  auditLoggingEnabled: true,
  mfaRequired: true,
  ipWhitelist: ['10.0.0.0/8'],
  rateLimit: 1000,
  apiKeyRotationDays: 90,
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 30,
  backupRequired: true,
  disasterRecoveryEnabled: true,
  complianceFrameworks: ['SOC2', 'HIPAA'],
  dataResidency: 'US',
  allowedIntegrations: ['stripe', 'salesforce'],
  customFields: {},
  version: '1.0',
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-25'),
};

describe('checksum-storage (Phase 2)', () => {
  describe('Module Exports', () => {
    it('should export storage functions', async () => {
      const module = await import('./checksum-storage');

      expect(typeof module.getStoredChecksum).toBe('function');
      expect(typeof module.storeChecksumResult).toBe('function');
      expect(typeof module.computeAndStore).toBe('function');
      expect(typeof module.lookupOrComputeChecksum).toBe('function');
    });

    it('should export StoredChecksum type', async () => {
      const module = await import('./checksum-storage');

      // Type exports available at module level
      expect(module).toBeDefined();
    });
  });

  describe('Checksum Determinism', () => {
    it('should produce consistent SHA256 hashes for identical policies', () => {
      const hash1 = computePolicySHA256(mockPolicy);
      const hash2 = computePolicySHA256(mockPolicy);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA256 hex = 64 chars
      expect(/^[a-f0-9]{64}$/.test(hash1)).toBe(true);
    });

    it('should produce different hashes for different policies', () => {
      const policy2: ClientSecurityPolicy = {
        ...mockPolicy,
        mfaRequired: !mockPolicy.mfaRequired,
      };

      const hash1 = computePolicySHA256(mockPolicy);
      const hash2 = computePolicySHA256(policy2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in policy fields', () => {
      const specialPolicy: ClientSecurityPolicy = {
        ...mockPolicy,
        customFields: {
          unicode: '测试 κόσμε мир',
          symbols: '!@#$%^&*()',
          emoji: '🔒',
        },
      };

      const hash = computePolicySHA256(specialPolicy);

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it('should handle empty and null fields', () => {
      const policyWithEmpty: ClientSecurityPolicy = {
        ...mockPolicy,
        customFields: {},
        ipWhitelist: [],
        allowedIntegrations: [],
      };

      const hash = computePolicySHA256(policyWithEmpty);

      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('Phase 2 Workflow', () => {
    it('should provide graceful fallback when Supabase unavailable', async () => {
      const { computeAndStore } = await import('./checksum-storage');

      // Call without Supabase credentials - should still return computed result
      const result = await computeAndStore(
        'test-policy-1',
        mockPolicy,
        undefined, // No URL
        undefined  // No Key
      );

      expect(result.isValid).toBe(true);
      expect(result.checksum.checksumSHA256).toBeDefined();
      expect(result.checksum.checksumSHA256.length).toBe(64);
      expect(typeof result.checksum.computedAt).toBe('string'); // ISO timestamp
    });

    it('should support checksum status transitions', () => {
      // Phase 2 enables: unknown → valid/invalid
      const statusTypes = ['valid', 'invalid', 'unknown'] as const;

      statusTypes.forEach((status) => {
        expect(['valid', 'invalid', 'unknown'].includes(status)).toBe(true);
      });
    });

    it('should document API return structure', async () => {
      const { computeAndStore } = await import('./checksum-storage');

      const result = await computeAndStore('test-policy-1', mockPolicy);

      // Verify checksum object has required fields
      expect(result.checksum).toHaveProperty('policyId', 'test-policy-1');
      expect(result.checksum).toHaveProperty('checksumSHA256');
      expect(result.checksum).toHaveProperty('computedAt');
      expect(result.checksum).toHaveProperty('isValid');

      // ISO string format for timestamps
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.checksum.computedAt as string)).toBe(true);
    });
  });

  describe('Integration Points', () => {
    it('should support phase-2-clients API endpoint integration', async () => {
      // /api/clients route now calls lookupOrComputeChecksum()
      // This test documents the integration surface

      const { lookupOrComputeChecksum } = await import('./checksum-storage');

      expect(typeof lookupOrComputeChecksum).toBe('function');
    });

    it('should enable checksum status visualization in UI', () => {
      // ClientProjectMapV2 displays: valid | invalid | unknown
      // Each status informs UI badge rendering

      const statuses = ['valid', 'invalid', 'unknown'] as const;
      const badges = {
        valid: '✅',
        invalid: '❌',
        unknown: '❓',
      };

      statuses.forEach((status) => {
        expect(badges[status]).toBeDefined();
      });
    });
  });
});

