# SAMPLE MISSION TEMPLATE — Phase 1 Pilot Deliberations

**Template Version:** v1.0-alpha  
**Purpose:** Provide a reusable template for Phase 1 decisions (Decisions #2–#10)  
**Status:** Ready for execution  

---

## HOW TO USE THIS TEMPLATE

1. **Copy this file** → Customize the [BRACKETS] sections
2. **Fill in the Context Frame** → What are you deciding?
3. **Identify teams** → Who needs to deliberate?
4. **Run the mission** → Execute via `runCrewMissionPipeline` MCP tool
5. **Review Observation Lounge record** → Analyze deliberation
6. **Store reasoning chains** → RAG retrieves as neural priors for future decisions

---

## TEMPLATE: PHASE 1 DECISION #[N]

### PART 1: CONTEXT FRAME

```
MISSION REFERENCE: PHASE1-DECISION-[NUMBER]-[SLUG]
DECISION: [What is the strategic question?]
DATE: [ISO date]
PILOT PHASE: Phase 1 Pilot (Aug 1–Sep 15, 2026)

STRATEGIC IMPORTANCE:
[Why does this decision matter? What fails if we choose wrong? How does it connect to the 4-tier reasoning system?]

SCOPE:
- IN: [What is explicitly included?]
- NOT: [What is explicitly NOT included?]
- DEPENDENCIES: [What prior Phase 1 decisions does this build on?]

CONSTRAINTS:
- Timeline: [When is this decision needed? Phase 1 Week [X]?]
- Budget/Cost: [Any financial constraints?]
- Organizational: [Authority/governance constraints? Veto authority?]

SUCCESS CRITERIA:
- Consensus threshold: ≥[X]% team agreement
- Confidence target: ≥[Y]% average crew confidence
- Risk profile: [Low / Medium / High] acceptable risk
- Measurable outcome: [How will we know this decision worked?]
```

### PART 2: TEAM ASSEMBLY

```
TEAMS DELIBERATING:

1. TEAM: [Team Name] (Lead: [Officer])
   Members: [Officer A], [Officer B], [Officer C]
   Domain: [Core expertise this team brings]
   Scope: [What trade-offs/decisions does this team own?]

2. TEAM: [Team Name] (Lead: [Officer])
   Members: [Officer A], [Officer B], [Officer C]
   Domain: [Core expertise]
   Scope: [What this team owns]

3. TEAM: [Team Name] (Lead: [Officer])
   Members: [Officer A], [Officer B], [Officer C]
   Domain: [Core expertise]
   Scope: [What this team owns]

AUTHORITY STRUCTURE:
- Tier 1: Individual crew members generate visible monologues
- Tier 2: Team leads synthesize into unified positions (>75% consensus threshold)
- Tier 3: [Arbitration officer, usually Riker] resolves inter-team conflicts via trade-off analysis
- Tier 4: [Command authority, usually Picard] makes final decision + rationale

VETO AUTHORITY:
- [Officer name]: [Type of veto, e.g., "Security veto — any HIGH finding blocks decision"]
- [Officer name]: [Type of veto]

RIKER'S ROLE:
Arbitrate if teams disagree. Use this framework:
1. Understand what each team is optimizing for
2. Identify the underlying trade-off
3. Propose a synthesis that honors both viewpoints (or propose testing both approaches)
4. Escalate to Picard only if synthesis fails
```

### PART 3: DELIBERATION PROTOCOL

```
TIER 1 — INDIVIDUAL MONOLOGUES

Each crew member generates visible reasoning with these components:

**Format:**
{
  "assumption": "I believe [X] because...",
  "evidence": "I observed [Y] in [context]",
  "reasoning": "Therefore I conclude...",
  "concern": "Risk: [Z] might happen if...",
  "confidence": "[0–100]% because..."
}

**Reasoning Depth:** [TERSE / DETAILED]
- TERSE: Focus on speed; 2–3 sentences per component; high-level only
- DETAILED: Focus on rigor; cite sources; acknowledge nuance

**Debate Style:** [INDEPENDENT / CROSS-DISCUSSION / EVIDENCE-DRIVEN]
- INDEPENDENT: State your view without prior coordination with team
- CROSS-DISCUSSION: Engage with other team members' monologues
- EVIDENCE-DRIVEN: Ground reasoning in observed facts (code, past decisions, metrics)

**Dissent Recording:** [EXPLICIT / IMPLICIT / DEFERRED-TO-TIER-2]
- EXPLICIT: Record both majority + minority views; annotate why they differ
- IMPLICIT: Let team synthesis surface disagreement naturally
- DEFERRED-TO-TIER-2: Don't debate in Tier 1; teams debate in Tier 2

TIER 2 — TEAM SYNTHESIS

Team lead (e.g., Data for Architecture) aggregates monologues:
1. Identify consensus areas (≥75% alignment) → unified position
2. Identify conflicts (disagreement on core assumptions) → escalate to Tier 3
3. Record consensus level (%) + disputed points
4. Calculate average confidence across team

OUTPUT:
{
  "team": "[Team Name]",
  "unifiedPosition": "Team agrees that...",
  "consensusLevel": [0–1],
  "disputedPoints": ["Point A", "Point B"],
  "memberConfidences": { "Officer A": 0.92, "Officer B": 0.88, ... }
}
```

### PART 4: SYNTHESIS RULES

```
TIER 2→3 ESCALATION TRIGGERS

Escalate to Riker if ANY of these occur:
- Team consensus <75%
- Confidence divergence >20% between team members
- Core assumptions conflict (not just tactical disagreement)
- Strategic disagreement on trade-offs

TIER 3 — RIKER ARBITRATION

Riker's Framework:
1. **Trade-off Analysis:** What is each team optimizing for?
2. **Synthesis:** Can we honor both viewpoints? (Layered approach? Phased? Measurement?)
3. **Escalation:** If no synthesis, escalate to Picard

OUTPUT:
{
  "conflict": "[What teams disagree on?]",
  "parties": ["Team A", "Team B"],
  "teamAPosition": { "assumption": "...", "optimizing_for": "..." },
  "teamBPosition": { "assumption": "...", "optimizing_for": "..." },
  "rikerAnalysis": "Both are right because...",
  "rikerSynthesis": "We'll implement... [proposed resolution]",
  "outcome": "CONSENSUS" or "ESCALATE_TO_PICARD"
}

TIER 4 — PICARD COMMAND DECISION

Picard's Authority:
- Final decision on rare escalations (<5% of decisions)
- Can override Tier 3 if institutional knowledge requires
- Sets reflection lifecycle (when/how outcomes will be measured)

OUTPUT:
{
  "authority": "Picard",
  "decision": "[Clear statement of what we're doing]",
  "rationale": "[Why this decision? What trade-offs? What risk?]",
  "confidence": [0–1],
  "implementation": {
    "phase1": { "timeline": "...", "owner": "...", "actions": [...] },
    "phase2": { "timeline": "...", "owner": "...", "actions": [...] }
  },
  "nextActions": [...],
  "riskMatrix": { "dimension": "...", "rating": "...", "mitigation": "..." }
}
```

### PART 5: OUTPUT & STORAGE

```
OBSERVATION LOUNGE RECORD

File: PHASE1_DECISION_[NUMBER]_OBSERVATION_LOUNGE_RECORD.md
Contains:
- Full mission reference + date + status
- All Tier 1 monologues (9 crew members)
- All Tier 2 syntheses (3 teams)
- All Tier 3 arbitrations (if any)
- Tier 4 decision + rationale

FORMAT: [See PHASE1_DECISION_001_OBSERVATION_LOUNGE_RECORD.md for example]

REASONING CHAIN STORAGE (RAG)

Reference: PHASE1-DECISION-[N]-[SLUG]
Client: familiarcat
Stored to: Supabase RAG table
Retrieval Trigger: "RAG recall decisions on [domain/theme]"

Future crews will use this chain as a NEURAL PRIOR:
- Next decision on similar topic recalls this reasoning chain
- Crew can see WHY this decision was made (not just WHAT)
- Enables institutional learning across time

CREW METRICS TO TRACK

For each decision, measure + record:
1. Consensus level (actual vs target) — Did team reach >75%?
2. Confidence calibration (stated vs outcome) — Did 85% confidence → 85% success rate?
3. Implementation success — Did Phase 1/2 execution match predictions?
4. 30-day reflection — Did outcomes validate core assumptions?
5. 90-day institutional memory — What did we learn?
```

---

## EXAMPLE: PHASE 1 DECISION #2 (Minimal Template)

Let's say the next Phase 1 decision is: **"How should we enforce reflection discipline in the crew?"**

```yaml
MISSION_REFERENCE: PHASE1-DECISION-002-REFLECTION-DISCIPLINE
DATE: 2026-08-10
DECISION: How should we enforce the 30-day reflection discipline? (Ticketing system? Calendar alerts? Bot reminders?)

STRATEGIC_IMPORTANCE: |
  The entire neural prior system depends on crew completing 30-day reflections on past decisions.
  Without reflection discipline, outcomes don't get recorded, future recalls lack outcome data,
  institutional learning breaks down. This is load-bearing.

SCOPE:
  IN: Reflection triggering mechanism, notification strategy, reflection review/QA, metrics tracking
  NOT: Reflection content/template (that's a separate decision), decision recording (already solved)
  DEPENDENCIES: PHASE1-DECISION-001 (RAG schema stores reflection lifecycle)

CONSTRAINTS:
  Timeline: Phase 1 Week 2 (Aug 8–14) — need working system before first 30-day marks arrive
  Budget: <$100/month (frugal)
  Authority: Picard (reflection discipline) + Quark (cost) veto

SUCCESS_CRITERIA:
  Consensus: ≥80%
  Confidence: ≥85%
  Measurable: By Phase 1 Day 30 (Sep 1), 100% of crew has completed first reflections on DECISION-001

---

TEAMS_DELIBERATING:
  
1. COMMUNICATIONS_TEAM (Lead: Uhura)
   Members: Uhura, Riker, Troi
   Domain: Crew engagement, notification, user experience
   Scope: How do we notify crew? How do we make reflection frictionless? How do we measure compliance?

2. INFRASTRUCTURE_TEAM (Lead: Geordi)
   Members: Geordi, O'Brien, Quark
   Domain: System design, operations, cost
   Scope: Ticketing system? Calendar integration? Bot reminders? Cost of each approach?

3. GOVERNANCE_TEAM (Lead: Picard)
   Members: Picard, Worf, Yar
   Domain: Institutional discipline, authority, audit
   Scope: Is this a hard requirement or soft? What happens if crew skips reflection? How do we audit compliance?

---

DELIBERATION_PROTOCOL:
  
  REASONING_DEPTH: DETAILED (reflection discipline is high-stakes)
  DEBATE_STYLE: CROSS-DISCUSSION (teams should debate approaches in Tier 1)
  DISSENT_RECORDING: EXPLICIT (likely to have strong disagreements; record for learning)

---

TIER_3_ESCALATION_TRIGGERS:

  Expected conflicts:
  - Communications (favor ease/low friction) vs Governance (favor discipline/accountability)
  - Infrastructure (favor automation/efficiency) vs Governance (favor explicit human review)

  Riker will arbitrate by framing trade-off:
  "Ease attracts compliance; strictness ensures rigor. Can we require reflection + make it easy?"

---

PICARD_REFLECTION_FRAMEWORK:

  Phase 1 Implementation:
    - Slack bot: Posts 24h before 30-day mark ("Your reflection on DECISION-001 is due tomorrow")
    - Templated form: 2-minute reflection (what worked? what didn't? why?)
    - Audit trail: All reflections stored immutably (Worf requirement)

  Phase 2 Enhancements:
    - Automated outcome measurement (did our prediction match reality?)
    - Confidence calibration tracking (building crew's track record)
    - Institutional memory extraction (what did we learn? store as pattern)
```

---

## EXECUTION FLOW (For Future Missions)

**Step 1: Prepare this template**
```
cp SAMPLE_MISSION_TEMPLATE.md PHASE1_DECISION_[N]_MISSION.md
# Edit [BRACKETS] with context-specific info
```

**Step 2: Run the mission via MCP**
```bash
# Use the run_crew_mission_pipeline MCP tool
# Input: Paste entire mission template + all 5 parts
# Output: Observation Lounge record + Stored chains
```

**Step 3: Review Observation Lounge record**
```
Review: PHASE1_DECISION_[N]_OBSERVATION_LOUNGE_RECORD.md
Check:
  - Did teams reach >75% consensus?
  - Did Riker arbitrate conflicts successfully?
  - Did Picard's confidence (>85%) match expected outcome?
  - Any surprises in crew reasoning?
```

**Step 4: Measure outcomes**
```
Day 30: First reflection check — did crew complete it?
Day 90: Outcome review — did prediction match reality?
Day 180: Institutional memory extraction — what pattern emerged?
```

**Step 5: Use reasoning chains for next decision**
```
NEXT_DECISION_[N+1]:
  Run: "RAG recall decisions on [similar domain]"
  Retrieve: PHASE1-DECISION-[N] reasoning chain
  Activate: As neural prior for new deliberation
  Measure: Did prior help? Did decision quality improve?
```

---

## MEASUREMENT FRAMEWORK

**Crew Confidence Calibration:**

Track for each decision:
- Day 0: Crew stated confidence (e.g., 85%)
- Day 30: First reflection (did predictions hold?)
- Day 90: Outcome review (did core assumptions validate?)
- Goal: Stated confidence = actual success rate (±5% tolerance)

**Example:**
```
DECISION-001: Crew stated 91.7% avg confidence
  → If <90% of outcomes succeed, miscalibrated (too optimistic)
  → If ≥92% of outcomes succeed, miscalibrated (too pessimistic)
  → If 87–95% succeed, well-calibrated ✓
```

**Decision Quality Measurement:**

```
Quality Score = (Consensus% × 0.3) + (Confidence Calibration × 0.3) + 
                (Outcome Success × 0.2) + (Learning Captured × 0.2)

Target: ≥85% quality score for Phase 1 decisions
```

---

## RED FLAGS (Escalation Triggers)

Watch for these in Observation Lounge records:

1. **Low Consensus (<70%)** → Decision may not stick; investigate why
2. **High Confidence + Low Success** → Crew is miscalibrated; retrain priors
3. **No Arbitration (Riker not needed)** → Either unanimous (good) or teams not challenging (bad); investigate
4. **Picard Escalation** → Rare event; document why Riker couldn't synthesize
5. **Missing Reflections** → Discipline not holding; Phase 2 must strengthen mechanism

---

## NEXT PHASE 1 DECISIONS (Proposed Sequence)

| # | Decision | Owner | Timeline | Status |
|---|----------|-------|----------|--------|
| 1 | RAG schema design | Data | Week 1 | ✅ COMPLETE |
| 2 | Reflection discipline | Picard | Week 2 | ⏳ PENDING |
| 3 | Crew skill framework | Riker | Week 2 | ⏳ PENDING |
| 4 | Cost governance model | Quark | Week 3 | ⏳ PENDING |
| 5 | Security audit framework | Worf | Week 3 | ⏳ PENDING |
| 6 | Decision archival strategy | Yar | Week 4 | ⏳ PENDING |
| 7 | Institutional memory extraction | Crusher | Week 5 | ⏳ PENDING |
| 8 | Neural prior activation patterns | Geordi | Week 5 | ⏳ PENDING |
| 9 | Outcome measurement cadence | Troi | Week 6 | ⏳ PENDING |
| 10 | Phase 2 expansion decision | Picard | Week 6 | ⏳ PENDING |

---

## FORMALIZATION STATUS

✅ **TEMPLATE v1.0-alpha READY**

This template is derived from:
- [PROMPT_ARCHITECTURE_v1_FORMAL_TEMPLATE.md] (formal engineering patterns)
- [PHASE1_DECISION_001_OBSERVATION_LOUNGE_RECORD.md] (executed example)

Next Steps:
1. Use this template for Decisions #2–#10
2. Measure consistency (does the template work across different domains?)
3. Refine v1.1 based on Phase 1 execution
4. Publish as formal specification

---

🖖 **Template ready. Make it so.**
