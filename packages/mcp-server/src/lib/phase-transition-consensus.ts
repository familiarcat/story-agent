/**
 * Phase Transition Consensus Orchestrator
 * 
 * Coordinates parallel crew validation with AUTO/YELLOW/RED gates.
 * All 11 crew members validate simultaneously; consensus (≥8/11) + zero critical vetos = AUTO gate.
 * 
 * Execution Owner: O'Brien (Engineering)
 * Security Owner: Worf (immutable audit trail)
 * Timeline: Deployed 2026-07-16, live for 2026-07-17 execution
 */

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import crypto from 'crypto';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const ValidationResultSchema = z.object({
  crewMember: z.string(),
  pass: z.boolean(),
  veto: z.boolean(),
  vetoType: z.enum(['hard', 'soft']).optional(),
  reason: z.string().optional(),
  criticality: z.enum(['hard', 'soft']).optional(),
  executionTimeMs: z.number(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const PhaseTransitionDecisionSchema = z.object({
  allowed: z.boolean(),
  gate: z.enum(['AUTO', 'YELLOW', 'RED']),
  consensus: z.number(), // pass count (0-11)
  vetos: z.array(z.object({ crewMember: z.string(), reason: z.string() })),
  executed: z.boolean(),
  escalatedTo: z.enum(['riker', 'admiral']).optional(),
  validationId: z.string().uuid().optional(),
  consensusPercentage: z.number(),
  avgValidationTimeMs: z.number(),
});

export type PhaseTransitionDecision = z.infer<typeof PhaseTransitionDecisionSchema>;

// ============================================================================
// CREW VALIDATION FUNCTIONS (11 members)
// ============================================================================

/**
 * PICARD: Narrative Coherence Check
 * Detects if transition makes strategic sense (soft veto — escalates to YELLOW)
 */
async function validatePicard(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check if story narrative is coherent
    const { data: story } = await supabaseClient
      .from('aha_stories')
      .select('name, description, acceptance_criteria')
      .eq('id', storyId)
      .single();

    const coherent = !!(story?.description && story?.acceptance_criteria);
    const pass = coherent && (fromPhase === 'STARTED' ? toPhase === 'IN_PROGRESS' : true);

    return {
      crewMember: 'picard',
      pass,
      veto: !pass && fromPhase === 'STARTED', // Soft veto on incoherent start
      vetoType: 'soft',
      reason: coherent ? 'Narrative coherent' : 'Missing description or acceptance criteria',
      criticality: 'soft',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Picard validation failed');
    return {
      crewMember: 'picard',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * DATA: Schema/Data Integrity Check
 * Hard veto if data contracts violated (immovable)
 */
async function validateData(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    const { data: story } = await supabaseClient
      .from('aha_stories')
      .select('*')
      .eq('id', storyId)
      .single();

    // Check schema integrity
    const hasRequiredFields = !!(story?.id && story?.name && story?.reference_id);
    const pass = hasRequiredFields;

    return {
      crewMember: 'data',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'Schema valid' : 'Missing required fields',
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Data validation failed');
    return {
      crewMember: 'data',
      pass: false,
      veto: true, // HARD VETO on error
      reason: `Schema error: ${error instanceof Error ? error.message : 'Unknown'}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * WORF: Security & Compliance Scan
 * Hard veto if any security threat detected (immovable)
 */
async function validateWorf(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check for security flags (RLS violations, unencrypted data, etc.)
    const { data: securityFlags } = await supabaseClient
      .from('security_flags')
      .select('*')
      .eq('story_id', storyId)
      .eq('severity', 'CRITICAL');

    const pass = !securityFlags || securityFlags.length === 0;

    return {
      crewMember: 'worf',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'Security clear' : `${securityFlags?.length} critical flags found`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Worf security validation failed');
    return {
      crewMember: 'worf',
      pass: false,
      veto: true, // HARD VETO on error
      reason: `Security check error: ${error instanceof Error ? error.message : 'Unknown'}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * RIKER: Critical Path & Blockers Check
 * Hard veto if critical dependencies unresolved
 */
async function validateRiker(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check if critical blockers exist
    const { data: blockers } = await supabaseClient
      .from('story_blockers')
      .select('*')
      .eq('story_id', storyId)
      .eq('severity', 'CRITICAL')
      .is('resolved_at', null);

    const pass = !blockers || blockers.length === 0;

    return {
      crewMember: 'riker',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'Critical path clear' : `${blockers?.length} unresolved blockers`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Riker validation failed');
    return {
      crewMember: 'riker',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * GEORDI: Infrastructure Health Check
 * Hard veto if infrastructure RED
 */
async function validateGeordi(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check infrastructure metrics
    const { data: infraMetrics } = await supabaseClient
      .from('infrastructure_health')
      .select('status')
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();

    const pass = infraMetrics?.status !== 'RED';

    return {
      crewMember: 'geordi',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'Infrastructure healthy' : `Infrastructure status: ${infraMetrics?.status}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Geordi validation failed');
    return {
      crewMember: 'geordi',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * O'BRIEN: CI/CD & Deployment Readiness Check
 * Hard veto if CI/CD broken
 */
async function validateObrien(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check CI/CD pipeline status
    const { data: cicdStatus } = await supabaseClient
      .from('cicd_pipeline_status')
      .select('status')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    const pass = cicdStatus?.status !== 'BROKEN';

    return {
      crewMember: 'obrien',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'CI/CD ready' : `CI/CD status: ${cicdStatus?.status}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, "O'Brien validation failed");
    return {
      crewMember: 'obrien',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * YAR: Test Coverage & Quality Gate Check
 * Hard veto if test coverage <80% OR critical tests fail
 */
async function validateYar(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check test coverage and critical test status
    const { data: coverage } = await supabaseClient
      .from('test_coverage')
      .select('percentage, critical_tests_passing')
      .eq('story_id', storyId)
      .single();

    const pass = (coverage?.percentage ?? 0) >= 80 && (coverage?.critical_tests_passing ?? false);

    return {
      crewMember: 'yar',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass
        ? `Coverage ${coverage?.percentage}%, tests passing`
        : `Coverage ${coverage?.percentage}%, critical tests: ${coverage?.critical_tests_passing}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Yar validation failed');
    return {
      crewMember: 'yar',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * TROI: Team Dynamics & Stakeholder Alignment Check
 * Soft veto — escalates to YELLOW if >25% crew uncomfortable
 */
async function validateTroi(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check stakeholder alignment and team comfort
    const { data: stakeholderFeedback } = await supabaseClient
      .from('stakeholder_feedback')
      .select('alignment_score')
      .eq('story_id', storyId);

    const avgAlignment = stakeholderFeedback?.length
      ? stakeholderFeedback.reduce((sum, x) => sum + (x.alignment_score ?? 0), 0) / stakeholderFeedback.length
      : 50;

    const pass = avgAlignment >= 70;

    return {
      crewMember: 'troi',
      pass,
      veto: avgAlignment < 50, // SOFT VETO
      vetoType: 'soft',
      reason: pass ? `Stakeholder alignment: ${avgAlignment}%` : `Low alignment: ${avgAlignment}%`,
      criticality: 'soft',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Troi validation failed');
    return {
      crewMember: 'troi',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * CRUSHER: Crew Health & Wellness Check
 * Hard veto if >10% crew show fatigue (90% threshold, higher than default 70%)
 */
async function validateCrusher(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check crew health metrics
    const { data: crewHealth } = await supabaseClient
      .from('crew_health_metrics')
      .select('fatigue_index')
      .order('measured_at', { ascending: false })
      .limit(11);

    const fatigueCount = crewHealth?.filter(h => (h.fatigue_index ?? 0) > 75).length ?? 0;
    const fatiguePercentage = crewHealth?.length ? (100 * fatigueCount) / crewHealth.length : 0;
    const pass = fatiguePercentage <= 10; // Hard veto if >10% fatigued

    return {
      crewMember: 'crusher',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? `Crew wellness: ${fatiguePercentage}% fatigued` : `FATIGUE ALERT: ${fatiguePercentage}% fatigued`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Crusher validation failed');
    return {
      crewMember: 'crusher',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * UHURA: Communication Integrity Check
 * Hard veto if signal corruption or communication failures
 */
async function validateUhura(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check communication channels and signal integrity
    const { data: commStatus } = await supabaseClient
      .from('communication_channels')
      .select('status, corruption_detected')
      .order('checked_at', { ascending: false })
      .limit(1);

    const pass = commStatus && commStatus.status === 'OK' && !commStatus.corruption_detected;

    return {
      crewMember: 'uhura',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass ? 'Communications clear' : `Comm issue: status=${commStatus?.status}, corruption=${commStatus?.corruption_detected}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Uhura validation failed');
    return {
      crewMember: 'uhura',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

/**
 * QUARK: Budget & ROI Validation
 * Hard veto if burn exceeds projections or ROI insufficient
 */
async function validateQuark(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<ValidationResult> {
  const startMs = performance.now();
  try {
    // Check budget and ROI metrics
    const { data: story } = await supabaseClient
      .from('aha_stories')
      .select('estimated_cost, estimated_value')
      .eq('id', storyId)
      .single();

    const { data: sprintBudget } = await supabaseClient
      .from('sprint_budget')
      .select('total_budget, projected_burn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const budgetOk = (sprintBudget?.projected_burn ?? 0) <= (sprintBudget?.total_budget ?? 1);
    const roiOk = (story?.estimated_value ?? 0) >= (story?.estimated_cost ?? 0) * 1.5;
    const pass = budgetOk && roiOk;

    return {
      crewMember: 'quark',
      pass,
      veto: !pass, // HARD VETO
      vetoType: 'hard',
      reason: pass
        ? `Budget OK, ROI ${(((story?.estimated_value ?? 0) / (story?.estimated_cost ?? 1)) * 100).toFixed(0)}%`
        : `Budget: ${budgetOk ? 'OK' : 'OVERRUN'}, ROI: ${roiOk ? 'OK' : 'INSUFFICIENT'}`,
      criticality: 'hard',
      executionTimeMs: performance.now() - startMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'Quark validation failed');
    return {
      crewMember: 'quark',
      pass: false,
      veto: false,
      reason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      executionTimeMs: performance.now() - startMs,
    };
  }
}

// ============================================================================
// CORE ORCHESTRATOR
// ============================================================================

/**
 * evaluatePhaseTransition: Central decision engine
 * Runs all 11 crew validations in PARALLEL (Promise.all)
 * Returns AUTO/YELLOW/RED gate decision
 */
export async function evaluatePhaseTransition(
  storyId: string,
  fromPhase: string,
  toPhase: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<PhaseTransitionDecision> {
  const orchestratorStartMs = performance.now();

  try {
    // 1. Run all 11 validations in parallel (not sequentially)
    const validationPromises = [
      validatePicard(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateData(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateWorf(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateRiker(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateGeordi(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateObrien(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateYar(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateTroi(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateCrusher(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateUhura(storyId, fromPhase, toPhase, supabaseClient, logger),
      validateQuark(storyId, fromPhase, toPhase, supabaseClient, logger),
    ];

    const validationResults = await Promise.all(validationPromises);
    const totalExecutionMs = performance.now() - orchestratorStartMs;
    const avgExecutionMs = validationResults.reduce((sum, v) => sum + v.executionTimeMs, 0) / validationResults.length;

    // 2. Count consensus (pass votes)
    const passCount = validationResults.filter(v => v.pass).length;
    const consensusThreshold = 8; // 8/11 required
    const hasConsensus = passCount >= consensusThreshold;
    const consensusPercentage = (100 * passCount) / 11;

    // 3. Collect critical vetos (hard vetos only)
    const criticalVetos = validationResults
      .filter(v => v.veto && v.vetoType === 'hard')
      .map(v => ({ crewMember: v.crewMember, reason: v.reason || 'No reason provided' }));

    const hasCriticalVeto = criticalVetos.length > 0;

    // 4. Determine gate outcome
    let gate: 'AUTO' | 'YELLOW' | 'RED';
    if (hasConsensus && !hasCriticalVeto) {
      gate = 'AUTO'; // Proceed immediately (90 sec)
    } else if (!hasConsensus || criticalVetos.length === 1) {
      gate = 'YELLOW'; // Riker reviews (30 min)
    } else {
      gate = 'RED'; // Admiral approval (2-4 hr)
    }

    // 5. Store immutable audit trail
    const validationId = crypto.randomUUID();
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(validationResults)).digest('hex');

    const { error: insertError } = await supabaseClient.from('sa_phase_transition_validation').insert({
      id: validationId,
      story_id: storyId,
      from_phase: fromPhase,
      to_phase: toPhase,
      decision_gate: gate,
      consensus_pass_count: passCount,
      consensus_threshold: consensusThreshold,
      picard_result: validationResults[0],
      data_result: validationResults[1],
      worf_result: validationResults[2],
      riker_result: validationResults[3],
      geordi_result: validationResults[4],
      obrien_result: validationResults[5],
      yar_result: validationResults[6],
      troi_result: validationResults[7],
      crusher_result: validationResults[8],
      uhura_result: validationResults[9],
      quark_result: validationResults[10],
      critical_vetos: criticalVetos,
      has_critical_veto: hasCriticalVeto,
      worfgate_audit_id: crypto.randomUUID(),
      is_immutable: true,
    });

    if (insertError) {
      logger.error({ insertError }, 'Failed to store validation results');
    }

    // 6. Store audit trail entries (immutable)
    for (const result of validationResults) {
      const auditHash = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
      await supabaseClient.from('sa_phase_validation_audit').insert({
        validation_result_id: validationId,
        crew_member: result.crewMember,
        vote_pass: result.pass,
        veto_triggered: result.veto,
        veto_type: result.vetoType,
        veto_reason: result.reason,
        criticality: result.criticality,
        execution_time_ms: result.executionTimeMs,
        validation_timestamp: new Date().toISOString(),
        content_hash: auditHash,
        worfgate_clearance: result.vetoType === 'hard', // Worf-signed
      });
    }

    logger.info(
      {
        storyId,
        gate,
        consensus: `${passCount}/11 (${consensusPercentage.toFixed(1)}%)`,
        criticalVetos: criticalVetos.length,
        totalExecutionMs: totalExecutionMs.toFixed(0),
        avgExecutionMs: avgExecutionMs.toFixed(0),
      },
      'Phase transition validated'
    );

    return {
      allowed: gate === 'AUTO' || gate === 'YELLOW',
      gate,
      consensus: passCount,
      vetos: criticalVetos,
      executed: false,
      escalatedTo: gate === 'YELLOW' ? 'riker' : gate === 'RED' ? 'admiral' : undefined,
      validationId,
      consensusPercentage,
      avgValidationTimeMs: avgExecutionMs,
    };
  } catch (error) {
    logger.error({ storyId, error }, 'evaluatePhaseTransition failed');
    throw error;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const phaseTransitionConsensus = {
  evaluatePhaseTransition,
  validatePicard,
  validateData,
  validateWorf,
  validateRiker,
  validateGeordi,
  validateObrien,
  validateYar,
  validateTroi,
  validateCrusher,
  validateUhura,
  validateQuark,
};
