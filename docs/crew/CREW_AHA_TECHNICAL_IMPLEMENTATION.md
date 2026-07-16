# Crew Deliberation → Aha API Implementation Guide
## Technical Specifications and Code Patterns

**Purpose:** Detailed technical guide for implementing crew-driven story assignment and Aha API synchronization.

**Phase:** 3 (Implementation ready)

**Status:** Technical specification for MCP tools integration

---

## I. AHA API CLIENT SETUP

### A. AHA SDK Configuration

```typescript
// packages/mcp-server/src/lib/aha-client.ts

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface AhaStoryUpdate {
  story_id: string;
  updates: Record<string, any>;
  crew_member: string;
  action_type: 'self_assignment' | 'standup_update' | 'blocker_escalation' | 'validation_complete';
  memory_log_id?: string;
}

export class AhaClient {
  private client: AxiosInstance;
  private domain: string;
  private apiKey: string;

  constructor(domain: string, apiKey: string) {
    this.domain = domain;
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL: `https://${domain}.aha.io/api/v1`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Update story with crew deliberation data
   * Called when:
   * 1. Crew self-assigns (Observation Lounge consensus)
   * 2. Daily standup progress updates
   * 3. Blocker escalation (YELLOW gate)
   * 4. Story validation complete (Yar approval)
   */
  async updateStoryFromCrewAction(update: AhaStoryUpdate): Promise<any> {
    const { story_id, updates, crew_member, action_type, memory_log_id } = update;

    // Add audit metadata
    const enriched_updates = {
      ...updates,
      custom_fields: {
        ...(updates.custom_fields || {}),
        status_last_updated_by_crew: crew_member,
        status_last_update_timestamp: new Date().toISOString(),
        crew_action_type: action_type,
        ...(memory_log_id && { last_decision_log_id: memory_log_id }),
      },
    };

    try {
      const response = await this.client.put(
        `/stories/${story_id}`,
        { story: enriched_updates }
      );

      // Log successful update
      console.log(`✅ Aha story ${story_id} updated by ${crew_member}:`, enriched_updates);

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to update Aha story ${story_id}:`, error);
      throw error;
    }
  }

  /**
   * Fetch story details + custom fields
   * Used by crew member before starting work
   */
  async getStory(story_id: string): Promise<any> {
    const response = await this.client.get(`/stories/${story_id}`);
    return response.data.story;
  }

  /**
   * List all stories matching criteria
   * Used for Phase 3 planning (available stories for self-assignment)
   */
  async listStories(filters: {
    release_id?: string;
    status?: string;
    assigned_to?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters.release_id) params.append('release_id', filters.release_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);

    const response = await this.client.get('/stories', { params });
    return response.data.stories;
  }

  /**
   * Batch update multiple stories
   * Used when crew synchronizes multiple assignments after Observation Lounge
   */
  async batchUpdateStories(updates: AhaStoryUpdate[]): Promise<any[]> {
    return Promise.all(
      updates.map(update => this.updateStoryFromCrewAction(update))
    );
  }

  /**
   * Create webhook listener for status changes
   * Call once during Phase 3 setup
   */
  async setupWebhook(webhook_url: string): Promise<any> {
    const response = await this.client.post('/webhooks', {
      webhook: {
        url: webhook_url,
        events: ['story.created', 'story.updated', 'story.status_changed'],
      },
    });
    return response.data;
  }
}

export const ahaClient = new AhaClient(
  process.env.AHA_DOMAIN!,
  process.env.AHA_API_KEY!
);
```

### B. Custom Field Definitions (Phase 3 Setup)

```typescript
// packages/mcp-server/src/lib/aha-custom-fields.ts

export const CREW_CUSTOM_FIELDS = {
  // Story ownership
  crew_member_primary: {
    name: 'crew_member_primary',
    label: 'Primary Crew Member',
    field_type: 'single_select',
    allowed_values: [
      'Picard', 'Data', 'Riker', 'Worf', 'Geordi',
      'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark'
    ],
    description: 'Which crew member owns this story',
  },

  crew_team: {
    name: 'crew_team',
    label: 'Crew Collaborators',
    field_type: 'multi_select',
    allowed_values: [
      'Picard', 'Data', 'Riker', 'Worf', 'Geordi',
      'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark'
    ],
    description: 'All crew members collaborating on this story',
  },

  // Deliberation tracking
  deliberation_log_id: {
    name: 'deliberation_log_id',
    label: 'Deliberation Log ID',
    field_type: 'text',
    description: 'Link to crew memory entry (e.g., data-phase3-deliberation-2026-07-28)',
  },

  deliberation_date: {
    name: 'deliberation_date',
    label: 'Deliberation Date',
    field_type: 'date',
    description: 'When Observation Lounge deliberated on this story',
  },

  crew_consensus_gate: {
    name: 'crew_consensus_gate',
    label: 'Gate Type',
    field_type: 'single_select',
    allowed_values: ['AUTO', 'YELLOW', 'RED'],
    description: 'How crew approved this story (AUTO=70s, YELLOW=Riker, RED=Admiral)',
  },

  // Progress tracking
  progress_notes: {
    name: 'progress_notes',
    label: 'Progress Notes',
    field_type: 'large_text',
    description: 'Daily standup notes from crew member',
  },

  percentage_complete: {
    name: 'percentage_complete',
    label: 'Completion %',
    field_type: 'number',
    description: 'Story progress 0-100',
  },

  crew_health_signal: {
    name: 'crew_health_signal',
    label: 'Crew Health',
    field_type: 'single_select',
    allowed_values: ['Healthy', 'Fatigued', 'Stressed'],
    description: 'Daily health signal from crew member',
  },

  cognitive_load: {
    name: 'cognitive_load',
    label: 'Cognitive Load',
    field_type: 'number',
    description: 'Crew member reported cognitive load (0-10)',
  },

  // Dependency tracking
  blocked_by: {
    name: 'blocked_by',
    label: 'Blocked By',
    field_type: 'text',
    description: 'CSV of story IDs that block this one',
  },

  unblocks: {
    name: 'unblocks',
    label: 'Unblocks',
    field_type: 'text',
    description: 'CSV of story IDs this one unblocks',
  },

  blocker_status: {
    name: 'blocker_status',
    label: 'Blocker Status',
    field_type: 'single_select',
    allowed_values: ['CLEAR', 'YELLOW_OVERRIDE', 'RED_ESCALATION'],
    description: 'Current blocker status if any',
  },

  // Testing + shipping
  testing_started: {
    name: 'testing_started',
    label: 'Testing Started',
    field_type: 'date',
    description: 'When story moved to TESTING status',
  },

  shipped_date: {
    name: 'shipped_date',
    label: 'Shipped Date',
    field_type: 'date',
    description: 'When story was completed and shipped',
  },

  shipped_by: {
    name: 'shipped_by',
    label: 'Shipped By',
    field_type: 'single_select',
    allowed_values: [
      'Picard', 'Data', 'Riker', 'Worf', 'Geordi',
      'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark'
    ],
    description: 'Which crew member validated + shipped this story (usually Yar)',
  },

  // Audit trail
  status_last_updated_by_crew: {
    name: 'status_last_updated_by_crew',
    label: 'Last Updated By',
    field_type: 'text',
    description: 'Which crew member last updated this story',
  },

  status_last_update_timestamp: {
    name: 'status_last_update_timestamp',
    label: 'Last Updated At',
    field_type: 'date_time',
    description: 'When this story was last updated by crew',
  },
};

// Helper to create all custom fields in Aha (run once)
export async function setupCustomFields(ahaClient: any) {
  for (const [key, field] of Object.entries(CREW_CUSTOM_FIELDS)) {
    try {
      await ahaClient.client.post('/custom_fields', { custom_field: field });
      console.log(`✅ Created custom field: ${key}`);
    } catch (error) {
      if ((error as any).response?.status === 409) {
        console.log(`⏭️  Custom field already exists: ${key}`);
      } else {
        console.error(`❌ Failed to create custom field ${key}:`, error);
      }
    }
  }
}
```

---

## II. CREW DELIBERATION HANDLERS

### A. Observation Lounge → Aha Assignment

```typescript
// packages/mcp-server/src/lib/crew-deliberation-handlers.ts

import { ahaClient } from './aha-client';
import { crewMemory } from './crew-memory';
import type { AhaStoryUpdate } from './aha-client';

export interface CrewSelfAssignment {
  crew_member: string;
  story_id: string;
  story_title: string;
  rationale: string;
  team_members?: string[];
  deliberation_date: string;
}

/**
 * Called after Observation Lounge reaches consensus
 * Each crew member self-assigns to one or more stories
 */
export async function handleCrewSelfAssignment(
  assignments: CrewSelfAssignment[]
): Promise<void> {
  console.log(`📋 Processing ${assignments.length} crew self-assignments...`);

  const ahaUpdates: AhaStoryUpdate[] = assignments.map(assignment => ({
    story_id: assignment.story_id,
    crew_member: assignment.crew_member,
    action_type: 'self_assignment',
    memory_log_id: `${assignment.crew_member}-phase3-deliberation-${assignment.deliberation_date}`,

    updates: {
      status: 'IN_PROGRESS',
      assigned_to: assignment.crew_member,
      custom_fields: {
        crew_member_primary: assignment.crew_member,
        crew_team: assignment.team_members || [assignment.crew_member],
        deliberation_log_id: `${assignment.crew_member}-phase3-deliberation-${assignment.deliberation_date}`,
        deliberation_date: assignment.deliberation_date,
        crew_consensus_gate: 'AUTO', // Will be updated if YELLOW/RED in Picard synthesis
      },
    },
  }));

  // Batch update Aha
  try {
    await ahaClient.batchUpdateStories(ahaUpdates);
    console.log(`✅ ${assignments.length} stories assigned in Aha`);
  } catch (error) {
    console.error('❌ Failed to batch update stories:', error);
    throw error;
  }

  // Log to crew memory
  for (const assignment of assignments) {
    await crewMemory.storeMemory({
      crew_id: assignment.crew_member,
      entry_type: 'SELF_ASSIGNMENT',
      content: `Self-assigned to ${assignment.story_id} (${assignment.story_title}). Rationale: ${assignment.rationale}`,
      tags: ['phase-3', 'self-assignment', assignment.story_id],
      metadata: {
        story_id: assignment.story_id,
        story_title: assignment.story_title,
        team: assignment.team_members,
        aha_update_timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Called at end of daily standup (17:00 PST)
 * Crew member updates progress, health, blockers
 */
export async function handleDailyStandupUpdate(
  crew_member: string,
  story_id: string,
  standup_data: {
    completed_today: string;
    percentage_complete: number;
    confidence_level: number;
    crew_health_signal: 'Healthy' | 'Fatigued' | 'Stressed';
    cognitive_load: number;
    risks: string[];
    decisions: string[];
    blocker_discovered?: {
      description: string;
      blocked_by_story_id?: string;
    };
  }
): Promise<void> {
  console.log(`📊 Standup update from ${crew_member} for ${story_id}`);

  const progressNotes = `
${new Date().toISOString()}: ${crew_member} standup

Completed today:
${standup_data.completed_today}

Health signal: ${standup_data.crew_health_signal}
Cognitive load: ${standup_data.cognitive_load}/10
Confidence: ${standup_data.confidence_level}/10

Risks identified:
${standup_data.risks.map(r => `- ${r}`).join('\n')}

Decisions made:
${standup_data.decisions.map(d => `- ${d}`).join('\n')}

${standup_data.blocker_discovered ? `⚠️ BLOCKER DISCOVERED: ${standup_data.blocker_discovered.description}` : ''}
  `.trim();

  // Prepare Aha update
  const ahaUpdate: AhaStoryUpdate = {
    story_id,
    crew_member,
    action_type: 'standup_update',
    memory_log_id: `${crew_member}-${story_id}-standup-${new Date().toISOString().split('T')[0]}`,
    updates: {
      custom_fields: {
        progress_notes: progressNotes,
        percentage_complete: standup_data.percentage_complete,
        crew_health_signal: standup_data.crew_health_signal,
        cognitive_load: standup_data.cognitive_load,
        status_last_updated_by_crew: crew_member,
        status_last_update_timestamp: new Date().toISOString(),
      },
    },
  };

  // If blocker discovered, add blocker fields
  if (standup_data.blocker_discovered) {
    ahaUpdate.updates.custom_fields = {
      ...ahaUpdate.updates.custom_fields,
      blocked_by: standup_data.blocker_discovered.blocked_by_story_id || '',
      blocker_status: 'YELLOW_OVERRIDE_PENDING',
    };
  }

  // Update Aha
  try {
    await ahaClient.updateStoryFromCrewAction(ahaUpdate);
    console.log(`✅ Standup update recorded for ${story_id}`);
  } catch (error) {
    console.error(`❌ Failed to record standup:`, error);
    throw error;
  }

  // Log to crew memory
  await crewMemory.storeMemory({
    crew_id: crew_member,
    entry_type: 'DAILY_STANDUP',
    content: progressNotes,
    tags: ['phase-3', 'daily-standup', story_id],
    metadata: {
      story_id,
      percentage_complete: standup_data.percentage_complete,
      crew_health_signal: standup_data.crew_health_signal,
      cognitive_load: standup_data.cognitive_load,
      blocker_discovered: !!standup_data.blocker_discovered,
      aha_update_timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Called when crew member discovers blocker (dependency, issue, etc.)
 * Triggers YELLOW gate escalation to Riker for decision
 */
export async function handleBlockerEscalation(
  crew_member: string,
  story_id: string,
  blocker_data: {
    description: string;
    blocked_by_story_id?: string;
    severity: 'YELLOW' | 'RED';
    recommended_action: string;
  }
): Promise<void> {
  console.log(`⚠️ Blocker escalation from ${crew_member} for ${story_id}`);

  // Update story with blocker status
  const ahaUpdate: AhaStoryUpdate = {
    story_id,
    crew_member,
    action_type: 'blocker_escalation',
    memory_log_id: `${crew_member}-${story_id}-blocker-${new Date().toISOString().split('T')[0]}`,
    updates: {
      custom_fields: {
        blocked_by: blocker_data.blocked_by_story_id || '',
        blocker_status: blocker_data.severity === 'YELLOW' ? 'YELLOW_OVERRIDE_PENDING' : 'RED_ESCALATION',
        progress_notes: `⚠️ BLOCKER: ${blocker_data.description}\n\nRecommended action: ${blocker_data.recommended_action}`,
      },
    },
  };

  try {
    await ahaClient.updateStoryFromCrewAction(ahaUpdate);
    console.log(`✅ Blocker escalation recorded`);
  } catch (error) {
    console.error(`❌ Failed to record blocker:`, error);
    throw error;
  }

  // Log to crew memory
  await crewMemory.storeMemory({
    crew_id: crew_member,
    entry_type: 'BLOCKER_ESCALATION',
    content: `Blocker: ${blocker_data.description}\n\nRecommended: ${blocker_data.recommended_action}`,
    tags: ['phase-3', 'blocker', story_id, blocker_data.severity],
    metadata: {
      story_id,
      blocked_by_story_id: blocker_data.blocked_by_story_id,
      severity: blocker_data.severity,
      escalation_gate: blocker_data.severity,
      aha_update_timestamp: new Date().toISOString(),
    },
  });

  // If YELLOW gate, notify Riker for decision
  if (blocker_data.severity === 'YELLOW') {
    // TODO: Send notification to Riker (Observation Lounge alert or dashboard)
    console.log(`🎯 Riker: Please review blocker for ${story_id} and provide override decision`);
  }

  // If RED gate, notify Admiral (post-sprint review)
  if (blocker_data.severity === 'RED') {
    console.log(`🚨 RED GATE: Blocker for ${story_id} escalated to Admiral review`);
  }
}

/**
 * Called by Riker when making YELLOW gate decision
 * Approves crew to proceed (with or without modifications)
 */
export async function handleRikerYellowGateDecision(
  story_id: string,
  decision_data: {
    decision: 'PROCEED_WITH_DEFENSIVE_ASSUMPTIONS' | 'PROCEED_WITH_MODIFICATIONS' | 'WAIT_FOR_BLOCKER' | 'DEFER_STORY';
    rationale: string;
    modifications?: string;
  }
): Promise<void> {
  console.log(`🎯 Riker decision for ${story_id}: ${decision_data.decision}`);

  const blocker_status_map = {
    'PROCEED_WITH_DEFENSIVE_ASSUMPTIONS': 'YELLOW_OVERRIDE',
    'PROCEED_WITH_MODIFICATIONS': 'YELLOW_OVERRIDE',
    'WAIT_FOR_BLOCKER': 'BLOCKED_PENDING',
    'DEFER_STORY': 'DEFERRED',
  };

  // Fetch story to get crew member
  const story = await ahaClient.getStory(story_id);
  const crew_member = story.custom_fields?.crew_member_primary || 'Unknown';

  const ahaUpdate: AhaStoryUpdate = {
    story_id,
    crew_member: 'Riker',
    action_type: 'blocker_escalation', // Updating blocker status
    updates: {
      custom_fields: {
        blocker_status: blocker_status_map[decision_data.decision] || 'YELLOW_OVERRIDE',
        progress_notes: `🎯 Riker decision: ${decision_data.decision}\n\nRationale: ${decision_data.rationale}${decision_data.modifications ? `\n\nModifications: ${decision_data.modifications}` : ''}`,
      },
    },
  };

  // If proceeding, update status to IN_PROGRESS
  if (decision_data.decision.includes('PROCEED')) {
    ahaUpdate.updates.status = 'IN_PROGRESS';
  }

  try {
    await ahaClient.updateStoryFromCrewAction(ahaUpdate);
    console.log(`✅ Riker decision recorded for ${story_id}`);
  } catch (error) {
    console.error(`❌ Failed to record Riker decision:`, error);
    throw error;
  }

  // Log to crew memory
  await crewMemory.storeMemory({
    crew_id: 'Riker',
    entry_type: 'YELLOW_GATE_DECISION',
    content: `Decision: ${decision_data.decision}\n\nRationale: ${decision_data.rationale}`,
    tags: ['phase-3', 'yellow-gate', story_id, decision_data.decision],
    metadata: {
      story_id,
      decision: decision_data.decision,
      aha_update_timestamp: new Date().toISOString(),
    },
  });

  // Notify crew member (via dashboard or Observation Lounge)
  console.log(`✅ ${crew_member} notified: Riker approved ${decision_data.decision}`);
}

/**
 * Called by Yar when story moves to TESTING
 * Validates against acceptance criteria
 */
export async function handleValidationComplete(
  crew_member: string,
  story_id: string,
  validation_data: {
    accepted: boolean;
    notes: string;
    qa_coverage: number; // 0-100%
  }
): Promise<void> {
  console.log(`🔍 Validation from ${crew_member} for ${story_id}: ${validation_data.accepted ? 'PASSED' : 'NEEDS_REWORK'}`);

  const new_status = validation_data.accepted ? 'SHIPPED' : 'IN_PROGRESS';

  const ahaUpdate: AhaStoryUpdate = {
    story_id,
    crew_member,
    action_type: 'validation_complete',
    memory_log_id: `${crew_member}-${story_id}-validation-${new Date().toISOString().split('T')[0]}`,
    updates: {
      status: new_status,
      custom_fields: {
        ...(validation_data.accepted ? {
          shipped_date: new Date().toISOString().split('T')[0],
          shipped_by: crew_member,
        } : {}),
        progress_notes: `✅ Validation: ${validation_data.notes}\n\nQA Coverage: ${validation_data.qa_coverage}%`,
      },
    },
  };

  try {
    await ahaClient.updateStoryFromCrewAction(ahaUpdate);
    console.log(`✅ Validation recorded; story now ${new_status}`);
  } catch (error) {
    console.error(`❌ Failed to record validation:`, error);
    throw error;
  }

  // Log to crew memory
  await crewMemory.storeMemory({
    crew_id: crew_member,
    entry_type: 'VALIDATION',
    content: `Validation: ${validation_data.accepted ? 'PASSED' : 'NEEDS_REWORK'}\n\nNotes: ${validation_data.notes}\n\nQA Coverage: ${validation_data.qa_coverage}%`,
    tags: ['phase-3', 'validation', story_id, validation_data.accepted ? 'passed' : 'rework'],
    metadata: {
      story_id,
      accepted: validation_data.accepted,
      qa_coverage: validation_data.qa_coverage,
      aha_update_timestamp: new Date().toISOString(),
    },
  });
}
```

---

## III. WEBHOOK INTEGRATION

### A. Webhook Listener (Aha → Crew)

```typescript
// packages/mcp-server/src/lib/aha-webhook-handler.ts

import { Express } from 'express';
import { crewMemory } from './crew-memory';
import { ahaClient } from './aha-client';

export function setupAhaWebhookListener(app: Express) {
  /**
   * Webhook: story.status_changed
   * Triggered when story status changes in Aha
   * Examples: IN_PROGRESS → TESTING, TESTING → SHIPPED
   */
  app.post('/webhooks/aha/story-status-changed', async (req, res) => {
    const { story } = req.body;
    const { id, name, status, custom_fields } = story;

    console.log(`📡 Webhook: Story ${id} status changed to ${status}`);

    // Determine which crew member to notify
    let notification_target = custom_fields?.crew_member_primary || 'Unknown';

    if (status === 'TESTING') {
      notification_target = 'Yar'; // Yar handles validation
    } else if (status === 'SHIPPED') {
      notification_target = custom_fields?.crew_member_primary;
    }

    // Log webhook to crew memory
    await crewMemory.storeMemory({
      crew_id: notification_target,
      entry_type: 'AHA_WEBHOOK',
      content: `Story ${id} status changed to ${status}`,
      tags: ['phase-3', 'webhook', id, status],
      metadata: {
        story_id: id,
        story_name: name,
        new_status: status,
        webhook_timestamp: new Date().toISOString(),
      },
    });

    console.log(`✅ ${notification_target} notified: ${id} is ready for next step`);

    res.json({ success: true, story_id: id, notification_sent_to: notification_target });
  });

  /**
   * Webhook: story.assigned_to_changed
   * Triggered when story is assigned to a crew member
   * Should happen during Observation Lounge self-assignment
   */
  app.post('/webhooks/aha/story-assigned', async (req, res) => {
    const { story } = req.body;
    const { id, name, assigned_to } = story;

    console.log(`📡 Webhook: Story ${id} assigned to ${assigned_to}`);

    // Log to assigned crew member's memory
    await crewMemory.storeMemory({
      crew_id: assigned_to,
      entry_type: 'AHA_WEBHOOK',
      content: `You've been assigned to story: ${name}`,
      tags: ['phase-3', 'webhook', 'assignment', id],
      metadata: {
        story_id: id,
        story_name: name,
        webhook_timestamp: new Date().toISOString(),
      },
    });

    console.log(`✅ ${assigned_to} notified: Story ${id} assigned to you`);

    res.json({ success: true, story_id: id, assigned_to });
  });

  /**
   * Webhook: story.created
   * Triggered when new story is created in Phase 3 release
   * Could notify relevant crew member (by domain matching)
   */
  app.post('/webhooks/aha/story-created', async (req, res) => {
    const { story } = req.body;
    const { id, name } = story;

    console.log(`📡 Webhook: New story created: ${id}`);

    // Log to all crew members (for Observation Lounge awareness)
    await crewMemory.storeMemory({
      crew_id: 'Picard',
      entry_type: 'AHA_WEBHOOK',
      content: `New Phase 3 story available: ${name}`,
      tags: ['phase-3', 'webhook', 'story-created', id],
      metadata: {
        story_id: id,
        story_name: name,
        webhook_timestamp: new Date().toISOString(),
      },
    });

    console.log(`✅ Picard notified: New Phase 3 story available for next Observation Lounge`);

    res.json({ success: true, story_id: id });
  });
}

/**
 * Webhook signature verification (optional but recommended)
 * Add to Express middleware if Aha provides signing key
 */
export function verifyAhaWebhookSignature(req: Express.Request): boolean {
  const signature = req.headers['x-aha-webhook-signature'];
  const body = req.body;

  if (!signature) return false;

  // TODO: Verify HMAC signature using Aha webhook key
  // See: https://www.aha.io/support/hc/en-us/articles/202396835-API#webhooks

  return true;
}
```

---

## IV. CREW MEMORY ↔ AHA BIDIRECTIONAL LINKING

### A. Memory Schema with Aha Traceability

```typescript
// packages/shared/src/crew-memory-schema.ts

export interface CrewMemoryEntry {
  // Core metadata
  id: string; // e.g., "data-PHASE3-001-deliberation-2026-07-28"
  crew_id: string;
  entry_type: 'DELIBERATION' | 'SELF_ASSIGNMENT' | 'DAILY_STANDUP' | 'BLOCKER_ESCALATION' | 'VALIDATION' | 'AHA_WEBHOOK';
  timestamp: string; // ISO timestamp
  
  // Content
  content: string; // Narrative
  tags: string[]; // phase-3, phase3-001, self-assignment, etc.
  
  // Aha linkage (bidirectional)
  aha_story_id?: string; // PHASE3-001
  aha_story_url?: string; // https://domain.aha.io/stories/PHASE3-001
  aha_update_timestamp?: string; // When Aha was updated
  
  // Structured metadata
  metadata: {
    story_id?: string;
    story_title?: string;
    decision?: string;
    rationale?: string;
    percentage_complete?: number;
    crew_health_signal?: string;
    cognitive_load?: number;
    blocker_description?: string;
    blocked_by_story_id?: string;
    [key: string]: any;
  };
  
  // Immutability
  created_at: string;
  updated_at: string;
  immutable: boolean;
}

export async function storeMemoryWithAhaLink(
  memory_entry: CrewMemoryEntry,
  aha_story_id?: string
): Promise<string> {
  // Store to crew memory
  const stored_memory_id = await crewMemory.store(memory_entry);
  
  // If Aha story, update Aha with memory link
  if (aha_story_id) {
    await ahaClient.updateStoryFromCrewAction({
      story_id: aha_story_id,
      crew_member: memory_entry.crew_id,
      action_type: 'standup_update',
      memory_log_id: stored_memory_id,
      updates: {
        custom_fields: {
          deliberation_log_id: stored_memory_id,
        },
      },
    });
  }
  
  return stored_memory_id;
}

export async function recallMemoryForStory(
  aha_story_id: string
): Promise<CrewMemoryEntry[]> {
  // Recall all memories for this story
  return crewMemory.recall({
    tags: [aha_story_id],
    limit: 100,
  });
}
```

---

## V. MCP TOOL DEFINITIONS (Crew Uses These)

### A. `aha_story_update` Tool

```typescript
// packages/mcp-server/src/tools/aha-story-update.ts

import { z } from 'zod';
import { defineSkillTheory } from '../lib/skill-theories';
import { handleDailyStandupUpdate } from '../lib/crew-deliberation-handlers';

const updateSchema = z.object({
  crew_member: z.enum(['Picard', 'Data', 'Riker', 'Worf', 'Geordi', 'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark']),
  story_id: z.string().startsWith('PHASE3-'),
  completed_today: z.string().describe('What the crew member completed today'),
  percentage_complete: z.number().min(0).max(100),
  confidence_level: z.number().min(0).max(10),
  crew_health_signal: z.enum(['Healthy', 'Fatigued', 'Stressed']),
  cognitive_load: z.number().min(0).max(10),
  risks: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  blocker_discovered: z.object({
    description: z.string(),
    blocked_by_story_id: z.string().optional(),
  }).optional(),
});

defineSkillTheory({
  skillName: 'aha_story_update',
  who: 'Any crew member (Picard through Quark)',
  what: 'Daily standup update to Aha story with progress, health, blockers',
  when: '17:00 PST daily standup',
  where: 'Aha story custom fields + crew memory',
  why: 'Keep story status synchronized; track crew health; enable blocker escalation',
  how: {
    steps: [
      'Crew calls this tool with standup data',
      'Tool updates Aha story custom_fields (progress, health, cognitive load)',
      'Tool logs to crew memory with Aha story link',
      'If blocker discovered, escalation gate triggered',
    ],
    annotations: {
      forceRequestApproval: false, // Crew can auto-update
      tags: ['phase-3', 'daily-standup', 'aha-integration'],
    },
  },
});

export async function ahaStoryUpdate(input: z.infer<typeof updateSchema>) {
  try {
    await handleDailyStandupUpdate(
      input.crew_member,
      input.story_id,
      {
        completed_today: input.completed_today,
        percentage_complete: input.percentage_complete,
        confidence_level: input.confidence_level,
        crew_health_signal: input.crew_health_signal,
        cognitive_load: input.cognitive_load,
        risks: input.risks || [],
        decisions: input.decisions || [],
        blocker_discovered: input.blocker_discovered,
      }
    );

    return {
      success: true,
      story_id: input.story_id,
      message: `✅ Standup update recorded for ${input.story_id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update story: ${error}`,
    };
  }
}
```

### B. `aha_blocker_escalation` Tool

```typescript
// packages/mcp-server/src/tools/aha-blocker-escalation.ts

import { z } from 'zod';
import { defineSkillTheory } from '../lib/skill-theories';
import { handleBlockerEscalation } from '../lib/crew-deliberation-handlers';

const escalationSchema = z.object({
  crew_member: z.enum(['Picard', 'Data', 'Riker', 'Worf', 'Geordi', 'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark']),
  story_id: z.string().startsWith('PHASE3-'),
  description: z.string().describe('What\'s blocking this story'),
  blocked_by_story_id: z.string().optional().describe('Which story is blocking this one'),
  severity: z.enum(['YELLOW', 'RED']).describe('YELLOW = Riker decides; RED = Admiral decides'),
  recommended_action: z.string(),
});

defineSkillTheory({
  skillName: 'aha_blocker_escalation',
  who: 'Any crew member discovering a blocker',
  what: 'Escalate blocker to leadership (YELLOW=Riker, RED=Admiral)',
  when: 'When crew discovers dependency, infrastructure issue, or critical risk',
  where: 'Aha story blocker_status + crew memory',
  why: 'Enable rapid decision-making on blockers; maintain crew flow',
  how: {
    steps: [
      'Crew identifies blocker (dependency, risk, etc.)',
      'Crew calls tool with blocker description + severity',
      'Tool updates Aha story.blocker_status',
      'Tool logs to crew memory for decision tracking',
      'If YELLOW, Riker notified; if RED, Admiral notified (post-sprint review)',
    ],
    annotations: {
      forceRequestApproval: false, // Crew can escalate autonomously
      tags: ['phase-3', 'blocker', 'escalation', 'yellow-gate', 'red-gate'],
    },
  },
});

export async function ahaBlockerEscalation(input: z.infer<typeof escalationSchema>) {
  try {
    await handleBlockerEscalation(
      input.crew_member,
      input.story_id,
      {
        description: input.description,
        blocked_by_story_id: input.blocked_by_story_id,
        severity: input.severity,
        recommended_action: input.recommended_action,
      }
    );

    return {
      success: true,
      story_id: input.story_id,
      gate: input.severity,
      message: `✅ Blocker escalated to ${input.severity === 'YELLOW' ? 'Riker' : 'Admiral'}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to escalate blocker: ${error}`,
    };
  }
}
```

---

## VI. DAILY STANDUP AUTOMATION

### A. Scheduled Standup Prompt (15:45 PST)

```typescript
// packages/mcp-server/src/lib/crew-standup-scheduler.ts

import cron from 'node-cron';
import { crewMemory } from './crew-memory';

const CREW_MEMBERS = ['Picard', 'Data', 'Riker', 'Worf', 'Geordi', 'O\'Brien', 'Yar', 'Troi', 'Crusher', 'Uhura', 'Quark'];

export function setupDailyStandupReminder() {
  // 15:45 PST = 23:45 UTC (depends on DST)
  // Run every weekday (Mon-Fri) at 15:45 PST
  const standupJob = cron.schedule('45 15 * * 1-5', async () => {
    console.log('📣 Daily standup reminder (15 min until 17:00 PST)');

    // Query for active stories assigned to each crew member
    const active_stories = await getActiveStoriesForAllCrew();

    for (const crew_member of CREW_MEMBERS) {
      const crew_stories = active_stories[crew_member] || [];

      if (crew_stories.length === 0) continue;

      // Send standup reminder to crew member (via dashboard or direct MCP call)
      console.log(`🔔 ${crew_member}: Time for standup update on ${crew_stories.map(s => s.id).join(', ')}`);

      // Store reminder in crew memory
      await crewMemory.storeMemory({
        crew_id: crew_member,
        entry_type: 'STANDUP_REMINDER',
        content: `Standup reminder: Please update ${crew_stories.map(s => s.id).join(', ')} with today's progress`,
        tags: ['phase-3', 'standup', 'reminder'],
        metadata: {
          stories: crew_stories.map(s => ({ id: s.id, title: s.title })),
        },
      });
    }
  });

  return standupJob;
}

async function getActiveStoriesForAllCrew(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};

  for (const crew_member of CREW_MEMBERS) {
    // Query Aha for stories assigned to this crew member with status IN_PROGRESS or TESTING
    // TODO: Replace with actual Aha API call
    result[crew_member] = [];
  }

  return result;
}
```

---

## VII. PHASE 3 SETUP CHECKLIST

**Pre-Phase 3 Implementation (One-time setup):**

```typescript
// packages/mcp-server/src/lib/phase3-setup.ts

import { ahaClient } from './aha-client';
import { setupCustomFields } from './aha-custom-fields';
import { setupAhaWebhookListener } from './aha-webhook-handler';
import { setupDailyStandupReminder } from './crew-standup-scheduler';

export async function initializePhase3() {
  console.log('🚀 Initializing Phase 3 crew deliberation system...');

  // Step 1: Create custom fields in Aha
  console.log('📝 Setting up Aha custom fields...');
  await setupCustomFields(ahaClient);

  // Step 2: Register webhook listener
  console.log('📡 Setting up Aha webhook listener...');
  await ahaClient.setupWebhook(process.env.WEBHOOK_URL!);
  setupAhaWebhookListener(app);

  // Step 3: Schedule daily standup reminders
  console.log('⏰ Setting up daily standup scheduler...');
  setupDailyStandupReminder();

  console.log('✅ Phase 3 initialization complete!');
}
```

---

**Conclusion:**

This technical guide provides the implementation patterns for crew-driven story assignment, daily tracking, blocker escalation, and Aha API synchronization. All crew deliberations are logged to persistent memory with bidirectional Aha story links, creating a complete audit trail of decisions and outcomes.

---

**Document Version:** 1.0 (Implementation Guide)  
**Status:** Ready for development  
**Next Step:** Implement MCP tools + Aha API client
