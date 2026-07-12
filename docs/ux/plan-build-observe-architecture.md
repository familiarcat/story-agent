# UI/UX Architecture: Plan → Build → Observe

## Overview

The crew's work is now organized into three transparent phases that users navigate sequentially:

1. **PLAN** — Crew deliberates and surfaces alternatives
2. **BUILD** — User/Agent executes the chosen plan  
3. **OBSERVE** — Crew and user learn from outcomes

This document maps each phase to existing UI surfaces and proposes how they interconnect.

---

## Phase 1: PLAN — Crew Deliberates & Surfaces Alternatives

### Entry Point: Chat Interface
- **Location**: `/chat` (web) + VSCode chat sidebar
- **Flow**:
  1. User enters a task/prompt (natural language)
  2. Crew auto-organizes (complexity score calculated, team assembled by Riker, tier-optimized by Quark)
  3. Crew deliberates across approaches
  4. **Picard synthesis: Attempt variance unification** (key refinement)
     - If consensus reached: Show ONE unified plan
     - If variance remains: Show 3 alternatives + ask user to resolve

### Picard Variance Unification
Picard's synthesis layer now serves as a **hallucination guard rail**:

```
Riker+Crew Debate (multiple positions emerge):
  ├─ Worf: "Security risk — need approval gate"
  ├─ Data: "Architecture supports 2 approaches"
  └─ Geordi: "Infrastructure constraint makes #1 cheaper"

Picard Synthesis (Try to Unify):
  1. Identify actual constraint vs opinion
     → Geordi's infrastructure = HARD constraint
     → Worf's security = REQUIREMENT (not option)
     → Data's architecture = FLEXIBLE
  
  2. Reframe as: "Do both. Geordi's cheaper approach + Worf's gate"
     → New unified plan: [Geordi approach] + [Security gate by Worf]
     → Addresses all concerns without choice paralysis
  
  3. If unification succeeds:
     → Return ONE plan (consensus achieved)
     → Variance flag: ✅ Consensus after synthesis
  
  4. If unification fails:
     → Variance persists (true disagreement on fundamentals)
     → Return 3 alternatives (user choice required)
     → Variance flag: ⚠️ Unresolved disagreement
```

### Plan Output: Decision Panel

**Consensus Case (Most Common)**
```
┌─────────────────────────────────────────────┐
│ CREW DELIBERATION: [Task Title]             │
│ Complexity: 0.68 (high) | Confidence: 0.87  │
├─────────────────────────────────────────────┤
│ ✅ UNIFIED PLAN (Consensus after synthesis) │
│                                              │
│ Steps:                                       │
│  1. [Riker] Design: Use cheaper infra       │
│  2. [Worf] Security: Add approval gate      │
│  3. [Data] Implement: Standard arch         │
│  4. [Geordi] Deploy: Cost-optimized path    │
│                                              │
│ Estimate: $0.023 | Risk: medium             │
│ Crew agreement: 11/11 (consensus)           │
│                                              │
│ [Proceed with Unified Plan]                 │
│ [View Full Transcript]                      │
└─────────────────────────────────────────────┘
```

**Variance Case (When Unification Failed)**
```
┌─────────────────────────────────────────────┐
│ CREW DELIBERATION: [Task Title]             │
│ Complexity: 0.68 (high) | Confidence: 0.52  │
├─────────────────────────────────────────────┤
│ ⚠️ VARIANCE DETECTED — Crew Disagreed       │
│    Reason: Different risk tolerance         │
│    Picard could not unify (fundamental diff)│
│                                              │
│ Choose one approach below, or ask crew      │
│ to debate further:                          │
├─────────────────────────────────────────────┤
│ 🛡️  CONSERVATIVE (Worf's position)         │
│    → Manual review gates at each step       │
│    → Cost: $0.018 | Risk: low               │
│    [CHOOSE] [Why this matters]              │
├─────────────────────────────────────────────┤
│ ⚡ AGGRESSIVE (Data's position)             │
│    → Automate all steps, review after       │
│    → Cost: $0.031 | Risk: high              │
│    [CHOOSE] [Why this matters]              │
├─────────────────────────────────────────────┤
│ [Ask crew to debate further]                │
│ [View Full Transcript]                      │
└─────────────────────────────────────────────┘
```

### Variance as Hallucination Guard Rail
Variance detection catches **when crew alignment fails**, which signals:
- ❌ Crew lacks context (ask clarifying question)
- ❌ Prompt engineering needs refinement (crew signals were too vague)
- ❌ Genuine fundamental tradeoff (user choice needed)

**Two Levers for Refinement**:
1. **Picard Synthesis Prompt** — Teach Picard better unification strategies
   - "Find shared goals, reframe trade-offs as complementary"
   - "Identify hard constraints vs soft preferences"
   - "Propose compromise that addresses all concerns"

2. **Crew Member Prompts** — Align prompts so crew starts closer to consensus
   - Riker: "Assemble team around shared goal, not competing approaches"
   - Each crew member: "Contribute your domain's unique insight, not alternative paths"
   - Result: Variance drops → consensus rate increases → fewer alternatives shown

---

## Phase 1b: PLAN — When Variance Persists (Rare)
- **Complexity Badge**: 0-1 score shows task difficulty (informs user why team was assembled)
- **Confidence Meter**: How certain is crew about this decision
- **Variance Flag**: ⚠️ Alert if crews disagreed (allows user to resolve) or ✅ Consensus achieved
- **Cost Breakdown**: Transparent OpenRouter spend for deliberation

### Plan Storage: Auto-Log to RAG
- Crew deliberation automatically stored to Observation Lounge
- Includes all 3 alternatives + variance summary
- Tagged with storyId, complexity, crewId's, outcome='pending'
- User can manually override tags to record context ("this was for migration") 

---

## Phase 2: BUILD — Execute & Track Progress

### Entry Point: VSCode Extension or CLI
- **VSCode Flow**:
  1. User clicks "Execute [Chosen Plan]" in chat
  2. Agent-core loop launches with plan as context
  3. Live feedback panel shows each step: file edits, commands, test results
  4. User can interrupt/modify at any point

- **CLI Flow**:
  ```bash
  story-agent "implement the balanced plan from crew deliberation [ID]"
  # Agent runs with Observation Lounge memory of plan context
  # Live NDJSON event stream shows progress
  ```

### Build Panel: Live Progress
- **Location**: VSCode "Agent" panel + `/agent` SSE endpoint
- **What user sees**:
  ```
  ┌─────────────────────────────────────────────┐
  │ EXECUTING: Balanced Plan                    │
  │ Started: 14:32:05 | Iteration: 3/8          │
  ├─────────────────────────────────────────────┤
  │ ✅ Step 1: [Riker] Design architecture      │
  │           → Created 3 design docs            │
  │                                              │
  │ ⏳ Step 2: [Data] Implement core logic       │
  │           → Modified: src/core.ts (42 lines) │
  │           → Test: type-check PASSED         │
  │           → Test: unit tests (12/14 pass)   │
  │           → Test: integration (running...)   │
  │                                              │
  │ ⭕ Step 3: [Geordi] Build UI                │
  │           → Waiting for core to pass tests   │
  ├─────────────────────────────────────────────┤
  │ Cost so far: $0.0045 (18% of estimate)      │
  │ [Pause] [Resume] [Modify] [Switch Plan]     │
  └─────────────────────────────────────────────┘
  ```

### Key Metrics During Build
- **Progress**: Iteration count, steps completed
- **Quality**: Test pass/fail, type-check status
- **Cost**: Live spend vs estimate
- **Errors**: Escalations, WorfGate remediation attempts
- **Control**: Pause/resume, modify next step, switch to alternative plan

### Automatic Outcome Capture
- Each tool invocation recorded (files edited, commands run, tests run)
- Screenshots/diffs stored (for later review)
- Build status tracked: 'in_progress' → 'success' | 'partial' | 'failed'
- When plan completes, system records outcome to RAG memory

---

## Phase 3: OBSERVE — Learn & Refine

### Entry Point: Observation Lounge
- **Location**: `/observation-lounge` (web)
- **What user sees**:
  ```
  ┌─────────────────────────────────────────────┐
  │ PAST DELIBERATION: [Task Title]             │
  │ Planned: Jul 12 14:30 | Executed: 14:35     │
  ├─────────────────────────────────────────────┤
  │ 🎯 PLAN (Balanced)                          │
  │    → Step 1: [Riker] Design architecture    │
  │    → Step 2: [Data] Implement core logic    │
  │    → Step 3: [Geordi] Build UI              │
  │    Crew consensus: Approved                 │
  │    Complexity score: 0.68 (high)            │
  ├─────────────────────────────────────────────┤
  │ ✅ OUTCOME: SUCCESS (Jul 12 14:50)          │
  │    Lesson: Splitting design + impl worked   │
  │            well for this complexity level    │
  │    Actual cost: $0.0052 (was est. $0.023)   │
  │    Actual time: 20min (vs 45min est)        │
  │                                              │
  │ [View Full Transcript] [Rate Outcome]       │
  │ [Compare vs Other Approaches]               │
  ├─────────────────────────────────────────────┤
  │ 📚 SIMILAR PAST TASKS                       │
  │    • Migration refactor (May 15): ✅ SUCCESS │
  │    • Auth rewrite (Jun 2): ⚠️ PARTIAL      │
  │    • Config overhaul (Jun 20): ✅ SUCCESS    │
  │    Crew confidence in this pattern: 85%     │
  ├─────────────────────────────────────────────┤
  │ 💭 CREW LEARNING                            │
  │    Data recorded: "This approach scales"    │
  │    Picard noted: "Complexity 0.6-0.8 works" │
  │    Riker tag: "design-first strategy"       │
  └─────────────────────────────────────────────┘
  ```

### Observation Lounge Features

#### Deliberation Replay
- Show full transcript: Picard intake → Riker assembly → Crew debate → Picard synthesis
- Click each alternative to see crew reasoning
- Click variance flag to see what crews disagreed on

#### Outcome Tracking
- **Status**: Success | Partial | Failed
- **Lessons**: What worked, what didn't (outlined in outcomeNotes)
- **Cost vs Estimate**: Transparency on accuracy of Quark's cost predictions
- **Time vs Estimate**: Build duration vs plan estimate

#### Pattern Recognition
- **Similar Tasks**: Show past deliberations with same tags/complexity/crew roles
- **Success Rate**: What % of tasks with this crew composition succeeded
- **Confidence Score**: Crew's learned trust in this pattern

#### Crew Learning Captured
- **Auto-tagged outcomes**: System records "design-first-architecture" / "high-complexity" / etc.
- **RAG recall**: When crew sees similar future task, it recalls all past outcomes with that tag
- **Institutional hesitancy**: Crew becomes cautious if they see repeated failures on a pattern

### Cost Observatory
- **Location**: `/cost` (web)
- **Shows**: Crew spend vs native (Anthropic) alternative
- **Breakdown**: Per-deliberation, per-build, per-phase costs
- **Learning**: Which crew compositions are most cost-effective for different complexity levels

---

## Cross-Phase Flows

### Flow 1: Crew Learning Improves Future Plans
```
Past Execution:
  → Outcome recorded: "Conservative approach works for migrations"
  → Tagged: "migration" + "complexity: 0.7" + "crew: [Riker, Data]"

Future Similar Task:
  → Crew sees RAG memory of past success
  → Riker defaults to conservative approach (learned confidence)
  → Quark assigns tier-2 (cheaper, now trusted) instead of tier-3
  → Cost drops 15%, success rate remembered as 85%
```

### Flow 2: Variance Resolution → Learning
```
Plan Phase:
  → Crew variance detected: Worf wants conservative, Data wants aggressive

User Choice:
  → User picks balanced, acknowledges Worf's caution

Observe Phase:
  → Build succeeds, but with complications Worf predicted
  → Outcome recorded: "Worf's caution was right about X, wrong about Y"
  → Crew learns to trust Worf on security, ignore on performance

Future:
  → Similar task, Worf raises concern → crew weighs it higher
  → Over time, crew learns Worf's actual expertise, not just authority
```

### Flow 3: Failed Outcome → Hesitancy → Investigation
```
Build Phase:
  → Agent executes plan, hits blockers, marks outcome='failed'
  → User records: "Approach assumed all files were TypeScript"
  → Crew learning: "This pattern fails on mixed-language repos"

Observe Phase:
  → Outcome shows red ❌, lesson recorded
  → Tagged: "mixed-language-repo" + "deliberation-mismatch"

Future Task (Mixed Language):
  → Crew recalls this failed outcome
  → Becomes more hesitant to apply that pattern
  → Asks clarifying question: "Is this mixed-language?"
  → If yes, proposes different approach (learned caution)
```

---

## UI Component Map

| Phase | Web Surface | VSCode Surface | Mobile | Description |
|-------|-------------|----------------|--------|-------------|
| **PLAN** | `/chat` | Chat sidebar | N/A | Deliberation, alternatives, variance |
| **PLAN** | `/dashboard` | N/A | Brief summary | Quick look at team complexity |
| **BUILD** | `/agent` (SSE) | Agent panel | N/A | Live progress, iteration count |
| **BUILD** | N/A | Command palette | Terminal | `story-agent "execute plan"` CLI |
| **OBSERVE** | `/observation-lounge` | N/A | `/memories` | Transcripts, outcomes, lessons |
| **OBSERVE** | `/cost` | N/A | Brief summary | Spend breakdown, savings |
| **LEARN** | RAG recall in chat | RAG context in chat | N/A | Past memories auto-surfaced during PLAN |

---

## Progressive Disclosure: Novice vs Expert Views

### Novice User
- See: "Here's what the crew suggests. Pick one."
- Crew defaults to balanced approach
- Simple outcome: ✅ Worked | ❌ Didn't work
- Doesn't see: Complexity scores, variance details, cost breakdowns, crew member names

### Intermediate User
- See: All 3 alternatives, why they differ (variance)
- Can pick by risk level
- Sees outcomes + lessons in plain language
- Doesn't see: Individual crew reasoning, RAG tags, Quark tier details

### Expert User
- See: Full crew transcript, Picard reasoning, Riker team assembly decisions
- Can modify plans mid-execution
- Access to RAG search and outcome statistics
- Can manually record outcomes and lessons
- Views cost per crew member, model tier assignments

---

## Success Criteria

✅ **Transparency**: User sees crew work at every phase
✅ **Discoverability**: Clear entry points for Plan/Build/Observe  
✅ **Feedback Loops**: Outcomes automatically feed back to crew memory
✅ **Learning**: Crew confidence in an approach visible to user (tags, success %)
✅ **Control**: User can override, pause, switch plans at any time
✅ **Cost Visibility**: Crew spend and savings always visible
✅ **Institutional Memory**: Past outcomes influence future crew behavior
✅ **Crew Hesitancy**: Over time, crew asks better questions and defaults to proven patterns

