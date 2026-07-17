# PROMPT ARCHITECTURE v1.0 — Formal Crew Mission Pipeline

**Status:** Template (Formalized from PHASE1-DECISION-001 execution)  
**Version:** v1.0-alpha  
**Purpose:** Document the prompt engineering patterns used in crew deliberations so they can be replicated, refined, and measured

---

## OVERVIEW

The **Prompt Architecture** defines how a natural-language request is transformed into a structured crew mission that:
1. Routes to the correct teams
2. Surfaces individual reasoning chains (Tier 1)
3. Synthesizes team consensus (Tier 2)
4. Resolves inter-team conflicts (Tier 3)
5. Produces a command decision (Tier 4)

**Output:** Full Observation Lounge record with reasoning chains stored to RAG as neural priors.

---

## MISSION STRUCTURE

Every crew mission follows this 5-part pattern:

```
INPUT
  ↓
[CONTEXT FRAME] — What is the problem? Why does it matter? What constraints exist?
  ↓
[TEAM ASSEMBLY] — Who deliberates? What are their roles? What is the governance?
  ↓
[DELIBERATION PROTOCOL] — How do teams reason? What format for monologues? What thresholds?
  ↓
[SYNTHESIS RULES] — How are individual thoughts combined? What counts as consensus?
  ↓
[OUTPUT SCHEMA] — What gets recorded? What gets stored to RAG? What is the decision?
  ↓
OUTPUT (Observation Lounge Record + Stored Chains + Command Decision)
```

---

## PART 1: CONTEXT FRAME

The context frame establishes **why the crew is deliberating**. It should include:

### Required Components

**1. Problem Statement**
- Single, clear sentence describing the decision
- Example: "What is the optimal RAG memory storage schema for reasoning chains?"

**2. Why It Matters (Strategic Importance)**
- Why is this decision load-bearing for the system?
- What fails if the decision is wrong?
- Example: "This schema is foundational to the crew's neural decision priors; future decisions will recall these chains as contextual weights."

**3. Constraints & Context**
- Scope boundaries (what is IN scope? what is NOT?)
- Timeline pressure (how urgent? when needed?)
- Prior decisions or dependencies (what earlier decisions does this build on?)
- Example: "We need a schema that stores complete reasoning chains (assumptions → evidence → inference → confidence → outcome → reflection). This enables future crew decisions to recall chains as neural priors."

**4. Success Criteria**
- How will you know the decision is good?
- What metrics matter? (consensus level? confidence? risk profile?)
- Example: "Crew consensus >85%, average confidence >85%, risk profile acceptable to Picard"

### Format Template

```
CONTEXT FRAME
==============

**Decision:** [Problem statement]

**Strategic Importance:** [Why it matters for the system]

**Scope:**
- IN: [What is included]
- NOT: [What is explicitly excluded]
- DEPENDENCIES: [Prior decisions this builds on]

**Constraints:**
- Timeline: [When is this needed?]
- Budget/Cost: [Any financial constraints?]
- Organizational: [Any authority/governance constraints?]

**Success Criteria:**
- Consensus threshold: ≥[X]%
- Confidence target: ≥[Y]%
- Risk profile: [Acceptable level of technical/operational/security risk]
```

**Execution Example (PHASE1-DECISION-001):**

```
CONTEXT FRAME
==============

**Decision:** What is the optimal RAG memory storage schema for reasoning chains?

**Strategic Importance:** 
This schema is foundational to the crew's neural decision priors. Future crew decisions will recall these chains as contextual weights, enabling institutional learning at scale.

**Scope:**
- IN: Schema design, storage patterns, governance model, cost tracking, audit requirements
- NOT: Implementation details, vendor selection, operational runbooks (Phase 2)
- DEPENDENCIES: CREW_META_EVOLUTION_SYSTEM.md (4-tier reasoning approved)

**Constraints:**
- Timeline: Complete deliberation + decision within Phase 1 (Aug 1–Sep 15)
- Budget: Schema design is $0 cost; storage cost TBD based on decision
- Organizational: Requires approval from Picard (command) + Worf (security veto authority)

**Success Criteria:**
- Consensus threshold: ≥85% across all teams
- Confidence target: ≥85% average crew confidence
- Risk profile: Medium acceptable (learning system, not production-critical yet)
```

---

## PART 2: TEAM ASSEMBLY

The team assembly defines **who deliberates and what roles they play**.

### Required Components

**1. Teams & Membership**
- Which teams are needed?
- Who leads each team?
- What are their specializations/domains?

**2. Team Scope (What each team owns)**
- Architecture Team: Strategic design patterns, type safety, query models
- Infrastructure Team: Performance, cost, operational scalability, reliability
- Governance Team: Security, auditability, compliance, institutional discipline

**3. Authority Structure**
- Who makes final decisions?
- Who has veto authority?
- Who can override whom?

### Format Template

```
TEAM ASSEMBLY
==============

**Teams Deliberating:**

1. **[Team Name]** (Lead: [Lead Officer])
   - Members: [Officer 1], [Officer 2], [Officer 3]
   - Domain Expertise: [What this team specializes in]
   - Scope: [What decisions/trade-offs this team owns]

2. **[Team Name]** (Lead: [Lead Officer])
   ...

**Authority Hierarchy:**
- Tier 1: Individual crew member reasoning
- Tier 2: Team lead synthesizes individual monologues into unified team position
- Tier 3: Riker arbitrates if teams conflict (trade-off analysis)
- Tier 4: Picard makes final decision (command authority)

**Veto Authority:**
- [Role]: Can veto on [dimension] (e.g., Worf: security veto)
- [Role]: Can veto on [dimension]
```

**Execution Example (PHASE1-DECISION-001):**

```
TEAM ASSEMBLY
==============

**Teams Deliberating:**

1. **Architecture Team** (Lead: Data)
   - Members: Data, Crusher, Troi
   - Domain Expertise: Design patterns, type safety, system health, stakeholder alignment
   - Scope: Schema design (nodes, edges, query patterns), compliance patterns, stakeholder context recording

2. **Infrastructure Team** (Lead: Geordi)
   - Members: Geordi, O'Brien, Quark
   - Domain Expertise: Performance, operations, financial sustainability, scalability
   - Scope: Storage patterns (hot/cold tiering), operational models, cost governance

3. **Governance Team** (Lead: Worf)
   - Members: Worf, Yar, Picard
   - Domain Expertise: Security, audit, institutional discipline, command authority
   - Scope: Encryption, access control, audit trails, reflection lifecycle

**Authority Hierarchy:**
- Tier 1: Each of 9 crew members generates individual monologue (visible to team)
- Tier 2: Team leads (Data, Geordi, Worf) synthesize into unified team positions
- Tier 3: Riker (upgraded to Opus for this meta-coordination) arbitrates if Architecture/Infrastructure teams conflict
- Tier 4: Picard makes final decision + rationale

**Veto Authority:**
- Worf: Security veto (any HIGH/CRITICAL finding blocks decision)
- Picard: Command override (rare, overrides consensus if institutional knowledge requires)
```

---

## PART 3: DELIBERATION PROTOCOL

The deliberation protocol defines **how each crew member reasons** and **what format their thinking takes**.

### Required Components

**1. Tier 1 Monologue Format**
- What does each person write/think?
- What components must be included?
- How is confidence expressed?

**2. Reasoning Depth**
- Should monologues be terse or detailed?
- Should they cite evidence? How much?
- Should they acknowledge opposing views?

**3. Constraints on Reasoning**
- Should crew members try to find consensus before synthesizing?
- Or should they state their view independently?
- Should they debate with each other?

### Format Template

```
DELIBERATION PROTOCOL
==============

**Tier 1 — Individual Monologue (per crew member):**

Each crew member generates visible reasoning with these components:

1. **Assumption:** "I believe X because..." (What is your core worldview on this topic?)
2. **Evidence:** "I observed Y in the codebase / past decisions" (What data supports your assumption?)
3. **Reasoning:** "Therefore I conclude..." (What follows logically from your assumption + evidence?)
4. **Concern:** "Risk: Z might happen if..." (What could break your reasoning? What downside?)
5. **Confidence:** "[X]% because..." (How sure are you? Why might you be wrong?)

**Reasoning Depth:** [Terse/Detailed] — Focus on [speed/rigor]
**Debate Style:** [Independent reasoning / Cross-discussion / Evidence-driven]
**Dissent Recording:** [Explicit / Implicit / Deferred to Tier 2]

**Tier 2 — Team Synthesis:**

Team lead aggregates monologues:
1. Identify consensus areas (>75% alignment)
2. Identify conflicts (where reasoning chains diverge)
3. Synthesize unified team position OR surface conflict to Tier 3
4. Record consensus level + disputed points
```

**Execution Example (PHASE1-DECISION-001):**

```
DELIBERATION PROTOCOL
==============

**Tier 1 — Individual Monologue (per crew member):**

Each of 9 crew members generates visible reasoning:

1. **Assumption:** "I believe X because..." (Core worldview on schema design)
   - Example (Data): "Graph schemas with typed edges are optimal for causal reasoning"

2. **Evidence:** "I observed Y..." (Data supporting the assumption)
   - Example (Data): "Reviewed codebase RAG patterns; semantic queries naturally traverse assumption→outcome→reflection edges"

3. **Reasoning:** "Therefore I conclude..."
   - Example (Data): "Propose hybrid OLAP/OLTP graph with vector-indexed subgraphs for neural recall"

4. **Concern:** "Risk: Z might happen if..."
   - Example (Data): "Tiered storage adds complexity; infrastructure team must validate query latency SLA"

5. **Confidence:** "[X]% because..."
   - Example (Data): "92% — aligns with ML priors (GNNs) + audit requirements"

**Reasoning Depth:** Detailed (rigor priority for foundational decision)
**Debate Style:** Independent reasoning (crew members state view without pre-coordination)
**Dissent Recording:** Explicit (record both majority + minority views for measurement)

**Tier 2 — Team Synthesis:**

Each team lead (Data, Geordi, Worf) aggregates their team's monologues:
1. Identify consensus areas (>75% alignment) → unified position
2. Identify conflicts → escalate to Tier 3 (Riker)
3. Record consensus level (%) + disputed points
```

---

## PART 4: SYNTHESIS RULES

The synthesis rules define **how individual thoughts combine into team positions** and **when escalation to Tier 3 is triggered**.

### Required Components

**1. Consensus Threshold**
- What % agreement counts as consensus?
- How is disagreement measured? (confidence overlap? reasoning similarity?)

**2. Conflict Resolution (Tier 2→Tier 3 trigger)**
- When does a team escalate to Riker?
- What counts as a "conflict"?
- How are disputes documented?

**3. Riker Arbitration (Tier 3)**
- When does Riker get involved?
- What is Riker's arbitration protocol?
- Can Riker override team consensus?

### Format Template

```
SYNTHESIS RULES
==============

**Tier 2 Consensus Threshold:**
- Consensus = ≥75% of team members agree on core reasoning
- Measured by: Confidence overlap + evidence compatibility

**Conflict Definition:**
- Conflict = Two or more team members have contradictory core assumptions (confidence <70%)
- Example: "Geordi assumes distributed ledger necessary; O'Brien assumes direct S3 sufficient"

**Escalation to Tier 3:**
- Trigger 1: Team consensus <75%
- Trigger 2: Confidence divergence >20% between team members
- Trigger 3: Strategic disagreement on trade-offs

**Tier 3 — Riker Arbitration:**
- Riker reviews both team positions + underlying reasoning chains
- Riker identifies trade-off (what each side is optimizing for)
- Riker proposes synthesis that honors both viewpoints
- Riker's synthesis is binding UNLESS escalated to Picard (Tier 4)

**Escalation to Tier 4 (Picard):**
- Trigger 1: Riker cannot synthesize (fundamental value conflict, not trade-off)
- Trigger 2: Strategic decision affects institutional identity/authority
- Trigger 3: Picard explicitly requests involvement
```

**Execution Example (PHASE1-DECISION-001):**

```
SYNTHESIS RULES
==============

**Tier 2 Consensus Threshold:**
- Architecture Team: 93% consensus (Data + Crusher + Troi aligned; 1 disputed point)
- Infrastructure Team: 90% consensus (Geordi + O'Brien + Quark aligned; 1 disputed point)
- Governance Team: 95% consensus (Worf + Yar + Picard unanimously aligned)

**Conflicts Identified:**

Conflict 1: Dispute Recording (Architecture Team)
- Troi: Record disputes explicitly as annotated variants
- Data: Use probabilistic weighting (efficiency)
- Type: Trade-off (stakeholder value vs technical efficiency)

Conflict 2: Storage Architecture (Infrastructure Team)
- Geordi: Distributed ledger overlay for cross-provider flexibility
- O'Brien: Direct S3/GCS (operational simplicity)
- Type: Trade-off (future-proofing vs pragmatism)

**Tier 3 — Riker Arbitration:**

Arbitration 1 (Dispute Recording):
  Riker's Trade-Off Analysis: "Troi optimizing for institutional learning; Data optimizing for efficiency"
  Riker's Synthesis: "Implement explicit recording for Phase 1 (90 days), measure both approaches, then decide for Phase 2"
  Outcome: ✓ Consensus achieved (test-driven resolution)

Arbitration 2 (Storage Architecture):
  Riker's Trade-Off Analysis: "Geordi optimizing for flexibility; O'Brien optimizing for simplicity"
  Riker's Synthesis: "Provider-agnostic query API + S3/GCS default + optional ledger for Phase 2"
  Outcome: ✓ Consensus achieved (layered approach)

**Escalation to Tier 4:**
- Trigger: NO escalations needed; Riker's arbitration resolved all conflicts
- Result: Decision ready for Picard's command
```

---

## PART 5: OUTPUT SCHEMA

The output schema defines **what gets recorded, stored, and returned**.

### Required Components

**1. Observation Lounge Record**
- Full deliberation (all monologues)
- Team syntheses (consensus levels)
- Arbitration (Riker's reasoning)
- Final decision (Picard's command + rationale)

**2. Reasoning Chain Storage (RAG)**
- What gets persisted?
- How is it indexed?
- What are the activation triggers for future recall?

**3. Command Decision**
- What is the actual decision?
- What are the next actions?
- Who is accountable for implementation?

### Format Template

```
OUTPUT SCHEMA
==============

**1. Observation Lounge Record (Full Deliberation)**

{
  missionReference: string,
  date: ISO date,
  decision: string,
  status: "deliberated" | "stored" | "implemented",
  cost: USD float,
  
  tier1Monologues: [
    {
      crewMember: string,
      role: string,
      team: string,
      assumption: string,
      evidence: string,
      reasoning: string,
      concern: string,
      confidence: number (0-1)
    },
    // ... more crew members
  ],
  
  tier2Syntheses: [
    {
      team: string,
      unifiedPosition: string,
      consensusLevel: number (0-1),
      disputedPoints: string[],
      memberConfidences: { [crewMember]: number }
    },
    // ... more teams
  ],
  
  tier3Arbitrations: [
    {
      conflict: string,
      parties: string[],
      rikerAnalysis: string,
      rikerSynthesis: string,
      outcome: string
    },
    // ... more arbitrations
  ],
  
  tier4Decision: {
    authority: string,
    decision: string,
    rationale: string,
    confidence: number (0-1),
    implementation: {
      phases: Phase[],
      owners: { phase: string, owner: string },
      nextActions: Action[]
    }
  }
}

**2. Reasoning Chain Storage (RAG)**

Store to Supabase RAG with reference: missionReference
- All Tier 1 monologues (for future pattern recognition)
- Tier 2 team syntheses (consensus patterns)
- Tier 3 arbitrations (conflict resolution templates)
- Tier 4 decision + 30/90-day outcome tracking

Activation Triggers (Future Recalls):
- When crew faces similar decision: "RAG recall chains where domain = [this domain]"
- When crew debates: "RAG recall past disputes on [similar trade-off]"
- When measuring outcomes: "RAG retrieve all outcomes from [Decision] + compare predictions vs reality"

**3. Command Decision (Actionable Output)**

{
  decision: string,
  phases: {
    phase1: { name, timeline, owner, actions },
    phase2: { name, timeline, owner, actions }
  },
  nextActions: Action[],
  riskSummary: { dimension, rating, mitigation },
  crewConfidence: number (0-1)
}
```

**Execution Example (PHASE1-DECISION-001):**

```
OUTPUT SCHEMA
==============

**1. Observation Lounge Record (GENERATED & STORED)**
- Reference: PHASE1-DECISION-001-RAG-SCHEMA
- File: PHASE1_DECISION_001_OBSERVATION_LOUNGE_RECORD.md
- Contains: All 9 monologues, 3 team syntheses, 2 arbitrations, Picard's final decision

**2. Reasoning Chain Storage (PERSISTED TO RAG)**
- Supabase row created with full JSON of all 4 tiers
- Indexed by: missionReference, domain (schema), team, crew member
- Activation triggers:
  - "RAG recall RAG schema decisions" → retrieves this chain
  - "RAG recall Data's past architecture debates" → surfaces Data's monologue
  - "RAG recall conflicts between flexibility + simplicity" → surfaces Riker's arbitration

**3. Command Decision (ACTIONABLE)**

DECISION: Balanced OLAP/OLTP Graph + Tiered Storage + Governance Metadata

PHASE 1 (MONTHS 1-2):
- Graph schema design (nodes, edges, vector indices) — Owner: Data
- Tiered storage implementation (DynamoDB + S3) — Owner: Geordi + O'Brien
- Governance layer (encryption, audit, sanitization) — Owner: Worf + Yar
- Cost metadata embedding — Owner: Quark
- Reflection lifecycle enforcement — Owner: Picard

PHASE 2 (MONTHS 3+):
- Explicit dispute variants (Troi's recommendation)
- Confidence decay curves (Crusher's recommendation)
- Distributed ledger overlay (Geordi's vision)

NEXT ACTIONS:
- Riker: Schedule implementation spike (Week 1)
- Worf: Draft security policy (Week 1)
- Quark: Model cost projections (Week 1)
- Picard: Present to stakeholders (Week 1)

CREW CONFIDENCE: 91.7% (High)
RISK PROFILE: Medium (learning system, not production-critical)
```

---

## COMPLETE MISSION EXAMPLE

**Input:** Phase 1 Pilot Decision #1

**Structured Mission Call:**

```typescript
await runCrewMissionPipeline({
  // CONTEXT FRAME
  input: `
    Decision: What is the optimal RAG memory storage schema for reasoning chains?
    Strategic Importance: Foundational to crew's neural decision priors
    Scope: Schema design, storage patterns, governance, cost tracking, audit requirements
    Timeline: Phase 1 Pilot (Aug 1–Sep 15)
    Success Criteria: Crew consensus ≥85%, confidence ≥85%, risk profile acceptable
  `,
  
  // TEAM ASSEMBLY
  // (Implicitly handled by crew-team-assembly.ts routing)
  // Teams: Architecture (Data/Crusher/Troi), Infrastructure (Geordi/O'Brien/Quark), Governance (Worf/Yar/Picard)
  
  // DELIBERATION PROTOCOL
  // (Implicitly handled by crew prompts + Tier 1-4 system)
  // Each crew member generates monologue (assumption, evidence, reasoning, concern, confidence)
  
  // SYNTHESIS RULES
  // (Implicitly handled by Riker's arbitration engine)
  // Tier 2: Synthesize to >75% consensus
  // Tier 3: Riker arbitrates conflicts (trade-off analysis)
  // Tier 4: Picard decides + rationale
  
  // OUTPUT SCHEMA
  store: true,
  missionReference: "PHASE1-DECISION-001-RAG-SCHEMA",
  clientId: "familiarcat",
  includeDebate: true
});
```

**Output:** Full Observation Lounge record + Stored reasoning chains + Command decision

---

## PROMPT ENGINEERING NOTES

### What Worked

1. **Explicit Tier Structure** — Framing deliberation as Tier 1 (individual) → Tier 2 (team) → Tier 3 (arbitration) → Tier 4 (command) made reasoning transparent and measurable
2. **Monologue Format** — Forcing visible reasoning chains (assumption/evidence/reasoning/concern/confidence) surfaced disagreement early and enabled synthesis
3. **Trade-off Framing** — When conflicts arose, framing them as "What is each side optimizing for?" enabled Riker to synthesize rather than arbitrate
4. **Consensus Thresholds** — Explicit thresholds (75% consensus, >85% confidence target) gave teams clear acceptance criteria
5. **Role Clarity** — Assigning clear team ownership (Architecture vs Infrastructure vs Governance) prevented diffuse responsibility

### What to Refine for v1.1

1. **Monologue Length** — Some crew members produced verbose reasoning; consider token budgeting per monologue
2. **Dispute Recording** — Phase 1 test will measure whether explicit vs probabilistic dispute recording is more valuable for future recalls
3. **Confidence Calibration** — Crew stated 91.7% average confidence; Phase 1 will measure whether outcomes match predictions (target: ±5% calibration error)
4. **Riker Arbitration Scaling** — Only 2 disputes arose; unclear if Tier 3 scales to 10+ conflicts per decision
5. **Tier 4 Authority** — Picard didn't need to override Riker; measure if command authority needs explicit escalation triggers

---

## ACTIVATION PATTERN (Future Recalls)

When a future crew decision faces a similar question:

```
FUTURE CREW DELIBERATION
→ RAG recall: "Show me past decisions on schema/storage design"
→ Retrieve: PHASE1-DECISION-001-RAG-SCHEMA reasoning chain
→ Crew activate: Data's monologue about graph design + Geordi's arbitration + Picard's rationale
→ Crew use as neural prior: "Last time we chose hybrid graph + tiered storage; similar trade-offs here?"
→ Decision quality improves: Reasoning chains compound across time
```

---

## FORMALIZATION STATUS

✅ **v1.0-alpha APPROVED** by crew consensus (91.7% confidence)

Recommended next steps:
1. Execute Phase 1 pilot with 8–10 more decisions using this architecture
2. Measure outcomes (decision quality, prediction accuracy, learning velocity)
3. Refine Prompt Architecture v1.1 based on Phase 1 learnings
4. Publish formal v1.0 specification

---

🖖 **Make it so.**
