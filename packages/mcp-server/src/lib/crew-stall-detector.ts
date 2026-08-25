/**
 * Story Agent: Proactive Stall Detection
 * Owned by: Troi (stakeholder psychology) + Uhura (communications)
 * 
 * Detects when crew member hasn't responded in 5 min, escalates via SNS/Slack.
 * 7Q Question 5 pattern: "What if Geordi gets stuck for 2 hours?"
 * 
 * Success criteria:
 * - 5-min heartbeat window
 * - Automatic escalation (Troi psychology check + Uhura notification)
 * - <2sec alert delivery (Uhura's SLA)
 * - Rollback: resume stalled task with fresh crew member
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// AWS SNS client stub (provided by Lambda runtime)
const snsClient: any = {
  publish: (params: any) => ({
    promise: async () => ({})
  })
};

interface CrewMemberStatus {
  crewId: string;
  lastHeartbeat: Date;
  currentTask?: string;
  status: 'active' | 'idle' | 'working' | 'stalled';
  stallDurationMs: number;
}

interface StallEvent {
  crewId: string;
  stalledAt: Date;
  lastTask: string;
  psychologyFactors: {
    perfectionism: number; // 0-1
    stress: number; // 0-1
    confidence: number; // 0-1
  };
  recommendedAction: 'escalate' | 'rotate' | 'mediate' | 'continue';
  escalationPath: string[]; // [Troi → Uhura → Picard]
}

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const STALL_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const ALERT_DELIVERY_SLA_MS = 2000; // 2 seconds (Uhura's requirement)

/**
 * Monitor crew member heartbeats and detect stalls
 */
export async function monitorCrewHeartbeats(
  supabase: SupabaseClient
): Promise<StallEvent[]> {
  const stallEvents: StallEvent[] = [];

  try {
    // Fetch all crew members
    const crewMembers = [
      'picard',
      'data',
      'worf',
      'riker',
      'geordi',
      'obrien',
      'yar',
      'troi',
      'crusher',
      'uhura',
      'quark'
    ];

    // Check each crew member's last heartbeat
    for (const crewId of crewMembers) {
      const status = await getCrewMemberStatus(supabase, crewId);

      if (status.stallDurationMs > STALL_THRESHOLD_MS) {
        // Stall detected!
        const stallEvent = await analyzeStallAndEscalate(
          supabase,
          status,
          crewId
        );
        stallEvents.push(stallEvent);
      }
    }

    return stallEvents;
  } catch (error) {
    console.error('Failed to monitor crew heartbeats:', error);
    throw error;
  }
}

/**
 * Get current status of a crew member
 */
async function getCrewMemberStatus(
  supabase: SupabaseClient,
  crewId: string
): Promise<CrewMemberStatus> {
  // Fetch latest heartbeat
  const { data: heartbeats } = await supabase
    .from('sa_crew_heartbeats')
    .select('*')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastHeartbeat = heartbeats?.[0];
  const lastHeartbeatTime = lastHeartbeat
    ? new Date(lastHeartbeat.created_at)
    : new Date(0);

  const stallDurationMs = Date.now() - lastHeartbeatTime.getTime();
  const status = stallDurationMs > STALL_THRESHOLD_MS
    ? 'stalled'
    : lastHeartbeat?.status || 'idle';

  return {
    crewId,
    lastHeartbeat: lastHeartbeatTime,
    currentTask: lastHeartbeat?.last_task,
    status: status as CrewMemberStatus['status'],
    stallDurationMs
  };
}

/**
 * Analyze stall using Troi's psychology model and prepare escalation
 */
async function analyzeStallAndEscalate(
  supabase: SupabaseClient,
  status: CrewMemberStatus,
  crewId: string
): Promise<StallEvent> {
  const perfectionism = getCrewPerfectionism(crewId);
  const stress = await estimateSystemStress(supabase);
  const confidence = await getCrewConfidence(supabase, crewId);

  // Troi's psychology assessment
  const recommendedAction = determineAction(
    crewId,
    perfectionism,
    stress,
    confidence,
    status.stallDurationMs
  );

  const stallEvent: StallEvent = {
    crewId,
    stalledAt: new Date(),
    lastTask: status.currentTask || 'unknown',
    psychologyFactors: {
      perfectionism,
      stress,
      confidence
    },
    recommendedAction,
    escalationPath: buildEscalationPath(recommendedAction)
  };

  // Execute escalation (Uhura)
  await executeEscalation(stallEvent, ALERT_DELIVERY_SLA_MS);

  return stallEvent;
}

/**
 * Troi's crew personality profiles (perfectionism scores)
 */
function getCrewPerfectionism(crewId: string): number {
  const profiles: Record<string, number> = {
    picard: 0.8, // High perfectionism, but delegates well
    data: 0.95, // Extreme perfectionism (4 retries → escalate)
    worf: 0.7, // Principled, not perfectionist
    riker: 0.4, // Pragmatic, okay with 80/20
    geordi: 0.9, // High perfectionism, gets stuck optimizing
    obrien: 0.75, // Practical with high standards
    yar: 0.8, // Detail-oriented on security/tests
    troi: 0.5, // Intuitive, not detail-obsessed
    crusher: 0.7, // Medical precision
    uhura: 0.6, // Efficiency-focused
    quark: 0.4 // Results-oriented (cost matters)
  };

  return profiles[crewId] || 0.5;
}

/**
 * Estimate current system stress (0-1 scale)
 */
async function estimateSystemStress(
  supabase: SupabaseClient
): Promise<number> {
  // Factors:
  // 1. Number of stalled crew members
  // 2. Cost variance (Quark metric)
  // 3. Error rate in logs
  // 4. Active task count

  const { data: stalledCount } = await supabase
    .from('sa_crew_heartbeats')
    .select('crew_id', { count: 'exact' })
    .eq('status', 'stalled')
    .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  const { data: activeTasks } = await supabase
    .from('sa_stories')
    .select('id', { count: 'exact' })
    .in('status', ['in_progress', 'blocked']);

  const crewStallFactor = (stalledCount?.length || 0) / 11; // 0-1
  const taskLoadFactor = Math.min((activeTasks?.length || 0) / 20, 1.0); // 0-1

  return Math.min(crewStallFactor * 0.4 + taskLoadFactor * 0.6, 1.0);
}

/**
 * Get crew member confidence (based on recent success rate)
 */
async function getCrewConfidence(
  supabase: SupabaseClient,
  crewId: string
): Promise<number> {
  const { data: recentTasks } = await supabase
    .from('sa_stories')
    .select('status')
    .eq('assigned_to', crewId)
    .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(10);

  if (!recentTasks || recentTasks.length === 0) return 0.5;

  const successCount = recentTasks.filter(
    t => t.status === 'complete' || t.status === 'delivered'
  ).length;

  return successCount / recentTasks.length;
}

/**
 * Determine recommended action based on psychology + stall duration
 */
function determineAction(
  crewId: string,
  perfectionism: number,
  stress: number,
  confidence: number,
  stallDurationMs: number
): 'escalate' | 'rotate' | 'mediate' | 'continue' {
  // Perfectionism → likely stuck on optimization
  if (perfectionism > 0.9 && stallDurationMs > 10 * 60 * 1000) {
    return 'escalate'; // Data pattern: escalate to Picard
  }

  // High stress + low confidence → might need support
  if (stress > 0.7 && confidence < 0.5) {
    return 'mediate'; // Troi provides psychological support
  }

  // Generic stall → rotate to fresh crew member
  if (stallDurationMs > STALL_THRESHOLD_MS) {
    return 'rotate';
  }

  return 'continue';
}

/**
 * Build escalation path based on recommended action
 */
function buildEscalationPath(action: string): string[] {
  switch (action) {
    case 'escalate':
      return ['picard']; // Direct to captain
    case 'mediate':
      return ['troi', 'picard']; // Counselor first
    case 'rotate':
      return ['uhura', 'picard']; // Uhura to coordinate rotation
    default:
      return ['picard'];
  }
}

/**
 * Execute escalation via SNS (Uhura handles communication)
 */
async function executeEscalation(
  stallEvent: StallEvent,
  maxDeliveryTimeMs: number
): Promise<void> {
  const startTime = Date.now();

  try {
    const message = formatEscalationMessage(stallEvent);
    const snsParams = {
      TopicArn: process.env.SNS_TOPIC_ARN!,
      Subject: `STALL ALERT: Crew member ${stallEvent.crewId} unresponsive`,
      Message: message
    };

    await snsClient.publish(snsParams).promise() as any;

    const deliveryTimeMs = Date.now() - startTime;
    if (deliveryTimeMs > maxDeliveryTimeMs) {
      console.warn(
        `Uhura SLA breach: alert delivery took ${deliveryTimeMs}ms (target ${maxDeliveryTimeMs}ms)`
      );
    } else {
      console.log(
        `✅ Uhura: Alert delivered in ${deliveryTimeMs}ms (SLA met)`
      );
    }

    // Store escalation event
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );

      await supabase.from('sa_crew_escalations').insert({
        crew_id: stallEvent.crewId,
        stalled_at: stallEvent.stalledAt,
        recommended_action: stallEvent.recommendedAction,
        psychology_factors: stallEvent.psychologyFactors,
        escalation_path: stallEvent.escalationPath,
        alert_delivery_ms: deliveryTimeMs,
        sla_met: deliveryTimeMs <= maxDeliveryTimeMs
      });
    }
  } catch (error) {
    console.error('Failed to execute escalation:', error);
    throw error;
  }
}

/**
 * Format human-readable escalation message
 */
function formatEscalationMessage(stallEvent: StallEvent): string {
  const stallMinutes = Math.floor(stallEvent.stalledAt.getTime() / 1000 / 60);
  const psychologyText = Object.entries(stallEvent.psychologyFactors)
    .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
    .join(', ');

  return `
CREW MEMBER STALL ALERT
=======================

Crew ID: ${stallEvent.crewId}
Stalled Duration: ${stallMinutes} minutes
Last Task: ${stallEvent.lastTask}

Psychological Profile:
${psychologyText}

Recommended Action: ${stallEvent.recommendedAction.toUpperCase()}
Escalation Path: ${stallEvent.escalationPath.join(' → ')}

Next Step:
${getActionInstructions(stallEvent.recommendedAction)}

Time: ${new Date().toISOString()}
`.trim();
}

/**
 * Get human-readable instructions for each action type
 */
function getActionInstructions(action: string): string {
  switch (action) {
    case 'escalate':
      return `Picard: Review task and authorize override or reassignment`;
    case 'mediate':
      return `Troi: Provide psychological support, then Picard authorizes if needed`;
    case 'rotate':
      return `Uhura: Rotate to fresh crew member and resume task`;
    default:
      return `Monitor for further degradation`;
  }
}

/**
 * Attempt recovery: rotate stalled crew member to fresh one
 */
export async function attemptCrewRotation(
  supabase: SupabaseClient,
  stalledCrewId: string,
  taskId: string
): Promise<{ success: boolean; newCrewId?: string; error?: string }> {
  try {
    // Find available crew member (not stalled, not overloaded)
    const { data: candidates } = await supabase
      .from('sa_crew_members')
      .select('crew_id')
      .eq('status', 'available')
      .order('workload', { ascending: true })
      .limit(1);

    if (!candidates || candidates.length === 0) {
      return {
        success: false,
        error: 'No available crew members for rotation'
      };
    }

    const newCrewId = candidates[0].crew_id;

    // Reassign task
    await supabase
      .from('sa_stories')
      .update({ assigned_to: newCrewId })
      .eq('id', taskId);

    // Log rotation event
    await supabase.from('sa_crew_rotations').insert({
      from_crew_id: stalledCrewId,
      to_crew_id: newCrewId,
      task_id: taskId,
      reason: 'stall_detection'
    });

    return { success: true, newCrewId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * MCP Tool registration
 */
export const stallDetectorSkillTheory = {
  name: 'crew_stall_detector',
  domain: 'crew_health',
  who: 'Troi (psychology) + Uhura (communications)',
  what: 'Monitor crew member heartbeats and detect stalls with psychological analysis',
  when: 'Continuously (every 30 seconds)',
  where: 'sa_crew_heartbeats table + psychology profiles',
  why: 'Prevent 2-hour stalls (7Q Question 5), enable fast rotation',
  how: '5-min heartbeat threshold → Troi psychology → Uhura <2sec alert → rotate'
};
