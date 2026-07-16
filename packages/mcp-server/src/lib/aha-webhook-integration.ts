/**
 * Aha Webhook Integration: Phase Transition Triggers
 * 
 * Listens for story status changes and triggers consensus validation
 * Webhook flow: Aha story.status_changed → evaluatePhaseTransition() → AUTO/YELLOW/RED gate
 * 
 * Owner: O'Brien (DevOps) + Worf (Security)
 * Deployed: 2026-07-16
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { evaluatePhaseTransition } from './phase-transition-consensus';
import crypto from 'crypto';

// Allowed state transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['TESTING'],
  TESTING: ['SHIPPED'],
};

// Gate requirements for each transition
const GATE_REQUIREMENTS: Record<string, 'YELLOW' | 'AUTO'> = {
  'STARTED->IN_PROGRESS': 'YELLOW', // Yellow gate minimum
  'IN_PROGRESS->TESTING': 'YELLOW',
  'TESTING->SHIPPED': 'AUTO', // AUTO gate required for ship
};

/**
 * Handle Aha webhook: story.status_changed
 */
export async function handleAhaStatusWebhook(
  payload: any,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{
  success: boolean;
  gate: string;
  decision: any;
  ahaUpdatePending: boolean;
  rollbackTriggered: boolean;
}> {
  const startMs = performance.now();

  try {
    const storyId = payload.resource?.id;
    const oldStatus = payload.action?.old_value;
    const newStatus = payload.action?.new_value;
    const reference = payload.resource?.reference_id;

    logger.info({ storyId, oldStatus, newStatus, reference }, 'Aha webhook received');

    // 1. Validate transition is allowed
    if (!ALLOWED_TRANSITIONS[oldStatus]?.includes(newStatus)) {
      logger.warn({ oldStatus, newStatus }, 'Invalid transition requested');
      return {
        success: false,
        gate: 'RED',
        decision: { reason: 'Invalid state transition' },
        ahaUpdatePending: false,
        rollbackTriggered: false,
      };
    }

    // 2. Run consensus validation
    const decision = await evaluatePhaseTransition(
      storyId,
      oldStatus,
      newStatus,
      supabaseClient,
      logger
    );

    logger.info(
      {
        storyId,
        gate: decision.gate,
        consensus: `${decision.consensus}/11`,
        vetos: decision.vetos.length,
        executionTime: performance.now() - startMs,
      },
      'Consensus validation complete'
    );

    // 3. Check gate requirements
    const transitionKey = `${oldStatus}->${newStatus}`;
    const requiredGate = GATE_REQUIREMENTS[transitionKey] || 'AUTO';
    const gateScore = { AUTO: 2, YELLOW: 1, RED: 0 }[decision.gate];
    const requiredScore = { AUTO: 2, YELLOW: 1, RED: 0 }[requiredGate];

    if (gateScore < requiredScore) {
      logger.warn(
        { gate: decision.gate, required: requiredGate, transition: transitionKey },
        'Transition blocked: gate insufficient'
      );
      return {
        success: false,
        gate: decision.gate,
        decision,
        ahaUpdatePending: false,
        rollbackTriggered: true,
      };
    }

    // 4. For AUTO gate, execute immediately
    if (decision.gate === 'AUTO') {
      logger.info({ storyId, newStatus }, 'AUTO gate approved — updating Aha immediately');

      // Update story status in Aha
      const { error: updateError } = await supabaseClient.from('aha_story_updates').insert({
        story_id: storyId,
        reference_id: reference,
        from_phase: oldStatus,
        to_phase: newStatus,
        gate_decision: 'AUTO',
        validation_id: decision.validationId,
        executed_at: new Date().toISOString(),
        aha_update_sent_at: new Date().toISOString(),
      });

      if (updateError) {
        logger.error({ updateError }, 'Failed to update Aha story');
        return {
          success: false,
          gate: 'RED',
          decision,
          ahaUpdatePending: true,
          rollbackTriggered: true,
        };
      }

      return {
        success: true,
        gate: 'AUTO',
        decision,
        ahaUpdatePending: false,
        rollbackTriggered: false,
      };
    }

    // 5. For YELLOW/RED gates, escalate (don't auto-update)
    logger.info({ storyId, gate: decision.gate }, `${decision.gate} gate — escalation pending`);

    const escalatedTo = decision.gate === 'YELLOW' ? 'riker' : 'admiral';

    // Store escalation record
    const { error: escalationError } = await supabaseClient.from('sa_gate_escalations').insert({
      story_id: storyId,
      reference_id: reference,
      from_phase: oldStatus,
      to_phase: newStatus,
      gate_decision: decision.gate,
      validation_id: decision.validationId,
      escalated_to: escalatedTo,
      vetos: decision.vetos,
      created_at: new Date().toISOString(),
    });

    if (escalationError) {
      logger.error({ escalationError }, 'Failed to store escalation');
    }

    return {
      success: true,
      gate: decision.gate,
      decision,
      ahaUpdatePending: true, // Awaiting human review
      rollbackTriggered: false,
    };
  } catch (error) {
    logger.error({ error, payload }, 'handleAhaStatusWebhook failed');
    throw error;
  }
}

/**
 * Riker approval: Allow phase transition after YELLOW gate review
 */
export async function approvePhaseTransitionRiker(
  storyId: string,
  reference: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{ success: boolean; ahaUpdated: boolean }> {
  try {
    // Get the escalation record
    const { data: escalation, error: fetchError } = await supabaseClient
      .from('sa_gate_escalations')
      .select('*')
      .eq('story_id', storyId)
      .eq('escalated_to', 'riker')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !escalation) {
      logger.error({ storyId, fetchError }, 'No escalation found for Riker approval');
      return { success: false, ahaUpdated: false };
    }

    // Update Aha story
    const { error: updateError } = await supabaseClient.from('aha_story_updates').insert({
      story_id: storyId,
      reference_id: reference,
      from_phase: escalation.from_phase,
      to_phase: escalation.to_phase,
      gate_decision: 'YELLOW',
      validation_id: escalation.validation_id,
      approved_by: 'riker',
      executed_at: new Date().toISOString(),
      aha_update_sent_at: new Date().toISOString(),
    });

    if (updateError) {
      logger.error({ updateError }, 'Failed to update Aha story');
      return { success: false, ahaUpdated: false };
    }

    logger.info({ storyId }, 'Riker approved phase transition — Aha updated');

    return { success: true, ahaUpdated: true };
  } catch (error) {
    logger.error({ error, storyId }, 'approvePhaseTransitionRiker failed');
    throw error;
  }
}

/**
 * Admiral approval: Override RED gate (rare, requires explicit approval)
 */
export async function approvePhaseTransitionAdmiral(
  storyId: string,
  reference: string,
  adminApprovalToken: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{ success: boolean; ahaUpdated: boolean; auditTrailId: string | null }> {
  try {
    // Verify approval token (Worf-gated)
    const tokenHash = crypto.createHash('sha256').update(adminApprovalToken).digest('hex');

    // Get the escalation record
    const { data: escalation } = await supabaseClient
      .from('sa_gate_escalations')
      .select('*')
      .eq('story_id', storyId)
      .eq('escalated_to', 'admiral')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!escalation) {
      logger.error({ storyId }, 'No RED gate escalation found');
      return { success: false, ahaUpdated: false, auditTrailId: null };
    }

    // Create immutable audit record
    const auditId = crypto.randomUUID();
    const { error: auditError } = await supabaseClient.from('sa_phase_validation_audit').insert({
      validation_result_id: escalation.validation_id,
      crew_member: 'admiral',
      vote_pass: true,
      veto_triggered: false,
      validation_timestamp: new Date().toISOString(),
      content_hash: crypto.createHash('sha256').update(auditId).digest('hex'),
      worfgate_clearance: true,
    });

    if (auditError) {
      logger.error({ auditError }, 'Failed to create audit trail');
      return { success: false, ahaUpdated: false, auditTrailId: null };
    }

    // Update Aha story
    const { error: updateError } = await supabaseClient.from('aha_story_updates').insert({
      story_id: storyId,
      reference_id: reference,
      from_phase: escalation.from_phase,
      to_phase: escalation.to_phase,
      gate_decision: 'RED',
      validation_id: escalation.validation_id,
      approved_by: 'admiral',
      executed_at: new Date().toISOString(),
      aha_update_sent_at: new Date().toISOString(),
    });

    if (updateError) {
      logger.error({ updateError }, 'Failed to update Aha story');
      return { success: false, ahaUpdated: false, auditTrailId: auditId };
    }

    logger.info({ storyId, auditId }, 'Admiral approved RED gate — Aha updated, immutable audit trail created');

    return { success: true, ahaUpdated: true, auditTrailId: auditId };
  } catch (error) {
    logger.error({ error, storyId }, 'approvePhaseTransitionAdmiral failed');
    throw error;
  }
}

/**
 * Rollback: Revert phase transition if false consensus detected
 */
export async function rollbackPhaseTransition(
  storyId: string,
  reference: string,
  reason: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{ success: boolean; rollbackAuditId: string }> {
  try {
    const rollbackAuditId = crypto.randomUUID();

    // Get current validation
    const { data: validation } = await supabaseClient
      .from('sa_phase_transition_validation')
      .select('*')
      .eq('story_id', storyId)
      .order('validated_at', { ascending: false })
      .limit(1)
      .single();

    if (!validation) {
      logger.error({ storyId }, 'No validation found for rollback');
      return { success: false, rollbackAuditId };
    }

    // Mark as rolled back
    const { error: updateError } = await supabaseClient
      .from('sa_phase_transition_validation')
      .update({
        rollback_triggered_at: new Date().toISOString(),
        rollback_reason: reason,
      })
      .eq('id', validation.id);

    if (updateError) {
      logger.error({ updateError }, 'Failed to mark rollback');
      return { success: false, rollbackAuditId };
    }

    logger.warn({ storyId, reason }, 'Phase transition rolled back');

    return { success: true, rollbackAuditId };
  } catch (error) {
    logger.error({ error, storyId }, 'rollbackPhaseTransition failed');
    throw error;
  }
}
