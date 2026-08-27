/**
 * RBAC Permission Tests
 * 
 * Tests role-based access control for PM entities
 */

import { describe, it, expect } from 'vitest';
import {
  canUserPerformAction,
  getReadableFields,
  getWritableFields,
  validateFieldUpdate,
} from '@story-agent/shared/pm-contracts';

describe('RBAC Permissions', () => {
  describe('Viewer Role (read-only)', () => {
    it('should allow read on all fields', () => {
      const canRead = canUserPerformAction('viewer', 'sprint', 'name', 'read');
      expect(canRead).toBe(true);
    });

    it('should deny write on any field', () => {
      const canWrite = canUserPerformAction('viewer', 'sprint', 'name', 'write');
      expect(canWrite).toBe(false);
    });

    it('should deny delete', () => {
      const canDelete = canUserPerformAction('viewer', 'sprint', 'id', 'delete');
      expect(canDelete).toBe(false);
    });

    it('should get all readable fields', () => {
      const fields = getReadableFields('viewer', 'story');
      expect(fields).toContain('*'); // Wildcard means all
    });

    it('should get empty writable fields', () => {
      const fields = getWritableFields('viewer', 'task');
      expect(fields).toEqual([]);
    });
  });

  describe('Developer Role (work-in-progress)', () => {
    it('should allow read on all fields', () => {
      const canRead = canUserPerformAction('developer', 'task', 'state', 'read');
      expect(canRead).toBe(true);
    });

    it('should allow write on task state', () => {
      const canWrite = canUserPerformAction('developer', 'task', 'state', 'write');
      expect(canWrite).toBe(true);
    });

    it('should allow write on task assignee', () => {
      const canWrite = canUserPerformAction('developer', 'task', 'assignee_id', 'write');
      expect(canWrite).toBe(true);
    });

    it('should deny write on story title', () => {
      const canWrite = canUserPerformAction('developer', 'story', 'title', 'write');
      expect(canWrite).toBe(false);
    });

    it('should deny delete', () => {
      const canDelete = canUserPerformAction('developer', 'sprint', 'id', 'delete');
      expect(canDelete).toBe(false);
    });

    it('should list writable fields', () => {
      const fields = getWritableFields('developer', 'task');
      expect(fields).toContain('state');
      expect(fields).toContain('assignee_id');
    });
  });

  describe('Product Manager Role (strategic)', () => {
    it('should allow write on sprint goal', () => {
      const canWrite = canUserPerformAction('product-manager', 'sprint', 'goal', 'write');
      expect(canWrite).toBe(true);
    });

    it('should allow write on sprint capacity', () => {
      const canWrite = canUserPerformAction('product-manager', 'sprint', 'capacity', 'write');
      expect(canWrite).toBe(true);
    });

    it('should allow write on story priority', () => {
      const canWrite = canUserPerformAction('product-manager', 'story', 'priority', 'write');
      expect(canWrite).toBe(true);
    });

    it('should allow write on story title', () => {
      const canWrite = canUserPerformAction('product-manager', 'story', 'title', 'write');
      expect(canWrite).toBe(true);
    });

    it('should allow write on story points', () => {
      const canWrite = canUserPerformAction('product-manager', 'story', 'story_points', 'write');
      expect(canWrite).toBe(true);
    });

    it('should deny write on task state', () => {
      const canWrite = canUserPerformAction('product-manager', 'task', 'state', 'write');
      expect(canWrite).toBe(false);
    });
  });

  describe('Editor Role (broad write)', () => {
    it('should allow write on all fields (except protected)', () => {
      const canWrite = canUserPerformAction('editor', 'story', 'title', 'write');
      expect(canWrite).toBe(true);
    });

    it('should deny write on protected fields', () => {
      const canWrite = canUserPerformAction('editor', 'sprint', 'id', 'write');
      expect(canWrite).toBe(false); // protected field
    });

    it('should deny write on created_at', () => {
      const canWrite = canUserPerformAction('editor', 'story', 'created_at', 'write');
      expect(canWrite).toBe(false); // protected
    });

    it('should deny delete', () => {
      const canDelete = canUserPerformAction('editor', 'task', 'id', 'delete');
      expect(canDelete).toBe(false);
    });

    it('should list writable fields (excluding protected)', () => {
      const fields = getWritableFields('editor', 'story');
      expect(fields).not.toContain('id');
      expect(fields).not.toContain('created_at');
      expect(fields).not.toContain('created_by');
    });
  });

  describe('Admin Role (full access)', () => {
    it('should allow read on all fields', () => {
      const canRead = canUserPerformAction('admin', 'sprint', 'name', 'read');
      expect(canRead).toBe(true);
    });

    it('should allow write on all fields except protected', () => {
      const canWrite = canUserPerformAction('admin', 'story', 'title', 'write');
      expect(canWrite).toBe(true);
    });

    it('should deny write on protected id field', () => {
      const canWrite = canUserPerformAction('admin', 'sprint', 'id', 'write');
      expect(canWrite).toBe(false); // Still protected
    });

    it('should allow delete', () => {
      const canDelete = canUserPerformAction('admin', 'task', 'description', 'delete');
      expect(canDelete).toBe(true);
    });
  });

  describe('Protected Fields', () => {
    it('should never allow write to id field', () => {
      expect(canUserPerformAction('editor', 'sprint', 'id', 'write')).toBe(false);
      expect(canUserPerformAction('admin', 'sprint', 'id', 'write')).toBe(false);
    });

    it('should never allow write to tenant_id field', () => {
      expect(canUserPerformAction('editor', 'story', 'tenant_id', 'write')).toBe(false);
      expect(canUserPerformAction('admin', 'story', 'tenant_id', 'write')).toBe(false);
    });

    it('should never allow write to created_at field', () => {
      expect(canUserPerformAction('editor', 'task', 'created_at', 'write')).toBe(false);
      expect(canUserPerformAction('admin', 'task', 'created_at', 'write')).toBe(false);
    });

    it('should never allow write to created_by field', () => {
      expect(canUserPerformAction('editor', 'sprint', 'created_by', 'write')).toBe(false);
      expect(canUserPerformAction('admin', 'sprint', 'created_by', 'write')).toBe(false);
    });

    it('should never allow write to audit_trail field', () => {
      expect(canUserPerformAction('editor', 'story', 'audit_trail', 'write')).toBe(false);
      expect(canUserPerformAction('admin', 'story', 'audit_trail', 'write')).toBe(false);
    });
  });

  describe('Field Update Validation', () => {
    it('should allow developer to update task state', () => {
      const result = validateFieldUpdate('developer', 'task', 'state', 'done');
      expect(result.allowed).toBe(true);
    });

    it('should deny developer from updating task title', () => {
      const result = validateFieldUpdate('developer', 'task', 'title', 'New Title');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cannot write');
    });

    it('should deny any role from updating protected id', () => {
      const result1 = validateFieldUpdate('editor', 'sprint', 'id', 'new-id');
      const result2 = validateFieldUpdate('admin', 'sprint', 'id', 'new-id');
      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(false);
    });

    it('should deny write to audit_trail', () => {
      const result = validateFieldUpdate('admin', 'story', 'audit_trail', []);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('protected');
    });

    it('should allow PM to update story priority', () => {
      const result = validateFieldUpdate('product-manager', 'story', 'priority', 'high');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Entity Type Access', () => {
    it('developer should have different permissions on sprints vs tasks', () => {
      const sprintState = canUserPerformAction('developer', 'sprint', 'state', 'write');
      const taskState = canUserPerformAction('developer', 'task', 'state', 'write');
      expect(sprintState).toBe(false);
      expect(taskState).toBe(true);
    });

    it('pm should have write access on stories but not tasks', () => {
      const storyTitle = canUserPerformAction('product-manager', 'story', 'title', 'write');
      const taskTitle = canUserPerformAction('product-manager', 'task', 'title', 'write');
      expect(storyTitle).toBe(true);
      expect(taskTitle).toBe(false);
    });
  });
});
