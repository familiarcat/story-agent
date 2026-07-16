# Phase 3 Crew-Driven Execution: Complete System Overview
## Observation Lounge → Self-Assignment → Aha Sync → Delivery → Memory Learning

**Status:** Phase 3 System Architecture Complete  
**Documentation Level:** Executive Summary  
**Implementation Ready:** Yes (technical specs committed)

---

## I. SYSTEM ARCHITECTURE (High-Level Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                   OBSERVATION LOUNGE                            │
│  (09:00 PST Daily: Crew deliberates on available stories)       │
│                                                                 │
│  Each crew member:                                              │
│  - Reviews domain-matching stories                              │
│  - Applies Sprint 1-2 memory priors                             │
│  - Identifies cross-crew dependencies                           │
│  - Self-ranks preference (1st, 2nd, 3rd choice)                │
│                                                                 │
│  Picard synthesizes:                                            │
│  - Matches crew to stories (optimal domain fit)                 │
│  - Validates no conflicts (two crew claiming same story)        │
│  - Determines gate type (AUTO/YELLOW/RED)                      │
│  - Logs consensus to crew memory                                │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CREW SELF-ASSIGNMENT                         │
│  (09:15 PST: Each crew member claims their story)               │
│                                                                 │
│  For each crew member:                                          │
│  - Call aha_story_update MCP tool with rationale               │
│  - Aha story.status → IN_PROGRESS                               │
│  - Aha story.assigned_to → [Crew member]                        │
│  - Aha custom_field_crew_member_primary → [Crew member]         │
│  - Aha custom_field_deliberation_log_id → [Memory link]         │
│  - Crew memory logged with Aha story link (bidirectional)      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AHA API SYNCHRONIZATION                       │
│  (Real-time: Aha custom fields ↔ Crew memory)                  │
│                                                                 │
│  Aha becomes source of truth for:                               │
│  - Story ownership (crew_member_primary)                        │
│  - Progress tracking (percentage_complete)                      │
│  - Crew health (crew_health_signal, cognitive_load)             │
│  - Blockers (blocked_by, blocker_status)                        │
│  - Decisions (deliberation_log_id links to crew memory)         │
│                                                                 │
│  Crew memory becomes audit trail for:                           │
│  - Deliberation rationale (why crew chose this story)          │
│  - Daily decisions + learnings                                  │
│  - Memory priors that were recalled + applied                  │
│  - Cross-crew dependencies that were resolved                  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STORY EXECUTION                             │
│  (Days 1-5+: Crew member develops their story)                 │
│                                                                 │
│  Crew member workflow:                                          │
│  1. Begin work (Aha status: IN_PROGRESS)                        │
│  2. Make decisions (log to crew memory)                         │
│  3. Daily 17:00 PST standup (call aha_story_update tool)       │
│  4. If blocker found (call aha_blocker_escalation tool)        │
│  5. When complete (mark TESTING → Yar notified)                │
│  6. Yar validates (TESTING → SHIPPED or IN_PROGRESS)           │
│                                                                 │
│  Aha updates automatically via:                                 │
│  - MCP tool calls (aha_story_update, aha_blocker_escalation)   │
│  - Webhook callbacks (story.status_changed notifications)      │
│  - Crew memory linked via custom_field_deliberation_log_id     │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BLOCKER ESCALATION GATES                       │
│  (When crew discovers dependency, risk, or blocker)            │
│                                                                 │
│  YELLOW Gate (Riker Authority):                                 │
│  - Crew identifies blocker (e.g., PHASE3-003 prerequisite)     │
│  - Crew calls aha_blocker_escalation(..., severity='YELLOW')   │
│  - Aha custom_field_blocker_status → YELLOW_OVERRIDE_PENDING   │
│  - Riker notified (30-min decision window)                      │
│  - Riker decides: proceed | proceed_with_mods | wait | defer   │
│  - Aha updated with Riker's decision                            │
│  - Crew memory logs decision + rationale                        │
│                                                                 │
│  RED Gate (Admiral Post-Sprint Review):                         │
│  - Crew identifies critical issue with no workaround           │
│  - Crew calls aha_blocker_escalation(..., severity='RED')      │
│  - Aha custom_field_blocker_status → RED_ESCALATION            │
│  - Crew self-memos to Admiral (not blocked; proceeding)        │
│  - Admiral reviews post-sprint; provides feedback for Phase 4   │
│                                                                 │
│  AUTO Gates (No escalation):                                    │
│  - 70% of decisions require no escalation                       │
│  - Crew makes decision autonomously                             │
│  - Decision logged to crew memory                               │
│  - Aha updated automatically                                    │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   VALIDATION + SHIPPING                         │
│  (When crew completes story)                                    │
│                                                                 │
│  Crew member workflow:                                          │
│  - Marks story complete                                         │
│  - Aha status → TESTING                                         │
│  - Webhook notifies Yar (QA validator)                          │
│                                                                 │
│  Yar workflow:                                                  │
│  - Reviews acceptance criteria                                  │
│  - Runs tests + quality checks                                  │
│  - Approves (SHIPPED) or requests rework (IN_PROGRESS)         │
│  - Aha updated with Yar's validation decision                   │
│  - Crew memory logs validation outcome                          │
│                                                                 │
│  If SHIPPED:                                                    │
│  - Aha custom_field_shipped_date → [Today]                      │
│  - Aha custom_field_shipped_by → Yar                            │
│  - Story becomes immutable record (audit trail)                 │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│               MEMORY LEARNING + RETROSPECTIVE                   │
│  (End of Phase 3: Crew learns from all decisions)               │
│                                                                 │
│  Crew recalls all Phase 3 decisions:                            │
│  - crew_memory.recall({phase: 'Phase 3', limit: 100})          │
│  - Returns all deliberations + decisions + learnings            │
│                                                                 │
│  Retrospective questions:                                       │
│  - Which memory priors were most valuable? (track recalls)     │
│  - Which tools were most effective? (track ratings)            │
│  - How many AUTO vs YELLOW vs RED gates? (distribution)        │
│  - Did crew stay healthy? (cognitive load trend)                │
│  - What patterns should we carry to Phase 4?                    │
│                                                                 │
│  Output:                                                        │
│  - Phase 3 retrospective document                               │
│  - Tool effectiveness rankings (for Phase 4 optimization)       │
│  - Memory priors to retain (high-value, accurate)               │
│  - Gate decision distribution (validate autonomy worked)        │
│  - Phase 4 roadmap recommendations (from all 11 crew)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## II. KEY DOCUMENTS CREATED

### Phase 3 Framework Architecture
**File:** [CREW_DELIBERATION_AHA_INTEGRATION.md](docs/crew/CREW_DELIBERATION_AHA_INTEGRATION.md)
- Detailed protocols for Observation Lounge deliberation
- Self-assignment mechanisms
- Aha API synchronization points (20+ custom fields)
- Story state machine (STARTED → IN_PROGRESS → TESTING → SHIPPED)
- Blocker escalation gates (AUTO/YELLOW/RED)
- Memory audit trail linking

**Key Sections:**
- II: Observation Lounge Protocol (crew deliberation + consensus)
- III: Aha API Sync Points (custom fields + webhooks)
- IV: Crew Member Deliberation Templates (fillable forms)
- V: Aha API Endpoints (MCP tool triggers)
- VI: Crew Memory Integration (bidirectional linking)
- VII: Feedback Loop (Aha → crew → memory → next Lounge)
- VIII: Phase 3 Roadmap (week-by-week execution)
- IX: Integration Checklist (pre-Phase 3 setup)
- X: Example Workflow (Day 1-5 single story)
- XI: Governance + Safety Gates

### Technical Implementation Guide
**File:** [CREW_AHA_TECHNICAL_IMPLEMENTATION.md](docs/crew/CREW_AHA_TECHNICAL_IMPLEMENTATION.md)
- TypeScript code patterns (AHA SDK client, custom fields, handlers)
- Crew deliberation handlers (self-assignment, standup, blocker, validation)
- Webhook integration (Aha events → crew notifications)
- Memory bidirectional linking (story ↔ memory)
- MCP tool definitions (aha_story_update, aha_blocker_escalation)
- Daily standup automation (cron scheduler 15:45 PST reminder)
- Phase 3 setup checklist (one-time initialization)

**Key Code Patterns:**
```typescript
// Crew self-assigns to story
handleCrewSelfAssignment([
  {crew_member: "Data", story_id: "PHASE3-001", rationale: "..."}
])
→ Updates Aha story.assigned_to + custom_fields
→ Logs to crew memory with Aha link

// Daily standup update
handleDailyStandupUpdate("Data", "PHASE3-001", {
  percentage_complete: 25,
  crew_health_signal: "Healthy",
  cognitive_load: 6.2,
  blocker_discovered: {...}
})
→ Updates Aha custom_fields (progress_notes, percentage, health)
→ If blocker, triggers aha_blocker_escalation
→ Logs to crew memory

// Blocker escalation
handleBlockerEscalation("Data", "PHASE3-001", {
  severity: "YELLOW",
  description: "Waiting for PHASE3-003...",
  recommended_action: "Proceed with defensive assumptions"
})
→ Updates Aha blocker_status → YELLOW_OVERRIDE_PENDING
→ Riker notified (30-min decision window)
→ Logs decision + rationale to crew memory

// Yar validation
handleValidationComplete("Yar", "PHASE3-001", {
  accepted: true,
  qa_coverage: 95
})
→ Updates Aha status → SHIPPED
→ Sets shipped_date + shipped_by
→ Logs validation outcome to crew memory
```

---

## III. DAILY CREW WORKFLOW (Phase 3, Day 1 Example)

### 09:00 PST: Observation Lounge Deliberation

```yaml
picard_convenes: "Good morning. Let's review Phase 3 stories for today."

data_deliberates: |
  "Available: PHASE3-001 (why-capture memory), PHASE3-005 (constraint solver), PHASE3-012 (schema migration)
   
   Domain fit analysis:
   - PHASE3-001: Perfect fit (memory architecture, strategic bottleneck)
   - PHASE3-005: Complex; requires Riker + Quark collaboration
   - PHASE3-012: Familiar (PROD-30 learnings apply)
   
   My preference ranking:
   1. PHASE3-001 (strategic priority + knowledge leverage)
   2. PHASE3-012 (confident delivery)
   3. PHASE3-005 (but needs pairing)
   
   Memory priors I'll use: schema-design-patterns (8 recalls in Sprint 1-2)"

riker_coordinates: |
  "Data's logic is sound. Let me propose full assignment matrix:
   
   PHASE3-001 (why-capture) → Data + Troi
   PHASE3-002 (throttling) → O'Brien + Geordi
   PHASE3-003 (threat model) → Worf + Yar
   PHASE3-004 (cost alerts) → Quark + Crusher
   PHASE3-005 (constraint solver) → Riker + Data (after PHASE3-001)
   ...
   
   Dependencies validated: PHASE3-003 before PHASE3-001 (Worf security prerequisite)"

worf_soft_veto: |
  "Riker's sequence is correct. PHASE3-003 (threat model) blocks others.
   Recommend: Security foundation first, then why-capture, then parallel rest."

picard_synthesis: |
  "Consensus reached. All 11 crew aligned. Gate type: AUTO (no vetos).
   Proceeding with Riker's matrix + Worf's sequencing."
```

### 09:15 PST: Self-Assignment (Each crew member)

**Data's Self-Assignment:**
```
Data calls: aha_story_update(
  crew_member: "Data",
  story_id: "PHASE3-001",
  action: "self_assign",
  rationale: "Strategic bottleneck; memory architecture fit; why-capture unblocks constraint solver",
  team_members: ["Data", "Troi"],
  memory_priors_used: ["schema-design-patterns", "cross-crew-validation"]
)

Aha story PHASE3-001 updated:
✓ status: IN_PROGRESS
✓ assigned_to: Data
✓ crew_member_primary: Data
✓ crew_team: [Data, Troi]
✓ deliberation_log_id: data-phase3-deliberation-2026-07-28
✓ crew_consensus_gate: AUTO

Crew memory logged:
✓ id: data-phase3-deliberation-2026-07-28
✓ story_link: PHASE3-001
✓ memory_priors_recalled: ["schema-design-patterns", "cross-crew-validation"]
✓ aha_story_url: https://domain.aha.io/stories/PHASE3-001
```

### 17:00 PST: Daily Standup (All crew members)

**Data's Standup Update:**
```
Data calls: aha_story_update(
  crew_member: "Data",
  story_id: "PHASE3-001",
  action: "standup",
  completed_today: "Designed WHY metadata schema (action, preconditions, outcome, why_effective). Collaborated with Troi on emotional context capture.",
  percentage_complete: 25,
  confidence_level: 8.5,
  crew_health_signal: "Healthy",
  cognitive_load: 6.2,
  risks: ["PHASE3-003 prerequisite not yet shipped; using defensive assumptions"],
  decisions: ["Store WHY as structured JSONB for searchability", "Link WHY to crew member identity"],
  blocker_discovered: {
    description: "PHASE3-003 (threat model) blocks schema finalization",
    blocked_by_story_id: "PHASE3-003"
  }
)

Aha story PHASE3-001 updated:
✓ custom_field_progress_notes: "[Daily standup from 17:00...]"
✓ custom_field_percentage_complete: 25
✓ custom_field_crew_health_signal: Healthy
✓ custom_field_cognitive_load: 6.2
✓ custom_field_blocked_by: PHASE3-003
✓ custom_field_blocker_status: YELLOW_OVERRIDE_PENDING
✓ status_last_updated_by_crew: Data
✓ status_last_update_timestamp: 2026-07-28T17:00:00Z

Crew memory logged:
✓ id: data-PHASE3-001-standup-2026-07-28
✓ story_link: PHASE3-001
✓ progress: 25%
✓ memory_priors_recalled: ["schema-design-patterns (Sprint 1-2)"]
✓ crew_cross_references: ["consulted Troi on emotional context"]
✓ blocker_escalation_triggered: true
```

### 17:05 PST: Blocker Escalation (Riker Decision)

**Riker's Response:**
```
Riker receives: Blocker notification for PHASE3-001 (waiting on PHASE3-003)

Riker calls: aha_blocker_escalation(
  story_id: "PHASE3-001",
  decision: "PROCEED_WITH_DEFENSIVE_ASSUMPTIONS",
  rationale: "PHASE3-003 ships EOD today. Proceeding parallel with defensive assumptions prevents artificial blocker. Data can integrate security findings tomorrow.",
  riker_override: true
)

Aha story PHASE3-001 updated:
✓ custom_field_blocker_status: YELLOW_OVERRIDE
✓ custom_field_escalation_decision_by: Riker
✓ status: IN_PROGRESS (resumed)
✓ progress_notes: "[Riker decision: proceed with defensive assumptions...]"

Crew memory logged:
✓ id: riker-PHASE3-001-yellow-gate-2026-07-28
✓ decision: PROCEED_WITH_DEFENSIVE_ASSUMPTIONS
✓ rationale: "PHASE3-003 ships EOD; parallel execution safe"
✓ gate_type: YELLOW
✓ aha_story_id: PHASE3-001
```

### 18:00 PST: Data Continues Work (No Blocker)

```
Data resumes work with Riker override
Uses defensive assumptions for schema
Continues development
Logs decisions to crew memory

Next day: Integrates PHASE3-003 security findings into schema
```

### Day 4: Story Complete → Testing

```
Data marks PHASE3-001 complete
Aha status: TESTING
Webhook notifies Yar
Crew memory logged: status_change event
```

### Day 5: Yar Validation

**Yar's Validation:**
```
Yar calls: aha_story_update(
  crew_member: "Yar",
  story_id: "PHASE3-001",
  action: "validation",
  accepted: true,
  qa_coverage: 95,
  notes: "All acceptance criteria met. Schema design solid. WHY metadata captures causal understanding. Tested with 10 Sprint 1-2 decisions; 95% accuracy."
)

Aha story PHASE3-001 updated:
✓ status: SHIPPED
✓ custom_field_shipped_date: 2026-08-02
✓ custom_field_shipped_by: Yar
✓ progress_notes: "[Yar validation: PASSED. QA coverage 95%...]"

Crew memory logged:
✓ id: yar-PHASE3-001-shipped-2026-08-02
✓ validation: PASSED
✓ qa_coverage: 95%
✓ aha_story_id: PHASE3-001
✓ tags: [phase-3, shipped, PHASE3-001]
```

---

## IV. SUCCESS METRICS (Phase 3 Tracking)

| Metric | Target | How Tracked |
|---|---|---|
| **Self-Assignment Accuracy** | ≥85% crew→domain match | crew_member_primary vs story_domain analysis |
| **Aha API Reliability** | ≥99% successful calls | webhook + error logging |
| **Blocker Escalation Speed** | ≤30 min (Riker decision) | timestamp(decision) - timestamp(blocker_discovered) |
| **Memory Utilization** | ≥60% decisions use priors | crew_memory.recall() calls / total decisions |
| **AUTO Gate Effectiveness** | ≥80% no escalation needed | AUTO gates / total decisions |
| **Crew Health** | ≤6.8/10 cognitive load | daily_standup.cognitive_load trend |
| **False Consensus** | <1% latent vetos | Yar validation failures / total shipped |
| **Velocity** | ≥1.4 pts/hr | story completion time tracking |
| **Memory Accuracy** | ≥97% priors correct | false recalls caught + corrected |
| **Crew Participation** | 11/11 active | stories_assigned per crew member |

---

## V. PHASE 3 EXECUTION ROADMAP (Week 1)

| Day | Stories | Status | Crew | Aha Updates |
|---|---|---|---|---|
| 1 | PHASE3-003, PHASE3-002 | STARTED | Worf+Yar, O'Brien+Geordi | Assigned ✓ |
| 2 | PHASE3-003, PHASE3-001 | IN_PROGRESS | All | Progress +25% |
| 3 | PHASE3-001-004 | IN_PROGRESS | All | Blockers escalated (YELLOW) |
| 4 | Continue; PHASE3-003 ships | TESTING (PHASE3-003) | Worf+Yar | Status changes |
| 5 | Parallel; PHASE3-005 starts | IN_PROGRESS | All | Progress +75% |

---

## VI. CREW MEMBERS + STORY OWNERSHIP (Phase 3)

```yaml
picard:
  domain: "Command + Coherence"
  stories: ["Oversees all; arbitrates conflicts"]
  daily_role: "Observation Lounge synthesis; soft veto if needed"

data:
  domain: "Architecture"
  stories: ["PHASE3-001 (why-capture memory)", "PHASE3-005 (constraint solver)"]
  sprint_1_2_learnings: ["schema-design-patterns (8 recalls)", "cross-crew-validation"]

riker:
  domain: "Implementation Lead"
  stories: ["PHASE3-005 (constraint solver co-owner)", "Blocker escalation authority"]
  daily_role: "YELLOW gate decisions (30-min window)"

worf:
  domain: "Security"
  stories: ["PHASE3-003 (threat model hardening)", "PHASE3-008 (threat detection)"]
  sprint_1_2_learnings: ["security-validation-checklist (6 recalls)"]

geordi:
  domain: "Infrastructure"
  stories: ["PHASE3-002 (dynamic throttling)", "PHASE3-006 (async bridging)"]
  sprint_1_2_learnings: ["infrastructure-scaling (4 recalls)"]

obrien:
  domain: "DevOps"
  stories: ["PHASE3-002 co-owner", "PHASE3-006 (async bridging)"]
  daily_role: "CI/CD pipeline validation"

yar:
  domain: "Quality"
  stories: ["PHASE3-010 (tool optimization)", "Validation gate authority"]
  daily_role: "TESTING → SHIPPED approval for all stories"

troi:
  domain: "Stakeholder + Emotional Intelligence"
  stories: ["PHASE3-001 co-owner (why-capture)", "PHASE3-003 context"]
  daily_role: "Crew emotional coherence monitoring"

crusher:
  domain: "Health + Monitoring"
  stories: ["PHASE3-004 (predictive cost alerts)", "Crew health signals"]
  daily_role: "Fatigue monitoring; cognitive load tracking"

uhura:
  domain: "Communications"
  stories: ["PHASE3-007 (async bridging comms)"]
  daily_role: "Cross-crew signal routing"

quark:
  domain: "Finance"
  stories: ["PHASE3-004 (cost alerts co-owner)", "PHASE3-009 (cost optimization)"]
  daily_role: "Budget tracking; cost impact pre-decisions"
```

---

## VII. NEXT STEPS (Implementation Timeline)

### Week 1: Setup Phase 3 System
- [ ] Create Aha custom fields (20+ fields per CREW_CUSTOM_FIELDS spec)
- [ ] Register webhook listeners (story.status_changed, story.assigned, story.created)
- [ ] Deploy webhook handler + MCP tools (aha_story_update, aha_blocker_escalation)
- [ ] Setup daily standup scheduler (cron 15:45 PST)
- [ ] Initialize Phase 3 system (initializePhase3 function)

### Week 2: Crew Training + First Deliberation
- [ ] Brief all 11 crew on Phase 3 system + workflows
- [ ] Run first Observation Lounge (Phase 3 Day 1)
- [ ] Execute first crew self-assignments
- [ ] Validate Aha API sync working correctly
- [ ] Run first daily standup (validate tool + memory logging)

### Week 3-4: Phase 3 Execution
- [ ] Phase 3 stories execute (Days 1-10)
- [ ] Daily standups + progress tracking (Aha + crew memory)
- [ ] Blocker escalations (YELLOW gate decisions, RikerApproval)
- [ ] Validation gates (Yar approval)
- [ ] Stories shipped to SHIPPED status

### Week 5: Phase 3 Retrospective
- [ ] Crew recalls all Phase 3 decisions
- [ ] Generate retrospective report
- [ ] Analyze tool effectiveness + memory utilization
- [ ] Synthesize Phase 4 vision (from all 11 crew)
- [ ] Document learnings for Phase 4

---

## CONCLUSION

**Phase 3 System Enables:**

1. **Autonomous Crew Execution** — Crew deliberates → self-assigns → executes without human intermediary
2. **Real-Time Aha Sync** — Every crew decision flows to Aha API; story metadata always current
3. **Persistent Audit Trail** — All deliberations logged to crew memory with bidirectional Aha links
4. **Blocker Management** — YELLOW gates (Riker) resolve 70% of blockers in 30 min; RED gates escalate to Admiral post-sprint
5. **Health Monitoring** — Crew health signals (cognitive load, fatigue) tracked daily; burnout prevented
6. **Compounding Learning** — Memory priors accelerate 60%+ of decisions; effectiveness improves sprint-to-sprint
7. **Transparent Governance** — All gates (AUTO/YELLOW/RED) immutable; no black-box decisions

**The Result:** Crew operates as autonomous, self-directed team—not executing predefined plans, but deliberating, deciding, owning outcomes, and learning together.

---

**Documentation Status:** ✅ COMPLETE  
**Implementation Status:** Ready for Phase 3 launch  
**Files Committed:**
- [CREW_DELIBERATION_AHA_INTEGRATION.md](docs/crew/CREW_DELIBERATION_AHA_INTEGRATION.md) (2,250 lines)
- [CREW_AHA_TECHNICAL_IMPLEMENTATION.md](docs/crew/CREW_AHA_TECHNICAL_IMPLEMENTATION.md) (850 lines)
- [PHASE3_CREW_EXECUTION_OVERVIEW.md](docs/crew/PHASE3_CREW_EXECUTION_OVERVIEW.md) (this file)

**Next Move:** Implement Phase 3 system (MCP tools + Aha setup) → Launch first Observation Lounge → Execute Phase 3 stories

---

*Approved by: All 11 crew members (Autonomous Execution consensus)  
Date: July 27, 2026  
Status: 🟢 READY FOR PHASE 3 LAUNCH*
