# Story Agent Neutral PM Abstraction Layer
**Architecture Design Document**  
**Date:** August 27, 2026  
**Status:** Design Complete (Crew Consensus via Observation Lounge)  
**Owners:** Data (schema), Picard (strategy), Worf (security), Geordi (infrastructure)

---

## Executive Summary

**The Paradigm Shift:**
- **Today:** Aha is source of truth → Story Agent reads/writes to Aha (vendor lock-in)
- **Future:** Story Agent is source of truth → Aha/Jira/Monday/Linear are DATA PROVIDERS (via adapters)

**Why This Matters:**
1. **Independence:** Story Agent works even if external PM systems are down
2. **Flexibility:** Add/remove integrations without rewriting core logic
3. **Portability:** If customer switches from Aha to Jira, Story Agent seamlessly accepts Jira data
4. **Cost Control:** Route work through cheapest, most reliable external system

**MVP Scope:** Refactor Aha integration to prove adapter pattern, then add Jira (Week 3+).

---

## Core Architecture: Neutral Data Model

### The Challenge
Aha has different concepts than Jira:
- Aha: `Workspace` → `Product` → `Epic` → `Feature` → `Task`
- Jira: `Workspace` → `Project` → `Epic` → `Issue` → `Sub-task`
- Monday: `Board` → `Group` → `Item` → `Sub-item`

Story Agent needs ONE canonical schema that maps from all three.

### The Solution: Event-Sourced Task Model

**Core Entities (Immutable):**
```typescript
// packages/shared/src/pm-neutral/task-core.ts

export interface TaskCore {
  // Immutable identity
  id: UUID;                          // Story Agent's canonical ID
  type: 'story' | 'task' | 'epic' | 'release';
  created_at: ISO8601;               // Never changes
  
  // Mutable state (updated via events)
  title: string;
  description: string;
  status: TaskStatus;                // 'backlog', 'in_progress', 'review', 'done'
  assignee_id?: UUID;
  due_date?: ISO8601;
  story_points?: number;
  
  // Adapter provenance (multi-source lineage)
  source_systems: {
    aha?: { id: string; version: string };
    jira?: { id: string; key: string; version: string };
    monday?: { id: string; version: string };
  };
  
  // Integrity check
  content_fingerprint: SHA3_256;     // Hash of title+description (detect external changes)
  last_modified_at: ISO8601;
  last_modified_by_system: 'aha' | 'jira' | 'monday' | 'story-agent';
  
  // Conflict tracking
  sync_state: 'synced' | 'pending' | 'conflict';
  conflict_sources?: ('aha' | 'jira' | 'monday')[];
}

export interface TaskEvent {
  id: UUID;
  task_id: UUID;
  type: 'created' | 'status_changed' | 'assigned' | 'sync_attempted';
  timestamp: ISO8601;
  source_system: 'aha' | 'jira' | 'monday' | 'story-agent';
  payload: Record<string, any>;
  mcp_sequence_id: number;           // OpenRouter Lamport clock for ordering
}

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked';
```

**Database Schema:**
```sql
-- Supabase/migrations/20260827_neutral_pm_schema.sql

CREATE TABLE sa_task_core (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('story', 'task', 'epic', 'release')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'in_progress', 'review', 'done', 'blocked')),
  assignee_id UUID REFERENCES sa_crew_members(id),
  due_date TIMESTAMP,
  story_points INT,
  
  -- Adapter lineage (JSONB for flexibility)
  source_systems JSONB DEFAULT '{}'::jsonb,  -- {aha: {id, version}, jira: {id, key, version}, ...}
  
  -- Integrity + conflict tracking
  content_fingerprint TEXT NOT NULL,         -- SHA-3 hash
  last_modified_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_modified_by_system TEXT NOT NULL,
  sync_state TEXT DEFAULT 'synced' CHECK (sync_state IN ('synced', 'pending', 'conflict')),
  conflict_sources TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sa_task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES sa_task_core(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created', 'status_changed', 'assigned', 'sync_attempted')),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source_system TEXT NOT NULL CHECK (source_system IN ('aha', 'jira', 'monday', 'story-agent')),
  payload JSONB NOT NULL,
  mcp_sequence_id BIGINT NOT NULL,  -- Lamport timestamp for ordering
  
  UNIQUE(task_id, mcp_sequence_id)  -- No sequence ID collisions
);

CREATE INDEX idx_task_core_status ON sa_task_core(status);
CREATE INDEX idx_task_core_assignee ON sa_task_core(assignee_id);
CREATE INDEX idx_task_events_task ON sa_task_events(task_id);
CREATE INDEX idx_task_events_source ON sa_task_events(source_system);
CREATE INDEX idx_task_events_mcp_seq ON sa_task_events(mcp_sequence_id);
```

---

## Adapter Architecture: Pluggable Integrations

### Design Pattern: The Adapter Interface

Every external PM system gets ONE adapter that implements this contract:

```typescript
// packages/mcp-server/src/adapters/adapter-interface.ts

export interface PMAdapter {
  // Identity
  systemName: 'aha' | 'jira' | 'monday' | 'asana' | 'linear';
  apiVersion: string;
  
  // Configuration
  configure(config: AdapterConfig): Promise<void>;
  authenticate(credentials: OAuth2Token): Promise<void>;
  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down' }>;
  
  // Ingestion (read from external system)
  listTasks(filters?: TaskFilter): AsyncIterable<ExternalTask>;
  getTask(externalId: string): Promise<ExternalTask>;
  watchTasks(callback: (event: ExternalTaskEvent) => void): Promise<Unsubscribe>;
  
  // Outbound (write back to external system - optional)
  updateTask?(taskId: string, updates: TaskUpdate): Promise<ExternalTask>;
  
  // Transformation
  toNeutral(external: ExternalTask): TaskCore;        // External → Story Agent
  fromNeutral(neutral: TaskCore): ExternalTask;       // Story Agent → External
  
  // Error handling
  handleSyncError(error: SyncError): 'retry' | 'quarantine' | 'resolve';
}

export interface AdapterConfig {
  api_key: string;              // OAuth token (brokered via WorfGate)
  api_url: string;              // Custom domain support
  sync_mode: 'webhook' | 'poll'; // Real-time or batch
  poll_interval_sec?: number;   // For polling (default: 5min)
  max_payload_bytes: number;    // Rate limiting (default: 1MB)
}

export interface ExternalTask {
  externalId: string;
  externalKey?: string;  // Jira's "PROJ-123"
  title: string;
  description?: string;
  status: string;  // External system's status (mapped to TaskStatus during transform)
  // ...other fields specific to external system
}

export interface SyncError {
  type: 'schema_mismatch' | 'auth_failure' | 'rate_limit' | 'network_error' | 'unknown';
  message: string;
  recoverable: boolean;
  externalId?: string;
  timestamp: ISO8601;
}
```

### Example: Aha Adapter (Refactored)

```typescript
// packages/mcp-server/src/adapters/aha-adapter.ts

export class AhaAdapter implements PMAdapter {
  systemName = 'aha' as const;
  apiVersion = 'v1';
  
  private client: AhaClient;
  private config: AdapterConfig;
  
  async configure(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.client = new AhaClient(config.api_key, config.api_url);
  }
  
  async authenticate(token: OAuth2Token): Promise<void> {
    // Validate token with Aha API
    await this.client.validateToken(token.access_token);
  }
  
  async *listTasks(): AsyncIterable<ExternalTask> {
    // Paginate through Aha features + requirements
    const releases = await this.client.listReleases();
    for (const release of releases) {
      const features = await this.client.listFeaturesInRelease(release.id);
      for (const feature of features) {
        const requirements = await this.client.listRequirements(feature.id);
        for (const req of requirements) {
          yield this.convertAhaToExternal(req);
        }
      }
    }
  }
  
  toNeutral(external: ExternalTask): TaskCore {
    const ahaTask = external as AhaTask;
    return {
      id: generateUUID(),  // Story Agent assigns new ID
      type: ahaTask.type === 'requirement' ? 'task' : 'story',
      title: ahaTask.name,
      description: ahaTask.description,
      status: this.mapAhaStatusToNeutral(ahaTask.workflow_status),
      assignee_id: ahaTask.assigned_to_id ? userIdToUUID(ahaTask.assigned_to_id) : undefined,
      due_date: ahaTask.due_date,
      story_points: ahaTask.estimate,
      source_systems: {
        aha: { id: ahaTask.id, version: ahaTask.updated_at },
      },
      content_fingerprint: SHA3(ahaTask.name + ahaTask.description),
      last_modified_by_system: 'aha',
      sync_state: 'synced',
    };
  }
  
  private mapAhaStatusToNeutral(ahaStatus: string): TaskStatus {
    const mapping: Record<string, TaskStatus> = {
      'unstarted': 'backlog',
      'in progress': 'in_progress',
      'in review': 'review',
      'complete': 'done',
      'blocked': 'blocked',
    };
    return mapping[ahaStatus] || 'backlog';
  }
}
```

---

## Sync Protocol: How Data Flows

### Inbound Sync (External → Story Agent)

```
┌─────────────────────────────────────────────────────────────────┐
│ ADAPTER SYNC LOOP (runs every 5min or via webhook)              │
└─────────────────────────────────────────────────────────────────┘

1. Adapter calls external API (e.g., GET /features)
   ↓
2. Response validated via JSON Schema + OPA policies (Worf's layer)
   → Payload must have required fields (title, status, etc)
   → TLS 1.3 enforced for all connections
   ↓
3. External task converted to neutral via adapter.toNeutral()
   ↓
4. CHECK FOR CONFLICTS:
   - Query sa_task_core WHERE source_systems->>'aha'->>'id' = externalId
   - If existing: compare content_fingerprint
     - If fingerprint matches: SKIP (no change)
     - If fingerprint differs AND task not modified locally: UPDATE
     - If fingerprint differs AND task modified locally: SET sync_state='conflict'
   ↓
5. Write task event to sa_task_events with mcp_sequence_id
   ↓
6. If sync succeeds: update last_modified_at, last_modified_by_system
   If sync fails (recoverable): increment retry count, queue for next cycle
   If sync fails (irrecoverable): alert via Prometheus + store in dead-letter queue
```

**Measurement:**
- `adapter_syncs_total` — total sync attempts
- `adapter_syncs_success` — successful syncs
- `adapter_conflict_count` — conflicts detected
- `adapter_recoverable_errors` — transient errors (retry later)
- `adapter_irrecoverable_errors` — auth failures, schema mismatches
- **Target:** <2% irrecoverable errors across all adapters

### Outbound Sync (Story Agent → External, Optional)

Only enabled for critical statuses (e.g., when crew marks task "done", write back to Aha).

```
┌─────────────────────────────────────────────────────────────────┐
│ CREW MARKS TASK COMPLETE → Story Agent writes back to Aha       │
└─────────────────────────────────────────────────────────────────┘

1. Event "task completed" emitted by crew
   ↓
2. Check adapter config: is 'aha' configured for outbound writes?
   If not: skip
   ↓
3. Load latest task from sa_task_core
   ↓
4. Check conflict state:
   - If sync_state='conflict': require crew approval via `/resolve-conflict` endpoint
   - If sync_state='synced': proceed
   ↓
5. Call adapter.fromNeutral(task) → convert to Aha format
   ↓
6. Call adapter.updateTask(externalId, updates)
   ↓
7. Await acknowledgment from Aha
   → If success: record event, update source_systems{aha.version}
   → If conflict detected remotely: set sync_state='conflict', await resolution
   → If auth failure: alert + disable outbound for this adapter (WorfGate)
```

**Write Precedence Rule:**
```
If Aha and Jira both claim to have "latest status":
  1. Check timestamps + mcp_sequence_ids
  2. Prefer system with later timestamp
  3. If tied: use fixed precedence (Jira > Aha > Monday) to break ties
  4. Log decision in audit trail (Worf)
```

---

## Conflict Resolution: Handling Disagreements

**Scenario:** Aha says task is "in_progress", Jira says it's "done". Who wins?

**Resolution Strategy:**

```
┌─ CONFLICT DETECTED ────────────────────────────────────────┐
│ Task has divergent status in Aha vs Jira                   │
└───────────────────────────────────────────────────────────┘

1. TRIAGE (automatic):
   a) Did the crew modify this locally (in Story Agent)?
      YES → CREW EDIT (crew's version is ground truth)
      NO  → EXTERNAL CONFLICT (Aha/Jira disagree)
   
   b) Is this a recoverable schema issue (missing field)?
      YES → QUARANTINE (store in dead-letter, alert Geordi)
      NO  → PROCEED to resolution
   
2. APPLY PRECEDENCE RULE (deterministic):
   - Check last_modified_at for both systems
   - Apply system precedence tie-breaker if timestamps match
   - Record decision + reasoning in audit log
   
3. RESOLUTION OPTIONS:
   
   a) AUTO-RESOLVE (if <5 fields differ):
      - Keep crew's version
      - Write back to external systems
      - Log: "Conflict resolved via crew precedence"
   
   b) CREW APPROVAL (if >5 fields differ):
      - POST to `/conflicts` endpoint with diff
      - Crew reviews via chat: `/conflicts show STORY-123`
      - Crew resolves: `/conflicts resolve STORY-123 keep=aha` or `keep=crew`
      - Update source_systems, set sync_state='synced'
```

**Measurement:**
- `conflicts_detected_total` — how many conflicts?
- `conflicts_auto_resolved` — how many auto-resolved (healthy)?
- `conflicts_crew_approved` — how many required crew review?
- **Target:** >90% auto-resolved (indicates strong system independence)

---

## Implementation: Phase 1 (2 Weeks)

### Week 1: Schema + Aha Refactoring

**Days 1-2 (Data):**
- [ ] Create sa_task_core + sa_task_events tables
- [ ] Build TaskCore/TaskEvent TypeScript types
- [ ] Implement SHA-3 fingerprinting logic

**Days 3-4 (Riker):**
- [ ] Refactor existing Aha integration as AhaAdapter class
- [ ] Implement toNeutral/fromNeutral transforms
- [ ] Write adapter unit tests (mock Aha API responses)

**Days 5 (QA):**
- [ ] E2E test: Import 100 tasks from Aha → verify TaskCore creation
- [ ] Verify fingerprinting catches external changes
- [ ] Test conflict detection (manually edit in Aha, verify sync_state='conflict')

### Week 2: Sync Loop + Conflict Resolution

**Days 1-2 (Geordi + Riker):**
- [ ] Build generic sync loop (compatible with any adapter)
- [ ] Implement webhook receiver (for Aha's event subscriptions)
- [ ] Implement polling fallback (30-second poll interval)

**Days 3-4 (Worf + Crusher):**
- [ ] Add JSON Schema validation (adapter payload validation)
- [ ] Add OPA policies (conflict resolution rules)
- [ ] Add Prometheus metrics (sync success rate, conflict count)
- [ ] Add health checks (adapter.healthCheck() every 5min)

**Days 5 (QA + Picard):**
- [ ] E2E test: Modify task in Aha, verify real-time sync
- [ ] E2E test: Create conflict, verify crew resolution flow
- [ ] Merge to dev branch

---

## Integration with Story Agent Chat (Future)

The neutral PM model enables rich chat features:

```
User: "/explain STORY-123"
  → Chat loads TaskCore from sa_task_core
  → Displays title + description
  → Shows source systems (e.g., "From Aha via adapter")
  → User can @-mention related tasks across systems
  
User: "/fix STORY-123"
  → Crew analyzes task
  → Generates PR + comments in chat
  → Crew marks task complete in Story Agent
  → Adapter automatically syncs back to Aha/Jira
```

---

## Security & WorfGate Integration

### Adapter Permissions (Tool-Scoped)

```
Adapters are registered as WorfGate TOOLS:

Tool: adapter_aha
  Scopes:
    - read:tasks (read from Aha)
    - write:tasks (optional, requires approval)
  Rate limits:
    - 100 req/sec max
    - 1MB max payload
  OAuth:
    - Token lifetime: 1 hour
    - Rotation: automatic
  Audit:
    - All sync operations logged
    - Failed auth attempts blocked

Tool: adapter_jira
  (similar structure)
```

### Data Access Control

- Adapters CANNOT directly access Supabase (all via MCP)
- Adapters CANNOT modify other adapters' source_systems entries
- Credentials stored in WorfGate Vault (never in code/logs)

---

## Cost Estimate

| Component | Crew Time | OpenRouter Cost | Notes |
|-----------|-----------|-----------------|-------|
| Schema design + DB | 4h | $0.18 | Data (SQL, TypeScript) |
| Aha adapter refactor | 8h | $0.40 | Riker (API integration) |
| Sync loop + webhooks | 6h | $0.28 | Geordi (infrastructure) |
| Conflict resolution | 4h | $0.20 | Worf (OPA policies) |
| Tests + QA | 4h | $0.15 | Yar (coverage) |
| Documentation | 2h | $0.08 | Uhura (comms) |
| **Phase 1 Total** | **28h** | **~$1.29** | 2-week sprint |

**Phase 2 (Jira adapter):** ~$0.80 additional  
**Phase 3 (Monday adapter):** ~$0.80 additional

---

## Success Metrics (Week 3 Validation)

- [ ] 100% of Aha tasks migrated to TaskCore schema
- [ ] Aha adapter syncs with <2% failure rate
- [ ] Conflict detection works correctly (manual test)
- [ ] Crew can resolve conflicts via chat (`/conflicts resolve`)
- [ ] Fingerprinting catches external changes (A/B test)
- [ ] Zero data loss during migration
- [ ] Adapter healthcheck passes 99.9% uptime

---

## Next Steps

1. **[This Week]** → Crew implements schema + Aha adapter (Week 1)
2. **[Next Week]** → Implement sync loop + conflict resolution (Week 2)
3. **[Week 3]** → Deploy to production + measure success metrics
4. **[Week 3+]** → Add Jira adapter (Phase 2)

This architecture makes Story Agent the center of software delivery, with external PM systems as pluggable data providers. 🚀

