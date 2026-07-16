# Crew Consensus Guardrails — Implementation Checklist

**Status: READY FOR SPRINT 1 INTEGRATION**  
**Timeline: Must complete before 2026-07-17 09:00 PST**  
**Owner: O'Brien (Engineering) + Worf (Security approval)**

---

## Pre-Launch Checklist (48 hours before execution)

### 1. Database Schema Deployment ✅

- [ ] Create `sa_phase_transition_validation` table (Supabase)
- [ ] Create `sa_phase_validation_audit` table (immutable trail)
- [ ] Add indexes on `(story_id, from_phase)` and `(validated_at)`
- [ ] Enable RLS on both tables (Worf security gate)
- [ ] Test rollback capability on schema (dry-run)

**SQL Script:** See CREW_CONSENSUS_GUARDRAILS_FRAMEWORK.md Part 3

---

### 2. TypeScript Validation Functions

#### 2.1 Core Engine
- [ ] Implement `evaluatePhaseTransition()` (consensus orchestrator)
- [ ] Wire up `Promise.all()` for parallel validation
- [ ] Implement gate logic (AUTO / YELLOW / RED)
- [ ] Add immutable audit trail storage

**File:** `packages/mcp-server/src/lib/phase-transition-consensus.ts`

#### 2.2 Per-Crew Validation Functions

- [ ] `validatePicard()` — Narrative coherence check
- [ ] `validateData()` — Schema/data integrity check
- [ ] `validateWorf()` — Security + compliance scan
- [ ] `validateRiker()` — Critical path + blockers
- [ ] `validateGeordi()` — Infrastructure health
- [ ] `validateObrien()` — CI/CD + deployment readiness
- [ ] `validateYar()` — Test coverage + quality gates
- [ ] `validateTroi()` — Team dynamics + stakeholder alignment
- [ ] `validateCrusher()` — Crew health + biometrics
- [ ] `validateUhura()` — Communication integrity
- [ ] `validateQuark()` — Budget + ROI validation

**Pattern:** Each function returns `{ pass: boolean, veto: boolean, reason: string, executionTimeMs: number }`

**Sample Implementation:**

```typescript
// Example: Quark budget validation
async function validateQuark(storyId: string): Promise<ValidationResult> {
  const story = await getStory(storyId);
  const sprintBudget = await getSprintBudget(story.sprintId);
  const projectedBurn = await projectBurn(story.sprintId);
  
  const budgetOk = projectedBurn <= sprintBudget * 1.0; // 100% threshold
  const roiOk = story.estimatedValue >= story.estimatedCost * 1.5; // 150% ROI
  
  return {
    crewMember: 'quark',
    pass: budgetOk && roiOk,
    veto: !budgetOk, // Hard veto on budget overrun
    criticality: 'hard',
    reason: budgetOk ? 'Budget OK' : `Budget exceeded: $${projectedBurn}/$${sprintBudget}`,
    executionTimeMs: 0, // Will be set by orchestrator
  };
}
```

---

### 3. Aha Integration

- [ ] Wire story status webhooks to trigger `evaluatePhaseTransition()`
- [ ] Configure allowed state transitions:
  - `STARTED` → `IN_PROGRESS` (requires YELLOW gate minimum)
  - `IN_PROGRESS` → `TESTING` (requires YELLOW gate minimum)
  - `TESTING` → `SHIPPED` (requires AUTO or YELLOW gate, no RED allowed)
- [ ] Implement rollback trigger (if validation fails post-update)

**Hook Points:**
- Aha webhook: `story.status_changed`
- Trigger: Call `evaluatePhaseTransition()` before updating Aha status
- Fallback: If validation fails, revert Aha status + notify crew

---

### 4. Real-Time Monitoring Dashboard

#### 4.1 Supabase Queries
- [ ] Query: "AUTO gate percentage (last 7 days)"
- [ ] Query: "Average validation time by crew member"
- [ ] Query: "Most common veto triggers"
- [ ] Query: "Post-transition veto detection (false consensus alarm)"

**Dashboard Route:** `/dashboard/phase-transitions`

#### 4.2 Metrics Display
- [ ] Total transitions (count)
- [ ] AUTO/YELLOW/RED split (%)
- [ ] Avg validation latency (ms)
- [ ] Crew participation rate (%)
- [ ] False consensus detection rate

---

### 5. Error Handling & Rollback

- [ ] Implement rollback logic if validation fails mid-transition
- [ ] Add retry logic (if validation timeout)
- [ ] Create fallback: manual gate if automation stalls
- [ ] Log all failures to Supabase audit trail

**Scenario Handling:**
- Validation timeout >2 min → escalate to YELLOW gate
- Conflicting vetos (multiple crew) → escalate to RED gate
- Post-transition veto detected → trigger auto-rollback

---

### 6. Testing & Dry-Run

#### 6.1 Unit Tests
- [ ] Test each validation function independently
- [ ] Test consensus calculation (edge cases: exactly 70%, >70%)
- [ ] Test veto logic (one veto, multiple vetos, critical vs. soft)
- [ ] Test gate logic (AUTO / YELLOW / RED triggering)

#### 6.2 Integration Tests
- [ ] Test full `evaluatePhaseTransition()` with mock story
- [ ] Test parallel execution (all validations run simultaneously)
- [ ] Test Aha webhook integration
- [ ] Test immutable audit trail storage

#### 6.3 Dry-Run (Non-Destructive)
- [ ] Run full validation suite on existing SHIPPED stories (no transitions)
- [ ] Verify consensus results match historical approvals
- [ ] Measure validation latency with real data
- [ ] Check false positive rate

---

### 7. Security Review (Worf Gate)

- [ ] Audit: All veto logic cannot be bypassed by consensus override
- [ ] Audit: Immutable audit trail (cannot be modified after creation)
- [ ] Audit: RLS policies prevent unauthorized crew members from viewing results
- [ ] Audit: Hard vetoes are truly non-negotiable (no edge cases)

**Worf Approval Required:** Before 2026-07-17 08:00 PST

---

### 8. Documentation & Training

- [ ] Update crew knowledge base with consensus gate behavior
- [ ] Create runbook: "What to do if validation fails"
- [ ] Create runbook: "How to interpret AUTO/YELLOW/RED outcomes"
- [ ] Brief Riker on YELLOW gate decision process
- [ ] Brief Admiral on RED gate requirements

---

## Week 1 Monitoring (2026-07-17 to 2026-07-21)

### Daily Metrics to Track

- [ ] AUTO gate usage (target: ≥75%)
- [ ] YELLOW gate escalations (target: <20%)
- [ ] RED gate escalations (target: <5%)
- [ ] Avg validation time (target: 60-90 sec)
- [ ] Zero post-transition vetos (early warning signal)

### Crew Feedback Loops

- [ ] Daily standup: Riker reports gate statistics
- [ ] Mid-week: Picard assesses if false consensus is being detected
- [ ] End-of-week: Quark reports cost gate violations (if any)
- [ ] Post-sprint: Comprehensive retrospective on guardrails effectiveness

---

## Implementation Prioritization

### Phase 1 (CRITICAL — must complete by 2026-07-17 09:00 PST)

1. **Database schema** (4 hours)
2. **Core orchestrator** `evaluatePhaseTransition()` (4 hours)
3. **Critical path validations:** Worf, Riker, Data (6 hours)
4. **Aha webhook integration** (3 hours)
5. **Dry-run testing** (2 hours)

**Total: ~19 hours (can parallelize O'Brien + Yar)**

### Phase 2 (IMPORTANT — complete by end of Week 1)

1. Remaining crew validation functions (Geordi, O'Brien, Uhura, Quark, Crusher, Troi)
2. Real-time dashboard
3. Monitoring alerts

### Phase 3 (OPTIMIZATION — post-Sprint 1)

1. Machine learning: Learn optimal thresholds from real data
2. Scaling: Multi-release consensus validation
3. Advanced rollback: Predictive rollback based on anomaly detection

---

## Handoff & Approval

| Role | Sign-Off | Status |
|---|---|---|
| **O'Brien (Engineering)** | Implementation complete | 🔄 IN PROGRESS |
| **Worf (Security)** | Security audit passed | ⏳ PENDING |
| **Yar (QA)** | Test coverage meets threshold | ⏳ PENDING |
| **Riker (Chief PM)** | YELLOW gate behavior trained | ⏳ PENDING |
| **Picard (Captain)** | Framework aligns with narrative | ✅ APPROVED |

---

## Timeline

| Date | Milestone | Owner |
|---|---|---|
| 2026-07-16 (TODAY) | Database schema + core engine ready | O'Brien |
| 2026-07-16 EOD | Critical validations (Worf, Riker, Data) | O'Brien + crew |
| 2026-07-16 23:00 | Dry-run complete + results validated | Yar |
| 2026-07-17 08:00 | Worf security sign-off | Worf |
| 2026-07-17 08:30 | Crew briefing on gate behavior | Riker |
| 2026-07-17 09:00 | **LAUNCH** (AUTO gate LIVE) | All crew |

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|---|---|---|
| Validation latency >2 min | Implement timeout + escalate to YELLOW | O'Brien |
| False positive vetos | Manual review + threshold adjustment | Worf |
| Post-transition veto | Auto-rollback + investigation | O'Brien |
| Crew misunderstands gates | Training + runbook + daily standup check | Riker |
| Database schema fails | Rollback plan + dry-run validation | O'Brien |

---

## Success Criteria

### Must Achieve by End of Week 1:
- ✅ AUTO gate activates successfully (≥75% of transitions)
- ✅ ZERO post-transition vetos (no missed blockers)
- ✅ Validation latency <90 seconds consistently
- ✅ All crew reports confidence in gate logic
- ✅ Crew satisfaction >85% (Troi monitoring)

### Red Flags (Abort if Detected):
- 🚨 AUTO gate rate <50% (indicates over-conservative thresholds)
- 🚨 Post-transition veto detected (indicates false consensus)
- 🚨 Validation latency >120 seconds (indicates performance issue)
- 🚨 >10% of crew report confusion about gates (indicates training gap)

---

## Contact & Escalation

- **O'Brien:** Implementation & performance
- **Worf:** Security & veto logic
- **Riker:** YELLOW gate decisions & crew coordination
- **Picard:** Narrative coherence & escalation authority
- **Admiral:** RED gate approval & policy overrides
