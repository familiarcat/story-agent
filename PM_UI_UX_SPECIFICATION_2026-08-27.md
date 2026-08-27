# Story Agent Unified PM UI/UX Specification
**Balanced Consensus Architecture (Crew Approved)**  
**Date:** August 27, 2026  
**Cost:** $0.01757 (crew research + deliberation)  
**Status:** Ready for Implementation (Week 3)

---

## Executive Summary

The crew researched common Agile/Sprint systems (Jira, Monday, Asana, Azure DevOps, Linear) and reached **unanimous consensus** on a unified UI/UX strategy:

**Core Principle:** Leverage existing global theme system for consistency while layering role-based access controls (RBAC) and real-time sync visibility.

**Key Design Decisions:**
- ✅ **Theme Reuse (70%)** — Use existing `@storyagent/design-tokens` across Web Dashboard + VSCode Extension
- ✅ **RBAC Integration** — Embed `rbac:*` tags in component schemas + runtime permission checks
- ✅ **Visual Consistency** — Maintain <5% pixel variance via automated regression tests
- ✅ **Sync Visibility** — Contextual health alerts (file-level VSCode, sprint-level Web)
- ✅ **Platform-Specific Performance** — 10ms debounce extension, 200ms web (via ConfigMap)
- ✅ **Health Metrics Prominence** — Fixed-position status bars in both platforms
- ✅ **Security-First Design** — Zero unauthorized access events (measured)
- ✅ **Cost-Optimized** — 70/30 split (theme reuse / platform adaptations)

---

## Part 1: Research Summary by Crew Domain

### 1. PICARD (Command/Strategy) — Dashboard Architecture Patterns

**Research Findings:**
- **Jira:** Command-level views emphasize status aggregation (QA dashboard, release overview)
- **Monday:** Simplicity-first UI with kanban-first approach (visual, minimal menu)
- **Asana:** Portfolio views + resource allocation dashboards
- **Linear:** Minimal, modern command bar (slash commands, quick filters)
- **Azure DevOps:** Enterprise integrated views (build pipeline, sprint burndown)

**Top-Level Dashboard Structure (What Admiral/Picard Sees):**
```
┌─ ADMIRAL DASHBOARD (Web Dashboard only) ────────────────────┐
│                                                               │
│  Navigation Bar: [Dashboard] [Stories] [Releases] [Team] [Settings]
│
│  TOP ROW (Key Metrics):
│  ├─ Current Sprint Status: [90% Complete] [5 stories remaining]
│  ├─ Crew Performance: [Crew routing 52%] [Cost/decision $0.009]
│  └─ System Health: [Adapters: Healthy] [Sync: Real-time] [Conflicts: 0]
│
│  MIDDLE ROW (Strategic View):
│  ├─ Release Timeline: Gantt chart (epics + milestones)
│  ├─ Team Capacity: Bar chart (crew hours remaining)
│  └─ Cost Tracker: Burndown chart (budget vs. spent)
│
│  BOTTOM ROW (Alerts & Actions):
│  ├─ Critical Alerts: [3 sync conflicts] [1 failed adapter]
│  ├─ Quick Actions: [Resolve conflicts] [Check adapter logs]
│  └─ Recent Activity: Last 10 crew actions (timestamped)
│
└─────────────────────────────────────────────────────────────┘
```

**Measurement:** Admiral dashboard adoption rate + reduced escalation tickets

---

### 2. DATA (Architecture) — Entity Relationships & Prioritized Fields

**Canonical Entity Model (Story Agent as source of truth):**
```typescript
// Core entities (unified across all adapters)
export interface Story {
  id: UUID;                      // Story Agent canonical ID
  title: string;                 // (required)
  description: string;           // (required)
  status: StoryStatus;           // 'backlog' | 'in_progress' | 'review' | 'done' | 'blocked'
  assignee_id: UUID;             // Crew member
  due_date?: ISO8601;
  story_points: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Adapter lineage (which external systems know this story)
  source_systems: {
    aha?: { id: string; version: string };
    jira?: { id: string; key: string; version: string };
    monday?: { id: string; version: string };
  };
  
  // RBAC metadata (embedded tags)
  rbac: {
    readable_by: ('developer' | 'stakeholder' | 'admin')[];
    editable_by: ('developer' | 'admin')[];
    viewable_fields: string[];  // e.g., ['title', 'status', 'assignee']
  };
  
  // Sync state
  last_sync_timestamp: ISO8601;
  sync_state: 'synced' | 'pending' | 'conflict';
  content_fingerprint: SHA3;
}

export interface Task {
  id: UUID;
  story_id: UUID;                // Parent story
  title: string;
  status: TaskStatus;            // Finer-grained than Story
  acceptance_criteria: string[];
  test_status?: 'untested' | 'passed' | 'failed';
  
  // Same RBAC + sync fields as Story
  rbac: { readable_by: []; editable_by: [] };
  last_sync_timestamp: ISO8601;
}

export interface Release {
  id: UUID;
  name: string;
  target_date: ISO8601;
  status: 'planned' | 'in_progress' | 'deployed';
  stories: Story[];             // Aggregated
  
  // RBAC + sync fields
  rbac: { readable_by: []; editable_by: [] };
}

export interface Epic {
  id: UUID;
  title: string;
  status: EpicStatus;
  stories: Story[];              // Aggregated
  
  // RBAC + sync fields
  rbac: { readable_by: []; editable_by: [] };
}
```

**Prioritized Fields Per View Type:**

| View Type | Visible Fields | Hidden (collapsible) | RBAC Gated |
|-----------|---|---|---|
| **Developer Dashboard** | title, status, assignee, due_date, story_points, sync_state | description, source_systems, acceptance_criteria | editable_by=developer |
| **Stakeholder Dashboard** | title, status, due_date, priority, release | story_points (internal only), assignments | readable_by=stakeholder |
| **Admiral Dashboard** | title, status, release, crew_hours, cost_metrics | individual story details | visible to admin only |
| **Task Detail Panel** | title, status, acceptance_criteria, test_status, assigned_to | source_systems lineage, sync history | editable_by=developer |

**Measurement:** Schema validation failures logged in CI (`mismatched_role_component_count`), <5% pixel variance in snapshots

---

### 3. RIKER (Implementation) — VSCode Extension Component Patterns

**VSCode Extension Architecture (Lightweight Sidebar):**

```
┌─ Story Agent (VSCode Sidebar) ──────────────────┐
│                                                  │
│  [/] (Slash command palette)                    │
│  ├─ /explain <story> — explain task in chat     │
│  ├─ /fix <story> — propose fix in chat          │
│  ├─ /test <story> — run tests + report          │
│  ├─ /audit <story> — audit permissions         │
│  └─ /sync <story> — manually sync adapter       │
│                                                  │
│  ┌─ QUICK FILTERS ──────────────────────────┐  │
│  │ [My Tasks] [In Progress] [Blocked] [All] │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌─ TASK LIST ───────────────────────────────┐ │
│  │ [SYNC: Healthy ✓]                         │ │
│  │                                            │ │
│  │ > STORY-123: Implement chat (1 of 3)      │ │
│  │   ├─ [TASK-1] Parser [IN PROGRESS] 👤You │ │
│  │   ├─ [TASK-2] UI Components [BACKLOG]    │ │
│  │   └─ [TASK-3] Testing [BACKLOG]          │ │
│  │                                            │ │
│  │ > STORY-124: PM Schema (due 2026-09-08)   │ │
│  │   ├─ [TASK-1] Migrations [REVIEW]        │ │
│  │   └─ [TASK-2] Tests [IN PROGRESS]        │ │
│  │                                            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ SYNC STATUS ───────────────────────────────┐│
│  │ 🟢 Aha: Healthy (1h ago)                   ││
│  │ 🟢 Jira: Healthy (5m ago)                  ││
│  │ 🟠 Monday: Degraded (30m no sync)          ││
│  │ [View details] [Manual sync]               ││
│  └────────────────────────────────────────────┘│
│                                                  │
│  ┌─ CONFLICT ALERTS ───────────────────────────┐│
│  │ ⚠️  2 unresolved conflicts                  ││
│  │ [STORY-125] Status mismatch (Aha vs Jira) ││
│  │ [STORY-126] Assignment conflict            ││
│  │ [Resolve in chat] [Dismiss]                ││
│  └────────────────────────────────────────────┘│
│                                                  │
└──────────────────────────────────────────────────┘
```

**Core Components (Using `@storyagent/design-tokens`):**
- `TaskCard` — Story + Task display with status badge
- `SyncStatusWidget` — Real-time adapter health + sync timestamp
- `ConflictAlert` — Unresolved conflict indicator with quick-action buttons
- `SlashCommandPalette` — Command registry + suggestions
- `QuickFilters` — Status-based filtering (My Tasks, In Progress, etc.)

**Webview CSS Isolation (Security):**
```typescript
// packages/vscode-extension/src/webview.ts

// Enforce token cascade validation
const validateWebviewTokens = async () => {
  const styles = document.styleSheets;
  for (let sheet of styles) {
    for (let rule of sheet.cssRules) {
      // Verify all color tokens are from @storyagent/design-tokens
      if (rule.style.color && !isValidToken(rule.style.color)) {
        console.warn(`Token leakage detected: ${rule.style.color}`);
        fail_ci(); // Trigger test failure
      }
    }
  }
};

// postMessage payload sanitization (Worf's requirement)
window.addEventListener('message', (event) => {
  const message = event.data;
  if (!isValidSignature(message)) {
    console.error('SECURITY: Unsigned message rejected');
    return;
  }
  // ... process validated message
});
```

**Measurement:** Riker's WebView CSS audit via `document.styleSheets` inspection, zero CSS injection incidents

---

### 4. GEORDI (Infrastructure) — Real-Time Sync & Performance Views

**Adapter Health Dashboard (Web Dashboard):**

```
┌─ ADAPTER STATUS (Real-Time Updates) ──────────────────────┐
│                                                              │
│ Sync Frequency: [Every 5min] [Manual Sync]                 │
│                                                              │
│ ┌─ AHA ADAPTER ────────────────────────────────────────────┐
│ │ Status: 🟢 HEALTHY                                       │
│ │ Last sync: 2 minutes ago                                 │
│ │ Synced: 156/158 tasks (99.2%)                           │
│ │ Conflicts: 0 (auto-resolved)                            │
│ │ Avg latency: 1.2s                                        │
│ │ [Manual sync] [View logs] [Configure]                   │
│ └──────────────────────────────────────────────────────────┘
│
│ ┌─ JIRA ADAPTER ────────────────────────────────────────────┐
│ │ Status: 🟡 DEGRADED (rate limit)                         │
│ │ Last sync: 15 minutes ago                                │
│ │ Synced: 142/145 tasks (97.9%)                           │
│ │ Conflicts: 2 (pending crew approval)                     │
│ │ Avg latency: 3.5s (normal: 0.8s)                        │
│ │ Error rate: 2.1% (threshold: 2.0%)                      │
│ │ [Manual sync] [View logs] [Configure]                   │
│ └──────────────────────────────────────────────────────────┘
│
│ ┌─ MONDAY ADAPTER ────────────────────────────────────────┐
│ │ Status: 🔴 DOWN (auth failure)                          │
│ │ Last sync: 2 hours ago                                  │
│ │ Synced: 0/87 tasks (0%)                                 │
│ │ Conflicts: 87 (pending)                                 │
│ │ Error: "Invalid OAuth token (expired)"                  │
│ │ [Reauthorize] [View logs] [Disable adapter]             │
│ └──────────────────────────────────────────────────────────┘
│
│ ┌─ METRICS SUMMARY ─────────────────────────────────────────┐
│ │ Total tasks synced: 298/390 (76%)                        │
│ │ Auto-resolved conflicts: 8/12 (67%)                      │
│ │ Unresolved conflicts: 4                                  │
│ │ Avg sync latency: 1.8s                                   │
│ │ System health score: 87% (Good)                          │
│ └───────────────────────────────────────────────────────────┘
│
└──────────────────────────────────────────────────────────────┘
```

**Performance Metrics Dashboard:**
```
┌─ PERFORMANCE TIMELINE (Last 24h) ─────────────────────────┐
│                                                              │
│ Sync Latency (p50/p95/p99):                                 │
│ ├─ Aha:   800ms / 1.2s / 2.1s   ✓ (target: <1.5s)         │
│ ├─ Jira:  2.1s / 3.5s / 5.2s    ⚠️ (target: <1.5s)        │
│ └─ Monday: 1.5s / 2.2s / 3.1s   ✓ (after reauth)          │
│
│ Error Rate (24h rolling average):                          │
│ ├─ Aha:   0.3% (threshold: 2%) ✓                          │
│ ├─ Jira:  2.1% (threshold: 2%) ⚠️                          │
│ └─ Monday: 0% (after recovery)                            │
│
│ Conflict Rate (24h rolling average):                       │
│ ├─ Total conflicts: 12                                    │
│ ├─ Auto-resolved: 8 (67%)                                 │
│ ├─ Crew-resolved: 4 (33%)                                 │
│ └─ Avg resolution time: 15 minutes                         │
│
└──────────────────────────────────────────────────────────────┘
```

**Measurement:** Geordi's regression tests (storycap + vscode-test-web), <5% pixel variance, Prometheus metrics (`adapter_retries_total`, `adapter_conflicts`, `adapter_latency_p95`)

---

### 5. WORF (Security) — Permission Scopes & Audit Trails

**RBAC Schema Integration (Embedded in Components):**

```typescript
// Component schema with RBAC tags
export const StoryCardSchema = {
  name: 'StoryCard',
  props: {
    story: { type: Story, required: true },
    rbac: { 
      readable_by: ['developer', 'stakeholder', 'admin'],
      editable_by: ['developer', 'admin'],
      viewable_fields: ['title', 'status', 'assignee', 'due_date', 'story_points']
    }
  },
  // Rendering logic respects RBAC tags
  render: (props) => {
    const user = getCurrentUser();
    if (!user.roles.some(r => props.rbac.readable_by.includes(r))) {
      return <div>Access denied</div>;
    }
    // Only show editable_fields if user can edit
    const canEdit = user.roles.some(r => props.rbac.editable_by.includes(r));
    return <EditableStoryCard story={props.story} editable={canEdit} />;
  }
};
```

**Runtime Permission Checks (API Gateways):**

```typescript
// packages/mcp-server/src/api/middleware/rbac.ts

// Web API Gateway
export const rbacGate = async (req, res, next) => {
  const user = req.auth.user;
  const resource = req.params.resource; // e.g., "stories/STORY-123"
  
  // Check WorfGate permission
  const hasAccess = await worfgate.checkPermission({
    user_id: user.id,
    resource,
    action: req.method, // GET, POST, PUT, DELETE
  });
  
  if (!hasAccess) {
    res.status(403).json({ error: 'Unauthorized' });
    // Log for audit trail
    auditLog.record({
      timestamp: new Date(),
      user_id: user.id,
      resource,
      action: req.method,
      result: 'DENIED',
      reason: 'permission_check_failed'
    });
    return;
  }
  
  next();
};

// VSCode Extension Command Scoping
export const registerCommands = () => {
  vscode.commands.registerCommand('storyagent.editTask', async (task) => {
    const user = await getCurrentUser();
    const canEdit = await worfgate.checkPermission({
      user_id: user.id,
      resource: `tasks/${task.id}`,
      action: 'EDIT'
    });
    
    if (!canEdit) {
      vscode.window.showErrorMessage('You do not have permission to edit this task');
      return;
    }
    
    // Proceed with edit
    await editTask(task);
  });
};
```

**Audit Trail Viewer:**

```
┌─ AUDIT TRAIL (Role-Based Access Log) ──────────────────┐
│                                                          │
│ Filter: [All users] [All resources] [Last 24h]         │
│ [Export]                                                │
│                                                          │
│ Timestamp | User | Resource | Action | Result | Reason  │
│ ──────────────────────────────────────────────────────── │
│ 10:23 AM  | You  | STORY-123 | EDIT | ALLOWED | -     │
│ 10:15 AM  | Jane | STORY-124 | DELETE | DENIED | admin_only |
│ 10:10 AM  | Bob  | EPIC-5 | VIEW | ALLOWED | -         │
│ 09:55 AM  | You  | TASK-567 | EDIT | ALLOWED | -       │
│ 09:45 AM  | Admin | Tasks | DELETE | ALLOWED | -       │
│ 09:30 AM  | Jane | Cost Dashboard | VIEW | DENIED | admin_only |
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Measurement:** Worf's zero unauthorized access incidents, audit logs track all permission checks, CI fails on mismatched role-component pairs

---

### 6. TROI (Stakeholder/UX) — Stakeholder-Facing Analytics & Progress

**Release Timeline Dashboard:**

```
┌─ RELEASE ROADMAP ──────────────────────────────────────┐
│                                                          │
│ v1.0.0 (Due 2026-09-30)        [▓▓▓▓▓▓░░░░] 60%       │
│ ├─ Epic: Auth System [COMPLETE]                        │
│ ├─ Epic: PM Adapters [IN PROGRESS] (5 of 8 stories)   │
│ ├─ Epic: Chat Features [IN PROGRESS] (2 of 5 stories) │
│ └─ Epic: Documentation [BACKLOG] (0 of 3 stories)     │
│
│ v1.1.0 (Due 2026-10-31)        [░░░░░░░░░░] 0%        │
│ ├─ Epic: Advanced Workflows [PLANNED]                 │
│ ├─ Epic: Analytics [PLANNED]                          │
│ └─ Epic: Integrations [PLANNED]                       │
│
└──────────────────────────────────────────────────────────┘
```

**Sprint Burndown Chart:**

```
┌─ SPRINT 3 BURNDOWN ─────────────────────────────────┐
│                                                      │
│ Story Points Remaining (Aug 28 - Sep 8)            │
│ │                                                  │
│ 80 ├─ ╱                                            │
│    │ ╱  Ideal                                      │
│ 60 ├─╱╱═══════                                     │
│    │ ║      ╲                                      │
│ 40 ├─║       ╲  Actual                            │
│    │ ║        ╲                                    │
│ 20 ├─║         ╲                                   │
│    │ ║          ╲___                               │
│  0 ├─╴───────────                                  │
│    └┴──────────────────────────────────────────    │
│      Day 1   Day 3   Day 5   Day 7   Day 8         │
│
│ Velocity: 28 points/day (on track for 224 total)  │
│ Remaining: 42 points (1.5 days of work)           │
│ Status: ON TRACK ✓                                 │
│
└──────────────────────────────────────────────────────┘
```

**Budget Allocation Chart:**

```
┌─ Q3 2026 BUDGET ($50k allocated) ──────────────┐
│                                                  │
│ Crew Hours (60%): $30k ────────────────────     │
│ ├─ Implementation: $18k                          │
│ ├─ Testing & QA: $8k                            │
│ └─ Documentation: $4k                            │
│
│ Infrastructure (30%): $15k ────────┐            │
│ ├─ Cloud services (AWS/Azure)      │            │
│ ├─ OpenRouter compute               │            │
│ └─ Monitoring & observability       │            │
│
│ Contingency (10%): $5k      ┐                   │
│ ├─ Unexpected issues        │                   │
│ └─ Buffer for overruns       │                   │
│
│ Spent to date: $22.3k (44.6% of budget)        │
│ Rate: $3.1k per day                            │
│ Projected finish: Under budget (✓)             │
│
└──────────────────────────────────────────────────┘
```

**Measurement:** Troi tracks reduced "unresolved conflict" support tickets, stakeholder survey feedback, budget variance <5%

---

### 7. CRUSHER (Health/Monitoring) — System Health & Alerting

**Health Status Widget (Fixed-Position, Both Platforms):**

```
Web Dashboard Top-Right Corner:
┌─ SYSTEM HEALTH ──────────────┐
│ 🟢 Overall: 87% (Good)       │
│                              │
│ 🟢 Adapters: Healthy         │
│ 🟢 Sync: Real-time (0 lag)   │
│ 🟡 Performance: 2.1s p95     │
│ 🟢 RBAC: Clean               │
│
│ [View Details] [Alerts]      │
└──────────────────────────────┘

VSCode Sidebar Bottom:
┌─ HEALTH: 87% ─────────────────┐
│ 🟢 Adapters: 3/3 healthy     │
│ 🔴 Conflicts: 2 unresolved   │
│ [Details]                    │
└────────────────────────────────┘
```

**Alert Rules (Auto-Triggered):**
```typescript
export const healthAlertRules = [
  {
    name: 'adapter_sync_failure',
    condition: 'adapter_error_count > 5 in 10min',
    severity: 'critical',
    action: 'notify_crew + escalate_to_admin',
    display: 'Red alert in status bar',
  },
  {
    name: 'conflict_threshold',
    condition: 'unresolved_conflicts > 10',
    severity: 'high',
    action: 'notify_crew + suggest_resolution',
    display: 'Yellow warning, clickable to resolve',
  },
  {
    name: 'performance_degradation',
    condition: 'latency_p95 > 2.0s for 5min',
    severity: 'medium',
    action: 'log + notify_admin',
    display: 'Orange badge (non-blocking)',
  },
  {
    name: 'rbac_violation_attempt',
    condition: 'unauthorized_access_attempt detected',
    severity: 'high',
    action: 'block_action + audit_log + alert_security',
    display: 'Red notification (blocking UI element)',
  },
];
```

**Automatic Rollback Mechanism:**
```typescript
// If system health drops below critical threshold
export const autoRollbackPolicy = {
  trigger: 'health_score < 60 for 5min',
  action: 'restore_from_last_good_snapshot',
  measurement: {
    trigger_count: 'crusher_rollback_triggered metric',
    recovery_time: 'snapshot_restore_latency_p50',
    success_rate: 'rollback_success_rate',
  }
};
```

**Measurement:** Crusher tracks rollback frequency, health score trends, mean-time-to-recovery (MTTR), alert response times

---

### 8. O'BRIEN (DevOps/Release) — Deployment Pipeline Views

**CI/CD Pipeline Dashboard:**

```
┌─ DEPLOYMENT PIPELINE (Latest PR: #1247) ─────────────┐
│                                                        │
│ [🟢 PASSED] Code review (2/2 approvals)             │
│             └─ Approved by: Data, Worf               │
│
│ [🟢 PASSED] Lint + typecheck                         │
│             └─ 0 errors, 0 warnings                  │
│
│ [🟢 PASSED] Unit tests (284/284)                     │
│             └─ Coverage: 92%                          │
│
│ [🟢 PASSED] Integration tests (45/45)                │
│             └─ Duration: 3m 22s                       │
│
│ [🟢 PASSED] Visual regression tests                  │
│             └─ <1% pixel variance (threshold: <5%)   │
│
│ [🟢 PASSED] Security audit (Worf RBAC checks)       │
│             └─ 0 violations, 0 warnings              │
│
│ [⏳ RUNNING] Deploy to staging                       │
│             └─ ETA: 2 minutes                        │
│
│ [⏹️  PENDING] Deploy to production                    │
│              └─ Requires Admiral approval (Picard)   │
│
└────────────────────────────────────────────────────────┘
```

**Release Management:**

```
┌─ ACTIVE RELEASES ──────────────────────────────────┐
│                                                     │
│ v1.0.0-beta (Staging)                              │
│ ├─ Branch: feat/pm-abstraction                     │
│ ├─ Deployed: 2 hours ago                           │
│ ├─ Tests: 284/284 passing ✓                        │
│ └─ Status: Ready for Admiral approval              │
│
│ v0.9.2 (Production)                                │
│ ├─ Branch: release/v0.9.2                          │
│ ├─ Deployed: 2 days ago                            │
│ ├─ Uptime: 99.95% (7.2h downtime in past month)   │
│ └─ Incident: 1 unresolved (adapter rate limit)    │
│
│ v0.9.1 (Maintenance)                               │
│ ├─ Branch: release/v0.9.1                          │
│ ├─ Deployed: 7 days ago                            │
│ ├─ Status: Deprecated (EOL 2026-09-01)            │
│ └─ Action: Plan cutover to v0.9.2                 │
│
└─────────────────────────────────────────────────────┘
```

**Measurement:** O'Brien tracks CI/CD pipeline duration (<5min target), test pass rate (>95%), deployment success rate (>99%)

---

### 9. YAR (QA/Testing) — Quality & Test Coverage Views

**Test Status Dashboard:**

```
┌─ TEST COVERAGE (Latest Build: #4821) ──────────────┐
│                                                     │
│ Unit Tests: ███████████████░░░░░ 92% (284/308)   │
│ Coverage: ████████████████░░░░░░ 84% (code)       │
│
│ Integration Tests: ██████████████████░░░░ 89% (45/51)
│ Coverage: ████████████████░░░░░░ 78% (E2E)         │
│
│ UI Component Tests: ███████████░░░░░░░░░░ 65% (52/80)
│ Snapshot tests: ████████████████░░░░░░░░ 72%       │
│
│ Performance Tests: █████████░░░░░░░░░░░░░░ 45% (need work)
│ Target: 100% (blocking for release)               │
│
│ Security Tests (Worf): █████████████░░░░░░░░░░ 63%
│ RBAC coverage: ███████████░░░░░░░░░░░░░░ 55%       │
│
│ Accessibility Tests: ███████████░░░░░░░░░░░░░ 50%  │
│
├─ Red flags: [2 performance tests failing]         │
│            [4 RBAC edge cases untested]           │
│            [Missing accessibility audit]         │
│
└─────────────────────────────────────────────────────┘
```

**Test Execution Timeline:**
```
┌─ TEST RUN #4821 (Duration: 8m 43s) ───────────────┐
│                                                     │
│ [████████] Setup & build (1m 23s) ✓               │
│ [████████████████] Unit tests (3m 12s) ✓          │
│ [████████████████████] Integration tests (2m 11s) ✓ │
│ [████████] Visual regression (1m 02s) ✓           │
│ [████] Security audit (0m 55s) ✓                  │
│ [██] Report generation (0m 03s) ✓                 │
│                                                     │
│ Overall result: ✓ PASS                            │
│ Blockers: None                                     │
│ Ready to merge: Yes ✓                             │
│
└─────────────────────────────────────────────────────┘
```

**Regression Detection:**
```
┌─ REGRESSION MONITOR ─────────────────────────────┐
│                                                   │
│ New failures (not in baseline):                 │
│ ├─ LoginFlow::testOAuthToken [REGRESSION]      │
│ │  └─ Expected pass rate 100%, got 95%         │
│ ├─ StoryPanel::renderWithRBAC [NEW FAILURE]    │
│ │  └─ 5 role combinations untested              │
│ └─ AdapterSync::testConflictResolution [FLAKY] │
│    └─ Pass rate: 94% (threshold: 98%)          │
│
│ Previous passing (now failing):                 │
│ └─ None detected ✓                              │
│
│ Recommendation: Fix 3 blockers before merge    │
│
└────────────────────────────────────────────────┘
```

**Measurement:** Yar tracks test pass rate >95%, coverage >85%, regression-free builds, mean-time-to-fix regressions <4 hours

---

### 10. UHURA (Communications) — Activity Feeds & Notifications

**Activity Feed (Real-Time Sidebar Panel):**

```
┌─ ACTIVITY FEED (Live Updates) ──────────────┐
│                                              │
│ 🕐 Now    [You] completed TASK-567         │
│ 1m ago    [Jane] commented on STORY-123     │
│ 3m ago    [Bob] moved STORY-124 to "Review" │
│ 5m ago    [System] Aha adapter synced ✓     │
│ 8m ago    [Crusher] Health alert: High ⚠️  │
│ 12m ago   [Admin] Approved PR #1247         │
│ 14m ago   [You] assigned TASK-789 to Jane  │
│ 18m ago   [System] Jira adapter degraded 🟡 │
│ 22m ago   [Worf] Permission denied attempt  │
│ 25m ago   [You] opened PR #1248             │
│                                              │
│ [Load more] [Settings] [Mute all]           │
│                                              │
└──────────────────────────────────────────────┘
```

**Notification Preferences:**

```
┌─ NOTIFICATION SETTINGS ────────────────────┐
│                                             │
│ ☑️ Task assignments → Desktop + Slack       │
│ ☑️ Story completions → Slack only          │
│ ☑️ Adapter alerts (critical) → All channels│
│ ☑️ Adapter alerts (warning) → Slack only   │
│ ☑️ Conflict detected → Desktop + Slack     │
│ ☑️ Permission denied → Audit log only      │
│ ☐ Comment mentions → (disabled)            │
│ ☐ Daily digest → (disabled)                │
│                                             │
│ Quiet hours: 6pm - 9am                     │
│ → Do not notify (except critical alerts)   │
│                                             │
│ [Save] [Reset to defaults]                 │
│                                             │
└─────────────────────────────────────────────┘
```

**Notification Example (Sync Conflict Alert):**

```
╔═══════════════════════════════════════════════════════╗
║ ⚠️  SYNC CONFLICT DETECTED                            ║
║───────────────────────────────────────────────────────║
║ Story: STORY-125 (Chat Feature Parity)              ║
║ Conflict: Status mismatch between Aha & Jira       ║
║   Aha:  "In Progress"                              ║
║   Jira: "Ready for Review"                          ║
║                                                      ║
║ Last modified:                                       ║
║   Aha:  2026-08-27 14:23 (You)                      ║
║   Jira: 2026-08-27 14:18 (Jane)                     ║
║                                                      ║
║ Auto-resolution: FAILED (5+ fields differ)          ║
║                                                      ║
║ [Resolve in Chat] [View Details] [Dismiss]         ║
╚═══════════════════════════════════════════════════════╝
```

**Measurement:** Uhura tracks notification delivery rate >99%, alert resolution time, unsubscribe rate <5%, activity feed engagement

---

### 11. QUARK (Finance/Metrics) — Cost & Efficiency Tracking

**Cost Dashboard (Admin View Only):**

```
┌─ Q3 2026 COST ANALYSIS ───────────────────────────┐
│                                                    │
│ Budget: $50,000 | Spent: $22,330 (44.7%)         │
│
│ Breakdown by service:                            │
│ ├─ Crew compute (OpenRouter): $12,100 (54%)     │
│ │  ├─ DeepSeek tier-3: $8,900                   │
│ │  └─ Claude (approval gates): $3,200           │
│ │                                               │
│ ├─ Cloud infrastructure: $6,800 (30%)           │
│ │  ├─ Supabase (DB + realtime): $3,200         │
│ │  ├─ AWS Lambda + API Gateway: $2,100         │
│ │  └─ Redis cache: $1,500                      │
│ │                                               │
│ ├─ Monitoring & logging: $2,430 (11%)          │
│ │  ├─ Prometheus: $800                         │
│ │  └─ CloudWatch: $1,630                       │
│ │                                               │
│ └─ Other (tools, licenses): $1,000 (4%)        │
│
│ Cost/day: $3,190 (expected to drop post-Week3) │
│ Runway at current rate: 15.7 days               │
│ Projected month-end: $8,200 additional         │
│ Total projected: $30.5k (61% of budget)        │
│
│ Trend: 📈 INCREASING (spike due to crew testing)
│ Forecast: 📉 Will decrease Week 4+ (autonomy)  │
│
└────────────────────────────────────────────────────┘
```

**Efficiency Metrics (Crew Autonomy):**

```
┌─ CREW EFFICIENCY (Rolling 7-day avg) ───────────┐
│                                                  │
│ Crew routing %: 52% (target: ≥50%) ✓            │
│ ├─ Week 3 target: 50%+                          │
│ ├─ Projected Week 4: 65%+                       │
│ └─ Long-term goal: 85%+                         │
│
│ Cost per decision: $0.0089 (target: ≤$0.010) ✓ │
│ ├─ Week 2 avg: $0.0125                          │
│ ├─ Improvement: 29% cost reduction              │
│ └─ Projected Week 4: $0.0068                    │
│
│ Story velocity: 45 points/week (target: 40) ✓  │
│ ├─ Sprint 1: 38 points                          │
│ ├─ Sprint 2: 42 points                          │
│ └─ Sprint 3 (current): 51 points (on pace)     │
│
│ Quality metrics:                                │
│ ├─ Test pass rate: 96% (target: >95%) ✓       │
│ ├─ Regressions: 1 (target: 0) ⚠️               │
│ └─ Security incidents: 0 (target: 0) ✓        │
│
└──────────────────────────────────────────────────┘
```

**Measurement:** Quark tracks cost trending, crew routing % trend, ROI per sprint, budget variance <5%

---

## Part 2: Component Architecture (Unified Design System)

### Core Component Registry

**All components use `@storyagent/design-tokens` v3.1.0**

| Component | Usage | Platform | RBAC Support |
|-----------|-------|----------|---|
| `TaskCard` | Story/Task display | Web + VSCode | Yes (field filtering) |
| `SyncStatusBadge` | Adapter health indicator | Web + VSCode | No (always visible) |
| `ConflictAlert` | Unresolved conflict prompt | Web + VSCode | Yes (blocking) |
| `StoryPanel` | Full story detail view | Web only | Yes (field filtering) |
| `SlashCommandPalette` | Command interface | VSCode + Web chat | Yes (command scoping) |
| `ReleaseTimeline` | Gantt chart for releases | Web only | Yes (stakeholder mode) |
| `BurndownChart` | Sprint progress | Web only | Yes (read-only for stakeholders) |
| `HealthWidget` | System health summary | Web + VSCode | No (fixed position) |
| `ActivityFeed` | Real-time activity log | Web only | Yes (scoped to user access) |
| `PermissionMatrix` | RBAC audit | Web only (admin) | Yes (admin only) |

### Theme Token Compliance

**All components inherit from `@storyagent/design-tokens`:**

```typescript
// Design tokens (centralized, version controlled)
const designTokens = {
  colors: {
    status_healthy: '#22c55e',  // Green
    status_degraded: '#eab308', // Yellow
    status_down: '#ef4444',     // Red
    sync_pending: '#f59e0b',    // Amber
    conflict_alert: '#e11d48',  // Rose
  },
  spacing: {
    xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px'
  },
  typography: {
    body: 'Inter, sans-serif',
    mono: 'Monaco, monospace',
  }
};
```

**Testing Compliance:**

```typescript
// packages/ui/src/__tests__/design-token-compliance.test.ts

describe('Design Token Compliance', () => {
  it('should enforce design tokens across Web Dashboard', () => {
    const elements = document.querySelectorAll('[data-token]');
    for (let el of elements) {
      const tokenName = el.dataset.token;
      const computed = getComputedStyle(el);
      const expected = designTokens[tokenName];
      expect(computed.color).toBe(expected);
    }
  });
  
  it('should validate VSCode Webview token cascade', () => {
    const styles = document.styleSheets;
    for (let sheet of styles) {
      for (let rule of sheet.cssRules) {
        const color = rule.style.color;
        if (color) expect(isValidToken(color)).toBe(true);
      }
    }
  });
  
  it('should ensure <5% pixel variance between platforms', () => {
    const web = takeScreenshot('web-dashboard.html');
    const extension = takeScreenshot('extension-webview.html');
    const diff = imageDiff(web, extension);
    expect(diff.variance).toBeLessThan(0.05);
  });
});
```

---

## Part 3: Integration Roadmap (Week 3 Implementation)

### MVP Feature Prioritization

**TIER 1 (Must Have, Days 1-5):**
- ✅ TaskCard component (Story + Task display with status)
- ✅ SyncStatusWidget (Adapter health badge in both platforms)
- ✅ ConflictAlert (Unresolved conflicts prompt)
- ✅ SlashCommandPalette (5 core commands in VSCode + Web chat)
- ✅ RBAC schema integration (embed tags in components)
- ✅ Design token compliance tests (<5% variance)

**TIER 2 (High Value, Days 5-7):**
- 🔄 StoryPanel (full story detail, Web only)
- 🔄 ActivityFeed (real-time updates, Web only)
- 🔄 HealthWidget (system status bar, both platforms)
- 🔄 Runtime RBAC enforcement (API gateways + VSCode commands)

**TIER 3 (Next Sprint, Week 4):**
- ⏳ ReleaseTimeline (Gantt chart, Web dashboard)
- ⏳ BurndownChart (sprint metrics, Web dashboard)
- ⏳ Advanced filtering (@-mentions, pinned context)
- ⏳ Automated visual regression CI gates

---

## Part 4: Autonomous Execution Process

**How the crew self-manages UI updates without Admiral micromanagement:**

```
WORKFLOW: Component Development → Integration → Deployment

PHASE 1: Design (Data + Troi)
  ├─ Define component spec (props, RBAC tags, design tokens)
  ├─ Create Figma mockup (aligned with design tokens)
  └─ Share in Slack #ui-design channel (async review)
     └─ Troi + Riker approve or request changes

PHASE 2: Implementation (Riker)
  ├─ Create component in packages/ui/src/components/
  ├─ Use @storyagent/design-tokens for all styles
  ├─ Add RBAC metadata to component schema
  ├─ Write unit tests (min 80% coverage)
  └─ Open PR with link to design spec

PHASE 3: Review & Testing (Geordi + Yar)
  ├─ CI pipeline runs:
  │  ├─ Lint + typecheck (auto-fail on errors)
  │  ├─ Unit tests (>80% coverage required)
  │  ├─ Visual regression (Geordi's <5% pixel variance)
  │  ├─ RBAC schema validation (Data's compliance check)
  │  └─ Security audit (Worf's permission checks)
  └─ If all green, proceed to integration

PHASE 4: Integration (Riker)
  ├─ Wire component into Web Dashboard layout
  ├─ Wire component into VSCode sidebar (if applicable)
  ├─ Test cross-platform consistency (snapshot tests)
  └─ Update Storybook + component docs

PHASE 5: Deployment (O'Brien)
  ├─ Merge to main (after Admiral approval on Picard's summary)
  ├─ Deploy to staging (smoke tests)
  ├─ Deploy to production (via CI/CD pipeline)
  └─ Monitor health (Crusher dashboards)

FEEDBACK LOOP:
  ├─ Uhura posts metrics to Slack daily
  ├─ If any metric misses target by >10%:
  │  └─ Trigger crew Observation Lounge (async)
  │     ├─ Root cause analysis
  │     ├─ Propose fix
  │     └─ Execute iteratively
  └─ No Admiral oversight needed (self-healing)
```

---

## Part 5: Success Criteria (Week 3 Validation)

### Go/No-Go Checkpoint

| Metric | Target | Measurement | Owner |
|--------|--------|-------------|-------|
| **Component Reuse** | 80% | Shared components count / total | Yar |
| **Design Token Compliance** | 100% | CI passes token validation | Geordi |
| **Pixel Variance** | <5% | Visual regression test diffs | Geordi |
| **RBAC Coverage** | 100% | Schema validation mismatches = 0 | Data |
| **Permission Tests** | 100% | Zero unauthorized access incidents | Worf |
| **Performance (p95 latency)** | <2.0s | VSCode: <200ms debounce | Riker |
| **Health Widget Adoption** | >80% | Users viewing health status | Crusher |
| **Support Tickets (Sync)** | <5% | Unresolved conflict tickets | Troi |
| **Crew Confidence** | ✅ | All 11 members thumbs-up in Slack | Picard |

**Outcome:**
- 🟢 **GO** (8/8 criteria met) → Proceed to Week 4 advanced features
- 🟡 **CAUTION** (6-7 met) → Debug gaps, extend validation 2-3 days
- 🔴 **NO-GO** (<6 met) → Escalate to Admiral, reassess scope

---

## Conclusion

This unified UI/UX system empowers the crew to:
1. **Work autonomously** — Consensus-driven design, self-healing via metrics
2. **Maintain consistency** — Leveraging existing theme system, automated regression tests
3. **Balance stakeholder needs** — Developers + stakeholders get relevant data without clutter
4. **Stay secure** — RBAC embedded at schema + runtime layers
5. **Adapt in real-time** — Sync visibility + health metrics drive fast decisions

**Next Step:** Admiral approval → Riker starts coding Monday (Week 3 begins).

