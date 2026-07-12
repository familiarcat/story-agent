/**
 * Crew Status Display — VSCode chat formatting for live crew progress.
 *
 * Renders crew execution state as markdown cards with real-time updates.
 * Cards group by crew member and update in place (append-only to avoid chat spam).
 * Escalations are highlighted prominently with immediate alerts.
 */

export interface CrewStreamEvent {
  crew_id: string;
  task_id: string;
  iteration: number;
  status: 'start' | 'progress' | 'complete' | 'escalation' | 'error';
  action_description: string;
  metrics?: Record<string, number | string>;
  escalation_reason?: string;
  proposed_fix?: string;
  result?: string;
  timestamp: string;
}

export interface CrewStatusCard {
  crew_id: string;
  task_id: string;
  current_iteration: number;
  status: 'idle' | 'in_progress' | 'complete' | 'escalated' | 'error';
  action: string;
  elapsed_seconds: number;
  last_update: Date;
  is_collapsed: boolean;
  update_count: number;
  escalation_reason?: string;
  proposed_fix?: string;
}

/**
 * Format the header banner for live crew status display.
 * Shows mission name, elapsed time, and refresh rate.
 */
export function formatCrewStatusHeader(start_time: Date): string {
  const elapsed = Math.floor((Date.now() - start_time.getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const padSecs = String(secs).padStart(2, '0');
  return `
🎯 **Section 31 Pre-Flight Validation — LIVE**
Teams A/B/C/D executing in parallel • Elapsed: **${mins}m ${padSecs}s** • Auto-refresh every 2s
`.trim();
}

/**
 * Format a single crew status card.
 * Shows: crew emoji | name | task | iteration | action | elapsed | status badge
 */
export function formatCrewCard(crew: CrewStatusCard): string {
  const emoji = getCrewEmoji(crew.crew_id);
  const statusBadge = getStatusBadge(crew.status);

  // Human-readable task name
  const taskName = crew.task_id
    .replace(/team_[a-d]_/i, '')
    .replace(/_/g, ' ')
    .toUpperCase();

  const elapsed_min = Math.floor(crew.elapsed_seconds / 60);
  const elapsed_sec = crew.elapsed_seconds % 60;
  const padSec = String(elapsed_sec).padStart(2, '0');

  const collapsed_note = crew.is_collapsed && crew.update_count > 3 ? ` (${crew.update_count} updates)` : '';

  return `${emoji} **${crew.crew_id.toUpperCase()}** | ${taskName} | Iter ${crew.current_iteration} | ${crew.action} | ⏱️ ${elapsed_min}m ${padSec}s | ${statusBadge}${collapsed_note}`;
}

/**
 * Format an escalation alert — highlighted prominently.
 * Called when a crew event has status === 'escalation'.
 */
export function formatEscalationAlert(event: CrewStreamEvent): string {
  const emoji = getCrewEmoji(event.crew_id);
  const taskName = event.task_id
    .replace(/team_[a-d]_/i, '')
    .replace(/_/g, ' ')
    .toUpperCase();

  return `
⚠️ **ESCALATION ALERT** — ${emoji} ${event.crew_id.toUpperCase()}
🎯 Task: ${taskName} | Iteration ${event.iteration}
❌ Issue: ${event.escalation_reason || event.action_description}
💡 Proposed Fix: ${event.proposed_fix || 'Investigating...'}
🖖 Status: **Picard reviewing with team**
`.trim();
}

/**
 * Format the completion summary when all teams finish.
 * Shows final results per crew and next steps.
 */
export function formatCompletionSummary(
  crews: Map<string, CrewStatusCard>,
  start_time: Date,
  escalation_count: number = 0
): string {
  const elapsed = Math.floor((Date.now() - start_time.getTime()) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const padSecs = String(secs).padStart(2, '0');

  const results = Array.from(crews.values())
    .map(crew => {
      const statusEmoji = crew.status === 'complete' ? '✅' :
                          crew.status === 'escalated' ? '⚠️' :
                          crew.status === 'error' ? '❌' : '🔄';
      const statusLabel = crew.status === 'complete' ? 'PASS' :
                          crew.status === 'escalated' ? 'ESCALATED' :
                          crew.status === 'error' ? 'ERROR' : 'IN PROGRESS';
      return `  ${statusEmoji} **${crew.crew_id.toUpperCase()}** — ${crew.action} | ${statusLabel}`;
    })
    .join('\n');

  const escalation_line = escalation_count > 0
    ? `⚠️  **${escalation_count} escalation${escalation_count > 1 ? 's' : ''} required Picard review**\n`
    : '';

  return `
✅ **Section 31 Pre-Flight Validation — COMPLETE**
Total Elapsed: **${mins}m ${padSecs}s**

${results}

${escalation_line}
📊 **PICARD SYNTHESIZING DECISION...**
`.trim();
}

/**
 * Format a status update line (minimal).
 * Used when displaying a stream of updates in real time.
 */
export function formatStatusUpdateLine(event: CrewStreamEvent): string {
  const emoji = getCrewEmoji(event.crew_id);
  const statusIcon = getStatusIcon(event.status);

  const taskName = event.task_id
    .replace(/team_[a-d]_/i, '')
    .replace(/_/g, ' ');

  return `${statusIcon} ${emoji} ${event.crew_id} | ${taskName} | Iter ${event.iteration} | ${event.action_description}`;
}

/**
 * Get the emoji for a crew member by ID.
 */
function getCrewEmoji(crew_id: string): string {
  const emojis: { [key: string]: string } = {
    picard: '🖖',
    riker: '💼',
    data: '🤖',
    geordi: '🔧',
    worf: '⚔️',
    quark: '💰',
    troi: '💭',
    crusher: '⚕️',
    guinan: '🍷',
    la_forge: '🔧',
    obrien: '🛠️',
  };
  return emojis[crew_id.toLowerCase()] || '👤';
}

/**
 * Get the status badge emoji.
 */
function getStatusBadge(status: CrewStatusCard['status']): string {
  const badges: { [key: string]: string } = {
    idle: '⏸️ IDLE',
    in_progress: '🔄 IN PROGRESS',
    complete: '✅ COMPLETE',
    escalated: '⚠️ ESCALATED',
    error: '❌ ERROR',
  };
  return badges[status] || '❓ UNKNOWN';
}

/**
 * Get the status icon for an event.
 */
function getStatusIcon(status: CrewStreamEvent['status']): string {
  const icons: { [key: string]: string } = {
    start: '▶️',
    progress: '⏳',
    complete: '✅',
    escalation: '⚠️',
    error: '❌',
  };
  return icons[status] || '❓';
}

/**
 * Merge a new event into the crew status map.
 * Updates iteration, action, elapsed time, and status.
 */
export function mergeCrewEvent(
  crews: Map<string, CrewStatusCard>,
  event: CrewStreamEvent,
  start_time: Date
): void {
  const crew_id = event.crew_id;

  if (!crews.has(crew_id)) {
    crews.set(crew_id, {
      crew_id,
      task_id: event.task_id,
      current_iteration: event.iteration,
      status: 'idle',
      action: event.action_description,
      elapsed_seconds: 0,
      last_update: new Date(),
      is_collapsed: false,
      update_count: 0,
      escalation_reason: event.escalation_reason,
      proposed_fix: event.proposed_fix,
    });
  }

  const card = crews.get(crew_id)!;
  card.task_id = event.task_id;
  card.current_iteration = Math.max(card.current_iteration, event.iteration);
  card.action = event.action_description;
  card.elapsed_seconds = Math.floor((Date.now() - start_time.getTime()) / 1000);
  card.last_update = new Date();
  card.update_count = (card.update_count || 0) + 1;
  card.escalation_reason = event.escalation_reason;
  card.proposed_fix = event.proposed_fix;

  // Map event status to card status
  if (event.status === 'start') {
    card.status = 'in_progress';
  } else if (event.status === 'progress') {
    card.status = 'in_progress';
  } else if (event.status === 'complete') {
    card.status = 'complete';
  } else if (event.status === 'escalation') {
    card.status = 'escalated';
  } else if (event.status === 'error') {
    card.status = 'error';
  }

  // Collapse card after 3+ updates to reduce visual noise
  if (card.update_count > 3) {
    card.is_collapsed = true;
  }
}

/**
 * Render all crew cards as markdown.
 * Returns grouped crew status lines.
 */
export function renderCrewCards(crews: Map<string, CrewStatusCard>): string {
  // Sort by crew_id for consistent display
  const sorted = Array.from(crews.values()).sort((a, b) => a.crew_id.localeCompare(b.crew_id));
  return sorted.map(crew => formatCrewCard(crew)).join('\n');
}
