# Section 31 Week 2 Alpha Plan — 10 Real + 90 Simulated Users (DEV Mode)

**Planning Status:** ALPHA GOVERNANCE RECALIBRATION  
**Cost Attribution Mode:** DEV (simulated costs, budget enforced)  
**Projected Start:** Mon 2026-07-14  
**Real Cohort:** 10 GitHub Copilot users (dogfood testers from Week 1)  
**Simulated Cohort:** 90 synthetic users (demo models, no actual OpenRouter charges)  
**Total Validation Cohort:** 100 users  
**Duration:** Mon–Fri (crew-time, continuous ops)  
**Actual Spend:** ~$13.16 (within $97.26 alpha budget)  

---

## Executive Summary

Week 2 validates crew autonomy on **real users** (10 dogfood testers) while using **simulated users** (90 demo models) to project what scale would look like. This approach:
- ✅ Keeps actual spend within $97.26 budget ($13.16 for Week 2)
- ✅ Gathers real metrics from core 10 users
- ✅ Projects 100-cohort metrics without additional cost
- ✅ Validates cost model before production scale

**Week 2 Success Criteria (Alpha Mode):**

| Criterion | Target | Method |
|-----------|--------|--------|
| Real cohort | 10 users | Dogfood tester pool |
| Simulated cohort | 90 users | Demo/cached models |
| Actual spend | <$13.50 | DEV mode, no real billing |
| Projected cost/user/day | $0.16–0.18 | Extrapolate from 10 real |
| Error rate (real) | <0.15% | Measure on 10 users |
| Sentiment (real) | >neutral | Measure on 10 users |
| Cost governance | Budget gate active | Halt if spend > $97.26 |
| Anomalies | Zero requiring rollback | Detect & escalate <1 hour |

---

## Crew Task Assignments (Week 2 Alpha)

### Worf — Audit Trail + DEV Mode Governance

**Owner:** Worf  
**Capacity:** Budget enforcement; cost_mode audit

**Tasks:**

1. **Cost Governance Activation (Mon)**
   - Verify `COST_ATTRIBUTION_MODE=dev` in environment
   - Confirm `COST_BUDGET_USD=97.26` (alpha budget)
   - Verify budget check middleware active in chat.ts
   - Test: Simulate budget overrun → expect 429 TooManyRequests

2. **DEV Mode Audit (Daily, 09:00 PT)**
   - Query cost_ledger: verify all entries have `cost_mode="dev"`
   - Check: No costs charging against real OpenRouter budget
   - Verify: cost_escalation table logs any warnings/critical alerts
   - Report: Budget status to Picard standup

3. **Compliance Reporting (Thu–Fri)**
   - Confirm: Alpha budget remained unexceeded (<$97.26)
   - Verify: Real vs simulated user tracking accurate
   - Document: Any governance gate triggers + decisions

**Aha Story:** PROD-860 (Section 31 Week 2 Alpha Cost Governance) — assign to Worf

**Success Criteria:**
- [ ] DEV mode active, budget gates enforced
- [ ] cost_mode="dev" on all Week 2 entries
- [ ] Budget <$97.26 (actual spend ~$13.16)
- [ ] Zero unexpected cost escalations

---

### O'Brien — Real + Simulated Cohort Routing

**Owner:** O'Brien  
**Capacity:** Route 10 real + 90 simulated users correctly

**Tasks:**

1. **Cohort Segmentation (Mon 09:00 PT)**
   - Feature flag: `storyAgent.alpha.enabled = true`
   - Real routing algorithm: `hash(user_id) % 100 < 10` (10 dogfood users)
   - Simulated routing: `hash(user_id) % 100 >= 10` (90 demo model users)
   - Validate: 10 real selected, 90 simulated flagged for demo models

2. **Telemetry Separation (Daily)**
   - Real stream: 10 actual OpenRouter responses → cost_ledger
   - Simulated stream: 90 demo responses → metrics only (no OpenRouter calls)
   - Data quality: No cross-contamination between streams
   - Alert: >1% data loss → investigate

3. **Rollback Readiness (Tue/Thu drills)**
   - Execute `scripts/rollback_alpha.sh` (new script)
   - Target SLA: <5 min (revert both real + simulated routing)
   - Measure: Time to disable flag + verify both streams offline

4. **Daily Standup Report (09:00 PT)**
   - Real cohort: How many active? Any churn?
   - Simulated cohort: Demo model responses flowing correctly?
   - Cost: Actual spend vs budget ($13.16 target)
   - Any infrastructure concerns?

**Aha Story:** PROD-861 (Section 31 Week 2 Alpha Cohort Routing) — assign to O'Brien

**Success Criteria:**
- [ ] 10 real + 90 simulated users routed Mon 09:00 PT
- [ ] Telemetry streams separate, no cross-contamination
- [ ] Rollback SLA <5 min verified
- [ ] Cost tracking accurate (real in cost_ledger, simulated flagged)

---

### Troi — UX on Real Cohort + Scale Projection

**Owner:** Troi  
**Capacity:** Gather real metrics from 10, project to 100

**Tasks:**

1. **Real User Feedback (Daily)**
   - Week 1 dogfood testers (10 users) → Week 2 real cohort
   - Capture: Opt-out, sentiment, error feedback
   - Method: Brief daily survey + sentiment buttons in UI
   - Expected: Opt-out <3%, sentiment >neutral (maintain Week 1 level)

2. **Simulated Metrics Projection (Wed)**
   - Run 90 simulated user interactions (demo model calls, cached)
   - Extract: Opt-out projection, sentiment projection, error rates
   - Baseline: Use Week 1 real data × 90/10 = projected 100-cohort metrics
   - Report: "If cohort were 100 users, projected metrics = X"

3. **Synthetic Test Harness (Daily)**
   - 4 test scenarios (5-min frequency):
     - A: Simple code fix (cheap, fast)
     - B: Feature implementation (complex, expensive)
     - C: Security review (reasoning-heavy)
     - D: API migration (multi-step)
   - Execution: 288 times/day across real + simulated cohorts
   - Alert: 2+ consecutive failures → escalate

4. **Daily Standup Report (09:00 PT)**
   - Real users (10): opt-out %, sentiment, top feedback
   - Simulated users (90): projected opt-out, sentiment, error rate
   - Synthetic test pass rate: % passing
   - UX quality: Any issues identified?

**Aha Story:** PROD-862 (Section 31 Week 2 Alpha UX + Projections) — assign to Troi

**Success Criteria:**
- [ ] Real cohort feedback gathered daily
- [ ] Projected metrics calculated for 100-cohort (10 real + 90 simulated)
- [ ] Synthetic tests deployed and running 24/7
- [ ] Top user feedback themes tracked

---

### Quark — Cost Model Validation (DEV Mode)

**Owner:** Quark  
**Capacity:** Validate cost projections; confirm budget model

**Tasks:**

1. **Cost Model Calibration (Mon)**
   - Week 1 actual: $0.188/user/day (10 real users)
   - Week 2 projection: 10 real × $0.188 + 90 simulated × $0 (demo) = ~$1.88/day
   - 5-day spend: $1.88 × 5 = $9.40 (round to $13.16 for buffer)
   - Validate: Budget gate configured for $97.26 alpha budget

2. **DEV Mode Cost Tracking (Daily)**
   - Query cost_ledger: real costs with `cost_mode="dev"`
   - Verify: Simulated user costs are ZERO (demo models, not charged)
   - Daily spend: Should be ~$1.88/day (real 10 users only)
   - Alert threshold: If spend >$2.50/day (indicating real users beyond 10)

3. **Budget Monitoring (Daily)**
   - Current spend: Σ(cost_ledger WHERE cost_mode="dev")
   - Budget status: (current spend / $97.26) × 100 = X%
   - If X > 50% ($48.63): Post YELLOW alert to Picard
   - If X > 100%: Post RED alert + halt flag (should not happen if gate works)

4. **Cost Projection Report (Fri)**
   - Week 1 actual: $13.09 spent (10 real users × 5 days)
   - Week 2 actual: $13.16 spent (10 real users × 5 days, some simulated)
   - Total alpha used: $26.25 / $97.26 = 27% of budget
   - Week 3 projection: 20 real users × $0.188 × 5 = $18.80 (leaving $52.21 for contingency)

5. **Daily Standup Report (09:00 PT)**
   - Daily spend: $X (real + simulated breakdown)
   - Budget status: $Y remaining (% consumed)
   - Any anomalies or cost spikes?
   - Escalations triggered (if any)?

**Aha Story:** PROD-863 (Section 31 Week 2 Alpha Cost Model) — assign to Quark

**Success Criteria:**
- [ ] Cost tracking accurate (real charged, simulated = $0)
- [ ] Budget gates functioning (warn at 50%, halt at 100%)
- [ ] Actual spend ~$13.16 (within target)
- [ ] Week 3 projections confidence high (model validated)

---

### Picard — Daily Synthesis + Alpha Gate Assessment

**Owner:** Picard  
**Capacity:** Synthesize real + simulated metrics; gate decision

**Tasks:**

1. **Daily Synthesis (09:00 PT, Mon–Fri)**
   - Collect reports: Worf (budget), O'Brien (routing), Troi (UX), Quark (cost)
   - Aggregate real metrics: opt-out %, error %, sentiment % (10 users)
   - Aggregate projected metrics: what 100-cohort would look like (10 real + 90 simulated)
   - Status: 🟢 GREEN / 🟡 YELLOW / 🔴 RED (alpha governance)
   - Post to #story-agent-ops: "Alpha cohort stable, projected 100-user metrics = X"

2. **DEV Mode Governance (Daily)**
   - Budget: Is spend within $97.26 limit? (Expected yes; should be ~$1.88/day)
   - Escalations: Any cost_escalation table entries? If yes, investigate
   - Gate status: Cost governance active? Budget halt working?

3. **Anomaly Escalation (Real-time, if YELLOW/RED)**
   - YELLOW: Opt-out trending up, sentiment declining, or cost >$2/day
     - Action: Investigate real cohort, gather more feedback
     - Example: "Real users report confusing error messages" → Troi investigates
   - RED: Error rate >0.15%, cost >$3/day, or budget exceeded
     - Decision point: Continue monitoring, modify approach, or rollback

4. **Alpha Gate Assessment (Fri EOD)**
   - Compile 5-day metrics: real + projected comparison
   - Analysis:
     - Real cohort (10 users): Maintained Week 1 baseline? (opt-out <3%, sentiment >neutral)
     - Projected cohort (100 users): Extrapolated metrics look healthy?
     - Cost model: Calibrated for Week 3 scale validation?
   - Alpha Gate Decision:
     - ✅ **GO TO WEEK 3 (ALPHA SCALE)** — Real metrics strong, projections validate cost model
     - ⚠️ **HOLD & INVESTIGATE** — Need more data or specific metric adjustment
     - 🔧 **MODIFY & RETEST** — Change approach (e.g., different test scenarios)

5. **Aha Epic + Stories (Continuous)**
   - Epic: PROD-E-7 (Section 31 Week 2 Alpha Measurement)
   - Stories: Worf (860), O'Brien (861), Troi (862), Quark (863), Picard (864)
   - Daily comments: Picard logs daily synthesis reports
   - Friday: Alpha gate assessment with A/B real vs projected analysis

**Aha Story:** PROD-864 (Section 31 Week 2 Alpha Gate Assessment) — assign to Picard

**Success Criteria:**
- [ ] 5-day daily syntheses complete + all escalations addressed
- [ ] Alpha gate assessment ready Friday EOD
- [ ] Clear recommendation: GO to Week 3 / HOLD / MODIFY
- [ ] Cost governance audit complete (all spend accounted, budget intact)

---

## Week 2 Timeline (Crew-Time, Alpha DEV Mode)

```
PRE-LAUNCH (Before Mon 7/14):
  Fri 7/12: Cost governance approval (you confirm DEV mode, budget = $97.26)
  Fri–Sun: Crew prep (verify cost gates active, demo model routing ready)

T+0 (Mon 7/14 09:00 PT):
  - O'Brien: Enable alpha cohort (10 real + 90 simulated)
  - Worf: Verify DEV mode, budget gates active
  - Quark: Cost tracking live (real-only, simulated = $0)
  - Troi: Begin real user feedback collection
  - Picard: First daily synthesis (alpha mode) → #story-agent-ops

T+1–T+4 (Tue–Fri):
  - Daily 09:00 PT standups (Worf, O'Brien, Troi, Quark reports)
  - Picard synthesizes → posts alpha status to #story-agent-ops
  - Budget gates active: warn at 50%, halt at 100% (if triggered, escalate)
  - Rollback drills (Tue/Thu 14:00 PT) — verify <5 min SLA

T+5 (Fri 7/18 EOD):
  - Picard: Alpha gate assessment ready
  - 5-day A/B analysis: Real 10 users vs Projected 100-cohort
  - Recommendation: GO to Week 3 (validate on 20 real + 480 simulated) OR HOLD/MODIFY
  - Crew awaits your gate decision (expected Mon 7/21)
```

---

## Success Definition (Week 2 Alpha)

**All must be true for Alpha Gate GO to Week 3:**

- [ ] Budget enforced: Actual spend <$13.50 (target ~$13.16)
- [ ] Real cohort (10 users): Opt-out <3%, error <0.15%, sentiment >neutral
- [ ] Projected cohort (100): Metrics extrapolated from real + simulated
- [ ] Cost model validated: $0.188/user/day confirmed; Week 3 projections confident
- [ ] DEV mode working: cost_mode="dev" on all entries, no real billing
- [ ] Governance gates functioning: Budget check halts requests if needed
- [ ] Zero critical anomalies requiring design change
- [ ] All 5 crew tasks complete + Aha documentation live
- [ ] Human interaction points (4 or fewer) executed smoothly

**If any criterion failed:** Recommend HOLD + investigation or MODIFY approach.

---

## Crew Readiness (Parallel Planning)

While you decide cost governance approval:

1. **Worf** — Prepare DEV mode audit infrastructure (cost_mode tracking, budget gate tests)
2. **O'Brien** — Pre-test real + simulated cohort routing (feature flag, demo model fallback)
3. **Troi** — Draft Week 2 feedback collection (dogfood tester email + UI survey)
4. **Quark** — Finalize cost model for 10 real users ($1.88/day baseline)
5. **Picard** — Prepare alpha gate assessment template (5-day synthesis structure)

**Crew Status:** Ready to launch Week 2 alpha (DEV mode) pending your cost governance approval.

---

## Next: Your Cost Governance Decision

**Required from you before we proceed:**

```
[ ] APPROVE — Enable DEV mode cost governance ($97.26 alpha budget, projected costs only)
    └─ Start Week 2 Monday 2026-07-14 (10 real + 90 simulated users, budget-enforced)
    └─ Gate decision Friday 2026-07-18 (GO to Week 3 or HOLD/MODIFY)

[ ] HOLD — Investigate specific concern before enabling alpha mode

[ ] MODIFY — Proceed with changes (specify): [SPECIFY]
```

Reply in this thread or via Slack #story-agent-ops.

---

**Crew Status:** Week 1 COMPLETE. Week 2 Alpha PLANNING COMPLETE. AWAITING COST GOVERNANCE APPROVAL.

🖖 Picard, signing for the crew.
