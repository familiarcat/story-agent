/**
 * Universal State Machine for PM Entities
 * 
 * Defines valid transitions for all entity types (Sprint, Story, Task)
 * Using a deterministic graph-based approach rather than hardcoded conditionals
 */

import { StateEnum, type State } from './schemas';

/**
 * State Transition Graph
 * Maps: from_state → [valid_to_states]
 * 
 * Minimal states (universally supported):
 * - open: Initial state, ready to start
 * - in_progress: Currently being worked on
 * - done: Work completed
 * 
 * Optional extensions (tool-specific):
 * - planning: Pre-work analysis
 * - blocked: Waiting on external dependency
 * - review: Code/design review
 * - archived: Historical, read-only
 */
const UNIVERSAL_STATE_MACHINE: Record<State, State[]> = {
  open: ['planning', 'in_progress', 'blocked', 'archived'],
  planning: ['open', 'in_progress', 'archived'],
  in_progress: ['blocked', 'review', 'done', 'open', 'archived'],
  blocked: ['open', 'in_progress', 'archived'],
  review: ['in_progress', 'done', 'blocked', 'archived'],
  done: ['archived', 'open'], // Allow reopening for corrections
  staging: ['done', 'open', 'archived'], // Pre-production validation
  archived: [], // Final state, no transitions out
};

/**
 * State Machine Validator
 */
export class StateMachine {
  /**
   * Check if a state transition is valid
   * @param fromState Current state
   * @param toState Desired target state
   * @returns true if transition is allowed
   */
  static isValidTransition(fromState: State, toState: State): boolean {
    if (!StateEnum.safeParse(fromState).success || !StateEnum.safeParse(toState).success) {
      return false;
    }

    const validTransitions = UNIVERSAL_STATE_MACHINE[fromState];
    return validTransitions?.includes(toState) ?? false;
  }

  /**
   * Get all valid next states from current state
   * @param currentState Current state
   * @returns Array of valid destination states
   */
  static getValidNextStates(currentState: State): State[] {
    return UNIVERSAL_STATE_MACHINE[currentState] || [];
  }

  /**
   * Validate a full state transition path
   * @param states Array of states in order
   * @returns true if all transitions are valid
   */
  static isValidPath(states: State[]): boolean {
    for (let i = 0; i < states.length - 1; i++) {
      if (!this.isValidTransition(states[i], states[i + 1])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find shortest path between two states (BFS)
   * @param fromState Starting state
   * @param toState Target state
   * @returns Array of states representing shortest path, or null if unreachable
   */
  static findShortestPath(fromState: State, toState: State): State[] | null {
    if (fromState === toState) {
      return [fromState];
    }

    const queue: [State, State[]][] = [[fromState, [fromState]]];
    const visited = new Set<State>([fromState]);

    while (queue.length > 0) {
      const [currentState, path] = queue.shift()!;
      const nextStates = UNIVERSAL_STATE_MACHINE[currentState] || [];

      for (const nextState of nextStates) {
        if (nextState === toState) {
          return [...path, toState];
        }

        if (!visited.has(nextState)) {
          visited.add(nextState);
          queue.push([nextState, [...path, nextState]]);
        }
      }
    }

    return null; // No path found (unreachable)
  }

  /**
   * Get state transition graph (for debugging/visualization)
   */
  static getTransitionGraph(): Record<State, State[]> {
    return JSON.parse(JSON.stringify(UNIVERSAL_STATE_MACHINE));
  }

  /**
   * Check if a state is a terminal state (no further transitions)
   */
  static isTerminalState(state: State): boolean {
    const nextStates = UNIVERSAL_STATE_MACHINE[state];
    return !nextStates || nextStates.length === 0;
  }

  /**
   * Check if a state is a starting state (typically the first state of an entity)
   */
  static isStartingState(state: State): boolean {
    return state === 'open' || state === 'planning';
  }
}

/**
 * State-specific behaviors and permissions
 */
export const STATE_BEHAVIOR = {
  open: {
    description: 'Ready to start, not yet in progress',
    isStarting: true,
    isTerminal: false,
    requiresApproval: false,
    locked: false,
  },
  planning: {
    description: 'Pre-work analysis and preparation',
    isStarting: true,
    isTerminal: false,
    requiresApproval: false,
    locked: false,
  },
  in_progress: {
    description: 'Currently being worked on',
    isStarting: false,
    isTerminal: false,
    requiresApproval: false,
    locked: false,
  },
  blocked: {
    description: 'Waiting on external dependency or blocker',
    isStarting: false,
    isTerminal: false,
    requiresApproval: false,
    locked: true, // Cannot change fields while blocked
  },
  review: {
    description: 'Under code/design review',
    isStarting: false,
    isTerminal: false,
    requiresApproval: true, // Needs reviewer approval to proceed
    locked: true,
  },
  done: {
    description: 'Work completed and accepted',
    isStarting: false,
    isTerminal: false, // Can be reopened
    requiresApproval: false,
    locked: true, // Cannot modify historical state
  },
  staging: {
    description: 'Pre-production validation',
    isStarting: false,
    isTerminal: false,
    requiresApproval: true,
    locked: false,
  },
  archived: {
    description: 'Historical, read-only',
    isStarting: false,
    isTerminal: true,
    requiresApproval: false,
    locked: true, // No modifications allowed
  },
} as const;

export type StateBehavior = (typeof STATE_BEHAVIOR)[State];
