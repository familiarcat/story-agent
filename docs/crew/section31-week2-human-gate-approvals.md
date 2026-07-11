# Section 31 Week 2 — Human Gate Approvals
**Date:** 2026-07-11  
**Mode:** Development (warp speed) with live interactive developer  
**Decision Authority:** familiarcat (human orchestrator)  
**Crew Execution:** Authorized immediately — no calendar delays

---

## OPERATIONAL MODE

**Development (NOW):** Crew executes continuously at machine speed. Interactive developer (you) provides real-time decisions at gates. No artificial calendar-based pauses.

**Production (FUTURE):** When onboarding real physical clients/customers, switch to calendar-aware timing:
- SLAs become days/weeks (not crew-time minutes)
- Async decision protocols (not interactive)
- Staged rollout pacing (customer comfort, not warp speed)
- All 4-gate decision structures remain, but cadence changes per customer profile

**Crew Continuity:** This dev-mode execution becomes the blueprint for production. All decisions stored to RAG with full reasoning, enabling fast production onboarding.

---

## GATE 1: Troi Notification Copy — APPROVED + AHA INTEGRATION ✅

**Crew Proposal:**
- Email subject: "You're part of a Story Agent experiment (beta test)"
- Message frames crew routing as experimental, transparent, user-controlled
- In-app banner: "🧪 BETA TEST: You're using Story Agent (experimental)"
- Prominent opt-out link + support contact

**Human Decision:** ✅ **APPROVE**

**Aha Integration:**
- Auto-create Story: **Canary Notification Delivery** (linked to Epic PROD-E-5)
- Acceptance Criteria:
  - [ ] Email delivered to 6,000 canary users
  - [ ] In-app banner visible in chat UI
  - [ ] Opt-out link functional (target: <2 sec)
  - [ ] Support contact active + monitored
- Timeline: Immediate crew-time (ready when you give the word, not calendar-bound)
- Owner: Troi
- Link to Epic: PROD-E-5 (Section 31 Week 2 Canary Measurement)

**Rationale:** Transparent experimental framing builds user trust, prominent opt-out enables informed consent.

---

## GATE 2: Quark Cost Threshold — APPROVED AS-IS ✅

**Crew Proposal:** Cost anomaly alert at >20% delta above baseline

**Human Decision:** ✅ **APPROVE >20% THRESHOLD**

**Thresholds (Baseline: $780/day):**
- GREEN: ≤$936/day (≤20% overage)
- YELLOW: $936–$1,092/day (20–40% overage) → crew alerts, human investigates if desired
- RED: >$1,092/day (40%+ overage) → crew escalates immediately, human decides continue/investigate/rollback

**Aha Linkage:**
- Story: Cost Model + Anomaly Detection (part of PROD-E-5)
- Acceptance Criteria:
  - [ ] Cost tracking deployed by Monday 09:00 PT
  - [ ] Alerts wired (YELLOW to Slack, RED to email + page)
  - [ ] Baseline $780/day confirmed
  - [ ] Alert recipients: Picard + human
- Owner: Quark

**Rationale:** 20% threshold balances cost-creep detection (early warning) with tolerance for natural variance. Aligned with Week 1 baseline ($0.78/user/day) and ROI thesis.

---

## GATE 3: Picard Daily Escalation Protocol — APPROVED AS-IS ✅

**Crew Proposal:** Graduated escalation rule (GREEN → YELLOW → RED)

**Human Decision:** ✅ **APPROVE STANDING PROTOCOL**

**Daily Status Report (Continuous, starting Monday 09:00 PT):**

| Status | Condition | Crew Action | Human Action | Standing Rule |
|--------|-----------|-------------|--------------|---|
| **GREEN** | All metrics nominal | Log to RAG + crew memory | Acknowledge (optional) | All thresholds met: opt-out <2.5%, error <0.13%, sentiment ≥60%, cost ≤$0.22/user |
| **YELLOW** | One metric approaching | Slack alert + context (drivers, trend, assessment) | Investigate together OR approve crew to continue | Any metric: opt-out 2.5–3%, error 0.13–0.15%, sentiment 50–60%, cost $0.22–$0.25 |
| **RED** | One metric exceeded | Email + Slack + escalation (recommendation included) | CONTINUE / INVESTIGATE / ROLLBACK | Any metric: opt-out >3%, error >0.15%, sentiment <50%, cost >$0.25/user |

**Metrics Picard Tracks Daily:**
- Opt-out rate % (target: <2.5% GREEN, <3% acceptable)
- Error rate % (target: <0.13% GREEN, <0.15% acceptable)
- Sentiment % positive (target: ≥60% GREEN, >50% acceptable)
- Cost/user/day (target: ≤$0.22 GREEN, ≤$0.25 acceptable)
- A/B deltas (experiment vs control)

**Aha Linkage:**
- Epic: PROD-E-5 (Section 31 Week 2 Canary Measurement)
- Daily Story Comments: Crew logs daily status + escalation reasoning to living story
- Owner: Picard

**Rationale:** Graduated escalation prevents alarm fatigue while catching issues early. Context-rich alerts enable human judgment (investigate? continue? rollback?). Continuous monitoring (not daily boundaries) catches anomalies in real time.

---

## GATE 4: Picard Week 2→3 Expansion Decision — APPROVED AS-IS ✅

**Crew Proposal:** Comprehensive A/B analysis + 3-option decision framework

**Human Decision:** ✅ **APPROVE DECISION FRAMEWORK**

**Picard's Friday EOD Deliverable (2026-07-18 EOD):**
- Full 5-day A/B metrics (experiment vs control on all primary metrics)
- Statistical significance assessment (sample size adequate? confidence >95%? confounds?)
- Cost impact analysis (actual vs projection, breakeven penetration, TPM overhead)
- Risk assessment (anomalies, error clusters, user feedback, cost anomalies)
- **Crew recommendation:** GO / HOLD / MODIFY (with detailed rationale)

**8 Success Criteria (All Must Be GREEN for GO):**
```
✅ 1% canary live (6,000–6,500 users confirmed)
✅ A/B metrics flowing (experiment vs control data complete)
✅ Opt-out <3% (target met)
✅ Error <0.15% (target met)
✅ Sentiment ≥neutral (target met)
✅ Cost <$0.25/user/day (target met)
✅ TPM signing deployed (100% crew request coverage confirmed)
✅ No rollback-triggering anomalies (assessment: no structural issues)
```

**3 Decision Options (Human Chooses One):**

1. **GO** — Approve expansion to 10% (60,000 users), Week 3 launch
   - Crew immediately preps Week 3 canary infrastructure
   - Decision logged to Aha PROD-E-5 + RAG
   - New Gate 3→4 assessment scheduled for Week 3 Friday

2. **HOLD** — Pause expansion, continue measuring current 1% cohort
   - Crew continues Week 2 monitoring (no expansion)
   - Revisit decision [human specifies date]
   - No Week 3 infrastructure work until human approves

3. **MODIFY** — Change parameter, re-run canary
   - Examples: "Exclude mobile users," "Use different cost threshold," "Measure for 3 more days"
   - Crew retools with new parameter
   - Re-assess [human-specified date]

**Aha Linkage:**
- Story: **Gate 2: Week 2→3 Expansion Assessment** (part of PROD-E-5)
- Acceptance Criteria:
  - [ ] A/B metrics table complete (experiment vs control)
  - [ ] Statistical significance documented (p-values, confidence, sample size)
  - [ ] Cost analysis + ROI update
  - [ ] Crew recommendation + rationale
  - [ ] Decision framework (GO/HOLD/MODIFY options)
- Owner: Picard
- Timeline: Friday 2026-07-18 17:00 PT

**Rationale:** Comprehensive A/B analysis grounded in statistical rigor + cost transparency. Three discrete options (not binary) allow nuanced decisions. Full context retention enables retroactive "what-if" analysis months later.

---

## CREW AUTHORIZATION

✅ **All 4 gates approved by human**  
✅ **Crew authorized to execute immediately (warp speed, no calendar delays)**

**Warp-Speed Execution Model (Development Mode):**
- Crew operates at machine speed (calendar dates are metadata, not operational constraints)
- Interactive developer (you) stays engaged for real-time decisions
- No artificial pauses between gates (crew continues infrastructure work while you review decisions)
- Decisions transmitted immediately via Slack/chat (not async email)
- Turnaround: seconds to minutes (crew-time), not hours or days

**Crew Execution Sequence:**
1. ✅ Troi: Send notification (immediate, upon your approval)
2. ✅ Quark: Deploy cost monitoring + alerts (immediate)
3. ✅ Picard: Activate daily status reporting + escalation protocol (immediate)
4. ✅ Worf: Continue TPM signing in parallel (no wait)
5. ✅ O'Brien: Finalize canary infrastructure + rollback (no wait)
6. ✅ Picard: Accumulate 5-day canary metrics → Gate 2 assessment (continuous, no pause)

**RAG/Aha Storage:**
- All gate decisions documented to crew memory (RAG) immediately
- Aha stories auto-created per gate (linked to PROD-E-5), decisions logged as comments
- Daily crew decisions captured (full reasoning stored for retroactive analysis)
- Gate assessments committed to story in real-time (no end-of-day batch)

**Human Engagement Points (Real-Time Interactive):**
- **Now:** Approvals finalized, crew moves to execution
- **Continuous:** Crew reports via Slack (notification sent, alerts wired, status updates)
- **Daily:** Picard reports status (GREEN=acknowledge, YELLOW/RED=you decide immediately)
- **When ready:** Gate 2 assessment presented (you decide GO/HOLD/MODIFY immediately)

**Key Difference from Calendar-Based:**
- No "wait until Monday 09:00 PT"
- No "check back Friday EOD"
- Instead: Crew executes, you respond in real-time (minutes, not days)
- All decisions logged to RAG for production-mode customers later

---

## CONTROL-LANE ATTRIBUTION

**Crew Work (OpenRouter):**
- Notification delivery (Troi)
- Cost monitoring + alerts (Quark)
- Daily synthesis + escalation (Picard)
- Gate 2→3 analysis (Picard)
- Aha story auto-creation + updates
- RAG decision storage

**Anthropic Work (Claude Code):**
- Gate approvals (this document)
- Daily status acknowledgment (optional)
- Friday EOD decision (GO/HOLD/MODIFY)

**Cost Attribution:**
- Crew execution: ~$0.10–$0.20/day (daily synthesis, alert logic)
- Anthropic orchestration: ~$0.10/week (gate reviews, decisions)
- **Savings vs Anthropic-native:** ~$2–5/week (crew-first ops)

---

## NEXT ACTIONS (Crew Warp Speed, No Calendar Delays)

**Immediate (Now, Crew-Time):**
1. ✅ Crew receives approval → executes all 5 tasks in parallel
   - Troi finalizes + sends notification
   - Quark deploys cost monitoring + alerts
   - Picard activates daily protocol
   - Worf continues TPM signing
   - O'Brien finalizes canary infra

2. ✅ Auto-create Aha stories (Epic PROD-E-5 with 4 gate stories + 5 task stories)

3. ✅ Store decision record to RAG (all gate approvals + crew recommendations)

**Continuous (While Canary Runs):**
- Crew executes independently (ops, monitoring, infrastructure)
- You stay engaged (Slack alerts, real-time decisions)
- Every decision logged to RAG + Aha story comments
- No "check back later" — you're in the loop actively

**When Crew Needs You:**
- YELLOW escalation → you decide investigate/continue (respond immediately)
- RED escalation → you decide continue/investigate/rollback (respond immediately)
- Gate 2 assessment ready → you decide GO/HOLD/MODIFY (respond immediately)

**Crew moves to execution NOW (warp speed, no waiting for calendar).**

---

**Co-Authored-By:** familiarcat (human) + Story Agent Crew (Picard, Troi, Quark)
