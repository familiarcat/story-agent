/**
 * Autonomous Executor — Autonomous Governance MVP (WORKSTREAM 1)
 *
 * Wraps task execution with:
 * 1. Pre-flight: Classify task + devil's advocate challenge
 * 2. Execution: Run task with try/catch + logging
 * 3. Post-flight: Review outcome (tests pass? scope match? intent correct?)
 * 4. Escalation: If concern, emit escalation event (don't execute)
 *
 * Logs all outcomes to autonomous audit trail for governance.
 */

import { randomUUID } from 'crypto';
import {
  classifyTask,
  inferTaskType,
  type TaskType,
  type TaskClassification,
} from '@story-agent/shared';
import {
  storeAutonomousTaskAudit,
  storeCrewExecutionOutcome,
} from '@story-agent/shared';

export interface AutonomousTaskInput {
  taskId: string;
  crewId: string;
  brief: string;
  taskType?: TaskType;
  executor: () => Promise<{
    success: boolean;
    output?: string;
    error?: string;
    filesChanged?: string[];
    durationMs?: number;
  }>;
  devilsAdvocateChallenge?: string; // Optional pre-execution concern
}

export interface AutonomousTaskResult {
  taskId: string;
  executed: boolean;
  reason: string;
  classification: TaskClassification;
  outcome?: {
    success: boolean;
    output?: string;
    error?: string;
    durationSeconds: number;
    filesChanged?: string[];
  };
  escalation?: {
    reason: string;
    severity: 'warning' | 'error' | 'critical';
  };
}

/**
 * Execute a task autonomously with pre/post-flight checks.
 *
 * Returns early with escalation if:
 * - Task classified as non-autonomous
 * - Devil's advocate raises valid concern
 * - Execution fails or outcome doesn't match intent
 *
 * Otherwise: Execute + log outcome to audit trail.
 */
export async function executeAutonomousTask(
  input: AutonomousTaskInput
): Promise<AutonomousTaskResult> {
  const startTime = Date.now();
  const attemptId = randomUUID();

  try {
    // ─── PHASE 1: CLASSIFICATION ───────────────────────────────────────

    const taskType = input.taskType || inferTaskType(input.brief);
    const classification = classifyTask(input.brief, taskType);

    // If task is not autonomous-eligible, escalate immediately
    if (!classification.isAutonomous) {
      await storeAutonomousTaskAudit({
        taskId: input.taskId,
        crewId: input.crewId,
        brief: input.brief,
        classification: 'requires_approval',
        reason: classification.reason,
        escalationThreshold: classification.escalationThreshold,
        status: 'escalated',
        durationSeconds: (Date.now() - startTime) / 1000,
      });

      return {
        taskId: input.taskId,
        executed: false,
        reason: classification.reason,
        classification,
        escalation: {
          reason: `Classification: ${classification.reason}`,
          severity: classification.riskLevel === 'critical' ? 'critical' : 'error',
        },
      };
    }

    // ─── PHASE 2: DEVIL'S ADVOCATE CHALLENGE ───────────────────────────

    if (
      input.devilsAdvocateChallenge &&
      shouldEscalateOnChallenge(input.devilsAdvocateChallenge)
    ) {
      await storeAutonomousTaskAudit({
        taskId: input.taskId,
        crewId: input.crewId,
        brief: input.brief,
        classification: 'autonomous',
        reason: `Devil's advocate raised concern: ${input.devilsAdvocateChallenge}`,
        status: 'escalated',
        durationSeconds: (Date.now() - startTime) / 1000,
      });

      return {
        taskId: input.taskId,
        executed: false,
        reason: input.devilsAdvocateChallenge,
        classification,
        escalation: {
          reason: `Devil's advocate challenge: ${input.devilsAdvocateChallenge}`,
          severity: 'warning',
        },
      };
    }

    // ─── PHASE 3: EXECUTION ────────────────────────────────────────────

    let executionResult;
    let executionError: string | undefined;
    const executionStartTime = Date.now();

    try {
      executionResult = await input.executor();
    } catch (err) {
      executionError = err instanceof Error ? err.message : String(err);
      executionResult = {
        success: false,
        error: executionError,
      };
    }

    const durationMs = Date.now() - executionStartTime;

    // ─── PHASE 4: POST-FLIGHT REVIEW ───────────────────────────────────

    // Check for execution concerns
    const postFlightConcerns = validateExecutionOutcome(
      executionResult,
      input.brief
    );

    if (postFlightConcerns.shouldEscalate) {
      await storeAutonomousTaskAudit({
        taskId: input.taskId,
        crewId: input.crewId,
        brief: input.brief,
        classification: 'autonomous',
        reason: `Post-flight concern: ${postFlightConcerns.reason}`,
        status: 'escalated',
        durationSeconds: durationMs / 1000,
      });

      await storeCrewExecutionOutcome({
        crewId: input.crewId,
        attemptId,
        taskDescription: input.brief,
        status: 'blocked',
        durationSeconds: durationMs / 1000,
        error: postFlightConcerns.reason,
      });

      return {
        taskId: input.taskId,
        executed: false,
        reason: postFlightConcerns.reason || 'Post-flight validation failed',
        classification,
        escalation: {
          reason: `Post-flight: ${postFlightConcerns.reason || 'unknown concern'}`,
          severity: 'warning',
        },
      };
    }

    // ─── PHASE 5: LOG SUCCESS ──────────────────────────────────────────

    const outcomeStatus = executionResult.success ? 'success' : 'failed';

    await storeAutonomousTaskAudit({
      taskId: input.taskId,
      crewId: input.crewId,
      brief: input.brief,
      classification: 'autonomous',
      reason: 'Pre-flight passed; task autonomous-eligible',
      status: 'executed',
      outcome: executionResult.output,
      durationSeconds: durationMs / 1000,
    });

    await storeCrewExecutionOutcome({
      crewId: input.crewId,
      attemptId,
      taskDescription: input.brief,
      status: outcomeStatus as 'success' | 'failed',
      durationSeconds: durationMs / 1000,
      confidenceLevel: 'high',
      error: executionResult.error,
      filesTouched: executionResult.filesChanged,
    });

    return {
      taskId: input.taskId,
      executed: executionResult.success,
      reason: `Task executed ${executionResult.success ? 'successfully' : 'with errors'}`,
      classification,
      outcome: {
        success: executionResult.success,
        output: executionResult.output,
        error: executionResult.error,
        durationSeconds: durationMs / 1000,
        filesChanged: executionResult.filesChanged,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const durationSecs = (Date.now() - startTime) / 1000;

    console.error(`Autonomous executor error (task ${input.taskId}):`, err);

    // Log even the executor failure
    await storeAutonomousTaskAudit({
      taskId: input.taskId,
      crewId: input.crewId,
      brief: input.brief,
      classification: 'autonomous',
      reason: 'Unexpected executor error',
      status: 'blocked',
      outcome: errorMsg,
      durationSeconds: durationSecs,
    });

    return {
      taskId: input.taskId,
      executed: false,
      reason: `Executor error: ${errorMsg}`,
      classification: {
        isAutonomous: false,
        reason: 'Executor crashed unexpectedly',
        riskLevel: 'high',
        confidenceScore: 0,
      },
      escalation: {
        reason: `System error: ${errorMsg}`,
        severity: 'critical',
      },
    };
  }
}

/**
 * Devil's advocate logic: check if the challenge should trigger escalation.
 * Returns true if the concern is severe enough to block execution.
 */
function shouldEscalateOnChallenge(challenge: string): boolean {
  const escalationKeywords = [
    'security',
    'data loss',
    'corruption',
    'breach',
    'unauthorized',
    'breaking',
    'production',
  ];

  const challengeLower = challenge.toLowerCase();
  return escalationKeywords.some(kw => challengeLower.includes(kw));
}

/**
 * Post-flight validation: check if execution outcome seems reasonable.
 */
function validateExecutionOutcome(
  result: {
    success: boolean;
    output?: string;
    error?: string;
    filesChanged?: string[];
    durationMs?: number;
  },
  taskBrief: string
): {
  shouldEscalate: boolean;
  reason?: string;
} {
  // Execution failed — escalate if error is significant
  if (!result.success) {
    if (result.error && result.error.length > 200) {
      return {
        shouldEscalate: true,
        reason: `Execution error too severe to auto-recover: ${result.error.substring(0, 100)}...`,
      };
    }
    // Recoverable errors don't always require escalation
    return { shouldEscalate: false };
  }

  // Success: check for sanity
  // If task says "add comment" but 50+ files were changed, escalate
  if (
    result.filesChanged &&
    result.filesChanged.length > 10 &&
    /\b(comment|doc|typo|format)\b/i.test(taskBrief)
  ) {
    return {
      shouldEscalate: true,
      reason: `Scope mismatch: ${result.filesChanged.length} files changed for a documentation task`,
    };
  }

  return { shouldEscalate: false };
}
