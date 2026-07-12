# Section 31 Week 2 Alpha Plan — 100-User Simulation (Projection Only)

**Planning Status:** ALPHA INFRASTRUCTURE PROJECTION  
**Cost Attribution Mode:** DEV (projected costs, $0 actual spend)  
**Projected Start:** Mon 2026-07-14  
**Simulated Cohort:** 100 synthetic users (demo models, infrastructure testing)  
**Actual Spend:** $0 (simulation only, no real OpenRouter calls)  
**Purpose:** Project what crew autonomy looks like at 100-user scale  
**Duration:** Mon–Fri (crew-time, continuous simulation)  

---

## Executive Summary

Week 2 projects crew autonomy at **100-user scale** using simulated interactions (demo models, zero cost). This approach:
- ✅ Tests infrastructure under 10x load (100 vs Week 1's 10)
- ✅ Projects metrics at 100-user scale (opt-out %, sentiment, error rate)
- ✅ Validates cost model: "100 real users would cost $0.16–0.18/user/day"
- ✅ Stays within development budget ($0 actual spend)
- ✅ De-risks moving to 1% production canary in future weeks

**Week 2 Success Criteria (100-User Projection):**

| Criterion | Target | Method |
|-----------|--------|--------|
| Simulated cohort | 100 users | Demo model interactions |
| Actual spend | $0 | Simulation only, no real API calls |
| Projected cost/user/day | $0.16–0.18 | Extrapolate from Week 1 |
| Projected error rate | <0.15% | Model from simulation |
| Projected sentiment | >neutral | Model from simulation |
| Infrastructure stability | Zero anomalies | Load test 100x scenario |
| Projections accuracy | High confidence | Compare to Week 1 baseline |

---

## Crew Task Assignments (Week 2 Simulation)

### Worf — Governance + Simulation Audit

**Owner:** Worf  
**Capacity:** Budget enforcement; cost mode validation

**Tasks:**

1. **Cost Governance Activation (Mon)**
   - Verify `COST_ATTRIBUTION_MODE=dev` in environment
   - Confirm `COST_BUDGET_USD=0` (simulation, no actual limit needed)
   - Verify budget check middleware active (safety net to prevent accidental real spend)
   - Test: Simulate budget overrun → expect graceful handling (warn, no charge)

2. **Simulation Audit (Daily, 09:00 PT)**
   - Query cost_ledger: verify all entries have `cost_mode="dev"`
   - Check: No actual OpenRouter API charges (all demo models)
   - Verify: cost_escalation table empty (no warnings should trigger)
   - Report: Budget status (projected costs vs simulated spend) to Picard

3. **Compliance Reporting (Thu–Fri)**
   - Confirm: Simulation stayed at $0 actual spend (demo models only)
   - Verify: All cost_mode="dev" entries are projected, not real
   - Document: Infrastructure audit trail for 100-user simulation

**Aha Story:** PROD-860 (Section 31 Week 2 Simulation Governance) — assign to Worf

**Success Criteria:**
- [ ] DEV mode active, no real billing occurred
- [ ] cost_mode="dev" on all Week 2 entries
- [ ] $0 actual spend (demo models only)
- [ ] Zero accidental real API calls

---

### O'Brien — Infrastructure Load Testing (100-User Scenario)

**Owner:** O'Brien  
**Capacity:** Test infrastructure at 100-user scale

**Tasks:**

1. **Simulation Harness Setup (Mon 09:00 PT)**
   - Feature flag: `storyAgent.simulation.mode = true`
   - Scenario config: 100 synthetic users, demo model routing
   - Load profile: 50 concurrent interactions, 5-min ramp-up
   - Validate: Routing engine handles 100-user load without errors

2. **Infrastructure Load Testing (Daily)**
   - API latency baseline (Week 1 10-user scenario): p50=~5ms, p95=~15ms, p99=~50ms (local demo)
   - Week 2 100-user target:
     - p50 should stay ~5ms (no scaling needed for demo models)
     - p95 should stay ~20ms
     - p99 should stay ~100ms (linear scaling for demo)
   - Alert if any metric anomalous (indicates infrastructure bug)

3. **Rollback Readiness Drills (Tue/Thu 14:00 PT)**
   - Execute `scripts/rollback_simulation.sh` (kill 100-user scenario)
   - Target: <1 min (just stop demo model calls)
   - Measure: Verify all 100 simulated interactions cleanly halted
   - Document: Any issues with shutdown

4. **Daily Standup Report (09:00 PT)**
   - Simulation status: 100 users running? Demo models responding?
   - Latency: p50/p95/p99 vs baseline (should be flat)
   - Errors: Any infrastructure anomalies?
   - Projected cost extrapolation: "100 users = $X/day if real"

**Aha Story:** PROD-861 (Section 31 Week 2 Infrastructure Load Test) — assign to O'Brien

**Success Criteria:**
- [ ] 100-user simulation stable Mon–Fri
- [ ] Infrastructure latency within expected bounds
- [ ] Rollback drills pass <1 min
- [ ] Cost projections calculated (100 users would cost $X at scale)

---

### Troi — Simulated Metrics Projection

**Owner:** Troi  
**Capacity:** Project metrics from 100-user simulation

**Tasks:**

1. **Simulated User Interactions (Daily)**
   - Run 100 synthetic interactions through crew pipeline (demo models)
   - Capture: Error responses, latency, response quality
   - Method: Deterministic test scenarios (same interactions every day for consistency)
   - Expected outputs: Simulate 100 users' worth of crew interactions

2. **Metrics Projection (Wed)**
   - Error rate projection: If 100 real users interacted this way, error rate would be X%
   - Sentiment projection: Based on response quality, 100 users would show Y% thumbs-up
   - Cost extrapolation: 100 real users at $0.188/user/day = Z cost/week
   - Confidence: How confident are these projections vs Week 1 baseline?

3. **Synthetic Test Suite (Deployed Mon, running 24/7)**
   - 4 test scenarios (5-min frequency across 100-user simulation):
     - A: Simple code fix (cheap, fast)
     - B: Feature implementation (complex, expensive)
     - C: Security review (reasoning-heavy)
     - D: API migration (multi-step)
   - Execution: 288 runs/day simulating 100-user workload
   - Alert: Infrastructure errors (not expected for demo) → escalate
   - Dashboard: Daily synthetic test pass rate % (100% expected for demo models)

4. **Daily Standup Report (09:00 PT)**
   - Simulated cohort (100): Projected error rate, sentiment, cost
   - Synthetic test pass rate: % (should be 100% for demo)
   - Projections accuracy: Tracking Week 1 baseline, or diverging?
   - Confidence level: Ready to project 500-user scale?

**Aha Story:** PROD-862 (Section 31 Week 2 Metrics Projection) — assign to Troi

**Success Criteria:**
- [ ] 100-user simulation metrics captured daily
- [ ] Projected cost/error/sentiment calculated with confidence
- [ ] Synthetic tests running 24/7, 100% pass rate expected
- [ ] Projections consistent with Week 1 baseline

---

### Quark — Cost Model Validation (Projection)

**Owner:** Quark  
**Capacity:** Validate cost projections; confirm model accuracy

**Tasks:**

1. **Cost Model Calibration (Mon)**
   - Week 1 baseline: 10-user simulation = $0.188/user/day (projected)
   - Week 2 projection: 100-user simulation = 10× baseline = $0.188/user/day (should stay same)
   - Economies of scale check: Do demos show cost decline at 100x? (expected: 10–15% savings)
   - Model validation: Is $0.16–0.18/user/day still confident?

2. **Cost Tracking (Daily)**
   - Query cost_ledger: $0 actual spend (demo models only)
   - Verify: No simulated users charged real money
   - Projected cost calc: "If 100 real users, cost = 100 × $0.188 × 1 day = $18.80"
   - Daily report: Projected costs vs Week 1 baseline

3. **Budget Monitoring (Daily)**
   - Current actual spend: $0 (all simulated)
   - Projected Week 2 cost IF REAL: ~$940 (100 users × 5 days × $0.188)
   - No alerts needed (we're not spending real money)
   - But: Document projected vs baseline for gate assessment

4. **Cost Projection Report (Fri)**
   - Week 1 projection: 10 users = $0.188/user/day
   - Week 2 projection: 100 users = $0.16–0.18/user/day (scale efficiency)
   - Week 3 projection: 500 users = $0.15–0.17/user/day (further optimization)
   - Recommendation: Cost model validated for next scale step?

5. **Daily Standup Report (09:00 PT)**
   - Projected daily spend: If 100 users were real, cost = $X/day
   - Cost per user trend: Staying at $0.188, or improving?
   - Scale efficiency: Are economies of scale evident?
   - Confidence for Week 3: Ready to project 500-user scenario?

**Aha Story:** PROD-863 (Section 31 Week 2 Cost Model Validation) — assign to Quark

**Success Criteria:**
- [ ] Cost model validated: $0.16–0.18/user/day holds at 100-user scale
- [ ] Projections calculated (what real cost would be if deployed)
- [ ] Economies of scale measured (% savings at 100x vs 10x)
- [ ] Confidence high for Week 3 500-user projection

---

### Picard — Simulation Synthesis + Gate Assessment

**Owner:** Picard  
**Capacity:** Synthesize projections; recommend Week 3 decision

**Tasks:**

1. **Daily Synthesis (09:00 PT, Mon–Fri)**
   - Collect reports: Worf (governance), O'Brien (infrastructure), Troi (metrics), Quark (cost)
   - Aggregate projections: Error rate, sentiment, cost/user at 100-user scale
   - Status: 🟢 GREEN / 🟡 YELLOW / 🔴 RED
   - Post to #story-agent-ops: "100-user projection: Error X%, Sentiment Y%, Cost $Z/user"

2. **Projection Validation (Daily)**
   - Governance: Is DEV mode working? $0 actual spend?
   - Infrastructure: Latency stable at 100-user load?
   - Metrics: Projections tracking Week 1 baseline?
   - Cost: Are economies of scale appearing as expected?

3. **Anomaly Escalation (If issues arise)**
   - YELLOW: Projection diverging from Week 1 (e.g., sentiment dropping, error rate rising)
     - Action: Investigate simulation logic; compare to baseline
   - RED: Infrastructure instability, demo models failing, or data anomalies
     - Decision: Debug, adjust simulation, or hold for investigation

4. **Gate 2 Assessment (Fri EOD)**
   - Compile 5-day projections: 100-user scenario metrics
   - Analysis:
     - Cost projections: Do they hold at 100x scale? ($0.16–0.18/user/day confirmed?)
     - Error rate projection: Stable or improving? (<0.15%?)
     - Sentiment projection: Maintained or improved? (>neutral?)
   - Gate 2 Recommendation:
     - ✅ **GO TO WEEK 3 (500-USER PROJECTION)** — Cost model validated, ready to scale simulation
     - ⚠️ **HOLD & INVESTIGATE** — Projections diverging from baseline, need clarification
     - 🔧 **MODIFY & RETEST** — Adjust simulation model, re-run Week 2 scenario

5. **Aha Epic + Stories (Continuous)**
   - Epic: PROD-E-7 (Section 31 Week 2 Simulation Measurement)
   - Stories: Worf (860), O'Brien (861), Troi (862), Quark (863), Picard (864)
   - Daily comments: Picard logs daily synthesis reports
   - Friday: Gate 2 assessment with full projection analysis

**Aha Story:** PROD-864 (Section 31 Week 2 Gate Assessment) — assign to Picard

**Success Criteria:**
- [ ] 5-day daily syntheses complete
- [ ] Gate 2 assessment ready Friday EOD
- [ ] Clear recommendation: GO to Week 3 / HOLD / MODIFY
- [ ] Cost model confidence validated at 100-user scale

---

## Week 2 Timeline (Simulation, Dev Mode)

```
PRE-LAUNCH (Before Mon 7/14):
  Fri 7/12: Cost governance approval (you confirm simulation mode, $0 actual spend)
  Fri–Sun: Crew prep (verify demo model routing ready, infrastructure load test plan)

T+0 (Mon 7/14 09:00 PT):
  - O'Brien: Enable 100-user simulation (demo models, $0 spend)
  - Worf: Verify DEV mode, cost_governance active (safety net)
  - Quark: Cost projection tracking live (projected costs only)
  - Troi: Begin synthetic 100-user interactions
  - Picard: First daily synthesis (simulation mode) → #story-agent-ops

T+1–T+4 (Tue–Fri):
  - Daily 09:00 PT standups (Worf, O'Brien, Troi, Quark reports)
  - Picard synthesizes → posts simulation status to #story-agent-ops
  - Infrastructure load tests: 100-user scenario, latency tracking
  - Rollback drills (Tue/Thu 14:00 PT) — verify <1 min shutdown

T+5 (Fri 7/18 EOD):
  - Picard: Gate 2 assessment ready
  - 5-day analysis: 100-user simulation projections vs Week 1 baseline
  - Recommendation: GO to Week 3 (500-user simulation) OR HOLD/MODIFY
  - Crew awaits your gate decision (expected Mon 7/21)
```

---

## Success Definition (Week 2 Simulation)

**All must be true for Gate 2 GO to Week 3:**

- [ ] Simulation stable: $0 actual spend (demo models only, no real API calls)
- [ ] 100-user projections: Error rate, sentiment, cost/user calculated with confidence
- [ ] Cost model validated: $0.16–0.18/user/day projects accurately at 100-user scale
- [ ] Infrastructure stable: Latency within expected bounds, no anomalies
- [ ] Projections consistent: 100-user metrics align with Week 1 baseline (no divergence)
- [ ] DEV mode working: cost_governance preventing accidental real spend
- [ ] Synthetic tests: 288 daily scenarios running, 100% pass rate for demo models
- [ ] All 5 crew tasks complete + Aha documentation live
- [ ] Projections confidence: High for moving to 500-user scenario in Week 3

**If any criterion failed:** Recommend HOLD + investigation or MODIFY simulation parameters.

---

## Crew Readiness (Parallel Planning)

While you decide cost governance approval:

1. **Worf** — Prepare governance activation checklist (DEV mode verification)
2. **O'Brien** — Pre-test 100-user simulation scenario (demo model routing, load profile)
3. **Troi** — Draft 100-user synthetic test scenarios (4 use cases)
4. **Quark** — Finalize cost projections for 100-user scale
5. **Picard** — Prepare gate 2 assessment template (projection analysis structure)

**Crew Status:** Ready to run 100-user simulation (DEV mode) pending your cost governance approval.

---

## Next: Your Cost Governance Decision

**Required from you before Week 2 proceeds:**

```
[ ] APPROVE — Enable DEV mode simulation ($0 actual spend, projections only)
    └─ Start Week 2 Monday 2026-07-14 (100-user simulation, demo models)
    └─ Gate decision Friday 2026-07-18 (GO to Week 3 or HOLD/MODIFY)

[ ] HOLD — Investigate specific concern before enabling simulation

[ ] MODIFY — Proceed with changes (specify): [SPECIFY]
```

Reply in this thread or via Slack #story-agent-ops.

---

**Crew Status:** Week 1 COMPLETE. Week 2 Alpha PLANNING COMPLETE. AWAITING COST GOVERNANCE APPROVAL.

🖖 Picard, signing for the crew.
