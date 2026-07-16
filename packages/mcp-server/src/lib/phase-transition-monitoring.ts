/**
 * Phase Transition Monitoring Dashboard
 * 
 * Real-time queries for AUTO/YELLOW/RED gate metrics
 * Updates 5-minute sampling interval (cost-optimized per Quark)
 * 
 * Owner: Geordi (Infrastructure) + Quark (Finance)
 * Deployed: 2026-07-16
 */

import { createClient } from '@supabase/supabase-js';
import { Logger } from 'pino';

export interface PhaseTransitionMetrics {
  totalTransitions: number;
  autoGateCount: number;
  autoGatePercentage: number;
  yellowGateCount: number;
  yellowGatePercentage: number;
  redGateCount: number;
  redGatePercentage: number;
  avgValidationTimeMs: number;
  maxValidationTimeMs: number;
  minValidationTimeMs: number;
  vetoCount: number;
  postTransitionVetosDetected: number;
  rollbackCount: number;
  crewParticipationRate: number;
  windowStart: string;
  windowEnd: string;
  falseConsensusRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Get real-time metrics (last 7 days)
 */
export async function getPhaseTransitionMetrics7d(
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<PhaseTransitionMetrics | null> {
  try {
    const { data, error } = await supabaseClient.rpc('get_auto_gate_percentage_7d');

    if (error) {
      logger.error({ error }, 'Failed to fetch metrics');
      return null;
    }

    if (!data || data.length === 0) {
      return {
        totalTransitions: 0,
        autoGateCount: 0,
        autoGatePercentage: 0,
        yellowGateCount: 0,
        yellowGatePercentage: 0,
        redGateCount: 0,
        redGatePercentage: 0,
        avgValidationTimeMs: 0,
        maxValidationTimeMs: 0,
        minValidationTimeMs: 0,
        vetoCount: 0,
        postTransitionVetosDetected: 0,
        rollbackCount: 0,
        crewParticipationRate: 0,
        windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date().toISOString(),
        falseConsensusRiskLevel: 'LOW',
      };
    }

    const [metrics] = data;

    return {
      totalTransitions: metrics.total_transitions,
      autoGateCount: metrics.auto_gate_count,
      autoGatePercentage: metrics.auto_percentage,
      yellowGateCount: metrics.yellow_gate_count,
      yellowGatePercentage: 100 - metrics.auto_percentage - (metrics.red_gate_count / metrics.total_transitions) * 100,
      redGateCount: metrics.red_gate_count,
      redGatePercentage: (metrics.red_gate_count / metrics.total_transitions) * 100,
      avgValidationTimeMs: metrics.avg_validation_time_ms,
      maxValidationTimeMs: metrics.max_validation_time_ms,
      minValidationTimeMs: metrics.min_validation_time_ms,
      vetoCount: metrics.veto_count,
      postTransitionVetosDetected: metrics.post_transition_vetos,
      rollbackCount: metrics.rollback_count,
      crewParticipationRate: metrics.crew_participation_rate,
      windowStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      windowEnd: new Date().toISOString(),
      falseConsensusRiskLevel:
        metrics.post_transition_vetos > 5 ? 'HIGH' : metrics.post_transition_vetos > 2 ? 'MEDIUM' : 'LOW',
    };
  } catch (error) {
    logger.error({ error }, 'getPhaseTransitionMetrics7d failed');
    throw error;
  }
}

/**
 * Get most common veto triggers (last 30 days)
 */
export async function getCommonVetoTriggers(
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<Array<{ crewMember: string; triggerCount: number; percentage: number }> | null> {
  try {
    const { data, error } = await supabaseClient
      .from('sa_phase_validation_audit')
      .select('crew_member')
      .eq('veto_triggered', true)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger.error({ error }, 'Failed to fetch veto triggers');
      return null;
    }

    const triggers = data?.reduce(
      (acc, row) => {
        acc[row.crew_member] = (acc[row.crew_member] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const total = Object.values(triggers).reduce((sum, count) => sum + count, 0);

    return Object.entries(triggers).map(([crewMember, triggerCount]) => ({
      crewMember,
      triggerCount,
      percentage: (100 * triggerCount) / total,
    }));
  } catch (error) {
    logger.error({ error }, 'getCommonVetoTriggers failed');
    throw error;
  }
}

/**
 * Detect false consensus (vetos AFTER transition)
 */
export async function detectFalseConsensus(
  storyId: string,
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<boolean> {
  try {
    const { data: validationData } = await supabaseClient
      .from('sa_phase_transition_validation')
      .select('id, executed_at')
      .eq('story_id', storyId)
      .order('validated_at', { ascending: false })
      .limit(1)
      .single();

    if (!validationData?.executed_at) return false;

    const { data: postTransitionVetos, error } = await supabaseClient
      .from('sa_phase_validation_audit')
      .select('*')
      .eq('validation_result_id', validationData.id)
      .eq('veto_triggered', true)
      .gt('created_at', validationData.executed_at);

    if (error) {
      logger.error({ error }, 'Failed to detect false consensus');
      return false;
    }

    const hasFalseConsensus = (postTransitionVetos?.length ?? 0) > 0;

    if (hasFalseConsensus) {
      logger.warn(
        { storyId, vetoCount: postTransitionVetos?.length },
        'FALSE CONSENSUS DETECTED: Vetos appeared after transition'
      );
    }

    return hasFalseConsensus;
  } catch (error) {
    logger.error({ error }, 'detectFalseConsensus failed');
    throw error;
  }
}

/**
 * Get decision authority distribution (last 30 days)
 */
export async function getDecisionAuthorityDistribution(
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{
  AUTO: number;
  YELLOW: number;
  RED: number;
  createdAt: string;
}> {
  try {
    const { data, error } = await supabaseClient
      .from('sa_phase_transition_validation')
      .select('decision_gate')
      .gte('validated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      logger.error({ error }, 'Failed to fetch gate distribution');
      return { AUTO: 0, YELLOW: 0, RED: 0, createdAt: new Date().toISOString() };
    }

    const distribution = {
      AUTO: 0,
      YELLOW: 0,
      RED: 0,
    };

    data?.forEach(row => {
      distribution[row.decision_gate as keyof typeof distribution]++;
    });

    return {
      ...distribution,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error }, 'getDecisionAuthorityDistribution failed');
    throw error;
  }
}

/**
 * Health check: Is consensus system healthy?
 */
export async function getConsensusSystemHealth(
  supabaseClient: ReturnType<typeof createClient>,
  logger: Logger
): Promise<{
  healthy: boolean;
  autoGatePercentage: number;
  avgValidationTime: number;
  falseConsensusRate: number;
  recommendation: 'PROCEED' | 'MONITOR' | 'ESCALATE';
}> {
  try {
    const metrics = await getPhaseTransitionMetrics7d(supabaseClient, logger);

    if (!metrics) {
      return {
        healthy: true,
        autoGatePercentage: 0,
        avgValidationTime: 0,
        falseConsensusRate: 0,
        recommendation: 'PROCEED', // No data yet, proceed with caution
      };
    }

    const falseConsensusRate = metrics.totalTransitions
      ? (100 * metrics.postTransitionVetosDetected) / metrics.totalTransitions
      : 0;

    const healthy =
      metrics.autoGatePercentage >= 75 &&
      metrics.avgValidationTimeMs <= 120000 && // 120 seconds max
      falseConsensusRate < 5 &&
      metrics.redGatePercentage < 10;

    let recommendation: 'PROCEED' | 'MONITOR' | 'ESCALATE' = 'PROCEED';
    if (falseConsensusRate > 10 || metrics.redGatePercentage > 20) {
      recommendation = 'ESCALATE';
    } else if (metrics.autoGatePercentage < 60 || metrics.avgValidationTimeMs > 90000) {
      recommendation = 'MONITOR';
    }

    return {
      healthy,
      autoGatePercentage: metrics.autoGatePercentage,
      avgValidationTime: metrics.avgValidationTimeMs,
      falseConsensusRate,
      recommendation,
    };
  } catch (error) {
    logger.error({ error }, 'getConsensusSystemHealth failed');
    throw error;
  }
}
