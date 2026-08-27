/**
 * State Machine Tests
 * 
 * Tests the universal state machine implementation for valid/invalid transitions
 */

import { describe, it, expect } from 'vitest';
import { StateMachine, STATE_BEHAVIOR } from '@story-agent/shared/pm-contracts';

describe('State Machine', () => {
  describe('Valid Transitions', () => {
    it('should allow open → in_progress', () => {
      const isValid = StateMachine.isValidTransition('open', 'in_progress');
      expect(isValid).toBe(true);
    });

    it('should allow in_progress → done', () => {
      const isValid = StateMachine.isValidTransition('in_progress', 'done');
      expect(isValid).toBe(true);
    });

    it('should allow in_progress → blocked', () => {
      const isValid = StateMachine.isValidTransition('in_progress', 'blocked');
      expect(isValid).toBe(true);
    });

    it('should allow open → planning', () => {
      const isValid = StateMachine.isValidTransition('open', 'planning');
      expect(isValid).toBe(true);
    });

    it('should allow done → archived', () => {
      const isValid = StateMachine.isValidTransition('done', 'archived');
      expect(isValid).toBe(true);
    });

    it('should allow done → open (reopening)', () => {
      const isValid = StateMachine.isValidTransition('done', 'open');
      expect(isValid).toBe(true);
    });

    it('should allow blocked → in_progress (unblocking)', () => {
      const isValid = StateMachine.isValidTransition('blocked', 'in_progress');
      expect(isValid).toBe(true);
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject open → done (must go through in_progress)', () => {
      const isValid = StateMachine.isValidTransition('open', 'done');
      expect(isValid).toBe(false);
    });

    it('should reject archived → open (archived is terminal)', () => {
      const isValid = StateMachine.isValidTransition('archived', 'open');
      expect(isValid).toBe(false);
    });

    it('should reject archived → in_progress', () => {
      const isValid = StateMachine.isValidTransition('archived', 'in_progress');
      expect(isValid).toBe(false);
    });

    it('should reject invalid from state', () => {
      const isValid = StateMachine.isValidTransition('invalid_state' as any, 'done');
      expect(isValid).toBe(false);
    });

    it('should reject invalid to state', () => {
      const isValid = StateMachine.isValidTransition('open', 'invalid_state' as any);
      expect(isValid).toBe(false);
    });

    it('should reject done → blocked (done is terminal for practical purposes)', () => {
      const isValid = StateMachine.isValidTransition('done', 'blocked');
      expect(isValid).toBe(false);
    });
  });

  describe('Valid Paths', () => {
    it('should accept valid 3-state path', () => {
      const path = ['open', 'in_progress', 'done'] as const;
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(true);
    });

    it('should accept valid path with blocking', () => {
      const path = ['open', 'in_progress', 'blocked', 'in_progress', 'done'] as const;
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(true);
    });

    it('should accept valid path with archive', () => {
      const path = ['open', 'in_progress', 'done', 'archived'] as const;
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(true);
    });

    it('should reject path with invalid transition', () => {
      const path = ['open', 'done', 'archived'] as const;
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(false);
    });

    it('should handle single-state path', () => {
      const path = ['open'] as const;
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(true);
    });

    it('should handle empty path', () => {
      const path: any[] = [];
      const isValid = StateMachine.isValidPath(path);
      expect(isValid).toBe(true);
    });
  });

  describe('Next States', () => {
    it('should return valid next states for open', () => {
      const nextStates = StateMachine.getValidNextStates('open');
      expect(nextStates).toContain('planning');
      expect(nextStates).toContain('in_progress');
      expect(nextStates).toContain('blocked');
      expect(nextStates).toContain('archived');
    });

    it('should return valid next states for in_progress', () => {
      const nextStates = StateMachine.getValidNextStates('in_progress');
      expect(nextStates).toContain('blocked');
      expect(nextStates).toContain('review');
      expect(nextStates).toContain('done');
      expect(nextStates).toContain('open');
      expect(nextStates).toContain('archived');
    });

    it('should return empty array for archived (terminal state)', () => {
      const nextStates = StateMachine.getValidNextStates('archived');
      expect(nextStates).toEqual([]);
    });

    it('should return valid next states for blocked', () => {
      const nextStates = StateMachine.getValidNextStates('blocked');
      expect(nextStates).toContain('open');
      expect(nextStates).toContain('in_progress');
      expect(nextStates).toContain('archived');
    });
  });

  describe('Shortest Path Finding', () => {
    it('should find shortest path open → done', () => {
      const path = StateMachine.findShortestPath('open', 'done');
      expect(path).toBeTruthy();
      expect(path![0]).toBe('open');
      expect(path![path!.length - 1]).toBe('done');
      expect(path!.length).toBeLessThanOrEqual(3); // Min: open → in_progress → done
    });

    it('should find shortest path with blocking', () => {
      const path = StateMachine.findShortestPath('open', 'blocked');
      expect(path).toBeTruthy();
      expect(path!).toContain('open');
      expect(path!).toContain('blocked');
    });

    it('should find path to archived', () => {
      const path = StateMachine.findShortestPath('open', 'archived');
      expect(path).toBeTruthy();
      expect(path![path!.length - 1]).toBe('archived');
    });

    it('should return null for unreachable state (archived)', () => {
      const path = StateMachine.findShortestPath('archived', 'open');
      expect(path).toBeNull();
    });

    it('should return single-element path for same state', () => {
      const path = StateMachine.findShortestPath('open', 'open');
      expect(path).toEqual(['open']);
    });

    it('should find path through multiple intermediate states', () => {
      const path = StateMachine.findShortestPath('planning', 'archived');
      expect(path).toBeTruthy();
      expect(path![0]).toBe('planning');
      expect(path![path!.length - 1]).toBe('archived');
    });
  });

  describe('Terminal States', () => {
    it('should identify archived as terminal', () => {
      const isTerminal = StateMachine.isTerminalState('archived');
      expect(isTerminal).toBe(true);
    });

    it('should not identify open as terminal', () => {
      const isTerminal = StateMachine.isTerminalState('open');
      expect(isTerminal).toBe(false);
    });

    it('should not identify in_progress as terminal', () => {
      const isTerminal = StateMachine.isTerminalState('in_progress');
      expect(isTerminal).toBe(false);
    });

    it('should not identify done as terminal (can reopen)', () => {
      const isTerminal = StateMachine.isTerminalState('done');
      expect(isTerminal).toBe(false);
    });
  });

  describe('Starting States', () => {
    it('should identify open as starting', () => {
      const isStart = StateMachine.isStartingState('open');
      expect(isStart).toBe(true);
    });

    it('should identify planning as starting', () => {
      const isStart = StateMachine.isStartingState('planning');
      expect(isStart).toBe(true);
    });

    it('should not identify in_progress as starting', () => {
      const isStart = StateMachine.isStartingState('in_progress');
      expect(isStart).toBe(false);
    });

    it('should not identify done as starting', () => {
      const isStart = StateMachine.isStartingState('done');
      expect(isStart).toBe(false);
    });
  });

  describe('State Behaviors', () => {
    it('should have correct behavior for open state', () => {
      const behavior = STATE_BEHAVIOR.open;
      expect(behavior.isStarting).toBe(true);
      expect(behavior.isTerminal).toBe(false);
      expect(behavior.locked).toBe(false);
    });

    it('should have correct behavior for blocked state', () => {
      const behavior = STATE_BEHAVIOR.blocked;
      expect(behavior.locked).toBe(true);
      expect(behavior.requiresApproval).toBe(false);
    });

    it('should have correct behavior for archived state', () => {
      const behavior = STATE_BEHAVIOR.archived;
      expect(behavior.isTerminal).toBe(true);
      expect(behavior.locked).toBe(true);
    });

    it('should have correct behavior for review state', () => {
      const behavior = STATE_BEHAVIOR.review;
      expect(behavior.requiresApproval).toBe(true);
      expect(behavior.locked).toBe(true);
    });
  });

  describe('Transition Graph Export', () => {
    it('should export valid transition graph', () => {
      const graph = StateMachine.getTransitionGraph();
      expect(graph).toBeDefined();
      expect(graph.open).toBeDefined();
      expect(graph.archived).toBeDefined();
      expect(Array.isArray(graph.open)).toBe(true);
      expect(Array.isArray(graph.archived)).toBe(true);
    });

    it('should not modify original graph when exported', () => {
      const graph1 = StateMachine.getTransitionGraph();
      const graph2 = StateMachine.getTransitionGraph();
      expect(graph1).not.toBe(graph2); // Different object
      expect(graph1).toEqual(graph2); // Same content
    });
  });
});
