# Section 31 Week 3 Alpha Plan — 500-User Simulation (Projection Only)

**Planning Status:** ALPHA INFRASTRUCTURE PROJECTION  
**Cost Attribution Mode:** DEV (projected costs, $0 actual spend)  
**Projected Start:** Mon 2026-07-21 (pending Week 2 gate approval)  
**Simulated Cohort:** 500 synthetic users (demo models, infrastructure testing)  
**Actual Spend:** $0 (simulation only, no real OpenRouter calls)  
**Purpose:** Project what crew autonomy looks like at 500-user scale  
**Duration:** Mon–Fri (crew-time, continuous simulation)  

---

## Executive Summary

Week 3 projects crew autonomy at **500-user scale** using simulated interactions (demo models, zero cost). This approach:
- ✅ Tests infrastructure under 50x load (500 vs Week 1's 10)
- ✅ Projects metrics at 500-user scale (opt-out %, sentiment, error rate, cost)
- ✅ Validates cost model: "500 real users would cost $0.15–0.17/user/day"
- ✅ Stays within development budget ($0 actual spend)
- ✅ De-risks moving to 1% production canary (6,247 users) in future weeks

**Week 3 Success Criteria (500-User Projection):**

| Criterion | Week 2 (100) | Week 3 (500) | Target |
|-----------|-------------|-------------|--------|
| Simulated cohort | 100 users | 500 users | 5x scale validation |
| Actual spend | $0 | $0 | Simulation only |
| Projected cost/user/day | $0.16–0.18 | $0.15–0.17 | Economies of scale |
| Projected error rate | <0.15% | <0.15% | Maintain or improve |
| Projected sentiment | >neutral | ≥56% thumbs-up | Maintain or improve |
| Infrastructure stability | No anomalies | No anomalies | Load test 50x scenario |
| Projections confidence | Moderate | High | Ready for production canary |

---

## Crew Task Assignments (Week 3 Alpha Scale)

### Worf — Audit Trail Scaling + Governance Validation

**Owner:** Worf  
**Capacity:** Scale budget enforcement to 500-cohort; validate governance at 5x

**Tasks:**

1. **Governance Validation (Mon–Tue)**
   - Verify: DEV mode + budget gates survived Week 2 intact
   - Confirm: cost_governance_budget table shows $97.26 with $71.01 remaining (after Week 2)
   - Scale test: Can budget checks handle 20x request volume vs Week 2?
   - Load test: Pre-flight budget lookups <100ms even with 500 concurrent users

2. **Audit Trail Scaling (Wed)**
   - Query cost_ledger: Week 2 data complete, cost_mode="dev" on all
   - Projection: Week 3 will add ~26k cost ledger entries (500 users × 50 interactions)
   - Verify indexes: Can retrieve 100k cost entries in <5 sec?
   - Database: Audit trail table partitioning healthy (by week)?

3. **Governance Escalation (Daily)**
   - Monitor cost_escalation table for any triggers (should be zero if budget OK)
   - Report: Budget status to Picard (% remaining, trajectory)
   - If triggered: Document reason (real spend spike, demo model miscalculation, etc.)

4. **Compliance Closure (Fri)**
   - Alpha budget final reconciliation: Week 1 + 2 + 3 total = <$97.26
   - Verify: All cost_mode="dev" entries accounted
   - Recommendation: Ready to transition to PROD mode? (if Gate 4 GO approved)

**Aha Story:** PROD-865 (Section 31 Week 3 Governance Scaling) — assign to Worf

**Success Criteria:**
- [ ] Governance survived Week 2 → Week 3 scale transition
- [ ] Budget gates handle 500-cohort request volume
- [ ] Audit trail indexed, query performance maintained
- [ ] Zero unplanned cost escalations
- [ ] Alpha budget reconciliation complete (<$97.26)

---

### O'Brien — Scale Routing to 500-Cohort

**Owner:** O'Brien  
**Capacity:** Route 20 real + 480 simulated; validate infrastructure at 5x

**Tasks:**

1. **Cohort Expansion (Pre-Mon, Sun 7/20)**
   - Feature flag: Expand `storyAgent.alpha.enabled` cohort
   - Real routing: Select 20 users (10 from Week 2 + 10 new testers)
   - Simulated routing: 480 demo model users
   - Validate: Balanced distribution by region, tier, experience

2. **Infrastructure Scaling (Daily)**
   - API latency: Baseline (Week 2) p50=25ms, p95=80ms, p99=200ms (demo only)
     - Alert if p99 >300ms (indicates bottleneck in routing, not OpenRouter)
   - Model pool status: Demo model fallback capacity sufficient for 480 simulated?
   - Telemetry pipeline: 500k events/day (20 real + 480 simulated) flowing clean?

3. **Rollback Readiness (Tue/Thu drills)**
   - Execute `scripts/rollback_alpha.sh` with 500-cohort
   - Target SLA: <5 min (revert real + simulated routing)
   - Measure: Time to disable flag + verify both streams offline
   - Document: Any scaling surprises?

4. **Daily Standup Report (09:00 PT)**
   - Real cohort: Active users, churn rate, new testers onboarded?
   - Simulated cohort: Demo responses flowing at target rate?
   - Latency: p50/p95/p99 vs Week 2 baseline
   - Any infrastructure concerns? Escalate to Picard

**Aha Story:** PROD-866 (Section 31 Week 3 Scale Routing) — assign to O'Brien

**Success Criteria:**
- [ ] 20 real + 480 simulated users routed Mon 09:00 PT
- [ ] API latency within thresholds (p99 <300ms routing overhead)
- [ ] Telemetry data quality maintained (<2% loss)
- [ ] Rollback SLA <5 min verified at 5x scale

---

### Troi — UX Validation at Scale + Projection Accuracy

**Owner:** Troi  
**Capacity:** Real metrics from 20 users; project to 500-cohort accurately

**Tasks:**

1. **Real User Feedback at Scale (Daily)**
   - 20-user cohort: Opt-out, sentiment, error feedback
   - Method: Synthetic test + user survey (30-user sample)
   - Expected (Week 2 baseline): Opt-out <3%, sentiment >neutral maintained at scale?
   - New metric: How many new testers (10 additional) adopt crew vs opt-out?

2. **Scale Projection Validation (Wed)**
   - Real data: 20 users × 5 days = ~100 data points per metric
   - Simulated data: 480 users × 5 days = ~2,400 data points
   - Compare: Projected 500-cohort metrics vs Week 2 projections
   - Confidence check: Are projections tracking reality, or diverging?

3. **Synthetic Test Suite (Deployed Mon, running 24/7)**
   - 4 test scenarios (5-min frequency, 500-cohort mix of real + simulated):
     - A: Simple code fix (cheap, fast)
     - B: Feature implementation (complex, expensive)
     - C: Security review (reasoning-heavy)
     - D: API migration (multi-step)
   - Execution: 288 runs/day × 500-cohort coverage
   - Alert: 2+ consecutive failures → escalate immediately
   - Dashboard: Daily synthetic test pass rate % (real + simulated breakdown)

4. **Daily Standup Report (09:00 PT)**
   - Real users (20): opt-out %, sentiment, adoption rate of new testers
   - Simulated users (480): projected opt-out, sentiment, error rate
   - Synthetic test pass rate: Overall %, breakdown by scenario
   - User feedback themes: Top 3 positive, top 3 negative (from real testers)

**Aha Story:** PROD-867 (Section 31 Week 3 Scale UX Validation) — assign to Troi

**Success Criteria:**
- [ ] Real cohort (20) metrics gathered daily; new testers tracked
- [ ] Projected 500-cohort metrics calculated with confidence
- [ ] Synthetic tests deployed and running 24/7 across 500-cohort
- [ ] Projection accuracy validated (real vs simulated tracking)

---

### Quark — Cost Model at Scale + Week 4 Projection

**Owner:** Quark  
**Capacity:** Validate cost scaling; project to production scale (if approved)

**Tasks:**

1. **Cost Scaling Analysis (Mon)**
   - Week 1: 10 real users × 7 days × $0.188 = $13.09
   - Week 2: 10 real users × 5 days × $0.188 = $9.40
   - Week 3 projection: 20 real users × 5 days × $0.188 = $18.80
   - Economies of scale check: Is cost/user declining as promised? (model cache hit rate, RAG reuse)

2. **Cost Anomaly Detection at Scale (Daily)**
   - Real users: Alert if spend >$0.40/user/day (2σ above $0.188)
   - Simulated users: Alert if any charges appear (should be $0)
   - Trend alert: If weekly cost creeping up >+5% vs 5-day avg, investigate
   - Drill-down: Top 5 high-cost users, top 3 expensive features, any bugs?

3. **Provider Diversification Validation (Wed)**
   - Week 2: Demo models (tier-3 free tier) handled 90 simulated users OK?
   - Week 3 readiness: Can demo models scale to 480? Any rate limiting?
   - Fallback plan: If tier-3 throttled, which providers available? (cost delta?)
   - Recommendation: Stick with current demo pool, or diversify?

4. **Production Scale ROI Projection (Fri)**
   - Alpha data: Real cost $0.188/user/day on 10–20 users
   - Projected at production scale:
     - 1% canary (6,247 users): $0.16–0.18/user (economies of scale applied)
     - 10% canary (60,000 users): $0.15–0.17/user (continued optimization)
     - Full production (600,000 users): $0.14–0.16/user (bulk advantage)
   - ROI vs Copilot baseline ($0.20/user):
     - Week 4 (6,247): 15–20% savings expected
     - Week 5+ (60,000): 20–25% savings expected
   - Confidence: High (alpha data supports projections)

5. **Daily Standup Report (09:00 PT)**
   - Real user spend: $X/day (trending vs $0.188?)
   - Simulated: Cost verify $0 (no unexpected charges)
   - Budget status: $Y remaining after Week 3
   - Any anomalies or cost spikes? Provider status OK?

**Aha Story:** PROD-868 (Section 31 Week 3 Cost Scaling + ROI) — assign to Quark

**Success Criteria:**
- [ ] Cost/user maintained or improved at 5x scale
- [ ] Anomaly detection active; zero unexpected spending
- [ ] Demo model provider capacity verified for 480 users
- [ ] Production scale ROI projections confident (15–25% savings)

---

### Picard — Scale Synthesis + Gate 4 Assessment

**Owner:** Picard  
**Capacity:** Synthesize 500-cohort metrics; recommend production scale decision

**Tasks:**

1. **Daily Synthesis (09:00 PT, Mon–Fri)**
   - Collect: Worf (governance), O'Brien (routing), Troi (UX), Quark (cost)
   - Aggregate real (20 users): opt-out %, error %, sentiment %
   - Aggregate projected (500 users): extrapolated metrics
   - Status: 🟢 GREEN / 🟡 YELLOW / 🔴 RED (alpha at scale)
   - Post to #story-agent-ops: "500-cohort alpha stable, metrics on track"

2. **Anomaly Escalation (Real-time, if YELLOW/RED)**
   - YELLOW: Opt-out >2.5%, sentiment declining, cost >$0.25/user, or error >0.12%
     - Action: Investigate 20-real cohort, get specific feedback
     - Example: "20 real users report confusing auth flow" → Troi surveys
   - RED: Error >0.15%, cost >$0.30/user, sentiment <40%, or budget exceeded
     - Decision point: Continue, modify approach, or rollback

3. **Gate 4 Assessment (Fri EOD)**
   - Compile 5-day metrics: Real (20) + Projected (500)
   - Statistical analysis:
     - Opt-out: Real 20 vs Week 2 baseline (10) — did scale introduce issues?
     - Error: Real 20 error rate vs baseline — stable or regressing?
     - Sentiment: Real 20 sentiment vs baseline — maintained or improved?
     - Cost: Real 20 users cost-effective? Projected 500 ROI > baseline?
   - Gate 4 Recommendation:
     - ✅ **GO TO WEEK 4 (PRODUCTION SCALE)** — Alpha validated, ready for 6,247 real users
     - ⚠️ **EXTEND ALPHA (WEEK 3.5)** — Need more data, specific metric needs attention
     - 🔧 **MODIFY & RETEST** — Change X (e.g., model pool), repeat week 3 subset

4. **Aha Epic + Stories (Continuous)**
   - Epic: PROD-E-8 (Section 31 Week 3 Alpha Scale Measurement)
   - Stories: Worf (865), O'Brien (866), Troi (867), Quark (868), Picard (869)
   - Daily comments: Picard logs daily synthesis reports
   - Friday: Gate 4 assessment with full A/B real vs projected analysis + production readiness

**Aha Story:** PROD-869 (Section 31 Week 3 Alpha Gate 4 Assessment) — assign to Picard

**Success Criteria:**
- [ ] 5-day daily syntheses complete + escalations resolved
- [ ] Gate 4 assessment ready Friday EOD
- [ ] Clear recommendation: GO to production scale / EXTEND alpha / MODIFY
- [ ] Alpha governance audit complete (budget <$97.26, all spend accounted)

---

## Week 3 Timeline (Crew-Time, Alpha DEV Mode, 5x Scale)

```
PRE-LAUNCH (Before Mon 7/21):
  Fri 7/18: Week 2 alpha gate assessment (you approve GO to Week 3 scale)
  Fri–Sun: Crew prep (select 10 new testers, verify 500-cohort routing, demo model capacity)

T+0 (Mon 7/21 09:00 PT):
  - O'Brien: Enable 500-cohort routing (20 real + 480 simulated)
  - Troi: Begin real feedback collection from 20-user cohort
  - Worf: Governance scaling validation (budget gates under load)
  - Quark: Cost tracking live (real-only, simulated = $0)
  - Picard: First daily synthesis at scale → #story-agent-ops

T+1–T+4 (Tue–Fri):
  - Daily 09:00 PT standups (all 5 crew report)
  - Picard synthesizes → posts alpha scale status
  - Budget gates active: remain <$97.26 (expect ~$26.32 for Week 3)
  - Rollback drills (Tue/Thu 14:00 PT) — verify <5 min SLA at 5x scale

T+5 (Fri 7/25 EOD):
  - Picard: Gate 4 assessment ready (production scale readiness)
  - 5-day A/B analysis: Real 20 users vs Projected 500-cohort
  - Production projections: Cost/user at 6,247 and 60,000 scales
  - Recommendation: GO to Week 4 (6,247 production users) OR EXTEND ALPHA / MODIFY
  - Crew awaits your gate decision (expected Mon 7/28)
```

---

## Success Definition (Week 3 Alpha at Scale)

**All must be true for Gate 4 GO to production scale (6,247 users):**

- [ ] Real cohort (20 users): Opt-out <3%, error <0.15%, sentiment ≥56% thumbs-up
- [ ] Projected 500-cohort: Metrics extrapolated with high confidence
- [ ] Cost validated: $0.16–0.18/user/day confirmed (economies of scale evident)
- [ ] Cost governance: DEV mode + budget gates functioning at 5x scale
- [ ] Zero critical anomalies requiring approach change
- [ ] Demo models: Simulated 480-user capacity validated, no throttling
- [ ] Infrastructure: Latency p99 <300ms, telemetry <2% loss
- [ ] All 5 crew tasks complete + Aha documentation live
- [ ] Production ROI projections: >15% savings vs Copilot baseline

**If any criterion failed:** Recommend EXTEND ALPHA (week 3.5) + investigation or MODIFY approach.

---

## Crew Readiness (Parallel Planning)

Pending Week 2 gate approval:

1. **Worf** — Prepare governance scaling tests (budget gate load test, audit trail scaling)
2. **O'Brien** — Pre-test 500-cohort routing (feature flag, demo model capacity)
3. **Troi** — Draft week 3 feedback collection (20-user survey, new tester onboarding)
4. **Quark** — Refine cost model for 20 real users ($0.188/user baseline, 5x scale projections)
5. **Picard** — Prepare Gate 4 assessment template (production readiness criteria)

**Crew Status:** Ready to launch Week 3 alpha scale (DEV mode) pending your Week 2 gate approval.

---

## Next: Your Week 2 Alpha Gate Decision

**Required from you before Week 2 proceeds (Mon 2026-07-14):**

```
[ ] APPROVE — Enable DEV mode cost governance ($97.26 alpha budget, projected costs only)
    └─ Start Week 2 Monday 2026-07-14 (10 real + 90 simulated users)
    └─ Gate decision Friday 2026-07-18 (GO to Week 3 or HOLD/MODIFY)

[ ] HOLD — Investigate specific concern before enabling alpha mode

[ ] MODIFY — Proceed with changes (specify): [SPECIFY]
```

---

**Crew Status:** Week 1 COMPLETE. Week 2 Alpha PLANNING COMPLETE. Week 3 Alpha PLANNING COMPLETE. AWAITING COST GOVERNANCE APPROVAL.

🖖 Picard, signing for the crew.
