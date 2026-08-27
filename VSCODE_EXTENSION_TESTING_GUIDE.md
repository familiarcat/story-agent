# VSCode Extension Testing Guide — Phase 6 UI/UX Unified

## Quick Start (5 minutes)

### 1. Install the Extension Locally

```bash
# The VSIX has been packaged at:
# packages/vscode-extension/story-agent-vscode-1.0.0.vsix

# Option A: Install via VSCode UI
1. Open VSCode
2. Extensions > ... menu (top right) > Install from VSIX
3. Select: packages/vscode-extension/story-agent-vscode-1.0.0.vsix
4. Reload window

# Option B: Install via CLI
code --install-extension packages/vscode-extension/story-agent-vscode-1.0.0.vsix
```

### 2. Start the MCP Server

```bash
# Terminal 1: Start MCP server (provides crew tools + Phase 6)
cd /Users/bradygeorgen/Developer/story-agent
pnpm run mcp
# Expected: "MCP server listening on stdio"
```

### 3. Connect Extension to MCP

```bash
# Terminal 2: Start VSCode with MCP enabled
# VSCode will auto-detect the MCP server via .mcp.json

# Or manually configure:
# Cmd+Shift+P > "Copilot: Toggle MCP Enabled"
# Should show: ✅ MCP Connected (11 crew members available)
```

---

## Testing Checklist (30 minutes)

### Test Category 1: Crew Status & Monitoring

#### ✅ Crew Status Panel
```
Test: Cmd+Shift+P > "Story Agent: View Crew Status"
Expected:
├─ Panel opens on right side
├─ Shows: "11 Crew Members" header
├─ Lists all roles: Picard, Data, Riker, Geordi, Worf, etc.
├─ Each member shows: [Status Badge] Role (Assigned, Learning, Idle)
├─ Color coding: 🟢=idle, 🟡=learning, 🔴=executing, ⚫=error
└─ Real-time updates as missions execute

Validation:
  ✓ All 11 crew members visible
  ✓ Status badges update as tasks run
  ✓ Panel refreshes every 2-3 seconds
  ✓ No console errors (Cmd+Shift+J)
```

#### ✅ Autonomy Level Indicator
```
Test: Look at status bar (bottom of window)
Expected:
├─ Shows: "🖖 Phase 6 [Level 0/5]" badge
├─ Current autonomy level displayed
├─ Time-to-next-level estimation shown on hover
├─ Tooltip: "Next level T+3 hours (Level 2 - Self-validation)"
└─ Badge updates as learning progresses

Validation:
  ✓ Badge visible in status bar
  ✓ Hover shows tooltip
  ✓ Level increments every 20-60 min (as per timeline)
```

---

### Test Category 2: Story Execution Workflow

#### ✅ Create & Execute Story
```
Test: Cmd+Shift+P > "Story Agent: Start New Story"
Steps:
  1. Enter story title: "Test: Crew Learning Validation"
  2. Enter description: "Verify crew status monitoring in VSCode"
  3. Set complexity: Medium
  4. Submit
  
Expected:
├─ Story created in Supabase (check backend)
├─ Panel shows: "Story [ID]: Test: Crew Learning Validation"
├─ Status: ⏳ PENDING → 🟡 IN_PROGRESS
├─ Crew member(s) assigned automatically
├─ Branch created: STORY-### (Aha reference)
└─ PR opened on GitHub (if enabled)

Validation:
  ✓ Story ID returned (STORY-XXX format)
  ✓ Status updated in real-time
  ✓ Crew routing visible (which member assigned)
  ✓ Timeline shows execution in ~15-30 min (crew speed)
```

#### ✅ Monitor Execution Progress
```
Test: Open story panel while execution in-flight
Expected:
├─ Shows: "Executing... [████░░░░] 40%"
├─ Current task: "Data: Analyzing schema registry"
├─ Next task: "Riker: Component implementation"
├─ Time elapsed / Time remaining
├─ Cost tracking: $0.003 (clicking shows breakdown)
└─ Rollback button (if human intervention needed)

Validation:
  ✓ Progress bar moves smoothly
  ✓ Task descriptions match crew roles
  ✓ Cost updates in real-time
  ✓ Rollback button disabled during autonomous execution
```

---

### Test Category 3: Real-Time Crew Dashboards

#### ✅ Learning Status Dashboard
```
Test: Cmd+Shift+P > "Story Agent: View Learning Status"
Expected:
├─ Graph: Autonomy Level (0-5) progression over time
├─ Stats:
│  ├─ Missions Processed: N (increments every 1-2 min)
│  ├─ Pattern Detection: ✅ Active (every 10 missions)
│  ├─ Cost Trend: $X.XX → $Y.YY (declining)
│  └─ Accuracy: 88% → 92% (improving)
├─ Timeline: Shows T+20min, T+3hrs, T+24hrs markers
├─ Table: Recent missions (10 rows, auto-refreshing)
│  ├─ Mission ID
│  ├─ Status (✅ Complete, ⏳ In-Flight, 🔴 Failed)
│  ├─ Crew Member
│  ├─ Cost
│  └─ Time
└─ Alerts: "Level 2 reached! Self-validation active."

Validation:
  ✓ All stats visible and live-updating
  ✓ Timeline matches actual progression
  ✓ Mission table auto-refreshes
  ✓ Alerts fire at autonomy level milestones
```

#### ✅ Cost Optimizer
```
Test: Cmd+Shift+P > "Story Agent: View Cost Metrics"
Expected:
├─ Cost breakdown by crew member
├─ Cost per mission (trending down)
├─ Budget utilization: X% of $1000/day cap
├─ Savings forecast: "~$60k/month by Aug 31"
├─ Recommendation alerts:
│  ├─ "Consider parallel execution (save 15%)"
│  ├─ "Crew routing could reduce cost (save 8%)"
│  └─ "Learning active — expect 20% cost drop daily"
└─ Export button: Save CSV report

Validation:
  ✓ Numbers match git audit trail
  ✓ Trend line shows daily decline
  ✓ Forecasts reasonable (based on current velocity)
  ✓ Export produces valid CSV
```

---

### Test Category 4: Unified UI/UX Component Library

#### ✅ Design Token System (LCARS Theme)
```
Test: Cmd+Shift+P > "Story Agent: View Design Tokens"
Expected:
├─ Color Palette section:
│  ├─ --surface-primary (dark gray, LCARS base)
│  ├─ --surface-secondary (lighter)
│  ├─ --accent-primary (gold/orange, LCARS energy)
│  ├─ --accent-danger (red)
│  ├─ --accent-success (green)
│  └─ --accent-warning (yellow)
├─ Typography section:
│  ├─ --font-heading (Inter Bold)
│  ├─ --font-body (Inter Regular)
│  └─ --font-mono (IBM Plex Mono)
├─ Spacing section:
│  ├─ --space-xs: 4px
│  ├─ --space-sm: 8px
│  ├─ --space-md: 16px
│  └─ --space-lg: 24px
├─ Components using tokens: 14+ visual examples
└─ Token compliance: ✅ 100% (all components updated)

Validation:
  ✓ All tokens documented with examples
  ✓ Color previews render correctly
  ✓ LCARS aesthetic consistent (dark + gold accents)
  ✓ Component examples show 100% token usage
```

#### ✅ Component Registry & RBAC
```
Test: Cmd+Shift+P > "Story Agent: View Component Registry"
Expected:
├─ Component list (14-17 components):
│  ├─ CrewStatusPanel
│  ├─ AutonomyProgressBar
│  ├─ StoryExecutionCard
│  ├─ MissionTimeline
│  ├─ CostBreakdown
│  ├─ DesignTokenViewer
│  ├─ RoleBasedFieldMask
│  ├─ AdmiralApprovalQueue
│  ├─ CrewPersonalContext
│  ├─ LearningStatusGraph
│  ├─ ComponentRegistry (this one!)
│  └─ (3-6 more utility components)
├─ For each component:
│  ├─ Description
│  ├─ Props schema (Zod-validated)
│  ├─ RBAC metadata:
│  │  ├─ readable_by: [Admiral, Developer, Stakeholder]
│  │  ├─ editable_by: [Admiral, Developer]
│  │  └─ viewable_fields: [...schema fields...]
│  ├─ Usage example code
│  ├─ Story points (test complexity)
│  └─ Last updated timestamp
└─ Schema validation: All Zod schemas compile without error

Validation:
  ✓ 14+ components registered
  ✓ Each has RBAC metadata
  ✓ Zod schemas pass validation
  ✓ Usage examples are copy-paste-ready
  ✓ No circular dependencies
```

---

### Test Category 5: Role-Based Access Control (RBAC)

#### ✅ Admiral View (Full Access)
```
Test: Cmd+Shift+P > "Story Agent: Switch Role" > Select "Admiral"
Expected:
├─ All fields visible
├─ Can edit: Autonomy flags, cost caps, approval queues
├─ Can see: Debug logs, raw crew memory, system health
├─ Can execute: Force rollback, veto decisions, override gates
├─ Approval queue: Shows all pending decisions
└─ Audit trail: Complete visibility

Validation:
  ✓ All sections render without redaction
  ✓ Edit buttons enabled
  ✓ Debug logs visible
  ✓ No "Access Denied" messages
```

#### ✅ Developer View (Operational)
```
Test: Switch role to "Developer"
Expected:
├─ Can see: Story status, crew assignments, cost metrics
├─ Can edit: Story acceptance criteria, test cases
├─ Cannot see: Admiral approval queues, raw memory
├─ Cannot edit: Autonomy levels, cost caps
├─ Query view: Read-only access to crew memory
└─ Limitation: "Crew decisions require Admiral approval"

Validation:
  ✓ Approval queue hidden
  ✓ Edit buttons only for story fields
  ✓ Cost breakdown visible but read-only
  ✓ Helpful "Ask Admiral" prompt shown
```

#### ✅ Stakeholder View (Read-Only Summary)
```
Test: Switch role to "Stakeholder"
Expected:
├─ Can see: Story status, timeline, cost summary (high-level only)
├─ Cannot see: Crew member details, technical complexity, debug logs
├─ Simplified dashboard: 3-5 key metrics only
├─ Export button: Download week/month summary
└─ Message: "Questions? Contact Admiral or Developer"

Validation:
  ✓ Only high-level metrics visible
  ✓ Technical details redacted
  ✓ Export button works (CSV/PDF)
  ✓ Helpful contact info shown
```

---

### Test Category 6: Phase 6 Autonomy Progression

#### ✅ Level 0 → Level 1 (T+20 min)
```
Test: Wait for T+20 minutes from activation (08:46 UTC → 09:06 UTC)
Expected:
├─ Status bar: "🖖 Phase 6 [Level 1/5]"
├─ Alert: "✅ Pattern detection active"
├─ Learning Status: "Initial patterns observed across 10 missions"
├─ New capability: Crew suggests optimizations
└─ Cost impact: Minimal ($0.01 saved on next mission)

Validation:
  ✓ Level badge updates
  ✓ Alert fires at expected time
  ✓ Pattern summary visible in dashboard
  ✓ Cost reflects first optimization
```

#### ✅ Level 1 → Level 2 (T+3 hours)
```
Test: Wait for T+3 hours (08:46 UTC → 11:46 UTC)
Expected:
├─ Status bar: "🖖 Phase 6 [Level 2/5]"
├─ Alert: "✅ Self-validation enabled"
├─ New capability: Crew auto-applies safe tunings
├─ Cost trend: 5-10% reduction visible
├─ Decision autonomy: Crew decides on non-policy changes
└─ Approval queue: Admiral sees fewer approvals needed

Validation:
  ✓ Level 2 badge visible
  ✓ Self-validation checkbox available (dev view only)
  ✓ Cost reduction graph shows decline
  ✓ Crew adjusts routing without asking
```

---

### Test Category 7: Component Rendering & Responsiveness

#### ✅ Panel Layouts (Crew Status, Learning, Cost, Registry)
```
Test: Open each panel and verify layout
Expected for each:
├─ Panel title + close button (top-left)
├─ Refresh button (⟳ icon, top-right)
├─ Content area: Responsive to window resize
├─ Scrollbars: Appear only when needed
├─ No overflow: All text visible at 800px width
└─ Mobile view: Panels stack vertically (if applicable)

Validation:
  ✓ All panels render at default width (400px)
  ✓ Resize to 800px: Still readable
  ✓ Resize to 600px: Content reflows gracefully
  ✓ No console warnings about layout
```

#### ✅ Status Badges & Color Coding
```
Test: Look at crew status colors
Expected:
├─ 🟢 Idle (gray): Crew member available, no task
├─ 🟡 Learning (blue): Processing, accumulating insights
├─ 🔴 Executing (orange): Running task, decision in-flight
├─ ⚫ Error (red): Failed task, manual intervention needed
└─ ✅ Complete (green): Task finished successfully

Validation:
  ✓ Each color used consistently
  ✓ Colors meet WCAG AA contrast (check DevTools)
  ✓ No red/green-only indication (also uses shape/text)
```

#### ✅ Animations & Transitions
```
Test: Watch panel open/close, data refresh
Expected:
├─ Panel slide-in: Smooth 200ms animation
├─ Data refresh: Rows fade-in, no jarring jumps
├─ Progress bar: Smooth increment (not stutter)
├─ Status badge: Subtle color transition (200ms)
└─ No flicker: Content never disappears during update

Validation:
  ✓ Animations feel responsive (not laggy)
  ✓ Performance: No dropped frames (open DevTools > Performance)
  ✓ CPU usage: <5% during idle panel
```

---

### Test Category 8: Integration with MCP Server

#### ✅ Tool Invocation
```
Test: Execute a crew tool from extension
Example: Cmd+Shift+P > "Story Agent: Get Crew Status"

Expected flow:
├─ Extension sends request to MCP server
├─ MCP processes: crew-get-console-status
├─ Response: JSON with 11 crew members, current tasks
├─ Extension renders: Crew Status Panel updates
├─ Status bar: Shows "Last updated: 2s ago"
└─ No errors: Check extension logs (Help > Toggle Developer Tools)

Validation:
  ✓ Request sent (filter by "story-agent" in DevTools Network)
  ✓ Response received within 2s
  ✓ UI updates immediately
  ✓ No "MCP unavailable" errors
```

#### ✅ MCP Disconnection Recovery
```
Test: Stop MCP server, then try tool invocation
Steps:
  1. In terminal running "pnpm run mcp", press Ctrl+C
  2. In VSCode, Cmd+Shift+P > "Story Agent: View Crew Status"

Expected:
├─ Error message: "MCP Server not reachable"
├─ Suggestion: "Start MCP with: pnpm run mcp"
├─ Offline mode: Show last known state (cached)
├─ Auto-reconnect: Retries every 5s
└─ Recovery: When MCP restarts, panel updates automatically

Validation:
  ✓ Graceful error handling (not crash)
  ✓ Auto-reconnect works (restart MCP, panel updates)
  ✓ Helpful error message shown
```

---

## Performance Targets

### ✅ Latency
```
Tool invocation → Response:  <500ms (target)
Panel render → Interactive: <200ms (target)
Data refresh cycle:          2-3s (target)
Status badge update:         <100ms (target)
```

### ✅ Resource Usage
```
Extension idle CPU:          <1% (target)
Extension memory:            <50MB (target)
Panel open/close:            <5MB delta (target)
Full dashboard:              <100MB total (target)
```

### ✅ Reliability
```
Tool success rate:           >99% (target)
Data consistency:            Real-time (within 5s)
Recovery after MCP restart:  <10s (target)
```

---

## Detailed Component Testing

### CrewStatusPanel (Most Frequently Used)
```
Coverage: Avatar, role name, status badge, assigned task, remaining time
Steps:
  1. Open: Cmd+Shift+P > "View Crew Status"
  2. Verify: All 11 members listed
  3. Click a member: Shows details (member context, recent missions, skills)
  4. Hover status badge: Tooltip shows current task
  5. Click row: Opens member's personal context panel
  
Expected:
  ✓ Avatar renders correctly (TNG character if available, fallback initials)
  ✓ Role name spelled correctly
  ✓ Status badge color matches crew state
  ✓ Task description is meaningful (not truncated)
  ✓ Click handlers work without lag
```

### AutonomyProgressBar
```
Coverage: Visual representation of Phase 6 progression
Steps:
  1. Check status bar: "🖖 Phase 6 [Level 1/5]" visible
  2. Hover: Tooltip shows time to next level
  3. Click badge: Opens Learning Status dashboard
  4. Wait 20+ min: Level increments, badge updates
  
Expected:
  ✓ Bar fills smoothly (0→100% per level)
  ✓ Percentage shown (e.g., "27/100 toward Level 2")
  ✓ ETA accurate to actual timeline
  ✓ Color gradient: 🔵 (Level 1) → 🟣 (Level 5)
```

### StoryExecutionCard
```
Coverage: Story status, crew assignment, timeline, rollback
Steps:
  1. Open a story: Cmd+Shift+P > "Start New Story"
  2. Verify card shows:
     - Story ID + title
     - Status indicator + percentage
     - Assigned crew member
     - Timeline (start → planned end)
     - Cost so far
     - Rollback button
  3. Click "View Details": Opens full story panel
  4. Watch progress: Card updates every 2-3s
  
Expected:
  ✓ Card renders within 1s
  ✓ Progress bar smooth
  ✓ Cost updates accurately
  ✓ Rollback button disabled during autonomous phase
```

---

## Common Issues & Troubleshooting

### Issue: "MCP Server not reachable"
```
Fix: 
  1. Terminal: pnpm run mcp
  2. Wait 2-3s for "MCP server listening"
  3. VSCode: Cmd+Shift+P > "Copilot: Toggle MCP Enabled"
  4. Reload window (Cmd+R)
  5. Try again

Prevention:
  ✓ Keep MCP running in background terminal
  ✓ Use screen/tmux for persistent session
```

### Issue: Panels not updating in real-time
```
Fix:
  1. Close panel: Click X
  2. Cmd+Shift+P > "Copilot: Toggle MCP Enabled" (toggle off)
  3. Toggle back on
  4. Reopen panel
  
Prevention:
  ✓ MCP must stay connected (check Terminal > Tasks)
  ✓ VSCode must have MCP extension enabled
```

### Issue: Component Registry shows "0 components"
```
Fix:
  1. Check git status: `git log --oneline | head -5`
  2. Rebuild: pnpm --filter story-agent-vscode run build
  3. Reload extension (Cmd+R in VSCode)
  4. Try again
  
Prevention:
  ✓ Ensure build succeeded (check for errors)
  ✓ Restart VSCode after git pull
```

---

## Sign-Off Checklist

After completing all tests, confirm:

```
UI/UX Unified Testing Checklist:

Core Functionality:
☐ All 11 crew members visible and updateable
☐ Story creation → execution workflow works
☐ Real-time status updates (2-3s latency acceptable)
☐ Cost metrics track correctly
☐ Autonomy level progresses (wait for T+20 min)

Design & Consistency:
☐ LCARS theme applied consistently (dark + gold)
☐ All design tokens used (100% compliance)
☐ Component registry shows 14+ components
☐ Spacing, fonts, colors uniform across panels

RBAC & Security:
☐ Admiral view shows all fields
☐ Developer view hides sensitive data
☐ Stakeholder view simplified appropriately
☐ No data leakage between roles

Performance:
☐ Tool invocation <500ms
☐ Panel render <200ms
☐ CPU usage <5% idle
☐ Memory <100MB total

Integration:
☐ MCP connection stable
☐ Graceful disconnect handling
☐ Auto-reconnect works
☐ No console errors

Phase 6:
☐ Learning Status dashboard shows progression
☐ Autonomy level badge updates at milestones
☐ Cost metrics trending down
☐ Alerts fire at expected times

SIGN-OFF:
Tester: ________________  Date: __________
Issues Found: [ ] None  [ ] Minor  [ ] Major
Ready for Production: [ ] YES  [ ] NO (explain below)

Notes:
_________________________________________________________________
_________________________________________________________________
```

---

## Publishing to VSCode Marketplace (After Testing)

Once testing is complete and all checks pass:

```bash
# Build final release
pnpm --filter story-agent-vscode run package

# Publish to marketplace
vsce publish patch

# Expected output:
# ✅ Published version 1.0.1 to marketplace
# 🔗 https://marketplace.visualstudio.com/items?itemName=familiarcat.story-agent

# Users can then install from marketplace:
# Open VSCode Extensions > Search "Story Agent" > Install
```

---

**🖖 Make it so. Testing phase begins now.**
