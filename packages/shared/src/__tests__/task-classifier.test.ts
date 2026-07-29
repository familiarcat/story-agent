/**
 * Tests for Task Classifier (WORKSTREAM 1)
 */

import { describe, expect, it } from 'vitest';
import { classifyTask, inferTaskType, type TaskType } from '../task-classifier.js';

describe('Task Classifier', () => {
  describe('classifyTask', () => {
    it('should classify bug fixes as autonomous', () => {
      // NOTE: the brief must not contain an escalation keyword. The original fixture said
      // "Fix authentication bug…", which correctly escalates — `authentication` is in
      // ESCALATION_KEYWORDS — so the test was asserting that an auth-touching change may run
      // unsupervised. The classifier was right and the assertion was wrong.
      const result = classifyTask('Fix off-by-one bug in the pagination helper', 'bug_fix');
      expect(result.isAutonomous).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('escalates a bug fix that touches authentication (keyword beats task type)', () => {
      const result = classifyTask('Fix authentication bug in login flow', 'bug_fix');
      expect(result.isAutonomous).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.reason).toContain('authentication');
    });

    it('should classify tests as autonomous', () => {
      const result = classifyTask('Add unit tests for auth module', 'test');
      expect(result.isAutonomous).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should classify documentation as autonomous', () => {
      const result = classifyTask('Update API documentation with new endpoints', 'documentation');
      expect(result.isAutonomous).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should classify refactoring as autonomous', () => {
      const result = classifyTask('Refactor navigation component for clarity', 'refactor');
      expect(result.isAutonomous).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should classify new features as requiring approval', () => {
      const result = classifyTask('Implement new payment flow', 'new_feature');
      expect(result.isAutonomous).toBe(false);
      expect(result.reason).toContain('requires human approval');
    });

    it('should classify migrations as requiring approval', () => {
      const result = classifyTask('Migrate database schema to v2', 'migration');
      expect(result.isAutonomous).toBe(false);
      expect(result.riskLevel).toBe('critical');
    });

    it('should escalate on security keywords', () => {
      const result = classifyTask('Fix security vulnerability in auth', 'bug_fix');
      expect(result.isAutonomous).toBe(false);
      expect(result.reason).toContain('security');
    });

    it('should escalate on production keywords', () => {
      const result = classifyTask('Fix production-only bug', 'bug_fix');
      expect(result.isAutonomous).toBe(false);
      expect(result.reason).toContain('production');
    });

    it('should handle high complexity refactors with approval', () => {
      // To exercise the COMPLEXITY threshold (phase 4) the brief must avoid escalation keywords,
      // which are checked first (phase 2). The original fixture said "authentication", so it
      // escalated on the keyword and never reached the complexity branch — the reason therefore
      // said "Found escalation keywords", not "complexity", which is what the assertion wanted.
      const result = classifyTask(
        'Refactor complex pagination system across multiple components with nested if else logic branches, conditional flows, and recursive helpers that need consolidation',
        'refactor'
      );
      expect(result.isAutonomous).toBe(false);
      expect(result.reason).toContain('complexity');
      expect(result.escalationThreshold).toBe('complexity_threshold');
    });

    it('escalates on a security keyword BEFORE considering complexity', () => {
      const result = classifyTask(
        'Refactor complex authentication system with multiple if else logic branches and conditional flows',
        'refactor'
      );
      expect(result.isAutonomous).toBe(false);
      expect(result.escalationThreshold).toBe('security_or_scope_concern');
      expect(result.reason).toContain('authentication');
    });

    it('should boost confidence with safe keywords', () => {
      const result = classifyTask('Fix typo in comment', 'documentation');
      expect(result.isAutonomous).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0.8);
    });
  });

  describe('inferTaskType', () => {
    it('should infer bug_fix from context', () => {
      expect(inferTaskType('Fix the broken authentication')).toBe('bug_fix');
    });

    it('should infer test from context', () => {
      expect(inferTaskType('Add unit tests for the API')).toBe('test');
    });

    it('should infer documentation from context', () => {
      expect(inferTaskType('Update the README with new features')).toBe('documentation');
    });

    it('should infer new_feature from context', () => {
      expect(inferTaskType('Implement dark mode toggle')).toBe('new_feature');
    });

    it('should return unknown for ambiguous text', () => {
      expect(inferTaskType('Do something with the code')).toBe('unknown');
    });
  });
});
