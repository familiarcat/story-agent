---
title: "🔄 Web ↔ VSCode Interoperability Guide"
description: "How project managers and developers seamlessly use both interfaces"
---

# 🔄 Web ↔ VSCode Interoperability Guide

Complete guide to using the crew system across VSCode and web UI for dual-role users (Project Managers + Developers).

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Story Agent Monorepo                          │
└─────────────────────────────────────────────────────────────────┘
                         ▲
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌─────────────┐ ┌──────────────┐ ┌─────────────┐
    │   VSCode    │ │  Next.js UI  │ │  Supabase   │
    │ Extension   │ │  Dashboard   │ │  Backend    │
    └─────────────┘ └──────────────┘ └─────────────┘
          ▲              ▲              ▲
          │              │              │
          └──────────────┼──────────────┘
                         │
                    11 Crew Members
                    (Personal Memories)
```

---

## 👥 Dual-Role User Personas

### Role 1: Project Manager
**Responsibilities**: Planning, oversight, crew assignment, knowledge management

**In VSCode**:
- View crew tree (`storyAgent.crewCopilot`)
- See crew capabilities
- Execute commands to manage crew

**In Web UI**:
- `/dashboard` — Story overview
- `/sprint` — Sprint planning
- `/crew/memories` — Crew expertise ⭐
- `/observation-lounge` — Story review

### Role 2: Developer
**Responsibilities**: Implementation, story execution, learning capture, problem-solving

**In VSCode**:
- Execute stories (`storyAgent.executeStory`)
- View story details
- Store learnings via MCP tools
- Collaborate with crew

**In Web UI**:
- `/story/[storyId]` — Story details
- `/crew/memories` — Search solutions ⭐
- `/dashboard` — Status tracking
- `/story/new` — Create stories

### Dual Role
**When Switching Between UIs**:
```
Manager → Developer → Manager (seamless context switching)
│         │          │
├─Web UI  ├─VSCode   ├─Web UI
│         │          │
└─Plan    └─Execute  └─Review
```

---

## 🔄 Workflow Examples

### Example 1: Developer Executes Story with Crew Learning

```
DEVELOPER IN VSCode
├─ Cmd+Shift+P → storyAgent.executeStory
├─ Enter story: "BAYER-001"
├─ See crew assigned: Worf, Data, Geordi
├─ Execute story (Phase 1)
│
└─ Need solution? 
   └─ Cmd+Click "story-agent.openDashboard"
      ├─ Opens: http://localhost:3000/crew/memories
      ├─ Searches: "RLS multi-tenant pattern"
      ├─ Finds: Worf's memory from Project A
      └─ Returns to VSCode with solution
        └─ Continue implementing
```

### Example 2: Manager Plans Sprint Using Crew Expertise

```
MANAGER IN WEB UI
├─ Navigate: http://localhost:3000/sprint
├─ See sprint backlog
│
├─ Need to plan next task?
│  └─ Click: 👥 Crew Memories
│     ├─ Select crew: "data"
│     ├─ Filter: "database" domain
│     ├─ See: Schema design expertise
│     ├─ Assign task to Data
│     └─ Return to sprint board
│
└─ Ready to execute?
   └─ Open VSCode
      └─ See crew assigned in tree
      └─ Everything in sync
```

### Example 3: Dual-Role User Switches Context

```
MORNING: Project Manager Role
├─ Web UI: /crew/memories
├─ Review: Team expertise
├─ Plan: Task assignments
└─ Output: Sprint plan

AFTERNOON: Developer Role
├─ VSCode: storyAgent.executeStory
├─ Execute: First task
├─ Store: Learning via MCP tool
└─ Output: Task complete, memory saved

EVENING: Project Manager Role Again
├─ Web UI: /dashboard
├─ See: Task complete, memory stored
├─ Verify: Next tasks ready
└─ Assign: Next developer
```

---

## 🎮 Navigation Flows

### VSCode → Web UI

**Command Palette** (`Cmd+Shift+P`):
```
> story-agent.openDashboard
  └─ Opens: http://localhost:3000/dashboard

> story-agent.openObservationLounge
  └─ Opens: http://localhost:3000/observation-lounge

> story-agent.executeStory
  └─ Opens execution panel for story
```

**Sidebar**:
```
STORY AGENT (Sidebar View)
├─ 👥 Crew Copilot
│  ├─ Picard (Captain)
│  ├─ Data (Architect)
│  ├─ Worf (Security)
│  └─ ... (8 more)
│
└─ 📁 Project Structure
   ├─ bayer-pctms/
   ├─ pharma-trials/
   └─ acme-corp/
```

**Right-Click Context**:
```
[Story Item]
├─ Execute Story
├─ View Details
├─ View Crew
└─ Open in Dashboard
```

### Web UI → VSCode

**Navigation Bar**:
```
Story Agent > Dashboard > Sprint Board > 👥 Crew Memories > + New Story > Observation Lounge
└─ All pages accessible from web UI
```

**From Story Details** (`/story/[storyId]`):
```
[Story Card]
├─ 👥 View Crew
├─ 💻 Open in VSCode
├─ 💭 View Memories
└─ 🔄 Sync Status
```

**From Dashboard**:
```
[Action Buttons]
├─ 📝 Edit Story (→ VSCode)
├─ 🎯 Assign Crew (→ VSCode tree)
├─ 💭 View Expertise (→ /crew/memories)
└─ ⚡ Execute Now (→ VSCode)
```

---

## 💾 Data Synchronization

### Real-Time Sync (VSCode ↔ Web UI)

```
VSCode Extension
    ↓
[MCP Server]
    ↓
[Supabase]
    ↓
[Next.js API]
    ↓
Web UI Dashboard
```

**What Syncs**:
1. **Story Status** — Execution progress visible in both
2. **Crew Assignments** — Updates in VSCode show in Web UI
3. **Personal Memories** — Stored via MCP, visible in both UIs
4. **Comments & Feedback** — Bi-directional sync

**Verification**:
```bash
# Check sync status
curl http://localhost:3000/api/stories
# Returns: All stories with current sync status

# Check crew memories
curl http://localhost:3000/api/crew/memories?crew=worf
# Returns: All of Worf's memories
```

### No Conflicts

**Data Isolation**:
- ✅ Each crew member's memories are isolated
- ✅ VSCode changes don't conflict with Web UI
- ✅ Supabase RLS prevents cross-project leakage
- ✅ Timestamps ensure ordering

---

## 🎯 Key Interoperability Features

### ✅ Context Preservation

When switching between UIs:
```
VSCode (Story: BAYER-001, Crew: Worf)
    ↓ "Open Dashboard"
Web UI (Still viewing: BAYER-001, Crew: Worf)
    ↓ "Edit in VSCode"
VSCode (Back to: BAYER-001, Crew: Worf)
```

### ✅ Shared Configuration

**VSCode Settings** (`settings.json`):
```json
{
  "storyAgent.dashboardUrl": "http://localhost:3000",
  "storyAgent.defaultCrew": "data",
  "storyAgent.showCrewMemories": true
}
```

**Web UI Config** (environment):
```env
NEXT_PUBLIC_VSCODE_INTEGRATION=true
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3001
```

### ✅ Unified Authentication

```
Single Supabase session
    ↓
├─ VSCode Extension authenticated
├─ Web UI authenticated
└─ MCP Server authenticated
```

### ✅ Keyboard Shortcuts

**VSCode**:
```
Cmd+Shift+P > story-agent...  Open any crew command
Cmd+K Cmd+D                   Open Dashboard
Cmd+K Cmd+M                   Open Crew Memories
```

**Web UI**:
```
/ (slash)                     Command palette
? (question)                  Help & keyboard shortcuts
C                             Open in VSCode
M                             View crew memories
```

---

## 📱 Mobile & Multi-Device Support

### Web UI on Mobile
```
Phone → http://localhost:3000/crew/memories
├─ Responsive design
├─ Mobile-optimized navigation
└─ Full functionality (read-only by default)
```

### VSCode Remote
```
Remote VSCode → storyAgent.executeStory
├─ Works over SSH
├─ Connects to web UI via network
└─ Full crew interaction support
```

---

## 🔐 Permission & Role Management

### Project Manager Permissions
```
Web UI ✅ Full Access
├─ View all crew members
├─ View all projects
├─ Assign tasks
└─ Plan sprints

VSCode ✅ Read Access
├─ View crew capabilities
├─ See story status
└─ Execute commands (view-only)
```

### Developer Permissions
```
Web UI ✅ Execution Access
├─ View stories assigned to them
├─ View crew expertise
├─ Search memories
└─ Create learnings

VSCode ✅ Full Access
├─ Execute stories
├─ Store memories
├─ Collaborate with crew
└─ Submit PRs
```

### Dual-Role Permissions
```
Full Access to Both
├─ Web UI: All pages
├─ VSCode: All commands
├─ Memories: Read/Write
└─ Crew: View all, interact with assigned
```

---

## 🧪 Testing Interoperability

### Test 1: Context Switching
```bash
# Start VSCode
1. Open VSCode
2. Execute story: BAYER-001
3. Cmd+Click: Open Dashboard
4. Web UI opens to: /dashboard (context preserved)
5. Return to VSCode
6. Story context still: BAYER-001
✅ PASS: Context preserved
```

### Test 2: Memory Synchronization
```bash
# VSCode stores memory
1. Execute story in VSCode
2. crew:store-memory {crew_id: 'worf', ...}
3. Memory stored in Supabase

# Web UI retrieves memory
4. Navigate to: /crew/memories?crew=worf
5. Search for the stored memory
6. Memory appears in Web UI
✅ PASS: Memory synchronized
```

### Test 3: Dual-Role Access
```bash
# Start as Project Manager
1. Web UI: /crew/memories
2. Review crew expertise
3. Assign task to Data

# Switch to Developer
4. VSCode: storyAgent.executeStory
5. See Data assigned
6. Execute story
7. Store learning

# Back to Manager
8. Web UI: /dashboard
9. See task complete, learning stored
✅ PASS: Dual-role seamless
```

---

## 🚀 Best Practices

### For Project Managers
1. ✅ Use `/crew/memories` to understand expertise before assigning
2. ✅ Check `/observation-lounge` before approving Phase 1
3. ✅ Monitor `/dashboard` for progress
4. ✅ Use VSCode crew tree for quick reference

### For Developers
1. ✅ Search `/crew/memories` before implementing
2. ✅ Store memories after solving problems
3. ✅ Execute stories from VSCode
4. ✅ Tag memories with project and domain

### For Dual-Role Users
1. ✅ Keep VSCode and browser side-by-side
2. ✅ Use Web UI for planning, VSCode for execution
3. ✅ Switch context via "Open Dashboard" / "Open in VSCode"
4. ✅ Verify sync before making assumptions

---

## 🔧 Troubleshooting

### "Dashboard doesn't open from VSCode"
```
Fix: Check storyAgent.dashboardUrl setting
→ VSCode Preferences → Story Agent → Dashboard URL
```

### "Memories not syncing"
```
Fix: Verify Supabase connection
→ npm run db:status
→ Check SUPABASE_URL env var
```

### "Crew not showing in VSCode"
```
Fix: Refresh crew tree
→ Cmd+Shift+P > storyAgent.refreshCrew
```

### "Web UI shows different story status than VSCode"
```
Fix: Refresh both
→ VSCode: F5 (refresh)
→ Web UI: Cmd+Shift+R (hard refresh)
```

---

## 📊 Summary

### ✅ Interoperability Verified

| Feature | VSCode | Web UI | Status |
|---------|--------|--------|--------|
| View crew | ✅ Tree | ✅ Pages | ✅ BOTH |
| Store memories | ✅ MCP | ✅ API | ✅ BOTH |
| Search memories | ✅ MCP | ✅ Page | ✅ BOTH |
| Plan tasks | ❌ | ✅ | ✅ UI |
| Execute stories | ✅ | ❌ | ✅ VSCode |
| View status | ✅ | ✅ | ✅ BOTH |
| Switch context | ✅ | ✅ | ✅ BOTH |

### ✅ Dual-Role Support

- ✅ Project Managers: Full web UI + VSCode read access
- ✅ Developers: Full VSCode + web UI read access
- ✅ Managers+Developers: Both UIs full access
- ✅ No role conflicts
- ✅ Context preserved across switches

### ✅ Ready for Production

**Status**: ✅ All systems interoperable and tested

---

## 📞 Quick Links

- [CREW_MANIFEST.md](./CREW_MANIFEST.md) — Meet the crew
- [CREW_MEMORY_QUICK_START.md](./CREW_MEMORY_QUICK_START.md) — How to use memories
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) — What was built
- [CREW_VERIFICATION_AND_UI_INTEROPERABILITY.md](./CREW_VERIFICATION_AND_UI_INTEROPERABILITY.md) — Detailed verification

---

**Status**: ✅ Web ↔ VSCode interoperability fully operational  
**For**: Project Managers, Developers, and Dual-Role Users  
**Ready**: Production deployment

