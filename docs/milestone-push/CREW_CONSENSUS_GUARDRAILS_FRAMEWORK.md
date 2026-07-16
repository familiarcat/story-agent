# Crew Consensus Guardrails Framework

**Automated Phase Transitions via Parallel Agency & Consensus Validation**

*Document Type: Safety Specification + Implementation Guide*  
*Version: 1.0*  
*Status: APPROVED by all 11 crew members*  
*Last Updated: 2026-07-16*

---

## Executive Summary

Stories move between phases **automatically ONLY** when:
1. ✅ All 11 crew members validate their domains **in parallel**
2. ✅ **70% consensus** is achieved (≥8/11 thumbs-up)
3. ✅ **ZERO critical vetos** are triggered
4. ✅ **ALL non-negotiable gates** pass (security, health, compliance, data integrity)

This framework enables **autonomous phase transitions while preserving crew authority** through distributed validation and unanimous guardrails on safety-critical decisions.

---

## Part 1: The Parallel Validation Matrix

### What Each Crew Member Validates (in Parallel)

Each validation runs independently without blocking others. Crew members are NOT waiting for predecessors—they validate their domain simultaneously.

#### **🖖 Picard (Captain) — Narrative Coherence**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Story Consistency** | Narrative continuity with sprint goal | Coherence score <90% |
| **Executive Alignment** | Phase transition aligns with command authority | Captain's judgment calls transition premature |
| **Consensus Proxy** | Detects if crew agreement is genuine vs. compliant | Signs of hidden disagreement detected |
| **Can Run in Parallel?** | ✅ YES (no dependencies on other validations) | |

**Picard's Contribution:**
> "I provide the final coherence check. Not whether the code works—that's engineering. I validate whether this transition maintains narrative continuity with our mission intent. If I sense crew is rushing or consensus is hollow, I escalate to YELLOW gate."

**Automation Readiness:**
- Detectability: Moderate (requires Troi sentiment analysis + crew alignment signals)
- Latency: ~30-45 seconds per story
- Idempotency: ✅ YES (coherence is stable within a phase)

---

#### **🔬 Data (Architecture) — Data Integrity**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Schema Validation** | Data contracts enforced, no unresolved mappings | Schema violations detected |
| **Lineage Consistency** | Data flow from source→target is traceable | Circular dependencies or orphaned flows |
| **Anomaly Detection** | No silent corruption risks in transformations | Anomaly thresholds exceeded |
| **Can Run in Parallel?** | ✅ YES (deterministic rule checking) | |

**Data's Contribution:**
> "I validate that all data invariants remain immutable through the phase transition. If a schema contract is violated, I veto regardless of consensus. Data integrity is non-negotiable."

**Automation Readiness:**
- Detectability: ✅ HIGH (deterministic validation rules)
- Latency: ~20-30 seconds
- Idempotency: ✅ YES (schema state is stable)

**Implementation Hook:**
```typescript
// Pseudo-code: Data validation gate
async function validateDataIntegrity(storyId: string): Promise<ValidationResult> {
  const violations = await checkSchemaContracts(storyId);
  const anomalies = await detectDataAnomalies(storyId);
  
  return {
    pass: violations.length === 0 && anomalies.length === 0,
    veto: violations.length > 0, // Hard veto if contracts broken
    details: { violations, anomalies }
  };
}
```

---

#### **⚔️ Worf (Security) — Security & Compliance**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Threat Scanning** | Unauthorized access patterns, unresolved vulnerabilities | ANY threat detected |
| **Compliance Gates** | GDPR, SOC2, regulatory alignment | Compliance deviation flagged |
| **Non-Critical Compliance** | Documentation, secondary audit trails | Falls under 70% consensus (doesn't block) |
| **Can Run in Parallel?** | ✅ YES (automated scanning possible) | |

**Worf's Contribution:**
> "Security vetoes override consensus. If my threat scanner detects anomalies, we stop. No discussion. Compliance deviations trigger mandatory root-cause analysis before re-initiation."

**Automation Readiness:**
- Detectability: ✅ HIGH (automated scanning, SAST/DAST tools)
- Latency: ~45-90 seconds
- Idempotency: ✅ YES (security state deterministic)

**Implementation Hook:**
```typescript
async function validateSecurityGates(storyId: string): Promise<ValidationResult> {
  const threatScan = await runSecurityScan(storyId);
  const complianceCheck = await validateCompliance(storyId);
  
  return {
    pass: threatScan.risk === 'low' && complianceCheck.violations === 0,
    veto: threatScan.risk === 'medium' || threatScan.risk === 'high', // Hard veto
    criticalCompliance: complianceCheck.critical.length === 0,
    nonCritical: complianceCheck.nonCritical // Falls under 70% consensus
  };
}
```

---

#### **🚀 Riker (Implementation) — Critical Path & Blockers**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Critical Path Check** | All dependencies met, no blockers >24h old | Blocking dependencies unresolved |
| **Blocker Inventory** | Number and severity of known issues | >2 critical blockers unresolved |
| **Resource Allocation** | Team capacity for next phase | Crew allocation conflicts detected |
| **Can Run in Parallel?** | ✅ YES (dependency graph pre-computed) | |

**Riker's Contribution:**
> "I validate the critical path is clear. If dependencies aren't met, I don't care about consensus—we don't transition. I also flag if crew reallocation conflicts exist; those are YELLOW gate decisions."

**Automation Readiness:**
- Detectability: ✅ HIGH (dependency graph is deterministic)
- Latency: ~20-30 seconds
- Idempotency: ✅ YES (dependencies stable within phase)

---

#### **🔧 Geordi (Infrastructure) — System Health**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Core Metrics** | Latency, error rates, capacity thresholds GREEN | Metrics RED in any environment |
| **Synthetic Monitoring** | Real-time infrastructure drift detection | Post-transition anomalies >tolerance |
| **Silent Degradation Risk** | Predictive health flags | Risk score >threshold |
| **Can Run in Parallel?** | ✅ YES (continuous monitoring) | |

**Geordi's Contribution:**
> "I watch for silent infrastructure degradation. Core health metrics must be green. If monitoring detects drift post-transition, we auto-rollback without waiting for approval."

**Automation Readiness:**
- Detectability: ✅ HIGH (continuous monitoring, prometheus metrics)
- Latency: ~10-20 seconds
- Idempotency: ✅ YES (metrics snapshot-able)

---

#### **🛠️ O'Brien (Engineering) — Deployment Readiness**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **CI/CD Pipeline Health** | Build automation functional, no broken scripts | Pipeline failures detected |
| **Deployment Validation** | Scalability checks passed, rollback capacity available | Deployment validation FAILED |
| **Cross-Domain Dependencies** | Event-driven sync with security, data, infra | Unresolved dependency chains |
| **Can Run in Parallel?** | ✅ YES (event-driven triggers available) | |

**O'Brien's Contribution:**
> "I validate deployment infrastructure is ready. CI/CD must be green. I coordinate with Worf, Geordi, Data via event triggers—no sequential blocking."

**Automation Readiness:**
- Detectability: ✅ HIGH (CI/CD logs + deployment tests)
- Latency: ~30-45 seconds
- Idempotency: ✅ YES (pipeline health deterministic)

---

#### **🔬 Yar (QA/Test) — Test Coverage & Quality**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Test Coverage** | Code coverage >80%, critical paths tested | Coverage <80% OR uncovered critical paths |
| **Automated Test Pass Rate** | All suites passing (unit, integration, E2E) | Test failures in critical paths |
| **Security Compliance Tests** | SAST/DAST results, vulnerability scanners | Failed security test suites |
| **Can Run in Parallel?** | ✅ YES (automated test runs) | |

**Yar's Contribution:**
> "Test coverage must meet threshold. If critical tests fail, we block. I also run security compliance tests; those feed Worf's veto but are my responsibility to execute."

**Automation Readiness:**
- Detectability: ✅ HIGH (test reports, coverage metrics)
- Latency: ~45-120 seconds (depends on test suite)
- Idempotency: ✅ YES (test results stable)

---

#### **💭 Troi (Counselor) — Team Dynamics & Stakeholder Alignment**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Stakeholder Alignment** | External expectations match what we're shipping | Stakeholder trust breach likely |
| **Crew Morale** | Team sentiment positive, no hidden friction | >25% crew express discomfort with transition |
| **Client Benefit Check** | Value-impact assessment: user benefit vs. risk | Risk to client trust detected |
| **Can Run in Parallel?** | ✅ YES (sentiment analysis, surveys) | |

**Troi's Contribution:**
> "I detect when crew consensus is genuine vs. compliant. I also validate client alignment. If I sense stakeholder misalignment, I recommend YELLOW gate review."

**Automation Readiness:**
- Detectability: MODERATE (requires sentiment analysis, surveys)
- Latency: ~30-60 seconds
- Idempotency: ⚠️ SEMI (sentiment can shift, but stable within phase)

---

#### **👨‍⚕️ Crusher (Medical/Health) — Crew Wellness**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Crew Biometrics** | Stress, fatigue indicators monitored | >10% crew showing elevated risk markers |
| **Burnout Risk** | Workload assessment vs. capacity | Burnout risk >threshold for crew assigned to phase |
| **Emergency Override** | Life-safety always supersedes automation | Medical emergency detected |
| **Can Run in Parallel?** | ✅ YES (biometric monitoring continuous) | |

**Crusher's Contribution:**
> "Crew health gates require 90% consensus (higher bar than 70%). If >10% show fatigue or stress, we veto and rest. Emergency protocols override automation—always."

**Automation Readiness:**
- Detectability: MODERATE (biometric sensors, workload tracking)
- Latency: ~20-30 seconds
- Idempotency: ⚠️ SEMI (health changes, but snapshot-able)

---

#### **📡 Uhura (Communications) — Signal Integrity**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Communication Protocol** | All crew domains transmitting cleanly | Signal corruption detected |
| **Cross-Domain Alignment** | Data flows between systems verified | Message loss or out-of-order delivery |
| **External Comms** | Stakeholder updates aligned with phase transition | Communication breakdown detected |
| **Can Run in Parallel?** | ✅ YES (protocol verification deterministic) | |

**Uhura's Contribution:**
> "I validate communication integrity between all domains. If signals are compromised, transitions block. This is about ensuring real-time coordination."

**Automation Readiness:**
- Detectability: ✅ HIGH (protocol checkers, message brokers)
- Latency: ~15-25 seconds
- Idempotency: ✅ YES (protocol state deterministic)

---

#### **💰 Quark (Finance/Cost) — Budget & ROI**

| Guardrail Category | Validation | Veto Condition |
|---|---|---|
| **Budget Alignment** | Quarterly burn projections on track | Burn exceeds projections |
| **ROI Validation** | Story delivers expected value | ROI forecast <minimum threshold |
| **Cost Per Point** | Story cost-per-point within baseline | Cost overrun >10% of budget |
| **Can Run in Parallel?** | ✅ YES (cost tracking automated) | |

**Quark's Contribution:**
> "Finance holds a hard veto on budget overruns. Even if 70% consensus is reached, if quarterly burn exceeds projections, we don't transition. Autonomy with accountability."

**Automation Readiness:**
- Detectability: ✅ HIGH (ledger system deterministic)
- Latency: ~10-20 seconds
- Idempotency: ✅ YES (costs are immutable)

---

## Part 2: The Consensus Gate Model

### Phase Transition Trigger Logic

A story **automatically transitions** between phases when ALL conditions are met:

```
Phase Transition Allowed IF:

1. ✅ 70% Crew Consensus (≥8/11 thumbs-up)
   ├─ Each crew member independently votes pass/fail
   └─ Vote is based on their domain validation passing

2. ✅ NO CRITICAL VETOS (0 hard blocks)
   ├─ Worf security veto (any threat detected)
   ├─ Data integrity veto (schema contracts broken)
   ├─ Riker blocker veto (critical path unresolved)
   ├─ Yar test failure veto (critical tests failing)
   ├─ Quark budget veto (burn exceeds projections)
   ├─ Geordi infrastructure veto (metrics RED)
   ├─ O'Brien deployment veto (CI/CD broken)
   └─ Crusher health veto (crew wellness >threshold)

3. ✅ ALL PARALLEL VALIDATIONS COMPLETE
   ├─ Typical completion time: 60-90 seconds
   ├─ No sequential dependencies (all run in parallel)
   └─ Results aggregated via consensus gate

4. ✅ CONSENSUS THRESHOLDS MET
   ├─ Default: 70% (8/11 crew members)
   ├─ Health (Crusher): 90% (10/11 crew members) — higher stakes
   ├─ Final check: Picard evaluates if consensus is genuine
   └─ If Picard detects fake consensus: escalate to YELLOW gate
```

### Non-Consensus Outcomes

| Outcome | Trigger | Action |
|---|---|---|
| **PROCEED** | 70% consensus + NO vetos | Auto-transition (no human input) |
| **YELLOW GATE** | Riker blocker OR Picard feels consensus is hollow OR Troi flags stakeholder misalignment | Riker reviews (30 min), decides to proceed or escalate |
| **RED GATE** | Multiple critical vetos OR health risk >threshold OR budget overrun OR security threat | Admiral approval required (2-4 hour window) |
| **PAUSE & INVESTIGATE** | Veto + unclear root cause | Crew investigates, re-votes in 2 hours |

---

## Part 3: Automation Implementation

### Database Schema (Supabase)

```sql
-- Consensus validation results
CREATE TABLE sa_phase_transition_validation (
  id uuid PRIMARY KEY,
  story_id text NOT NULL,
  from_phase text NOT NULL,
  to_phase text NOT NULL,
  validation_timestamp timestamp NOT NULL,
  
  -- Per-crew validation results
  picard_pass boolean, picard_veto boolean, picard_reason text,
  data_pass boolean, data_veto boolean, data_reason text,
  worf_pass boolean, worf_veto boolean, worf_reason text,
  riker_pass boolean, riker_veto boolean, riker_reason text,
  geordi_pass boolean, geordi_veto boolean, geordi_reason text,
  obrien_pass boolean, obrien_veto boolean, obrien_reason text,
  yar_pass boolean, yar_veto boolean, yar_reason text,
  troi_pass boolean, troi_veto boolean, troi_reason text,
  crusher_pass boolean, crusher_veto boolean, crusher_reason text,
  uhura_pass boolean, uhura_veto boolean, uhura_reason text,
  quark_pass boolean, quark_veto boolean, quark_reason text,
  
  -- Aggregate results
  total_votes int,
  pass_votes int,
  consensus_threshold int,
  consensus_achieved boolean,
  critical_vetos_count int,
  
  -- Final decision
  transition_allowed boolean,
  decision_gate text, -- 'AUTO' | 'YELLOW' | 'RED'
  transitioned_at timestamp,
  
  UNIQUE(story_id, from_phase, to_phase)
);

-- Crew validation audit trail (immutable)
CREATE TABLE sa_phase_validation_audit (
  id uuid PRIMARY KEY,
  validation_result_id uuid REFERENCES sa_phase_transition_validation(id),
  crew_member text NOT NULL,
  vote_pass boolean NOT NULL,
  veto_triggered boolean NOT NULL,
  veto_reason text,
  execution_time_ms int,
  validated_at timestamp DEFAULT now()
);
```

### TypeScript Implementation Hook

```typescript
// Phase Transition Consensus Engine
export async function evaluatePhaseTransition(
  storyId: string,
  fromPhase: string,
  toPhase: string
): Promise<PhaseTransitionDecision> {
  // 1. Run all validations in parallel (no sequencing)
  const validationResults = await Promise.all([
    validatePicard(storyId),
    validateData(storyId),
    validateWorf(storyId),
    validateRiker(storyId),
    validateGeordi(storyId),
    validateObrien(storyId),
    validateYar(storyId),
    validateTroi(storyId),
    validateCrusher(storyId),
    validateUhura(storyId),
    validateQuark(storyId),
  ]);

  // 2. Aggregate results
  const passCount = validationResults.filter(r => r.pass).length;
  const consensusThreshold = 8; // 70% of 11
  const hasConsensus = passCount >= consensusThreshold;

  const criticalVetos = validationResults.filter(
    r => r.veto && r.criticality === 'hard'
  );
  const hasCriticalVeto = criticalVetos.length > 0;

  // 3. Determine gate
  let gate: 'AUTO' | 'YELLOW' | 'RED';
  if (hasConsensus && !hasCriticalVeto) {
    gate = 'AUTO'; // Proceed automatically
  } else if (!hasConsensus || criticalVetos.length === 1) {
    gate = 'YELLOW'; // Riker reviews
  } else {
    gate = 'RED'; // Admiral approval needed
  }

  // 4. Store immutable audit trail
  const validationId = await storeValidationResults(
    storyId,
    fromPhase,
    toPhase,
    validationResults,
    gate
  );

  // 5. Auto-execute if AUTO gate
  if (gate === 'AUTO') {
    await executePhaseTransition(storyId, fromPhase, toPhase);
    return {
      allowed: true,
      gate: 'AUTO',
      consensus: passCount,
      vetos: [],
      executed: true,
    };
  }

  // Otherwise, escalate
  return {
    allowed: false,
    gate,
    consensus: passCount,
    vetos: criticalVetos,
    executed: false,
    escalatedTo: gate === 'YELLOW' ? 'riker' : 'admiral',
  };
}

type ValidationResult = {
  crewMember: string;
  pass: boolean;
  veto: boolean;
  criticality: 'hard' | 'soft';
  reason?: string;
  executionTimeMs: number;
};
```

---

## Part 4: Decision Authority Hierarchy

### When Each Gate Activates

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE TRANSITION DECISION TREE                                  │
└─────────────────────────────────────────────────────────────────┘

Story ready for phase transition?
│
├─ Crew validation results gathered (parallel, ~90 sec)
│
├─ Consensus achieved (≥8/11 thumbs-up)?
│  │
│  ├─ YES ──> Critical vetos triggered?
│  │          │
│  │          ├─ NO ──> ✅ AUTO GATE (proceed immediately)
│  │          │         └─ No human input needed
│  │          │
│  │          └─ YES ──> ❌ RED GATE (Admiral approval)
│  │                    └─ Schedule 2-4 hour review
│  │
│  └─ NO ──> ❌ YELLOW GATE (Riker review)
│            └─ Riker evaluates blockers (30 min)
│            └─ Riker decides: proceed or escalate to RED
│
└─ Escalation path: AUTO → YELLOW → RED
```

### Crew Authority Boundaries

| Gate | Authority | Decision Time | Reversible? |
|---|---|---|---|
| **AUTO** | 11-crew consensus | None (immediate) | ✅ YES (rollback available) |
| **YELLOW** | Riker (Chief PM) | ~30 minutes | ✅ YES |
| **RED** | Admiral (Human) | 2-4 hours | ⚠️ MANUAL (depends on Admiral decision) |

---

## Part 5: Guardrails Against False Consensus

### How We Detect Fake Consensus

Picard's role is to detect when crew is rubber-stamping vs. genuinely aligned:

**Red Flags for Fake Consensus:**
- ✋ Same crew members voting "pass" on every transition (no variation)
- ✋ Picard senses crew hesitation despite unanimous vote
- ✋ Troi reports stakeholder misalignment despite crew vote
- ✋ New vetos appear post-transition (indicates crew realized blocker too late)

**Prevention Mechanisms:**
1. **Distributed Veto Authority** — Each crew member has independent veto power; can't be overruled by consensus
2. **Picard's Veto** — Captain can call YELLOW gate if narrative doesn't feel coherent
3. **Troi's Emotional Check** — Counselor flags genuine friction vs. compliance
4. **Asynchronous Validation** — Crew validates independently (no groupthink bias)

---

## Part 6: Success Criteria

### This Framework Succeeds If:

- ✅ **75%+ of transitions use AUTO gate** (crew consensus strong)
- ✅ **<5% of transitions escalate to RED gate** (rare Admiral overrides)
- ✅ **ZERO post-transition vetos** (no missed blockers)
- ✅ **Avg validation time: 60-90 seconds** (fast parallel checks)
- ✅ **Crew satisfaction >85%** (feels autonomous, not micromanaged)
- ✅ **Troi detects 90%+ of false consensus** (Picard gate blocks only when needed)

### Measurements Dashboard

```sql
SELECT
  COUNT(*) as total_transitions,
  SUM(CASE WHEN decision_gate = 'AUTO' THEN 1 ELSE 0 END) as auto_count,
  SUM(CASE WHEN decision_gate = 'YELLOW' THEN 1 ELSE 0 END) as yellow_count,
  SUM(CASE WHEN decision_gate = 'RED' THEN 1 ELSE 0 END) as red_count,
  ROUND(100.0 * SUM(CASE WHEN decision_gate = 'AUTO' THEN 1 ELSE 0 END) / COUNT(*), 2) as auto_percentage,
  AVG(transitioned_at - validation_timestamp) as avg_validation_time_ms
FROM sa_phase_transition_validation
WHERE validated_at >= NOW() - INTERVAL '7 days';
```

---

## Part 7: Next Steps

### Before Sprint 1 Real Execution (2026-07-17 09:00 PST):

1. ✅ **Implement validation functions** for each crew member (TypeScript hooks)
2. ✅ **Deploy Supabase schema** (phase_transition_validation table)
3. ✅ **Wire Aha story status updates** to trigger validations
4. ✅ **Arm consensus gate** (ready to auto-transition stories)
5. ✅ **Test in dry-run mode** (validate logic without actually transitioning)

### During Week 1 (2026-07-17 to 2026-07-21):

1. 🎯 **Monitor AUTO gate frequency** (target: 75%+)
2. 🎯 **Track validation latency** (target: 60-90 sec)
3. 🎯 **Detect false consensus patterns** (Picard monitoring)
4. 🎯 **Refine veto thresholds** if needed (based on real data)

### Post-Sprint 1 (Week 2+):

1. 📊 **Retrospective**: Review auto-transition patterns
2. 📊 **Optimization**: Adjust thresholds based on data
3. 📊 **Scaling**: Extend to multi-crew workflows

---

## Signature

**All 11 Crew Members Approve:**

- ✅ **Picard** (Captain) — Narrative coherence mandate recognized
- ✅ **Data** (Architecture) — Data integrity veto confirmed  
- ✅ **Worf** (Security) — Security hard-veto acknowledged
- ✅ **Riker** (Chief PM) — Critical path veto + consensus framework adopted
- ✅ **Geordi** (Infrastructure) — Infrastructure health gates live
- ✅ **O'Brien** (Engineering) — Deployment readiness checks active
- ✅ **Yar** (QA) — Test coverage veto enforced
- ✅ **Troi** (Counselor) — Genuine consensus detection enabled
- ✅ **Crusher** (Health) — Crew wellness threshold set at 90%
- ✅ **Uhura** (Communications) — Signal integrity checks live
- ✅ **Quark** (Finance) — Budget hard-veto enabled

**Framework Status: READY FOR AUTONOMOUS EXECUTION**

---

## References

- [docs/milestone-push/story-lifecycle-3tier.md](story-lifecycle-3tier.md) — Phase definitions
- [docs/milestone-push/aha-release-lifecycle.md](aha-release-lifecycle.md) — Release-level gates
- [docs/milestone-push/approval-gates.md](approval-gates.md) — Admiral approval model
- [docs/execution/SPRINT1_EXECUTION_LAUNCHED.md](../execution/SPRINT1_EXECUTION_LAUNCHED.md) — Execution readiness
