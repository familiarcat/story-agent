/**
 * Conflict Resolution Tests
 * 
 * Tests multi-tool sync conflict detection and resolution strategies
 */

import { describe, it, expect } from 'vitest';
import {
  detectConflict,
  resolveConflict,
  mergeEntities,
  getConflictResolutionStrategy,
  createConflictAuditEntry,
} from '@story-agent/shared/pm-contracts';
import { VALID_FIXTURES } from './fixtures/pm-contracts/test-fixtures';

describe('Conflict Resolution', () => {
  describe('Conflict Detection', () => {
    it('should detect conflict when both sources update within 5 minutes', () => {
      const now = new Date().toISOString();
      const base = new Date(now).getTime();

      const conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' },
          updated_at: new Date(base).toISOString(),
        },
        {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'in_progress' },
          updated_at: new Date(base + 2 * 60 * 1000).toISOString(), // 2 minutes later
        }
      );

      expect(conflict).not.toBeNull();
      expect(conflict!.conflict_fields).toContain('state');
      expect(conflict!.requires_manual_review).toBe(true);
    });

    it('should not detect conflict if updates are >5 minutes apart', () => {
      const now = new Date().toISOString();
      const base = new Date(now).getTime();

      const conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' },
          updated_at: new Date(base).toISOString(),
        },
        {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'in_progress' },
          updated_at: new Date(base + 6 * 60 * 1000).toISOString(), // 6 minutes later
        }
      );

      expect(conflict).toBeNull();
    });

    it('should not detect conflict if versions are identical', () => {
      const now = new Date().toISOString();

      const conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: now,
        },
        {
          tool: 'monday',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: now,
        }
      );

      expect(conflict).toBeNull();
    });

    it('should identify all differing fields', () => {
      const now = new Date().toISOString();

      const conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: {
            ...VALID_FIXTURES.story.valid_basic,
            state: 'done' as const,
            assignee_id: 'user1@example.com',
          },
          updated_at: now,
        },
        {
          tool: 'monday',
          version: {
            ...VALID_FIXTURES.story.valid_basic,
            state: 'in_progress' as const,
            assignee_id: 'user2@example.com',
          },
          updated_at: now,
        }
      );

      expect(conflict).not.toBeNull();
      expect(conflict!.conflict_fields.length).toBeGreaterThanOrEqual(2);
      expect(conflict!.conflict_fields).toContain('state');
      expect(conflict!.conflict_fields).toContain('assignee_id');
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve via last-write-wins (most recent update)', () => {
      const base = new Date().getTime();
      const conflict = {
        entity_id: 'story-1',
        entity_type: 'story' as const,
        timestamp: new Date().toISOString(),
        source_a: {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'open' as const },
          updated_at: new Date(base).toISOString(),
        },
        source_b: {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: new Date(base + 60000).toISOString(), // 1 minute later (most recent)
        },
        conflict_fields: ['state'],
        resolution_strategy: 'last_write_wins' as const,
        requires_manual_review: false,
      };

      const resolved = resolveConflict(conflict);
      expect(resolved).not.toBeNull();
      expect(resolved!.state).toBe('done'); // Most recent value
    });

    it('should handle manual merge resolution', () => {
      const conflict = {
        entity_id: 'story-1',
        entity_type: 'story' as const,
        timestamp: new Date().toISOString(),
        source_a: {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'open' as const },
          updated_at: new Date().toISOString(),
        },
        source_b: {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: new Date().toISOString(),
        },
        conflict_fields: ['state'],
        resolution_strategy: 'manual_merge' as const,
        requires_manual_review: true,
      };

      const merged = {
        ...VALID_FIXTURES.story.valid_basic,
        state: 'review' as const, // Manually selected intermediate state
      };

      const resolved = resolveConflict(conflict, merged);
      expect(resolved).not.toBeNull();
      expect(resolved!.state).toBe('review');
    });

    it('should return null if manual merge required but no resolution provided', () => {
      const conflict = {
        entity_id: 'story-1',
        entity_type: 'story' as const,
        timestamp: new Date().toISOString(),
        source_a: {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic },
          updated_at: new Date().toISOString(),
        },
        source_b: {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic },
          updated_at: new Date().toISOString(),
        },
        conflict_fields: ['state'],
        resolution_strategy: 'manual_merge' as const,
        requires_manual_review: true,
      };

      const resolved = resolveConflict(conflict);
      expect(resolved).toBeNull();
    });
  });

  describe('Entity Merging', () => {
    it('should merge using last-write-wins strategy', () => {
      const base = new Date().getTime();
      const entityA = {
        ...VALID_FIXTURES.story.valid_basic,
        updated_at: new Date(base).toISOString(),
      };
      const entityB = {
        ...VALID_FIXTURES.story.valid_basic,
        updated_at: new Date(base + 60000).toISOString(), // More recent
      };

      const merged = mergeEntities(entityA, entityB, 'last_write_wins');
      expect(merged.updated_at).toBe(entityB.updated_at);
    });

    it('should merge using source_a_wins strategy', () => {
      const entityA = { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const };
      const entityB = { ...VALID_FIXTURES.story.valid_basic, state: 'open' as const };

      const merged = mergeEntities(entityA, entityB, 'source_a_wins');
      expect(merged.state).toBe('done');
    });

    it('should merge using source_b_wins strategy', () => {
      const entityA = { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const };
      const entityB = { ...VALID_FIXTURES.story.valid_basic, state: 'open' as const };

      const merged = mergeEntities(entityA, entityB, 'source_b_wins');
      expect(merged.state).toBe('open');
    });

    it('should merge arrays using combine strategy', () => {
      const entityA = {
        ...VALID_FIXTURES.story.valid_basic,
        labels: ['feature', 'urgent'],
      };
      const entityB = {
        ...VALID_FIXTURES.story.valid_basic,
        labels: ['urgent', 'migration'],
      };

      const merged = mergeEntities(entityA, entityB, 'combine_arrays');
      expect(merged.labels).toContain('feature');
      expect(merged.labels).toContain('urgent');
      expect(merged.labels).toContain('migration');
      expect(new Set(merged.labels).size).toBe(3); // No duplicates
    });
  });

  describe('Conflict Resolution Strategy', () => {
    it('should require manual merge for state conflicts within 5 min', () => {
      const strategy = getConflictResolutionStrategy('story', 'state', 2);
      expect(strategy).toBe('manual_merge');
    });

    it('should use last-write-wins for assignee conflicts', () => {
      const strategy = getConflictResolutionStrategy('story', 'assignee_id', 3);
      expect(strategy).toBe('last_write_wins');
    });

    it('should default to last-write-wins for unmapped fields', () => {
      const strategy = getConflictResolutionStrategy('sprint', 'unknown_field', 1);
      expect(strategy).toBe('last_write_wins');
    });

    it('should use last-write-wins when time difference exceeds limit', () => {
      const strategy = getConflictResolutionStrategy('sprint', 'state', 10);
      expect(strategy).toBe('last_write_wins'); // Outside 5-min window
    });
  });

  describe('Conflict Audit Trail', () => {
    it('should create audit entry from conflict', () => {
      const conflict = {
        entity_id: 'story-1',
        entity_type: 'story' as const,
        timestamp: new Date().toISOString(),
        source_a: {
          tool: 'jira',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: new Date().toISOString(),
        },
        source_b: {
          tool: 'monday',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: new Date().toISOString(),
        },
        conflict_fields: ['state'],
        resolution_strategy: 'manual_merge' as const,
        requires_manual_review: true,
      };

      const audit = createConflictAuditEntry(conflict);
      expect(audit.entity_id).toBe('story-1');
      expect(audit.entity_type).toBe('story');
      expect(audit.source_a_tool).toBe('jira');
      expect(audit.source_b_tool).toBe('monday');
      expect(audit.conflict_fields).toContain('state');
      expect(audit.requires_manual_review).toBe(true);
    });

    it('should include resolution details when conflict is resolved', () => {
      const conflict = {
        entity_id: 'story-1',
        entity_type: 'story' as const,
        timestamp: new Date().toISOString(),
        source_a: {
          tool: 'jira',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: new Date().toISOString(),
        },
        source_b: {
          tool: 'monday',
          version: VALID_FIXTURES.story.valid_basic,
          updated_at: new Date().toISOString(),
        },
        conflict_fields: ['state'],
        resolution_strategy: 'manual_merge' as const,
        requires_manual_review: true,
        resolution_at: new Date().toISOString(),
        resolved_by: 'troi@familiarcat.com',
        resolution_notes: 'Selected "review" as intermediate state',
      };

      const audit = createConflictAuditEntry(conflict);
      expect(audit.resolved_at).toBe(conflict.resolution_at);
      expect(audit.resolved_by).toBe('troi@familiarcat.com');
      expect(audit.resolution_notes).toBe('Selected "review" as intermediate state');
    });
  });

  describe('Multi-Tool Sync Scenarios', () => {
    it('should handle simultaneous Jira + Monday updates', () => {
      const now = new Date().toISOString();

      const conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'in_progress' as const },
          updated_at: now,
        },
        {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: now,
        }
      );

      expect(conflict).not.toBeNull();
      expect(conflict!.requires_manual_review).toBe(true);
    });

    it('should handle cascading updates (A→B→A)', () => {
      const base = new Date().getTime();

      // First sync: Jira updated
      let conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: new Date(base).toISOString(),
        },
        {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'in_progress' as const },
          updated_at: new Date(base - 10000).toISOString(), // Older
        }
      );

      expect(conflict).toBeNull(); // No conflict, Jira is newer

      // Second sync: Monday updated (catch-up)
      conflict = detectConflict(
        'story-1',
        'story',
        {
          tool: 'jira',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: new Date(base).toISOString(),
        },
        {
          tool: 'monday',
          version: { ...VALID_FIXTURES.story.valid_basic, state: 'done' as const },
          updated_at: new Date(base + 5000).toISOString(), // Newer, same value
        }
      );

      expect(conflict).toBeNull(); // No conflict, same final state
    });
  });
});
