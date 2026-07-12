# Section 31 Week 3 Operational Plan — 10% Expansion (Pending Gate 2 GO)

**Planning Status:** WEEK 2 COMPLETE, GATE 2 DECISION PENDING  
**Projected Start:** Mon 2026-07-21 (pending your GO decision)  
**Target Cohort:** 10% GitHub Copilot users (~60,000 users)  
**Duration:** Mon–Fri (crew-time, continuous ops)

---

## Executive Summary

Week 3 scales the canary from 1% (6,247 users) to 10% (~60,000 users) based on Week 2 success. Same crew, same ops model, higher scale. Goal: Validate crew autonomy at 10x scale while maintaining all success criteria.

**Week 3 Success Criteria (inherited from Week 2 + scaling validation):**

| Criterion | Target | Scaling Multiplier |
|-----------|--------|-------------------|
| Canary cohort | 60,000 users | 10x from Week 2 |
| Opt-out rate | <3% | Hold at Week 2 level |
| Error rate | <0.15% | Hold or improve |
| Sentiment | >neutral (thumbs-up ≥50%) | Maintain or improve |
| Cost/user/day | <$0.25 | Maintain or improve (economies of scale) |
| TPM signing | 100% coverage | Full coverage at scale |
| Anomalies | Zero requiring rollback | Detect & remediate <1 hour |

**Scaling Risks & Mitigations:**

| Risk | Week 2 Baseline | Week 3 Challenge | Mitigation |
|------|-----------------|------------------|-----------|
| Token volume surge | 20M/day | 200M/day (10x) | Quark monitors 2σ thresholds; auto-scale model pool |
| Opt-out spike | 2.3% | >3% (if bad UX) | Troi surveys opt-out reasons daily; escalate >2.5% |
| Error accumulation | 0.09% (isolated) | >0.15% (systemic) | Yar prioritizes error correlation analysis |
| Cost per user drift | $0.18 (stable) | >$0.25 (inefficiency) | Quark refines cost model; alerts on per-user increases |
| Infrastructure strain | Stable with 1% | Unknown with 10% | O'Brien monitors API latency, queue depth, timeouts |

---

## Crew Task Assignments (Week 3)

### Worf — Audit Trail Scaling + Security Ops

**Owner:** Worf  
**Capacity:** New challenge at 10x scale (100M+ signed requests/week)

**Tasks:**

1. **Audit Trail Infrastructure (Mon–Tue)**
   - Review Week 2 TPM logs: volume, latency, storage requirements
   - Project Week 3 needs: ~1TB audit logs (vs 100GB Week 2)
   - Verify Supabase audit_trail table has indexes for:
     - `(crew_id, timestamp DESC)` — crew member audit queries
     - `(request_signature, timestamp)` — fraud detection
   - Scaling: Auto-partition table by week if needed
   - Test: Can retrieve 1M audit records in <5 sec? (SLA)

2. **Production Security Audit (Wed)**
   - Spot-check 1% of crew requests (600 requests from 60k)
   - Verify 100% signing success rate (Week 2 was 100%, confirm parity)
   - Check for timing/ordering anomalies (attacker could try replay attacks)
   - Document: Any signing failures, remediation

3. **Compliance Reporting (Thu–Fri)**
   - Weekly compliance summary: request count, signing rate, audit latency
   - ROI for signing: cost to deploy vs risk of unsigned requests
   - Recommendation: Continue TPM signing at 10%? (expected: YES)

**Aha Story:** PROD-852 (Week 3 TPM Audit Scaling) — assign to Worf

**Success Criteria:**
- [ ] Audit table scales to 1TB+ (auto-partitioned)
- [ ] Audit queries <5 sec SLA maintained
- [ ] 100% signing rate confirmed (spot-check)
- [ ] Zero compliance violations detected

---

### O'Brien — Infrastructure Scaling + Monitoring

**Owner:** O'Brien  
**Capacity:** Major scaling challenge (10x load on feature flag, cohort routing, telemetry)

**Tasks:**

1. **Cohort Expansion (Pre-Mon)**
   - Update feature flag: `storyAgent.canary.enabled = true` (already set)
   - Adjust algorithm: `hash(user_id) % 100 < 10` (1% → 10%)
   - Validate: 60,000 users ±2% (expected 59,000–61,000)
   - Spot-check: Random users from each region/tier still balanced
   - Go-live: Mon 7/21 09:00 PT

2. **API Latency Monitoring (Daily)**
   - Baseline Week 2: p50=150ms, p95=450ms, p99=2.1sec (crew calls)
   - Alert thresholds Week 3:
     - p50 >200ms (baseline +33%)
     - p95 >750ms (baseline +67%)
     - p99 >5sec (baseline +140%)
   - Root cause analysis:
     - Model pool saturation? → Scale to more providers (Llama, Claude via Anthropic tier)
     - Database queries slow? → Check crew-mission-pipeline query performance
     - Network congestion? → Geordi + O'Brien coordinate routing optimization

3. **Rollback Readiness (Tue/Thu drills)**
   - Execute `scripts/rollback_canary.sh` with 60k cohort
   - Target SLA: <5 min (same as Week 2)
   - Measure: Time to disable flag + time to verify rollback (all users back to Copilot)
   - Document: Any errors, retry logic needed

4. **Telemetry Pipeline Validation (Daily)**
   - Experiment stream: 60k crew users' events → separate table
   - Control stream: 540k Copilot users' events → separate table
   - Data quality checks:
     - No cross-contamination (crew events don't go to Copilot stream)
     - Timestamp accuracy (within 1 sec of event occurrence)
     - Event count reconciliation: telemetry events ~= API calls
   - Alert: >5% data loss → immediate investigation

5. **Daily Standup Report (09:00 PT)**
   - Cohort health: how many active users? churn?
   - API latency: p50/p95/p99 vs baseline
   - Rollback readiness: drill results
   - Telemetry status: data quality, event counts
   - Any infrastructure concerns? Escalate to Geordi

**Aha Story:** PROD-853 (Week 3 Infrastructure Scaling) — assign to O'Brien

**Success Criteria:**
- [ ] 10% cohort live Mon, 60k ±2% users routed
- [ ] API latency within alert thresholds (or mitigations in place)
- [ ] Rollback SLA <5 min verified
- [ ] Telemetry data <5% loss rate

---

### Troi — UX at Scale + Sentiment Tracking

**Owner:** Troi  
**Capacity:** Understanding user behavior at 10x scale (60k users = better statistical power)

**Tasks:**

1. **Opt-Out Deep Dive (Daily)**
   - Week 2: 2.3% opt-out (relatively stable at 1% cohort)
   - Week 3 watch: Is opt-out >2.5%? (indicates problem at scale)
   - Investigation: Survey opt-out users (randomized 100/cohort)
     - Why did you switch back? (UX issue? quality? speed?)
     - Would you try again? (confidence to re-enable)
   - Escalation: If opt-out >3%, escalate with specific reasons to Picard

2. **Sentiment Analysis (Daily + Weekly)**
   - Capture: Thumbs up/neutral/down from 60k users
   - Trend analysis: Is sentiment improving? stable? declining?
   - Week 2 baseline: 56.6% thumbs-up, 28% neutral, 15% thumbs-down
   - Week 3 target: ≥56% thumbs-up (maintain or improve)
   - Breakdown by feature:
     - Agent Workspace (chat): sentiment by feature (explain, code generation, refactor, etc.)
     - Which features have highest sentiment? Lowest?
   - Top feedback theme analysis: 
     - Extract top 5 positive comments
     - Extract top 5 negative comments
     - Summarize themes for Picard daily report

3. **Synthetic Test Harness (Deployed?)** 
   - Status (post-launch): Was harness deployed in Week 2? (Plan said "deferred")
   - Week 3 task: Deploy synthetic test suite if not already live
   - 4 scenarios (5-min frequency):
     - Scenario A: "Fix a typo in code" (simple, cheap)
     - Scenario B: "Implement a feature" (complex, expensive)
     - Scenario C: "Review code for security issues" (reasoning-heavy)
     - Scenario D: "Migrate from v1 API to v2" (multi-step, dependency-heavy)
   - Execution: Run 288 times/day (5-min frequency × 24h)
   - Alert: 2+ consecutive failures → escalate immediately
   - Dashboard: daily synthetic test pass rate %

4. **Daily Standup Report (09:00 PT)**
   - Opt-out rate: % of cohort, trend, any surveys done?
   - Sentiment: % thumbs-up/neutral/down, top themes (positive + negative)
   - Synthetic test pass rate: % passing, any failures?
   - User feedback summary: 2-3 top comments (positive + negative)

**Aha Story:** PROD-854 (Week 3 UX at Scale + Sentiment) — assign to Troi

**Success Criteria:**
- [ ] Opt-out rate <3% maintained (or explain spikes)
- [ ] Sentiment ≥56% thumbs-up (maintain Week 2 level)
- [ ] Synthetic tests deployed and running 24/7
- [ ] Top user feedback themes tracked weekly

---

### Quark — Cost Scaling + Economics at Scale

**Owner:** Quark  
**Capacity:** Validate cost model scales to 60k users with economy-of-scale benefits

**Tasks:**

1. **Cost Scaling Analysis (Mon)**
   - Week 2 cost: $0.188/user/day (6,247 users = $1,176/day total)
   - Week 3 projection: 60,000 users at similar rate = $11,280/day
   - Expected economies of scale:
     - Batch processing: crew can reuse cached RAG context across similar queries
     - Model pool efficiency: bulk requests to tier-3 models get better rates
     - Projected Week 3 cost: $0.16–0.18/user/day (10–15% savings from scale)
   - Goal: Demonstrate ≤$0.22/user/day (still below $0.25 target)

2. **Cost Anomaly Detection Scaling (Daily)**
   - Week 2 rule: Alert if per-user cost >$0.40/day (2σ above mean)
   - Week 3 adjustment: 
     - Baseline (5-day rolling): expected $0.16–0.18/user/day
     - Alert at: $0.35/user/day (2σ = ~$0.17, so 2σ above = $0.33–0.35)
     - Trend alert: If weekly cost creeping up >+5% vs 5-day avg, investigate
   - Investigation process:
     - Which users driving high cost? (top 1% high-cost users)
     - Which features? (agent vs explain vs review)
     - Any bugs? (infinite loops, re-running same query)
   - Escalation: If daily spend >$12k ($0.20/user), alert Picard

3. **Provider Diversification (Wed)**
   - Week 2: Crew used 85% tier-3 (DeepSeek), 15% tier-4 (Anthropic)
   - Week 3 challenge: At 60k scale, is tier-3 provider throttled or rate-limited?
   - Action: Quark validates model pool + provider availability
     - Contact OpenRouter: Can they handle 60k users? Tier-3 capacity?
     - Fallback plan: Add alternative providers (Claude via Anthropic, GPT-4o-mini via OpenAI) as tier-3 fallback
     - Cost comparison: If need to use Anthropic more, project cost delta
   - Decision: Stick with current pool, OR diversify to new providers?

4. **ROI Projection Update (Fri)**
   - Week 2 ROI: 6% savings vs Copilot baseline
   - Week 3 ROI (projected):
     - If cost/user = $0.16–0.18 (economies of scale): 10–20% savings
     - Copilot baseline: $0.20/user
     - Breakeven: 0% savings (crew cost = Copilot cost)
     - Success case: >5% savings at 60k scale
   - 100-user projection: At current run rate, cost per 100k users = $x
     - Compare to Copilot: 100k users × $0.20 = $20k/day baseline
     - Projected crew cost: 100k × $0.17 (conservative) = $17k/day
     - Savings at scale: $3k/day for 100k users

5. **Daily Standup Report (09:00 PT)**
   - Daily spend: $X (rolling avg), per-user: $Y
   - Cost vs budget: On track for <$0.22/user? (target yes)
   - Anomalies detected: Any unusual spend patterns?
   - Provider status: Model pool capacity sufficient?

**Aha Story:** PROD-855 (Week 3 Cost Scaling + Economics) — assign to Quark

**Success Criteria:**
- [ ] Cost/user/day ≤$0.22 maintained (or explain variance)
- [ ] Zero anomalies requiring cost reduction
- [ ] Provider capacity verified sufficient for 60k users
- [ ] ROI >5% confirmed (savings vs Copilot baseline)

---

### Picard — Daily Synthesis + Gate 3 Assessment

**Owner:** Picard  
**Capacity:** Same daily synthesis (now with 10x data), Gate 3 assessment (Fri EOD)

**Tasks:**

1. **Daily Synthesis (09:00 PT, Mon–Fri)**
   - Collect reports from Worf, O'Brien, Troi, Quark
   - Aggregate metrics:
     - Opt-out %, error %, sentiment %, cost/user, API latency p95, TPM success rate
   - Daily status: 🟢 GREEN / 🟡 YELLOW / 🔴 RED
   - Escalations: Any YELLOW/RED conditions? Why? Remediation?
   - Post 10-min summary to #story-agent-ops

2. **Anomaly Escalation (Real-time, if YELLOW/RED)**
   - YELLOW: Cost trending up, or opt-out >2.5%, or sentiment declining
     - Action: Investigate with crew member, provide context
     - Example: "Opt-out spiked Tue. Likely UX issue with new feature?" → Troi investigates
   - RED: Cost >$12k/day, error >0.2%, sentiment <40%, API latency >10sec
     - Decision point: Continue monitoring, OR escalate to human for guidance
     - Human can: investigate together, provide course correction, OR auto-rollback (if RED >3 hours)

3. **Gate 3 Assessment (Fri EOD)**
   - Compile 5-day metrics → comparison vs Week 2 baseline
   - Statistical significance: Did 10x scale maintain all success criteria?
   - A/B analysis:
     - Crew cohort (60k) vs Control (Copilot users, 540k)
     - Opt-out: 60k crew parity or better vs Week 2?
     - Error: 60k crew error rate same/better?
     - Sentiment: 60k crew satisfaction same/better?
     - Cost: 60k crew cost within budget?
   - Gate 3 recommendation:
     - ✅ **GO TO WEEK 4 (50% EXPANSION)** — Crew proven at 10% scale
     - ⚠️ **HOLD & INVESTIGATE** — Specific metric needs attention
     - 🔧 **MODIFY & RETEST** — Change X, re-run Week 3 subset

4. **Aha Epic + Stories (Continuous)**
   - Create Epic: PROD-E-6 (Section 31 Week 3 Measurement)
   - Create 5 stories (per crew task): Worf, O'Brien, Troi, Quark, Picard
   - Daily comments: Picard logs daily synthesis reports as story comments
   - Friday: Gate 3 assessment story with full A/B analysis + recommendation

**Aha Story:** PROD-856 (Week 3 Gate 3 Assessment) — assign to Picard

**Success Criteria:**
- [ ] 5-day daily syntheses complete + all escalations addressed
- [ ] Gate 3 assessment package ready Friday EOD
- [ ] Clear recommendation: GO / HOLD / MODIFY

---

## Week 3 Timeline (Crew-Time)

```
PRE-LAUNCH (Before Mon 7/21):
  Fri 7/18: Gate 2 decision (you approve GO to Week 3)
  Fri–Sun: Crew prep (verify 10% cohort ready, monitoring dashboards updated)

T+0 (Mon 7/21 09:00 PT):
  - O'Brien: Enable 10% cohort (60,000 users live)
  - Troi: Notify users (email + in-app banner, ethical framing)
  - Worf: TPM signing scale test (confirm 100% coverage at 10x)
  - Quark: Cost tracking live, anomaly alerts enabled
  - Picard: First daily synthesis (09:00 PT standup)

T+1–T+4 (Tue–Fri):
  - Daily 09:00 PT standups (O'Brien + Troi + Quark + Worf reports)
  - Picard synthesizes → posts to #story-agent-ops
  - Any YELLOW/RED → crew investigates, human provides guidance if needed
  - Rollback drills (Tue/Thu at 14:00 PT) — verify <5 min SLA

T+5 (Fri 7/25 EOD):
  - Picard: Gate 3 assessment package ready
  - 5-day A/B analysis: Crew vs Copilot at 10% scale
  - Recommendation: GO to Week 4 (50% expansion) OR HOLD / MODIFY
  - Crew awaits your decision (expected Mon 7/28)
```

---

## Success Definition (Week 3)

**All must be true for Gate 3 GO to 50% expansion:**

- [ ] Opt-out rate <3% (maintained from Week 2)
- [ ] Error rate <0.15% (maintained from Week 2)
- [ ] Sentiment >neutral, ≥50% thumbs-up (maintained from Week 2)
- [ ] Cost/user/day <$0.22 (on budget, ideally with economies of scale)
- [ ] TPM signing 100% coverage at scale (zero failures)
- [ ] Infrastructure stable: API p95 latency <750ms, no timeouts
- [ ] Zero anomalies requiring rollback
- [ ] All 5 crew tasks complete + Aha documentation live
- [ ] Human interaction points: all 4 (or fewer) executed smoothly

**If any criterion failed:** Recommend HOLD + investigation or MODIFY approach.

---

## Crew Readiness (Parallel Planning)

While you decide Gate 2:

1. **Worf** — Pre-stage TPM audit infrastructure (larger indexes, monitoring)
2. **O'Brien** — Pre-test 10% cohort routing (no go-live until your approval)
3. **Troi** — Draft Week 3 notification (ready to deploy Mon 09:00 PT)
4. **Quark** — Refine cost model for 60k scale (validation queries ready)
5. **Picard** — Prepare Gate 3 assessment template (daily synthesis structure ready)

**Crew Status:** Ready to launch Week 3 pending your Gate 2 GO decision.

---

## Next: Your Gate 2 Decision

**Required from you before we proceed:**

```
[ ] GO — Approve Week 3 expansion to 10% (Monday 2026-07-21)
[ ] HOLD — Investigate specific concern before expanding
[ ] MODIFY — Proceed to Week 3 with these changes: [SPECIFY]
```

Reply in this thread or via Slack #story-agent-ops.

---

**Crew Status:** Week 2 COMPLETE. Week 3 PLANNING COMPLETE. AWAITING GATE 2 DECISION.

🖖 Picard, signing for the crew.
