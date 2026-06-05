# Story Agent: Complete UI Architecture

## 🎯 Design Philosophy

**Single Crew, Dual Views**

The same 11-member crew provides intelligence to both roles:
- **Developers** get code-focused guidance
- **Project Managers** get project-focused guidance
- **Both** see the same crew executing in real-time

This enables **parallel work** without bottlenecks.

---

## 📐 UI Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Story Agent Dashboard                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Role Selector: [PROJECT MANAGER] [DEVELOPER]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         PROJECT MANAGER VIEW    │    DEVELOPER VIEW │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │ Sprint Board                   Story Workspace      │   │
│  │ ├─ Kanban columns              ├─ Story details    │   │
│  │ ├─ Velocity tracking           ├─ Crew execution   │   │
│  │ ├─ Risk indicators             ├─ Code & CI/CD     │   │
│  │ ├─ Blocker alerts              ├─ Crew guidance    │   │
│  │ │                              └─ Quick actions    │   │
│  │ Roadmap View                   │                   │   │
│  │ ├─ Sprint timeline             Developer sees:     │   │
│  │ ├─ Capacity planning           • Architecture tips │   │
│  │ └─ Release schedule            • Security checks   │   │
│  │                                • Code quality      │   │
│  │ Crew Status                    • Test strategies   │   │
│  │ ├─ Individual workload         • Implementations   │   │
│  │ ├─ Availability tracking       │                   │   │
│  │ └─ Performance metrics         Side Panel:         │   │
│  │                                • Story info card   │   │
│  │ Budget & Cost                  • Crew progress     │   │
│  │ ├─ Allocation tracking         • Blockers/risks    │   │
│  │ ├─ Spend vs budget             • Quick actions     │   │
│  │ └─ Cost breakdown              │                   │   │
│  │                                                      │   │
│  │ Right Sidebar (Both):                               │   │
│  │ ┌─────────────────────────────────┐                │   │
│  │ │ PROJECT MANAGER ADVISOR          │                │   │
│  │ │ • Timeline risks                 │                │   │
│  │ │ • Budget concerns                │                │   │
│  │ │ • Stakeholder alignment          │                │   │
│  │ │ • Pending crew decisions         │                │   │
│  │ │ • Resource optimization          │                │   │
│  │ └─────────────────────────────────┘                │   │
│  │                                                      │   │
│  │              DEVELOPER ADVISOR                       │   │
│  │ • Architecture recommendations                       │   │
│  │ • Security checks (CRITICAL alerts)                  │   │
│  │ • Code quality suggestions                           │   │
│  │ • Test strategies                                    │   │
│  │ • Implementation guidance                            │   │
│  │ • Crew consensus decisions                           │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 PROJECT MANAGER VIEW

### 1. Sprint Board (Main Dashboard)

**Purpose:** Real-time sprint progress with Kanban columns

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Sprint: Sprint 3 (2024-01-15 → 2024-01-29)     │
│ 5 days remaining                                │
├─────────────────────────────────────────────────┤
│ [📋 STATS]                                      │
│ Total: 42 pts │ Velocity: 23 pts │ 55% Done    │
│ In Progress: 12 pts │ Blocked: 3 pts           │
│ Days Left: 5                                    │
├─────────────────────────────────────────────────┤
│ 📋 BACKLOG  │ ✅ READY  │ 🔄 IN PROGRESS      │
│ [5 stories] │ [3 stories]│ [6 stories]        │
│             │           │ [Crew: 42% done]   │
│ STORY-101   │ STORY-201 │ STORY-301          │
│ 8pts        │ 5pts      │ 5pts [⚠️ 3 blockers]│
│             │           │                    │
│ STORY-102   │ STORY-202 │ STORY-302          │
│ 5pts        │ 3pts      │ 3pts               │
│             │           │                    │
│ [+ Add]     │ [+ Add]   │ [+ Add]            │
│                                               │
│ 👀 IN REVIEW      │ 🎉 COMPLETE            │
│ [2 stories]       │ [4 stories]            │
│                   │                        │
│ STORY-401         │ STORY-501              │
│ 5pts              │ 8pts ✓ MERGED          │
│ [Crew Decision]   │                        │
│                   │ STORY-502              │
│ STORY-402         │ 6pts ✓ DEPLOYED        │
│ 3pts [🛑 VETO]    │                        │
│ [Security issue]  │ [4 more...]            │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ Kanban columns: Backlog → Ready → In Progress → In Review → Complete
- ✅ Story cards with: points, assignee, crew progress, risk level, blockers
- ✅ Sprint metrics: total velocity, completion %, days remaining
- ✅ Visual blockers: red highlight for blocked stories
- ✅ Crew progress indicator on each story (0-100%)
- ✅ Decision indicators: ⚖️ = pending crew decision, 🛑 = security veto

**Data Flow:**
```
SprintBoard
├─ GET /api/agile/sprints/{id} → Sprint details
├─ GET /api/agile/stories?sprintId={id} → All stories
├─ WebSocket subscribe → Real-time crew state updates
└─ Refreshes every 10 seconds
```

**Interactions:**
- Click story → Open detailed view
- Drag story → Change status
- Hover crew progress → See which crew members are done
- Click blocker badge → View blocker details

---

### 2. Roadmap View

**Purpose:** Multi-sprint planning and capacity visibility

**Layout:**
```
Sprint 1 (Dec 15-29)                    [✓ COMPLETE - 100%]
├─ Target: 50 pts
├─ Actual: 52 pts
└─ Status: Deployed to production

Sprint 2 (Jan 1-14)                     [✓ COMPLETE - 100%]
├─ Target: 45 pts
├─ Actual: 44 pts
└─ Status: In production

Sprint 3 (Jan 15-29) [CURRENT]          [🔄 IN PROGRESS - 65%]
├─ Target: 42 pts
├─ Actual (so far): 23 pts
├─ Status: Execution
└─ Days left: 5

Sprint 4 (Feb 1-14)                     [📋 PLANNED - 0%]
├─ Target: 40 pts
├─ Assigned: 38 pts
└─ Status: Ready to start

Sprint 5 (Feb 15-Mar 1)                 [📋 PLANNED - 0%]
├─ Target: 40 pts
├─ Assigned: 28 pts
└─ Status: In planning
```

**Key Features:**
- ✅ Timeline view of all sprints
- ✅ Capacity planning (target vs assigned)
- ✅ Sprint status indicators
- ✅ Velocity trends
- ✅ Release planning

---

### 3. Crew Status View

**Purpose:** Individual crew member workload and capacity

**Layout:**
```
Crew Utilization Summary
├─ Total: 11 crew members
├─ Executing: 7 members (64%)
├─ Idle: 4 members (36%)

Picard (Captain)        [  IDLE ]  0 active stories
Data (Architect)        [EXECUTING] 2 active stories
Riker (Developer)       [EXECUTING] 3 active stories
Geordi (Infrastructure) [  IDLE ]  0 active stories
O'Brien (DevOps)        [EXECUTING] 1 active story
Worf (Security)         [EXECUTING] 2 active stories
Yar (QA)                [EXECUTING] 2 active stories
Troi (Analyst)          [  IDLE ]  0 active stories
Crusher (Health)        [  IDLE ]  0 active stories
Uhura (Communications)  [  IDLE ]  0 active stories
Quark (Finance)         [  IDLE ]  0 active stories
```

**Key Features:**
- ✅ Individual crew status
- ✅ Active story count
- ✅ Workload distribution
- ✅ Availability tracking
- ✅ Performance metrics

---

### 4. Budget & Cost View

**Purpose:** Cost tracking and budget management

**Layout:**
```
Budget Summary
├─ Allocated: $10,000
├─ Spent: $7,450 (74.5%)
└─ Remaining: $2,550

Cost Breakdown
├─ LLM Usage: $4,200 (56%)
├─ Infrastructure: $2,100 (28%)
└─ Tools & Services: $1,150 (16%)

Trend Analysis
├─ Burn rate: $1,500/week
├─ Projected total: $9,850
├─ Status: ✓ Within budget
```

**Key Features:**
- ✅ Budget allocation tracking
- ✅ Spend by category
- ✅ Burn rate analysis
- ✅ Projected overrun alerts
- ✅ Cost per story metrics

---

### 5. Risks & Decisions View

**Purpose:** Identify blockers and crew decision recommendations

**Layout:**
```
Active Risks
├─ 🔴 CRITICAL: Security issue in STORY-456
│  └─ Cannot merge until SQL injection fixed
│
├─ 🟠 HIGH: Timeline Risk - 2 stories behind
│  └─ May miss sprint goal by 2 days
│
├─ 🟠 HIGH: Budget trending 115%
│  └─ Projected overrun: ~$1,150
│
└─ 🟡 MEDIUM: Stakeholder alignment unclear
   └─ Scope creep risk

Crew Decisions Pending Approval
├─ ⚖️ [Individual] Approve STORY-123 PR
│  Crew: "All reviews complete, no blockers"
│  Confidence: 92%
│  [✓ APPROVE] [✗ REJECT]
│
└─ ⚖️ [Consensus] Accelerate timeline
   Crew: "Infrastructure ready early, can reduce deploy by 30%"
   Authority: Consensus (4 crew members agreed)
   [✓ APPROVE] [✗ REJECT]
```

**Key Features:**
- ✅ Risk prioritization
- ✅ Blocker tracking
- ✅ Impact analysis
- ✅ Crew decision display
- ✅ Approval/rejection workflow

---

### Right Sidebar: PM Advisor

**Real-time guidance for project managers**

```
PROJECT MANAGER ADVISOR

📊 INSIGHTS (7)
├─ 🔴 CRITICAL (1)
│  └─ Security issue blocking PR merge
│
├─ 🟠 HIGH (2)
│  ├─ Timeline at Risk
│  └─ Budget over limit
│
├─ 🟡 MEDIUM (2)
│  ├─ Resource optimization opportunity
│  └─ Stakeholder alignment needed
│
└─ 🔵 LOW (2)
   └─ Communication improvements

⚖️ DECISIONS (2)
├─ Approve Implementation [👤 Individual]
│  Picard: "Ready to merge, all reviews done"
│  [✓] [✗]
│
└─ Accelerate Timeline [👥 Consensus]
   Geordi: "Infrastructure ready early"
   [✓] [✗]
```

---

## 💻 DEVELOPER VIEW

### 1. Developer Story Workspace

**Purpose:** Individual story execution with crew guidance

**Layout:**
```
┌───────────────────────────────────────────────────────────┐
│ STORY-456: Add user authentication with OAuth             │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ [📋 Details] [🚀 Execution] [💻 Code] [🤖 Guidance]     │
│                                                           │
│ ┌─────────────────────────────┬──────────────────────┐  │
│ │ MAIN CONTENT                │ RIGHT SIDEBAR        │  │
│ │                             │                      │  │
│ │ Story Details               │ Quick Info           │  │
│ │ ├─ Title & description      │ ├─ Story: STORY-456 │  │
│ │ ├─ Acceptance Criteria      │ ├─ Points: 8        │  │
│ │ │  ▢ User can login        │ ├─ Status: In Dev   │  │
│ │ │  ▢ OAuth token stored    │ └─ Due: Jan 29      │  │
│ │ │  ▢ Logout works          │                      │  │
│ │ │  ▢ Token refresh         │ Crew Status         │  │
│ │ │  ▢ Session expires       │ ├─ Progress: 6/11   │  │
│ │ │                           │ │ [████████░]       │  │
│ │ │ Metadata:                │ │                    │  │
│ │ │ • Repository: api-repo   │ ├─ Data     [✓]    │  │
│ │ │ • Branch: STORY-456      │ ├─ Riker    [✓]    │  │
│ │ │ • Assignee: Alice        │ ├─ Worf     [✓]    │  │
│ │ │                           │ ├─ Yar      [✓]    │  │
│ │ │ [→ Create Branch]         │ ├─ O'Brien  [✓]    │  │
│ │ │ [✓ Mark In Review]        │ ├─ Geordi   […]    │  │
│ │ │ [📊 View Metrics]         │ └─ Crusher  [◯]    │  │
│ │ │                           │                      │  │
│ │ │ Crew Execution            │ 🛑 No blockers      │  │
│ │ │ Phase: In Review          │                      │  │
│ │ │ Status: Code Review       │ ✓ Crew Connected    │  │
│ │ │ Cost: $2.34               │                      │  │
│ │ │ Time: 4h 23m              │                      │  │
│ │ │                           │                      │  │
│ │ │ [→ Build Log]             │                      │  │
│ │ │ [→ Latest Commit]         │                      │  │
│ │ │                           │                      │  │
│ │ └─────────────────────────────┴──────────────────────┘  │
│ │                                                        │  │
│ │ Code & CI/CD Status                                  │  │
│ │ ├─ CI/CD: ✓ PASSED                                   │  │
│ │ │ [████████████████] 100%                            │  │
│ │ │                                                    │  │
│ │ ├─ Test Coverage: 92%                                │  │
│ │ │ [███████████████░] Target: 80%                    │  │
│ │ │                                                    │  │
│ │ └─ PR #456 Ready for Review                         │  │
│ │    [→ View on GitHub]                               │  │
│ │                                                      │  │
│ │ Crew Guidance                                        │  │
│ │ ├─ 🏗️ Architecture Review (Data)                     │  │
│ │ │  "OAuth implementation follows best practices"    │  │
│ │ │  Confidence: 88%                                  │  │
│ │ │  Actions: ✓ Validate token expiry, Add refresh   │  │
│ │ │                                                    │  │
│ │ ├─ 🔒 Security Check (Worf) - CRITICAL             │  │
│ │ │  "Token storage uses secure httpOnly cookies"    │  │
│ │ │  Confidence: 95%                                  │  │
│ │ │  ⚠️ Crew can block PR merge if issues found      │  │
│ │ │                                                    │  │
│ │ └─ ✅ Test Strategy (Yar)                            │  │
│ │    "Add unit tests for token refresh flow"          │  │
│ │    Actions: ✓ Mock OAuth provider, Test edge cases  │  │
│ │                                                      │  │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Four Main Tabs:**

1. **📋 Story Details**
   - Full story description
   - Acceptance criteria (interactive checklist)
   - Story metadata (points, assignee, dates)
   - Related stories/dependencies
   - Quick action buttons

2. **🚀 Crew Execution**
   - Real-time crew execution progress
   - Individual crew member status
   - Findings and recommendations
   - Blockers and vetoes
   - Cost and time tracking
   - Next steps guidance

3. **💻 Code & CI/CD**
   - CI/CD pipeline status (pass/fail)
   - Build logs and diagnostics
   - Test coverage metrics
   - Pull request information
   - Branch management

4. **🤖 Crew Guidance** (Most Important for Developer)
   - Architecture recommendations (Data)
   - Security checks with alerts (Worf) - CRITICAL priority
   - Code quality suggestions (Crusher)
   - Test coverage strategies (Yar)
   - Implementation patterns (Riker)
   - All with action items and confidence scores

**Right Sidebar:**
- Story quick info
- Crew execution summary with individual status
- Blockers and risks
- Connection status

---

## 🔄 Real-Time Data Flow

### Developer Perspective

```
Developer opens story
    ↓
DeveloperStoryWorkspace mounts
    ↓
├─ Fetch story details (GET /api/stories/{id})
├─ WebSocket connect to ws://localhost:8000
│  └─ Send: { type: 'subscribe', storyRef: 'STORY-456' }
│
└─ Every 5 seconds (auto-refresh):
   ├─ Fetch crew insights (GET /api/crew/insights?storyRef=STORY-456&role=developer)
   ├─ Receive crew updates via WebSocket
   └─ Receive crew decisions (GET /api/crew/decisions?storyRef=STORY-456&status=pending)

Developer reads guidance
    ↓
Developer implements
    ↓
Developer commits
    ↓
Crew executes review
    ↓
If issues: DeveloperAdvisor shows recommendations
If approved: PR merges (or awaits approval if high-risk)
```

### Project Manager Perspective

```
PM opens dashboard
    ↓
ProjectManagerDashboard mounts
    ↓
├─ Fetch sprint data (GET /api/agile/sprints/{id})
├─ Fetch all stories (GET /api/agile/stories?sprintId={id})
├─ WebSocket connect to ws://localhost:8000
│  └─ Subscribe to all stories in sprint
│
└─ Every 10 seconds (auto-refresh):
   ├─ Update sprint progress
   ├─ Update crew status
   ├─ Fetch PM insights (GET /api/crew/insights?projectId=X&role=project_manager)
   └─ Fetch pending decisions (GET /api/crew/decisions?projectId=X&status=pending)

PM sees risks and alerts
    ↓
PM approves/rejects crew decisions
    ↓
Crew executes approved decisions
    ↓
If decision approved: Auto-merge PR, update status, post comments
If decision rejected: Return to crew for revision
```

---

## 🎨 Color & Status Scheme

**Story Status Colors:**
```
Backlog:     📋 Gray (#f3f4f6)
Ready:       ✅ Blue (#eff6ff)
In Progress: 🔄 Yellow (#fffbeb)
In Review:   👀 Purple (#f3e8ff)
Complete:    🎉 Green (#f0fdf4)
Blocked:     🛑 Red (#fef2f2)
```

**Risk Levels:**
```
Low:      🔵 Blue
Medium:   🟡 Yellow
High:     🟠 Orange
Critical: 🔴 Red
```

**Crew Status:**
```
Idle:      ⭕ Green
Executing: ⚙️ Yellow
Complete:  ✅ Green
Error:     ❌ Red
```

**Decision Authority:**
```
Individual:  👤 Single decision maker
Consensus:   👥 Multiple crew members agreed
Veto:        🛑 Security block (Worf)
```

---

## 📊 Dashboard Refresh Strategy

| Component | Refresh Rate | Trigger |
|-----------|--------------|---------|
| Sprint Board | 10 seconds | Time interval |
| Developer Workspace | 5 seconds | Time interval |
| PM Advisor | Real-time | WebSocket |
| Dev Advisor | 5 seconds | Time interval |
| Crew Status | 10 seconds | Time interval |
| Budget View | 30 seconds | Time interval |
| Risks View | 5 seconds | Time interval |

---

## 🔌 Required API Endpoints

**Agile Management:**
- `GET /api/agile/sprints/{id}` — Sprint details
- `GET /api/agile/stories?sprintId={id}` — Stories in sprint
- `GET /api/stories/{id}` — Story details

**Crew System:**
- `GET /api/crew/insights?storyRef={ref}&role={role}` — Role-specific insights
- `GET /api/crew/decisions?storyRef={ref}&status={status}` — Pending decisions
- `POST /api/crew/decisions/{id}/approve` — Approve decision
- `POST /api/crew/decisions/{id}/reject` — Reject decision

**WebSocket:**
- `ws://localhost:8000` — Real-time crew state
- Message: `{ type: 'subscribe', storyRef: 'STORY-123' }`

---

## 🚀 Implementation Status

✅ **Built Components:**
- SprintBoard.tsx (Kanban with stats)
- DeveloperStoryWorkspace.tsx (4 tabs + sidebar)
- ProjectManagerDashboard.tsx (5 views)
- DeveloperAdvisor.tsx (crew guidance)
- ProjectManagerAdvisor.tsx (PM guidance)

⏳ **Awaiting API Integration:**
- Connect mock data to real endpoints
- Link WebSocket updates to components
- Implement decision approval flows

---

## 📱 Mobile Considerations

**Mobile-first components:**
- Story cards responsive
- Kanban columns stack on mobile
- Advisor panels hidden, accessible via tabs
- Core metrics always visible

**Responsive breakpoints:**
```
Desktop: 1400px+ (full layout)
Tablet:  768px-1399px (3-column → 2-column)
Mobile:  < 768px (single column, tabs for navigation)
```

---

## Summary

**Two distinct views, one unified crew:**

| Aspect | Project Manager | Developer |
|--------|-----------------|-----------|
| **Main View** | Sprint Board (Kanban) | Story Workspace (Tabs) |
| **Key Metrics** | Velocity, points, timeline | Progress, coverage, quality |
| **Crew Focus** | Team workload, decisions | Technical guidance |
| **Advisor** | Timeline, budget, risks | Architecture, security, quality |
| **Actions** | Approve decisions, plan | Implement, test, commit |
| **Refresh** | Every 10s | Every 5s (real-time) |

Both roles work in parallel, enabled by real-time crew intelligence in the advisors.
