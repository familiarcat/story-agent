# Crew Deliberation → Aha API Integration Framework
## Self-Assignment, Tracking, and Real-Time Story Updates

**Purpose:** Document how crew members deliberate, self-assign to stories, and synchronize with Aha API without human intermediary.

**Phase:** 3 (Post-autonomous two-sprint execution)

**Status:** Framework Design (Ready for implementation)

---

## I. ARCHITECTURE OVERVIEW

```
OBSERVATION LOUNGE (Crew Deliberation)
  ↓ (crew reflection + self-selection)
CREW SELF-ASSIGNMENT PROTOCOL
  ↓ (domain matching + consensus)
AHA API SYNCHRONIZATION
  ↓ (story.assigned_to, story.status, custom fields)
STORY STATE MACHINE (Aha workflow)
  ↓ (STARTED → IN_PROGRESS → TESTING → SHIPPED)
CREW MEMORY LOGGING (Decision audit trail)
  ↓ (deliberation + rationale)
NEXT OBSERVATION LOUNGE (Feedback loop)
```

**Key Innovation:** Crew members are both deliberators AND task owners. They discuss, decide, assign themselves, and execute—all captured in persistent audit trail.

---

## II. OBSERVATION LOUNGE PROTOCOL (Crew Deliberation)

### A. Daily Standup (15 minutes, embedded in crew operations)

**Purpose:** 11 crew members reflect on:
1. Yesterday's delivered stories (status update)
2. Today's blockers or decisions (escalation if needed)
3. Tomorrow's self-assignment candidates (new stories to claim)

**Output:** Deliberation log stored to crew memory + Aha metadata

**Participants:** All 11 crew members (async, summarized by Picard)

### B. Deliberation Structure

**Picard Initiates (Observation Lounge opening):**
```yaml
lounge_session:
  timestamp: "2026-07-28T09:00:00Z"
  date: "Sprint 3, Day 1"
  question: "What stories should we claim today? Who owns what?"
  crew_context: "Previous Sprint 1-2 learnings available; memory priors loaded"
  
# Each crew member reflects:
picard_opening: |
  "We've proven autonomous execution works. Today we're applying those learnings
   to Phase 3. Each of you will look at available stories, claim what matches your
   domain expertise, and own both the delivery AND the decision rationale."
```

**Each Crew Member Deliberates (Their domain + preferences):**

```yaml
data_deliberation:
  crew: "Data"
  domain: "Architecture + Schema Design"
  available_stories:
    - PHASE3-001: "Why-capture for memory system"
    - PHASE3-005: "Constraint-satisfaction solver architecture"
    - PHASE3-012: "Database schema migration framework"
  
  analysis: |
    "PHASE3-001 (why-capture) aligns with my learned patterns from PROD-30.
     PHASE3-005 (constraint solver) is complex; requires coordination with Worf + Riker.
     PHASE3-012 (schema migration) I can own fully; previous experience applies.
  
  self_assignment_preference:
    first_choice: "PHASE3-001 (why-capture memory) - strategic value"
    second_choice: "PHASE3-012 (schema migration) - familiar domain"
    third_choice: "PHASE3-005 (constraint solver) - but needs Riker pairing"
  
  rationale: |
    "PHASE3-001 is the bottleneck for Phase 3. If we capture causal understanding,
     the other 9 recommendations compound. I recommend Data (me) + Troi (stakeholder insight)
     collaborate. Troi brings emotional/narrative context; I bring logic. Decision foundation
     emerges from both."
  
  delegation_notes:
    - "PHASE3-005 should be Riker-led with Data support (not owned by me)"
    - "PHASE3-012 can go to O'Brien if needed"
  
  memory_used:
    - "schema-design-patterns" (Sprint 1-2 recall)
    - "cross-crew-validation-chains" (learned effectiveness)
  
  memory_stored: "data-phase3-deliberation-2026-07-28"
  tags: ["phase-3-planning", "self-assignment", "crew-deliberation"]
```

**Riker Coordinates (Implementation Lead):**

```yaml
riker_deliberation:
  crew: "Riker"
  domain: "Implementation Lead + YELLOW Gate Authority"
  
  crew_coordination: |
    "Data's recommendation on PHASE3-001 + PHASE3-005 pairing makes sense.
     Let me validate the full Phase 3 slate against resource constraints and
     dependencies. I'm going to orchestrate the full assignment matrix."
  
  assignment_proposal:
    PHASE3-001: "Data + Troi (why-capture memory)"
    PHASE3-002: "O'Brien + Geordi (dynamic throttling infrastructure)"
    PHASE3-003: "Worf + Yar (threat model hardening + dissent-surface)"
    PHASE3-004: "Quark + Crusher (predictive cost alerts + health monitoring)"
    PHASE3-005: "Riker + Data (constraint-satisfaction solver)"
    ...
  
  dependencies_checked:
    - "PHASE3-001 must ship before PHASE3-005 (why-capture unblocks solver)"
    - "PHASE3-003 (threat model) blocks PHASE3-006 (async bridging)"
    - "All parallel; no sequential bottlenecks identified"
  
  gate_criteria: |
    "I'm applying Sprint 1-2 learnings: pre-validate dependencies, pre-cache
     decision patterns, identify cross-crew validation chains. This will reduce
     YELLOW gate escalations in Phase 3."
  
  memory_stored: "riker-phase3-coordination-2026-07-28"
  tags: ["phase-3-planning", "resource-orchestration", "leadership"]
```

**Worf Security Veto Check:**

```yaml
worf_deliberation:
  crew: "Worf"
  domain: "Security + WorfGate"
  
  security_assessment: |
    "PHASE3-001 (why-capture) requires new data structures for causal reasoning.
     This is a security boundary: corrupted memories could propagate.
     PHASE3-003 (threat model hardening) is prerequisite for Phase 3 scaling.
     I recommend: PHASE3-003 before PHASE3-001 to ensure threat model exists."
  
  veto_authority: "SOFT (escalation only, not hard block)"
  recommendation: "Reorder Phase 3 roadmap: security foundation first"
  
  memory_stored: "worf-phase3-security-assessment-2026-07-28"
  tags: ["phase-3-planning", "security-assessment", "crew-deliberation"]
```

### C. Picard Synthesis (All crew deliberations → consensus)

```yaml
picard_synthesis:
  timestamp: "2026-07-28T09:15:00Z"
  
  deliberation_summary: |
    "All 11 crew members have provided their domain perspectives:
    
    Data: Recommends PHASE3-001 (why-capture) + Troi pairing
    Riker: Proposes full assignment matrix with dependency checks
    Worf: Soft veto on ordering; security foundation first (PHASE3-003)
    Geordi: Infrastructure readiness confirmed for throttling
    O'Brien: CI/CD and async bridging feasible
    Yar: Testing strategy for tool optimization (PHASE3-010)
    Troi: Emotional coherence with Data pairing on why-capture
    Crusher: Health monitoring integrated into PHASE3-004
    Uhura: Communication pathways documented
    Quark: Budget allocated; no fiscal constraints
    
    CONSENSUS: Reorder per Worf's security recommendation. PHASE3-003 (threat model)
    ships first, then PHASE3-001 (why-capture), then remaining 8 in parallel."
  
  final_assignment_matrix:
    - story_id: "PHASE3-003"
      title: "Threat Model Hardening + Corrupted Learning Detection"
      assigned_to: ["Worf", "Yar"]
      start_date: "2026-07-28"
      priority: "CRITICAL (blocking other phase 3)"
      rationale: "Worf security assessment identified as prerequisite"
    
    - story_id: "PHASE3-001"
      title: "Why-Capture for Memory System (Causal Understanding)"
      assigned_to: ["Data", "Troi"]
      start_date: "2026-07-28" (after PHASE3-003 cleared)
      priority: "CRITICAL (strategic bottleneck)"
      rationale: "Data + Troi collaboration; foundation for Phase 3"
    
    - story_id: "PHASE3-002"
      title: "Dynamic Cognitive Throttling Infrastructure"
      assigned_to: ["O'Brien", "Geordi"]
      start_date: "2026-07-28"
      priority: "HIGH"
      rationale: "Parallel with security; no dependencies"
    
    # ... 7 more stories (PHASE3-004 through PHASE3-010) assigned
  
  gate_determination: "AUTO (all 11 crew aligned, zero vetos)"
  
  memory_stored: "picard-phase3-synthesis-2026-07-28"
  tags: ["phase-3-planning", "crew-consensus", "picard-synthesis"]
```

### D. Crew Self-Assignment (Each member claims their story)

**Data's Self-Assignment (Aha Story PHASE3-001):**

```yaml
self_assignment_action:
  crew_member: "Data"
  story_id: "PHASE3-001"
  story_title: "Why-Capture for Memory System"
  
  assignment_rationale: |
    "I'm claiming this story because:
    1. Architectural fit (memory system redesign)
    2. Sprint 1-2 learnings directly apply (observed 54%→71% recall improvement)
    3. Strategic bottleneck (unlocks PHASE3-005 constraint solver)
    4. Troi collaboration validated in deliberation (emotional context + logic)"
  
  acceptance_criteria: |
    "✓ Define 'causal understanding' metadata (why, not just pattern)
    ✓ Design schema for storing (action_taken, preconditions, outcome, why_effective)
    ✓ Implement memory recall with WHY context
    ✓ Test with 10 past Sprint 1-2 decisions
    ✓ Integrate with Troi stakeholder insights
    ✓ Documentation + crew training"
  
  story_fields_updated_in_aha:
    assigned_to: "Data"
    status: "IN_PROGRESS"
    custom_field_crew_member: "Data"
    custom_field_deliberation_date: "2026-07-28"
    custom_field_deliberation_log: "data-phase3-deliberation-2026-07-28" (link to crew memory)
    custom_field_assigned_by: "Picard (Observation Lounge synthesis)"
    custom_field_team_members: ["Data", "Troi"]
  
  memory_logged: "data-self-assignment-PHASE3-001-2026-07-28"
  tags: ["phase-3", "self-assignment", "story-claim"]
```

---

## III. AHA API SYNCHRONIZATION POINTS

### A. Story Metadata Fields (Custom + Standard)

**Standard Aha Fields (Auto-updated):**
```yaml
story_fields:
  id: "PHASE3-001"
  name: "Why-Capture for Memory System"
  status: "IN_PROGRESS"
  assigned_to: "Data" # Crew member who claimed it
  start_date: "2026-07-28"
  estimate: 13 # points (from Phase 3 scope)
```

**Custom Fields (Crew-owned metadata):**
```yaml
custom_fields:
  crew_member_primary: "Data" # Primary owner
  crew_team: ["Data", "Troi"] # Collaborative team
  deliberation_log_id: "data-phase3-deliberation-2026-07-28" # Link to crew memory
  deliberation_date: "2026-07-28T09:00:00Z"
  crew_consensus_gate: "AUTO" # How it was approved
  rationale: |
    "Strategic bottleneck for Phase 3. Data leads architecture;
     Troi provides stakeholder/emotional context. WHY-capture
     unlocks constraint-satisfaction solver."
  
  priority_crew_assigned: "CRITICAL"
  blocked_by: ["PHASE3-003"] # Worf security prerequisite
  unblocks: ["PHASE3-005"] # Constraint solver depends on why-capture
  
  tools_planned: ["schema-validator", "memory-profiler", "causal-analyzer"]
  memory_priors_used: ["schema-design-patterns", "memory-recall-optimization"]
  
  status_last_updated_by_crew: "Data"
  status_last_update_timestamp: "2026-07-28T09:15:00Z"
```

### B. Story Status Updates (Crew → Aha → Crew Memory)

**Daily Standup Update (Data provides):**

```yaml
story_status_update:
  story_id: "PHASE3-001"
  crew_member: "Data"
  timestamp: "2026-07-29T17:00:00Z"
  day_number: 1
  
  status_change:
    from: "IN_PROGRESS"
    to: "IN_PROGRESS" (no status change, but progress update)
  
  progress_notes: |
    "Completed: Schema design for WHY metadata (action, preconditions, outcome, why_effective).
     Collaborated with Troi on emotional context capture (how decisions felt vs. objective measures).
    
     Today's learnings applied from Sprint 1-2:
     - Memory tagging convention from Sprint 2 carried forward
     - Recalled 3 schema patterns from PROD-30 / PROD-37
     - Cross-crew validation: consulted Worf on threat model implications
    
     Current blocker: PHASE3-003 (threat model) not yet shipped; proceeding with defensive assumptions."
  
  confidence_level: 8.5/10
  crew_health_signal: "Healthy; cognitive load 6.2/10"
  
  percentage_complete: 25%
  estimated_days_remaining: 4
  
  risks_identified: []
  decisions_made:
    - "Store WHY as structured JSONB (vs free text) for searchability"
    - "Link WHY to crew member identity (who understood why decision worked)"
  
  aha_api_update:
    field: "custom_field_progress_notes"
    value: "[Daily standup notes...]"
    field: "custom_field_percentage_complete"
    value: 25
    field: "custom_field_crew_health_signal"
    value: "Healthy"
  
  memory_stored: "data-PHASE3-001-standup-2026-07-29"
  tags: ["phase-3", "daily-standup", "progress-tracking"]
```

**Blocker Escalation (Data escalates PHASE3-003 dependency):**

```yaml
blocker_escalation:
  story_id: "PHASE3-001"
  crew_member: "Data"
  timestamp: "2026-07-29T14:30:00Z"
  
  blocker_description: |
    "PHASE3-003 (Threat Model Hardening) is a prerequisite. Cannot finalize
     WHY-capture schema without understanding threat model for corrupted learning.
     Worf's security assessment indicates schema design impacts threat surface."
  
  escalation_action: "YELLOW gate (Riker review required)"
  
  riker_decision_requested:
    - "Can we proceed with defensive assumptions while PHASE3-003 is in progress?"
    - "Or wait for PHASE3-003 completion?"
  
  riker_response: |
    "Proceed with defensive assumptions. Worf is shipping PHASE3-003 by EOD today.
     You can integrate security findings tomorrow. This avoids artificial blocker;
     proceed in parallel with risk management."
  
  riker_decision_gate: "YELLOW (Riker override allows parallel execution)"
  
  aha_api_update:
    field: "custom_field_blocked_by"
    value: ["PHASE3-003 (in progress, security review ongoing)"]
    field: "custom_field_blocker_status"
    value: "YELLOW gate override by Riker; proceed with defensive assumptions"
    field: "custom_field_blocker_notes"
    value: "[Escalation notes]"
  
  memory_stored: "data-PHASE3-001-blocker-escalation-2026-07-29"
  tags: ["phase-3", "blocker", "yellow-gate", "riker-decision"]
```

### C. Story State Machine (Aha Workflow)

**Valid Transitions (Enforced by crew):**

```yaml
state_machine:
  states:
    - name: "STARTED"
      description: "Story claimed; crew deliberation complete"
      trigger: "Crew self-assignment"
      crew_member_action: "Claim story in Observation Lounge"
      aha_update:
        status: "STARTED"
        assigned_to: "[Crew member]"
    
    - name: "IN_PROGRESS"
      description: "Crew member actively developing"
      trigger: "Crew member starts work"
      crew_member_action: "Begin implementation"
      aha_update:
        status: "IN_PROGRESS"
        custom_field_start_actual: "[Today's date]"
    
    - name: "TESTING"
      description: "Feature complete; Yar (QA) validates"
      trigger: "Crew ships feature; calls Yar"
      crew_member_action: "Notify Yar; request validation"
      aha_update:
        status: "TESTING"
        custom_field_testing_started: "[Today's date]"
        assignee_secondary: "Yar"
    
    - name: "SHIPPED"
      description: "Yar validated; story complete"
      trigger: "Yar approves + ships to prod"
      crew_member_action: "Yar executes final merge + deployment"
      aha_update:
        status: "SHIPPED"
        custom_field_shipped_date: "[Today's date]"
        custom_field_shipped_by: "Yar"

  allowed_transitions:
    - from: "STARTED"
      to: ["IN_PROGRESS"]
      gate: "AUTO (crew member decision; no approval needed)"
    
    - from: "IN_PROGRESS"
      to: ["TESTING"]
      gate: "AUTO (crew member notifies Yar; no approval gate)"
    
    - from: "TESTING"
      to: ["SHIPPED"]
      gate: "YELLOW (Yar approval required; also final Riker sign-off if critical path)"
    
    - from: "IN_PROGRESS"
      to: ["STARTED"] # Regression (blocker discovered)
      gate: "YELLOW (Riker must approve revert)"
    
    - from: "TESTING"
      to: ["IN_PROGRESS"] # Re-work (QA failure)
      gate: "AUTO (Yar decision; no higher gate)"

  blocked_transitions:
    - from: "SHIPPED"
      to: "*" # Terminal state; no further transitions
```

---

## IV. CREW MEMBER DELIBERATION TEMPLATES

### A. Observation Lounge Deliberation Form

**Template (Crew member fills out for each story they're considering):**

```yaml
crew_deliberation_template:
  crew_member: "[Name]"
  date: "[YYYY-MM-DD]"
  sprint_phase: "[Phase 3, Day X]"
  
  available_stories:
    - "List of stories matching my domain"
  
  domain_fit_analysis: |
    "[Which stories align with my expertise?]"
  
  sprint_learning_applied: |
    "[Which memories/priors from Sprint 1-2 apply?]"
  
  cross_crew_dependencies: |
    "[Which other crew members do I need to collaborate with?]"
  
  self_assignment_ranking:
    1st_choice: "[Story ID + rationale]"
    2nd_choice: "[Story ID + rationale]"
    3rd_choice: "[Story ID + rationale]"
  
  concerns_or_constraints: |
    "[Any blockers, risks, or concerns about my assignment?]"
  
  memory_tags_to_recall:
    - "tag-1"
    - "tag-2"
  
  picard_consensus_ready: true/false
```

### B. Story Assignment Confirmation (Crew member → Aha)

**Template (Once story is assigned):**

```yaml
story_assignment_confirmation:
  crew_member: "[Name]"
  story_id: "[PHASE3-XXX]"
  timestamp: "[ISO timestamp]"
  
  why_i_claimed_this_story: |
    "[Specific reasons this story matches my domain and Phase 3 strategy]"
  
  team_members_collaborating:
    - "[Co-owner names if paired]"
  
  acceptance_criteria_confidence: 7.5/10
  
  estimated_completion_date: "[Date]"
  
  blockers_or_dependencies:
    - "List of blockers"
  
  daily_standup_cadence: "15:00 PST (crew standup)"
  
  aha_fields_i_will_update:
    - "custom_field_progress_notes (daily)"
    - "custom_field_percentage_complete (daily)"
    - "custom_field_crew_health_signal (daily)"
  
  memory_where_i_log_decisions: "[Memory path]"
```

### C. Daily Standup Update (Crew member → Aha)

**Template (Crew member updates daily at 17:00 PST):**

```yaml
daily_standup_update:
  crew_member: "[Name]"
  story_id: "[PHASE3-XXX]"
  date: "[YYYY-MM-DD]"
  timestamp: "[17:00:00Z]"
  
  what_i_completed_today: |
    "[Concrete deliverables]"
  
  sprint_1_2_learnings_applied: |
    "[Which memory priors accelerated decisions today?]"
  
  cross_crew_help_received_from: |
    "[Which crew members helped resolve blockers?]"
  
  blocker_discovered: true/false
  if_blocker:
    description: "[What's blocked?]"
    escalation_gate: "AUTO | YELLOW | RED"
    escalation_to: "[Which crew member?]"
  
  confidence_level: "8.5/10"
  crew_health_signal: "Healthy | Fatigued | Stressed"
  cognitive_load: "6.2/10"
  
  percentage_complete_updated_to: 25
  estimated_days_remaining_updated: 4
  
  risks_mitigated_today:
    - "Risk 1 → mitigated via [action]"
  
  decisions_made_today:
    - "Decision 1 → rationale"
  
  aha_api_updates:
    field: "custom_field_progress_notes"
    field: "custom_field_percentage_complete"
    field: "custom_field_crew_health_signal"
  
  memory_logged_as: "[memory-id-PHASE3-XXX-standup-YYYY-MM-DD]"
  memory_tags: ["phase-3", "daily-standup", "story-id"]
```

---

## V. AHA API ENDPOINTS (Crew-Driven Updates)

### A. Story Create/Update Endpoints

**Crew Self-Assignment Triggers:**

```typescript
// When Data claims PHASE3-001
aha_api.updateStory({
  story_id: "PHASE3-001",
  updates: {
    status: "IN_PROGRESS",
    assigned_to: "Data",
    custom_field_crew_member_primary: "Data",
    custom_field_crew_team: ["Data", "Troi"],
    custom_field_deliberation_date: "2026-07-28T09:00:00Z",
    custom_field_deliberation_log_id: "data-phase3-deliberation-2026-07-28",
    custom_field_crew_consensus_gate: "AUTO",
  }
});

// Daily standup triggers
aha_api.updateStory({
  story_id: "PHASE3-001",
  updates: {
    custom_field_progress_notes: "[Daily standup notes]",
    custom_field_percentage_complete: 25,
    custom_field_crew_health_signal: "Healthy",
    custom_field_status_last_updated_by_crew: "Data",
    custom_field_status_last_update_timestamp: "2026-07-29T17:00:00Z",
  }
});

// Blocker escalation triggers YELLOW gate
aha_api.updateStory({
  story_id: "PHASE3-001",
  updates: {
    custom_field_blocked_by: ["PHASE3-003"],
    custom_field_blocker_status: "YELLOW gate override by Riker",
    custom_field_escalation_gate_type: "YELLOW",
    custom_field_escalation_decision_by: "Riker",
  }
});

// Story completion triggers validation gate
aha_api.updateStory({
  story_id: "PHASE3-001",
  updates: {
    status: "TESTING",
    assignee_secondary: "Yar",
    custom_field_testing_started: "2026-08-01T00:00:00Z",
    custom_field_shipped_by: null, // Will be filled when Yar validates
  }
});

// Yar validation triggers SHIPPED
aha_api.updateStory({
  story_id: "PHASE3-001",
  updates: {
    status: "SHIPPED",
    custom_field_shipped_date: "2026-08-02T00:00:00Z",
    custom_field_shipped_by: "Yar",
  }
});
```

### B. Webhook Listeners (Aha → Crew Notifications)

**When Aha Story Status Changes:**

```yaml
webhook_listener:
  trigger: "story.status_changed"
  payload:
    story_id: "PHASE3-001"
    old_status: "IN_PROGRESS"
    new_status: "TESTING"
    changed_by: "Data"
    changed_at: "2026-08-01T00:00:00Z"
  
  crew_action_triggered: |
    "Yar is notified: PHASE3-001 ready for validation. Pull latest branch; run tests."
  
  crew_memory_logged: |
    "aha-webhook-PHASE3-001-status-changed-2026-08-01"
```

**When Crew Member is Assigned:**

```yaml
webhook_listener:
  trigger: "story.assigned_to_changed"
  payload:
    story_id: "PHASE3-001"
    old_assigned_to: null
    new_assigned_to: "Data"
    changed_at: "2026-07-28T09:15:00Z"
  
  crew_action_triggered: |
    "Data is pinged: You're assigned to PHASE3-001 (via Observation Lounge consensus).
     Story details: [loaded from Aha]. Your deliberation rationale stored in crew memory."
  
  crew_memory_logged: |
    "aha-webhook-story-assigned-PHASE3-001-2026-07-28"
```

---

## VI. CREW MEMORY INTEGRATION (Decision Audit Trail)

### A. Memory Schema (Decision → Aha Traceability)

**Each Deliberation is Stored with Aha Links:**

```yaml
crew_memory_entry:
  id: "data-phase3-deliberation-2026-07-28"
  crew_member: "Data"
  entry_type: "DELIBERATION"
  timestamp: "2026-07-28T09:00:00Z"
  phase: "Phase 3, Day 1"
  
  narrative: |
    "Data deliberates on Phase 3 stories. Recommends PHASE3-001 (why-capture memory)
     as strategic bottleneck. Proposes Troi collaboration for stakeholder context.
     Links to Observation Lounge synthesis. Picard consensus reached (AUTO gate)."
  
  decision: "Self-assign to PHASE3-001 + Troi pairing"
  
  rationale: |
    "1. Architectural fit (memory system redesign)
     2. Sprint 1-2 learnings apply (54%→71% recall improvement)
     3. Strategic bottleneck (unlocks PHASE3-005)
     4. Troi collaboration validated"
  
  memory_priors_used:
    - "schema-design-patterns" (8 recalls in Sprint 1-2)
    - "cross-crew-validation-chains" (effective coordination)
  
  aha_story_links:
    - story_id: "PHASE3-001"
      title: "Why-Capture for Memory System"
      link_type: "self-assigned"
      timestamp_assigned: "2026-07-28T09:15:00Z"
    
    - story_id: "PHASE3-005"
      title: "Constraint-Satisfaction Solver"
      link_type: "unblocks"
      reasoning: "Why-capture foundation required"
  
  gate_type: "AUTO"
  gate_participants: ["Picard", "Data", "Troi", "Riker", "All 11 crew"]
  
  tags: ["phase-3", "deliberation", "self-assignment", "memory-priors"]
  
  stored_by: "Crew"
  immutable: true
```

**Each Daily Standup is Stored with Progress Links:**

```yaml
crew_memory_entry:
  id: "data-PHASE3-001-standup-2026-07-29"
  crew_member: "Data"
  entry_type: "DAILY_STANDUP"
  timestamp: "2026-07-29T17:00:00Z"
  story_id: "PHASE3-001"
  
  progress_notes: |
    "Completed schema design for WHY metadata. Collaborated with Troi on emotional context.
     Applied 3 memory patterns from Sprint 1-2. Consulted Worf on threat model.
     Blocker: PHASE3-003 prerequisite; Riker issued YELLOW gate override to proceed."
  
  percentage_complete: 25
  confidence_level: 8.5/10
  crew_health_signal: "Healthy"
  cognitive_load: 6.2/10
  
  aha_story_link:
    story_id: "PHASE3-001"
    aha_field_updated: "custom_field_progress_notes"
    aha_timestamp: "2026-07-29T17:00:00Z"
  
  decisions_made_today:
    - "Store WHY as structured JSONB (vs free text) for searchability"
      reasoning: "Enables future memory queries on WHY context"
  
  memory_priors_recalled_and_applied:
    - "schema-design-patterns" → used for JSONB structure
    - "cross-crew-validation" → consulted Worf preemptively
  
  tags: ["phase-3", "daily-standup", "PHASE3-001", "progress-tracking"]
  
  next_standup_target: "2026-07-30T17:00:00Z"
```

### B. Memory Query Patterns (Crew recalls decisions + context)

**Crew Recalls Decisions Before Starting Day:**

```typescript
// At 09:00 PST, Data recalls past decisions on why-capture
crew_memory.recall({
  crew_member: "Data",
  domain: "memory-architecture",
  tags: ["why-capture", "phase-3"],
  limit: 10,
  since: "2026-07-28"
});

// Returns:
{
  "data-phase3-deliberation-2026-07-28": {
    decision: "Self-assign to PHASE3-001",
    rationale: "[...]",
    memory_priors_used: ["schema-design-patterns"],
    aha_story_id: "PHASE3-001"
  },
  "data-PHASE3-001-standup-2026-07-29": {
    progress: "25% complete",
    decisions_made: ["Store WHY as structured JSONB"],
    aha_story_id: "PHASE3-001",
    next_step: "Integrate Troi stakeholder context"
  }
}

// Data reviews, prepares for Day 2 work
```

**Crew Recalls Blocker Resolution Patterns:**

```typescript
// During blocker escalation, Riker recalls similar situations
crew_memory.recall({
  domain: "blocker-resolution",
  tags: ["yellow-gate", "dependency-management"],
  crew_member: "Riker",
  limit: 20
});

// Returns past YELLOW gate decisions + outcomes
// Riker applies same decision framework to new blocker
```

---

## VII. FEEDBACK LOOP (Aha Status → Crew Memory → Next Observation Lounge)

### A. Aha Status Change Triggers Crew Notification

```yaml
workflow:
  step_1_crew_updates_aha: |
    "Data updates PHASE3-001 to TESTING (ready for Yar validation)"
  
  step_2_aha_webhook_fires: |
    "Aha sends webhook: story.status_changed → TESTING"
  
  step_3_crew_notified: |
    "Yar receives notification: 'PHASE3-001 ready for validation'"
  
  step_4_yar_validates: |
    "Yar runs tests, reviews acceptance criteria, approves or rejects"
  
  step_5_aha_updated_again: |
    "Yar updates PHASE3-001 to SHIPPED (or back to IN_PROGRESS if rework needed)"
  
  step_6_memory_logged: |
    "yar-PHASE3-001-validation-2026-08-02 stored to crew memory
     Links decision, confidence, any rework needed"
  
  step_7_next_observation_lounge: |
    "In next standup, crew reviews: 'Did PHASE3-001 validation work smoothly?
     Any patterns we should remember?'"
```

### B. End-of-Sprint Retrospective (Crew Recalls Phase 3 Decisions)

```yaml
retro_workflow:
  day_1: "Crew reflects in Observation Lounge on Phase 3 work"
  
  retro_questions:
    - "What stories did we deliver? Which crew members shipped them?"
    - "How effective was self-assignment? Did deliberations match execution?"
    - "Which Aha API integrations worked well? Which were friction?"
    - "Which memory priors were most useful? Which were stale?"
    - "How many AUTO gates vs YELLOW gates vs RED gates?"
    - "What should we change in Phase 4?"
  
  crew_recalls: |
    "crew_memory.recall({
      phase: 'Phase 3',
      types: ['deliberation', 'daily_standup', 'blocker_escalation'],
      limit: 100
    })"
  
  retrospective_output: |
    "Phase 3 Retrospective Report:
    - 10 stories delivered (100% Phase 3 scope)
    - Auto-assignment success rate: 87% (9/10 original selections held)
    - Aha API integrations: 5 working smoothly, 1 latency issue (Supabase sync)
    - Top memory prior: 'schema-design-patterns' (23 recalls)
    - Most effective tool: 'constraint-satisfaction-solver' (4.7/5)
    - AUTO gate ratio: 84% (IMPROVED from 82% Phase 1-2)
    - FALSE consensus: 0.4% (IMPROVED from 0.6% Phase 1-2)
    - Crew consensus: Ready for Phase 4, Phase 3 foundation solid"
```

---

## VIII. PHASE 3 ROADMAP (Crew Self-Driven Execution)

### A. Week 1 Phase 3 Sprint (Days 1-5)

| Day | Stories | Owners | Status | Aha Updates |
|---|---|---|---|---|
| 1 | PHASE3-003 (security), PHASE3-002 (throttling) | Worf+Yar, O'Brien+Geordi | STARTED | Assigned ✓ |
| 2 | PHASE3-003 cont., PHASE3-001 (why-capture) | Worf+Yar, Data+Troi | IN_PROGRESS | Progress +25% |
| 3 | All 4 cont. + PHASE3-004 (cost alerts) | All + Quark+Crusher | IN_PROGRESS | Progress +50% |
| 4 | Parallel work; PHASE3-003 ships | All | TESTING (PHASE3-003) | Status → TESTING |
| 5 | Continue Phase3-001-002-004; start PHASE3-005 | All | IN_PROGRESS + TESTING | Progress +75%, Yar validates |

### B. Aha Story Setup (Pre-Phase 3)

**Custom Fields Template (All Phase 3 stories):**

```yaml
aha_story_template:
  standard_fields:
    status: "STARTED"
    assigned_to: "[Crew member primary]"
    estimate: "[Points]"
    priority: "[CRITICAL|HIGH|MEDIUM]"
  
  custom_fields:
    crew_member_primary: "[Data | Riker | Worf | ...]"
    crew_team: "[List of collaborators]"
    deliberation_log_id: "[Link to crew memory]"
    deliberation_date: "[ISO date]"
    crew_consensus_gate: "[AUTO | YELLOW | RED]"
    
    # Daily tracking
    progress_notes: "[Updated daily at 17:00 PST]"
    percentage_complete: "[0-100]"
    crew_health_signal: "[Healthy | Fatigued | Stressed]"
    status_last_updated_by_crew: "[Crew member]"
    status_last_update_timestamp: "[ISO timestamp]"
    
    # Blockers + dependencies
    blocked_by: "[List of story IDs]"
    unblocks: "[List of story IDs]"
    blocker_status: "[CLEAR | YELLOW gate override | RED escalation]"
    
    # Testing + shipping
    testing_started: "[ISO date]"
    shipped_date: "[ISO date]"
    shipped_by: "[Crew member who validated]"
```

---

## IX. INTEGRATION CHECKLIST (Implementation Phase)

**Pre-Phase 3 Implementation:**

- [ ] Aha API authentication enabled for crew member API calls
- [ ] Custom fields created in Aha (crew_member_primary, deliberation_log_id, etc.)
- [ ] Webhook listeners deployed (story.assigned_to, story.status_changed)
- [ ] Crew memory system linked to Aha story IDs (bi-directional)
- [ ] Observation Lounge protocol documented + crew trained
- [ ] Story state machine validated (STARTED → IN_PROGRESS → TESTING → SHIPPED)
- [ ] Daily standup template + Aha update automation
- [ ] Blocker escalation (YELLOW gate) Riker approval workflow
- [ ] Validation gate (Yar testing) integrated with Aha status
- [ ] End-of-phase retrospective query templates ready
- [ ] Memory recall optimization (indexes on phase, crew_member, tags)

**Phase 3 Week 1 Validation:**

- [ ] Day 1: 4 stories self-assigned; Aha fields populated correctly
- [ ] Day 2: First standup updates flow through Aha API
- [ ] Day 3: Blocker escalation test (YELLOW gate, Riker approval)
- [ ] Day 4: First story hits TESTING status; Yar validation triggered
- [ ] Day 5: First story ships; SHIPPED status + metadata recorded

---

## X. EXAMPLE WORKFLOW (Day 1-5, Single Story PHASE3-001)

### Day 1: Observation Lounge + Self-Assignment

```
09:00 PST: Observation Lounge convenes
  → Data deliberates: "Why-capture memory is strategic bottleneck"
  → Troi aligns: "Pairing makes sense; emotional context + logic"
  → Picard synthesizes: "AUTO gate; Data + Troi assigned"

09:15 PST: Data self-assigns to PHASE3-001 in Aha
  Aha story PHASE3-001 updated:
    status: IN_PROGRESS
    assigned_to: Data
    custom_field_crew_team: [Data, Troi]
    custom_field_deliberation_log_id: data-phase3-deliberation-2026-07-28

09:20 PST: Crew memory logs deliberation
  id: data-phase3-deliberation-2026-07-28
  story_link: PHASE3-001
  gate_type: AUTO
```

### Day 2: First Daily Standup

```
09:00 PST: Data begins work on PHASE3-001

17:00 PST: Data standup
  Aha story PHASE3-001 updated:
    custom_field_progress_notes: "Completed schema design for WHY metadata..."
    custom_field_percentage_complete: 25
    custom_field_crew_health_signal: Healthy
    custom_field_status_last_updated_by_crew: Data
    custom_field_status_last_update_timestamp: 2026-07-29T17:00:00Z

17:05 PST: Crew memory logs standup
  id: data-PHASE3-001-standup-2026-07-29
  story_link: PHASE3-001
  progress: 25%
```

### Day 3: Blocker Escalation

```
14:30 PST: Data discovers blocker (PHASE3-003 prerequisite)
  Aha story PHASE3-001 updated:
    custom_field_blocked_by: [PHASE3-003]
    custom_field_blocker_status: YELLOW gate (awaiting Riker)

14:35 PST: Riker receives escalation notification

14:45 PST: Riker approves parallel execution with defensive assumptions
  Aha story PHASE3-001 updated:
    custom_field_blocker_status: YELLOW gate override by Riker; proceed
    custom_field_escalation_decision_by: Riker

15:00 PST: Crew memory logs escalation + resolution
  id: data-PHASE3-001-blocker-escalation-2026-07-29
  escalation_gate: YELLOW
  riker_decision: proceed with defensive assumptions
```

### Day 4: Progress Update + Near Completion

```
17:00 PST: Data standup
  Aha story PHASE3-001 updated:
    custom_field_progress_notes: "Schema finalized; Troi context integrated; testing..."
    custom_field_percentage_complete: 75

17:05 PST: Crew memory logs progress
  id: data-PHASE3-001-standup-2026-07-30
  progress: 75%
```

### Day 5: Story Ready for Testing

```
09:00 PST: Data completes PHASE3-001

15:00 PST: Data marks TESTING + notifies Yar
  Aha story PHASE3-001 updated:
    status: TESTING
    assignee_secondary: Yar
    custom_field_testing_started: 2026-08-01T00:00:00Z

15:05 PST: Yar receives notification
  "PHASE3-001 ready for validation. Run tests; review acceptance criteria."

22:00 PST: Yar completes validation + approves
  Aha story PHASE3-001 updated:
    status: SHIPPED
    custom_field_shipped_date: 2026-08-02T00:00:00Z
    custom_field_shipped_by: Yar

22:05 PST: Crew memory logs shipping
  id: yar-PHASE3-001-shipped-2026-08-02
  status: SHIPPED
  validation_notes: "[Yar's acceptance]"
```

---

## XI. GOVERNANCE + SAFETY GATES

### A. Self-Assignment Veto (Picard Authority)

```yaml
picard_veto_scenario: |
  "If crew member self-assigns to story that doesn't match their domain,
   or if it creates a logical contradiction (two crew claiming same story),
   Picard soft-vetos and asks for re-deliberation.
  
  Example:
  - Yar (QA) self-assigns to PHASE3-005 (constraint solver architecture) → Mismatch
  - Picard: 'Yar, this is Data domain. Suggest you focus on PHASE3-010 (tool optimization).
    If you want PHASE3-005, pair with Data first.'
  - Yar re-deliberates; opts for PHASE3-010 (better fit)"
```

### B. Blocker Escalation Gate (Riker Authority)

```yaml
riker_escalation_authority: |
  "If crew discovers blocker (dependency, infrastructure issue, etc.),
   Riker makes YELLOW gate decision within 30 minutes:
  
   - Proceed with defensive assumptions (like PHASE3-001 Day 3)
   - Pause and wait (if blocker is critical + cannot be worked around)
   - Reorder stories (if dependency resolution is complex)
  
  Riker logs decision to Aha custom field + crew memory."
```

### C. Validation Gate (Yar Authority)

```yaml
yar_validation_authority: |
  "When crew marks story TESTING, Yar has final authority:
  
  - SHIPPED (all tests pass, acceptance criteria met)
  - IN_PROGRESS (rework needed; specify what failed)
  - BLOCKED (discovery of critical issue; escalate to Riker)
  
  Yar logs validation notes to Aha + crew memory."
```

---

## XII. SUCCESS METRICS

### Phase 3 Execution Tracking

```yaml
success_metrics:
  self_assignment_accuracy: |
    "% of crew members assigned to stories matching their domain
    Target: ≥85%
    Tracked: Via crew_member_primary vs story_domain field analysis"
  
  aha_api_integration_reliability: |
    "% of Aha API calls from crew deliberations that succeed
    Target: ≥99%
    Tracked: Via webhook listener logs"
  
  blocker_escalation_speed: |
    "Average time from blocker discovered to Riker decision
    Target: ≤30 min
    Tracked: Via custom_field_escalation_decision_timestamp - blocker discovery"
  
  memory_prior_utilization: |
    "% of crew decisions that reference memory priors
    Target: ≥60% (improved from Phase 1-2: 62%)
    Tracked: Via memory.recall() calls in crew decisions"
  
  crew_consensus_gate_effectiveness: |
    "% AUTO gates approved without escalation
    Target: ≥80%
    Tracked: Via crew_consensus_gate field in Aha + crew memory"
  
  crew_health_maintenance: |
    "Avg crew cognitive load across Phase 3
    Target: ≤6.8/10 (healthy; below 7.5 burnout threshold)
    Tracked: Via daily standup crew_health_signal field"
  
  false_consensus_rate: |
    "% of decisions that had latent vetos (caught in testing or shipped)
    Target: <1% (improved from Phase 1-2: 0.6%)
    Tracked: Via Yar validation notes + late veto detections"
  
  story_delivery_velocity: |
    "Average points per story per day
    Target: ≥1.4 pts/hr (Phase 1-2: 1.11 pts/hr, +26% improvement expected)
    Tracked: Via story completion dates in Aha"
```

---

## CONCLUSION

This framework bridges **crew deliberation → self-assignment → Aha API synchronization → outcome tracking → memory learning**.

**Key Design Principles:**

1. **Crew owns decisions** — Not humans approving crew; crew deliberates and executes
2. **Aha is source of truth** — All story metadata flows through Aha API
3. **Memory compounds learning** — Each decision logged; priors inform future decisions
4. **Gates preserve safety** — AUTO/YELLOW/RED gates manage risk without bottlenecking
5. **Transparency always** — All deliberations auditable; no black-box decisions

**Phase 3 Execution:** Crew follows this framework for 10 stories (PHASE3-001 through PHASE3-010). At end of Phase 3, retrospective data informs Phase 4 roadmap. Cycle repeats with learned optimizations.

---

**Document Version:** 1.0 (Phase 3 Framework Design)  
**Status:** Ready for implementation  
**Next Step:** Aha API configuration + crew training
