/**
 * Crew Outcome Recorder — Real-Time Status Reporting (WORKSTREAM 2)
 *
 * Module that records crew task execution outcomes for:
 * 1. Real-time status display (dashboard + VSCode chat)
 * 2. Historical tracking + RAG learning
 * 3. Aggregate metrics (success rate, avg duration, cost)
 *
 * Called after every crew task execution (in crew-mission-pipeline.ts or agent-core)
 * Extracts metadata and stores to Supabase + RAG
 */

import { randomUUID } from 'crypto';
import { storeCrewExecutionOutcome } from '@story-agent/shared';
import { appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Structure of a crew execution attempt.
 */
export interface CrewExecutionAttempt {
  crewMemberId: string;
  taskDescription: string;
  status: 'success' | 'blocked' | 'retry' | 'failed';
  startTime: number; // milliseconds since epoch
  endTime: number; // milliseconds since epoch
  confidenceLevel?: 'high' | 'medium' | 'low' | 'unknown';
  errorMessage?: string;
  filesTouched?: string[];
  recoveryAttempts?: number;
  complexityEstimate?: string;
}

/**
 * Record a crew execution outcome to:
 * - Supabase crew_execution_outcomes table (for live dashboard)
 * - RAG memory (for future crew learning)
 * - Local audit file (for debugging + local replay)
 *
 * Fire-and-forget async (doesn't block primary execution).
 */
export async function recordCrewExecutionOutcome(
  attempt: CrewExecutionAttempt
): Promise<void> {
  const attemptId = randomUUID();
  const durationSeconds = (attempt.endTime - attempt.startTime) / 1000;

  try {
    // Store to Supabase + RAG (async, don't await)
    storeCrewExecutionOutcome({
      crewId: attempt.crewMemberId,
      attemptId,
      taskDescription: attempt.taskDescription,
      status: attempt.status,
      durationSeconds,
      confidenceLevel: attempt.confidenceLevel,
      error: attempt.errorMessage,
      filesTouched: attempt.filesTouched,
      recoveryAttempts: attempt.recoveryAttempts,
      complexityEstimate: attempt.complexityEstimate,
    }).catch(err => {
      console.error('Failed to store crew execution outcome:', err);
    });

    // Also log to local audit file for debugging + local replay
    logToLocalAuditFile({
      attemptId,
      ...attempt,
      durationSeconds,
    });
  } catch (err) {
    console.error('Error in recordCrewExecutionOutcome:', err);
    // Don't throw; fire-and-forget
  }
}

/**
 * Log execution outcome to local audit file (~/.claude/crew-execution-outcomes.jsonl).
 * Format: newline-delimited JSON for easy streaming/replay.
 */
function logToLocalAuditFile(record: {
  attemptId: string;
  crewMemberId: string;
  taskDescription: string;
  status: 'success' | 'blocked' | 'retry' | 'failed';
  durationSeconds: number;
  confidenceLevel?: string;
  errorMessage?: string;
  filesTouched?: string[];
  recoveryAttempts?: number;
  complexityEstimate?: string;
}): void {
  try {
    const auditDir = join(homedir(), '.claude');
    const auditFile = join(auditDir, 'crew-execution-outcomes.jsonl');

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...record,
    };

    appendFileSync(auditFile, JSON.stringify(logEntry) + '\n');
  } catch (err: any) {
    // Silently fail; audit logging is best-effort
    console.debug('Failed to write local audit file:', err);
  }
}

/**
 * Extract execution metrics from a crew task result.
 * Used to populate recordCrewExecutionOutcome.
 *
 * This is a helper to parse crew-specific output formats.
 */
export function extractExecutionMetrics(crewResult: any): Partial<CrewExecutionAttempt> {
  return {
    status: crewResult.status || 'unknown',
    errorMessage: crewResult.error || crewResult.errorMessage,
    filesTouched: crewResult.filesTouched || crewResult.files_touched,
    recoveryAttempts: crewResult.recovery_attempts || 0,
    complexityEstimate: crewResult.complexity || crewResult.complexity_estimate,
    confidenceLevel: inferConfidenceLevel(crewResult),
  };
}

/**
 * Infer confidence level based on crew result structure.
 */
function inferConfidenceLevel(
  result: any
): 'high' | 'medium' | 'low' | 'unknown' {
  if (result.confidence_score !== undefined) {
    const score = result.confidence_score;
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    if (score >= 0.2) return 'low';
    return 'unknown';
  }

  if (result.recovery_attempts && result.recovery_attempts > 2) {
    return 'low';
  }

  if (result.status === 'success') {
    return 'high';
  }

  if (result.status === 'blocked' || result.status === 'failed') {
    return 'low';
  }

  return 'unknown';
}

/**
 * Hook to integrate into crew-mission-pipeline.ts.
 * Called after each crew member completes a task.
 *
 * Example usage in crew-mission-pipeline.ts:
 * ```
 * const crewResult = await executeCrewMember(...);
 * await recordCrewExecutionOutcome({
 *   crewMemberId: 'geordi',
 *   taskDescription: 'Fix auth bug',
 *   status: crewResult.status,
 *   startTime: taskStartTime,
 *   endTime: Date.now(),
 *   ...extractExecutionMetrics(crewResult),
 * });
 * ```
 */
export async function integrateOutcomeRecording(
  crewMemberId: string,
  taskDescription: string,
  executionPromise: Promise<any>,
  startTime: number = Date.now()
): Promise<any> {
  try {
    const result = await executionPromise;
    const endTime = Date.now();

    // Record the outcome (fire-and-forget)
    recordCrewExecutionOutcome({
      crewMemberId,
      taskDescription,
      status: result.status || 'unknown',
      startTime,
      endTime,
      ...extractExecutionMetrics(result),
    }).catch(err => {
      console.error('Outcome recording failed:', err);
    });

    return result;
  } catch (err) {
    // Even on error, record it
    const endTime = Date.now();
    recordCrewExecutionOutcome({
      crewMemberId,
      taskDescription,
      status: 'failed',
      startTime,
      endTime,
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(errRec => {
      console.error('Failed to record error outcome:', errRec);
    });

    throw err;
  }
}
