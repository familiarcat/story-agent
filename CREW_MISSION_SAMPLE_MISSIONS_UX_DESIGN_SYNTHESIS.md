# Crew Mission Synthesis: Sample Missions + Task-Driven UI/UX Design
**Stored:** 2026-08-26 · **Cost:** $0.0168 USD · **Crew Consensus:** 11/11 officers  
**Status:** Ready for Data + Troi co-authorship of UI/UX implementation  
**Priority:** Phase 1 foundation (pre-LLM provider activation)

---

## Executive Summary

The crew has designed **TWO mission categories** (easy base-level + complex collaborative) and **FIVE UI/UX interaction principles** that pivot from feature-driven dashboards to task-driven workflows. Key innovation: **Ephemeral vs. Persistent infrastructure triggers** replace time constraints as the primary mission categorization axis, with **Real-time crew execution feeds** replacing static result pages.

**Cost Baseline:**
- Easy missions: ~$0.002–0.01 (OpenRouter frugal: DeepSeek tier-3)
- Complex missions: ~$0.05–0.20 (escalation to Anthropic tier-4 if multi-crew + architectural)
- Both categories leverage **crew escalation logic** to avoid unnecessary high-tier model usage

---

## Part 1: Mission Templates (Category A & B)

### Category A: Easy/Base-Level Missions

**Definition:** Single-crew, deterministic, ephemeral container execution (no persistent state mutations)  
**Target LLM:** OpenRouter tier-3 (DeepSeek, Llama) ~$1.10/Mtok  
**Cost Cap:** $0.10/1k tokens (Quark enforcement gate)  
**Time Constraint:** <30 seconds to first result OR <5min container CPU-seconds (whichever tighter)

#### Template A1: Shake-Down Diagnostic
**Purpose:** Single crew member technical audit (validation, linting, health check)  
**Constraints:**
- Single crew member assigned (e.g., Data → type-safety, Geordi → build checks, Worf → security scanning)
- No external APIs required (only internal CLI tools: eslint, terraform validate, tsc --strict)
- Ephemeral execution (read-only, no writes to persistent storage)
- Deterministic output (pass/fail + findings)

**Example Missions:**
- **"Audit TypeScript strict mode across codebase"** → Data runs `tsc --strict` → Reports violations
- **"Validate Terraform modules"** → Geordi runs `terraform validate` → Reports syntax errors
- **"Security scan for common vulnerabilities"** → Worf runs `eslint-sec-scanner` → Reports false-positive rate <5%

**Success Criteria:**
- ✅ Completion in <30s
- ✅ Infrastructure drift: `terraform plan -no-color` delta lines <5
- ✅ Cost: $0.002–0.01
- ✅ No escalation to higher-tier models required

**Escalation Trigger:** If output exceeds 100 findings or time >5min, auto-escalate to Category B (collaborative review)

---

#### Template A2: Quick Standup
**Purpose:** Rapid synthesis of pre-existing data (status rollup, velocity summary)  
**Constraints:**
- Query-only (no writes to databases)
- Models: OpenAI tier-2 (gpt-3.5-turbo) or DeepSeek tier-3
- Input: Existing crew memories + story status + velocity data
- Output: 2–5 minute briefing

**Example Missions:**
- **"Summarize Sprint 1 progress vs baseline"** → Query sa_stories + velocity → 2min brief
- **"Health check: crew personas & skills availability"** → Query sa_crew_personas + sa_crew_skills → Status report
- **"What's blocking infrastructure team this week?"** → Query sa_projects + INFRA-* stories → Blockers list

**Success Criteria:**
- ✅ Completion in <2min
- ✅ No persistent state mutations
- ✅ Cost: $0.001–0.005
- ✅ Accuracy: 90%+ when cross-checked against source data

---

### Category B: Complex/Collaborative Missions

**Definition:** Multi-crew, requires team coordination, potential persistent state, may escalate to Anthropic  
**Team Size:** 3–11 crew members (matched to complexity)  
**LLM Tiers:** OpenRouter tier-3 baseline → escalate to Anthropic tier-4 if architectural or cross-domain tradeoffs  
**Time Constraint:** No hard cap; escalation logic gates model tier selection  
**Cost Envelope:** $0.05–0.20 per mission (Riker cost monitoring alert: if >$0.25, manual review required)

#### Template B1: Design Sprint
**Purpose:** Multi-crew architectural/UX analysis (Data + Troi + Geordi review + debate)  
**Team:**
- Data (architecture validator)
- Troi (UX/stakeholder impact)
- Geordi (infrastructure feasibility)
- Picard (synthesis + decision)
- Riker (cost monitoring)

**Constraints:**
- Input: Detailed problem statement + constraints
- Execution: Observation Lounge-style debate (3–5 rounds)
- Output: Synthesized recommendation + dissent log + cost estimate
- Models: Quark tier-selected per member; Picard synthesis on Anthropic tier-4 if needed

**Example Missions:**
- **"Design hierarchy validation rules for Client/Project/Story relationships"**
  - Data: Schema constraints + type safety
  - Troi: User feedback on relationship clarity
  - Geordi: Compute cost of validation rules
  - → Picard synthesizes rule set with Owner + next actions

- **"Should we migrate from Supabase RLS policies to WorfGate + row-level permissions?"**
  - Worf: Security tradeoffs
  - O'Brien: Implementation complexity
  - Quark: Cost delta (managed RLS vs. custom policies)
  - → Picard resolves with timeline + risk assessment

**Success Criteria:**
- ✅ All officers contribute substantive input
- ✅ Dissent logged (not suppressed)
- ✅ Cost tracked per member + escalations noted
- ✅ Owner assigned for each recommendation
- ✅ Follow-up missions suggested (e.g., "Write schema migration script")

**Escalation:** If design touches security (Worf) + infrastructure (Geordi) + multiple services, auto-escalate Picard's synthesis to Anthropic tier-4

---

#### Template B2: Incident Postmortem
**Purpose:** Root-cause analysis + corrective actions (cross-functional team)  
**Team:**
- Crusher (incident timeline + health metrics)
- Worf (security posture during incident)
- O'Brien (infrastructure logs + recovery actions)
- Data (code/configuration changes that triggered it)
- Picard (synthesis + accountability)

**Example Missions:**
- **"AWS Lambda deployment failure postmortem (missing module index)"**
  - Crusher: Timeline (2026-08-25T06:12:19 → resolution)
  - O'Brien: `terraform plan` delta lines pre/post-incident
  - Data: Root cause: missing index.mjs in deployment package
  - Worf: Security audit (did logs leak credentials?)
  - Riker: Cost impact (downtime × user impact)
  - → Picard: Actionable fix + preventive measures

**Success Criteria:**
- ✅ RCA completed in <1 hour
- ✅ 5-why depth (Why 1 → Why 2 → Why 3 → Why 4 → Why 5 + fix)
- ✅ Owner assigned (e.g., "O'Brien: validate build artifacts pre-deploy")
- ✅ Cost of incident quantified (via Quark + Crusher health data)
- ✅ Follow-up missions auto-generated (e.g., "Write build artifact validator")

---

#### Template B3: Innovation Lounge (All-Crew Brainstorm)
**Purpose:** Generative ideation (each crew member invents a feature, crew debates portfolio)  
**Team:** All 11 officers in canonical personas  
**Execution:** Full Innovation Lounge run (~15–20min)  
**Output:** Pitched features + crew debate + Picard portfolio resolution (Pursue Now / Next / Park)

**Example Mission:**
- **"What should Story Agent's next moonshot capability be?"**
  - Data: "Automated multi-file refactoring with AST transformation"
  - Troi: "Real-time collaboration portal (comment threads + async handoff)"
  - Geordi: "Self-healing infrastructure (auto-rollback on metric anomalies)"
  - O'Brien: "GitOps workflow (all changes tracked + auditable)"
  - Worf: "Zero-trust security model (verify every action)"
  - → Crew debates synergies + conflicts
  - → Picard resolves portfolio (e.g., "Pursue: Collaboration portal + Self-healing | Next: Zero-trust")

**Success Criteria:**
- ✅ All 11 crew members pitch original ideas
- ✅ Synergies identified (e.g., "Collaboration + Zero-trust align")
- ✅ Conflicts surfaced (e.g., "Self-healing vs. Determinism tradeoff")
- ✅ Portfolio resolved with rationale
- ✅ Cost baseline established per initiative

---

## Part 2: UI/UX Task-Driven Interaction Design (Data + Troi)

### Principle 1: Task Entry Point (Replace Feature Gallery)

**Current State (Anti-Pattern):**
```
┌─────────────────────────────┐
│ Choose Crew Members         │ ← Users overwhelmed by options
│ Select LLM Model            │
│ Define Mission Goals        │
│ Configure Escalation Rules  │
└─────────────────────────────┘
```

**Crew-Designed Pattern:**
```
┌────────────────────────────────────────┐
│ "What do you want to accomplish?"      │ ← Natural language
│ [____________ describe task _________] │ ← Simple text field
└────────────────────────────────────────┘
         ↓ (Crew auto-assembles)
┌────────────────────────────────────────┐
│ Mission Type: BASE-LEVEL               │ ← Auto-detected
│ Estimated Cost: $0.002                 │
│ Time to Results: ~15 seconds           │
│ Crew Assigned: Data (TypeScript audit) │
│                                        │
│ [▶ Launch Mission]  [← Change Type]    │
└────────────────────────────────────────┘
```

**Implementation (Data + Troi):**
1. **Natural Language Classification** (Data)
   - Input: User's task description
   - Logic: Regex + semantic matching → detect mission category (A1/A2/B1/B2/B3)
   - Example: "audit typescript" → Detects `A1: Shake-Down Diagnostic`
   - Crew assignment: Quark's model selector returns crew roster

2. **Stakeholder-Friendly Display** (Troi)
   - Mission type badge: "⚡ QUICK" (A2) vs. "👥 TEAM REVIEW" (B1) vs. "🧠 BRAINSTORM" (B3)
   - Cost transparency: "~$0.002 (cheaper than a coffee)"
   - Time clarity: "15 seconds to results" or "30 min debate + synthesis"
   - Crew visibility: Show assigned members + their domains
   - ONE-CLICK LAUNCH (no config wizards)

3. **Validation:**
   - Misclassification rate target: <5%
   - Time-to-first-action: <15 seconds (measure: from task input to "Launch" click)

---

### Principle 2: Live Execution Feed (Not "Loading...")

**Current State (Anti-Pattern):**
```
┌─────────────────────────────┐
│ Loading mission...          │
│ ⏳ Please wait...           │
│                             │
│ (User context is lost)      │
└─────────────────────────────┘
```

**Crew-Designed Pattern:**
```
┌────────────────────────────────────────┐
│ MISSION: Audit TypeScript strict mode  │
│ Status: ▶ IN PROGRESS                  │
├────────────────────────────────────────┤
│ [15:32] Data → "Starting linter scan"  │ ← Real-time crew thoughts
│         🔍 Scanning 42 files...        │    (not raw output)
│                                        │
│ [15:33] Data → "Found 3 violations"    │
│         · src/utils/helpers.ts:L42     │
│         · src/types/index.ts:L8        │
│         · packages/ui/api.ts:L156      │
│                                        │
│ [15:35] 🎯 Data: "Ready to refactor?   │
│              Suggest detailed fixes?"  │
│                                        │
│ ┌─────────────────────────────────┐   │
│ │ [💬 Ask crew a question]        │   │ ← User control
│ │ [↻ Course-correct mid-mission]  │   │
│ │ [⏸ Pause & review]             │   │
│ └─────────────────────────────────┘   │
└────────────────────────────────────────┘
```

**Implementation (Troi + Data):**
1. **Real-Time Crew Narration** (Troi)
   - Subscribe to mission execution logs (via WebSocket or SSE)
   - Filter crew thoughts → Show high-level summaries, not raw token spam
   - Format: `[HH:MM] CrewMember → "Natural language summary" (metadata)`
   - Emojis + badges for visual scanning (🔍 Scanning, 📋 Analyzing, 🎯 Ready, ⚠️ Escalation needed)

2. **Instrumentation** (Data)
   - Crew agent emits structured logs with `level: (debug|info|action|escalation)` field
   - Only surface `info` + `action` + `escalation` to UI (filter debug spam)
   - Tag each log with crew member ID + domain (e.g., `{ crewId: 'data', domain: 'architecture', level: 'action', text: '...' }`)
   - Stream to `mission_{id}_stream.jsonl` in Supabase

3. **User Interactions (Live Feedback):**
   - **"Ask crew a question"** → Crew responds in-stream (e.g., user: "Can we auto-fix these?" → Data: "Yes, I can generate fixes")
   - **"Course-correct"** → Pause mission, let user modify goals, resume
   - **"Pause & review"** → Show current findings in detail (not realtime scroll)

4. **Validation:**
   - Stream latency: <2 sec from crew log to UI display
   - Crew narration: 80%+ intelligibility in user testing (not cryptic)
   - User engagement: 30%+ users interact mid-mission (ask question or pause)

---

### Principle 3: Outcome-Focused Results (Not Feature Dump)

**Current State (Anti-Pattern):**
```
┌──────────────────────────────────────┐
│ Mission Results (Raw)                │
│                                      │
│ Crew Debate Transcript (2000 words)  │ ← Overwhelming
│ Token Usage: 53,926                  │
│ Cost: $0.0168                        │
│ Model: deepseek/deepseek-chat        │
│ Efficiency: 0.01626 USD/1k tokens    │
│                                      │
│ (User doesn't know what to DO)       │
└──────────────────────────────────────┘
```

**Crew-Designed Pattern:**
```
┌──────────────────────────────────────┐
│ ✅ MISSION COMPLETE                 │
│ "Audit TypeScript strict mode"      │
├──────────────────────────────────────┤
│ 📊 FINDINGS (3 violations)           │
│ ├─ src/utils/helpers.ts:L42          │
│ │  Issue: Missing return type        │
│ │  Fix: Add `-> Promise<string>`     │
│ │  Owner: Frontend team              │
│ │  Effort: 5 min                     │
│ │                                    │
│ ├─ src/types/index.ts:L8             │
│ │  Issue: Implicit `any` type        │
│ │  Fix: Specify union type           │
│ │  Owner: Data (will fix)            │
│ │  Effort: 2 min                     │
│ │                                    │
│ └─ packages/ui/api.ts:L156           │
│    Issue: Unsafe type cast           │
│    Fix: Use Zod validation           │
│    Owner: Backend team               │
│    Effort: 10 min                    │
│                                      │
│ 🔗 NEXT STEPS (Auto-suggested)       │
│ ├─ "Write fixes for 3 violations"   │
│ │  [→ Launch This Mission]           │
│ │                                    │
│ └─ "Run tests after fixes"          │
│    [→ Launch This Mission]           │
│                                      │
│ 💡 STAKEHOLDER IMPACT                │
│ "Frontend team can unblock this      │
│  week if you address violations     │
│  by Friday EOD. Critical path."      │
│                                      │
│ ⏱ Cost: $0.002 · Time: 3 min        │
│ 👤 Crew: Data (validation expert)   │
└──────────────────────────────────────┘
```

**Implementation (Data + Troi):**
1. **Data Validation** (Data)
   - Synthesize crew findings → Extract actionable items:
     - Issue → Root cause → Recommended fix → Effort estimate → Owner
   - Validate findings against source code (no hallucinations)
   - Link to specific file:line references (click-through to GitHub)
   - Format: JSON schema `{ issues: [{ file, line, issue, fix, owner, effort }] }`

2. **Stakeholder Impact Summary** (Troi)
   - Extract from crew debate: Who is blocked? By when? What's the risk?
   - Natural language summary: "Frontend team can unblock if you fix by Friday"
   - Tone: Action-oriented, not feature-driven
   - Target: 1–2 sentences max

3. **Follow-Up Mission Suggestions** (Data + Troi)
   - Data: Detect logical next steps from findings
     - "3 violations found" → Suggest "Write fixes for 3 violations"
     - "Deploy blocked" → Suggest "Remediate infrastructure drift"
   - Troi: Make it one-click
     - Format: `[→ Launch This Mission]` (pre-filled with next step)
     - Pitch: "Based on findings, crew suggests: ..."

4. **Validation:**
   - Outcome clarity: 90%+ testers know exactly what to do next
   - Time-to-action: <30 seconds from mission complete to follow-up click
   - Hallucination rate: 0% (all findings verified against source code)

---

### Principle 4: Escalation Clarity (Not Silent Escalation)

**Current State (Anti-Pattern):**
```
Mission started...
(30 seconds later)
🕐 Still waiting...
(2 minutes later)
Mission failed. Contact support.

User: "What happened??? Did we escalate? Should I retry??"
```

**Crew-Designed Pattern:**
```
┌──────────────────────────────────────┐
│ ⚠️ CREW NEEDS YOUR INPUT             │
│                                      │
│ Data's analysis found a tradeoff:    │
│                                      │
│ OPTION A: "Quick Fix" (RISKY)        │
│ ├─ Use `as any` casting             │
│ ├─ Deploy in 5 minutes              │
│ ├─ Risk: 20% chance of type-related │
│ │  bugs in production                │
│ └─ Cost: $0.001                     │
│                                      │
│ OPTION B: "Safe Refactor" (SLOWER)  │
│ ├─ Write proper type definitions    │
│ ├─ Full test coverage               │
│ ├─ Timeline: By Friday EOD           │
│ └─ Cost: $0.005                     │
│                                      │
│ 🎯 Troi's Recommendation:           │
│ "Option B. Stakeholders expect      │
│  Friday delivery. Type safety       │
│  prevents costly prod incidents."   │
│                                      │
│ [Choose Option A]  [Choose Option B]│
│ [Ask crew for more details]         │
└──────────────────────────────────────┘
```

**Implementation (Worf + Data + Troi):**
1. **Escalation Detection** (Worf + Data)
   - Automatic triggers for crew escalation:
     - Architectural tradeoffs (Data detects conflicts in advice)
     - Security implications (Worf flags permission/audit concerns)
     - Cross-domain dependencies (multiple crew members give different advice)
   - Condition: `IF crew_members_with_different_advice >= 2 THEN escalate`

2. **Transparent Escalation UI** (Troi)
   - Show: "Crew needs your judgment: [Option A] vs [Option B]"
   - Include: Crew recommendation + rationale (1–2 sentences)
   - Format: Side-by-side comparison (cost, timeline, risk, stakeholder impact)
   - Buttons: Choose Option A / Choose Option B / Ask for more details
   - NO silent retries or waiting

3. **Validation:**
   - Escalation clarity: 95%+ users understand the tradeoff
   - Escalation frequency: <15% of missions (don't over-escalate)
   - Cost accuracy: User understands cost delta between options

---

### Principle 5: Follow-Up Missions (One-Click Next Steps)

**Current State (Anti-Pattern):**
```
Mission complete. View results.
← Back to Dashboard
← Create a new mission
← Browse mission templates
(User context is lost; have to start over)
```

**Crew-Designed Pattern:**
```
┌──────────────────────────────────────┐
│ ✅ MISSION COMPLETE                 │
│ "Audit TypeScript strict mode"      │
│                                      │
│ 🔗 SUGGESTED NEXT MISSION            │
│                                      │
│ Mission: "Fix TypeScript violations" │
│ Category: ⚡ QUICK                   │
│ Assigned Crew: Data                  │
│ Estimated Cost: $0.005               │
│ Time: ~5 minutes                     │
│                                      │
│ Scope: Auto-fix 3 violations via     │
│        Prettier + TypeScript linter  │
│                                      │
│ Impact: "Unblock frontend team       │
│         (currently waiting on type   │
│         safety fixes)"               │
│                                      │
│ [▶ Launch This Mission]  [← Try Another]
│                                      │
│ ─────────────────────────────────────│
│ Other suggestions:                   │
│ • Run tests after fixes              │
│ • Review changes with team           │
│ • Merge to main branch               │
│                                      │
└──────────────────────────────────────┘
```

**Implementation (Data + Troi):**
1. **Auto-Detection** (Data)
   - Parse mission findings → Detect logical next steps
   - Examples:
     - "Violations found" → Next: "Write fixes"
     - "Fixes written" → Next: "Run tests"
     - "Tests failing" → Next: "Debug failures"
   - Create mission brief pre-populated with context

2. **One-Click Launch** (Troi)
   - Button: `[▶ Launch This Mission]` (no config)
   - Automatically pass context (e.g., file list, owner, deadline)
   - Show: Cost + time estimate + stakeholder impact (why this matters)

3. **Validation:**
   - Follow-up mission adoption: 60%+ users click "Launch This Mission"
   - Context carryover: 90%+ of auto-generated missions run successfully (no config tweaks needed)

---

## Part 3: Implementation Roadmap (Data + Troi Co-Author Phase)

### Phase 3.1: Core UI Components (Week 1)

**Data Responsibilities:**
1. Define data schema for `Mission` type (extends CrewMissionPlan):
   ```typescript
   type Mission = {
     id: string;
     category: 'A1' | 'A2' | 'B1' | 'B2' | 'B3';
     userInput: string;
     autoClassification: { category, confidence, reasoned };
     assignedCrew: string[];
     status: 'pending' | 'running' | 'escalation' | 'complete';
     findings: Finding[]; // Issue + fix + owner + effort
     nextMissions: Mission[]; // Auto-generated suggestions
     stakeholderImpact: string;
     cost: number;
     createdAt: timestamp;
   }
   ```

2. Write SQL migrations for `sa_mission_execution_stream` table:
   ```sql
   CREATE TABLE sa_mission_execution_stream (
     id UUID PRIMARY KEY,
     mission_id TEXT,
     crew_id VARCHAR(32),
     level ENUM('debug', 'info', 'action', 'escalation'),
     text TEXT,
     metadata JSONB,
     created_at TIMESTAMP,
     FOREIGN KEY (mission_id) REFERENCES sa_stories(id)
   );
   ```

3. Implement mission auto-classifier (NLP → regex + semantic matching → crew roster)

**Troi Responsibilities:**
1. Design visual hierarchy (mission card → live feed → results → follow-up)
2. Create Figma designs for 5 UI states:
   - Task entry
   - Live execution feed
   - Escalation prompt
   - Outcome results
   - Follow-up suggestions

### Phase 3.2: Live Feed Integration (Week 2)

**Troi:** WebSocket/SSE streaming UI + real-time crew thought display  
**Data:** Crew agent logging (structure mission execution as `mission_*.jsonl` stream)

### Phase 3.3: Outcome Synthesis (Week 3)

**Data:** Parse crew findings → Extract issues + fixes + owners + effort  
**Troi:** Template results page with stakeholder impact + follow-up suggestions

### Phase 3.4: Validation & Testing (Week 4)

**User Testing:**
- 10 internal users (Story Agent crew + familiarcat ops)
- Metrics: time-to-first-action, outcome clarity, follow-up adoption, escalation understanding
- Iterate based on feedback

---

## Part 4: Measurement Framework

### Success Metrics (Crew Consensus)

| Metric | Target | Category | Owned By |
|--------|--------|----------|----------|
| Time-to-first-action | <15 sec | A1/A2 UX | Troi |
| Mission completion rate | >85% | A1/A2 | Data + Crew |
| User abandonment rate | <20% | A1/A2 | Crusher |
| Escalation clarity | 95%+ users understand tradeoff | B1/B2 | Troi |
| Infrastructure drift | <5 delta lines (A1) | A1 | Geordi |
| Cost accuracy | ±10% estimate vs actual | All | Quark |
| Hallucination rate | 0% (findings verified) | All | Data |
| Follow-up adoption | 60%+ click "Launch This Mission" | All | Troi |
| Misclassification rate | <5% | Task Entry | Data |

---

## Part 5: Crew Consensus Statement

**Picard's Synthesis:**
> "We have designed a mission system that prioritizes user agency over feature completeness. By anchoring mission categorization to infrastructure triggers (ephemeral vs. persistent), we achieve both cost efficiency and clarity. The UI/UX follows from this foundation: users describe their goal in natural language, the system assembles the crew, and the user watches real-time progress while retaining control to course-correct or escalate. Results are outcome-focused (findings → fixes → owners → deadlines), not feature-complete data dumps. Follow-up missions are contextually suggested with one-click activation, keeping momentum without losing context. This system is measurable (drift, cost, abandonment, clarity), scalable (frugal models for easy tasks, Anthropic reserved for genuine tradeoffs), and human-centered. Implementation begins with Data + Troi co-authoring the UI/UX layer, validated by internal user testing before external rollout."

---

## Next Actions

1. **Data + Troi:** Co-author UI/UX design specs (Figma + TypeScript types) — **1 week**
2. **Crew:** Build 2 easy missions (A1 + A2) + 1 complex mission (B1) as Shake-Down Cruise validation — **1 week**
3. **Internal Testing:** 10 users, 20 mission runs, feedback loop — **1 week**
4. **Iteration:** Adjust UX based on testing (time-to-action, clarity, adoption) — **1 week**
5. **Launch:** Story Agent internal dogfooding with full mission system + Data + Troi UI/UX

---

**Stored to Cloud RAG:**
- Tags: `type:mission-design`, `domain:sample-missions`, `domain:ui-ux`, `phase:design`, `crew:consensus`
- Reference: `CREW_MISSION_SAMPLE_MISSIONS_UX_DESIGN_2026_08_26`
- Recall keyword: "sample missions task-driven UI UX design"
