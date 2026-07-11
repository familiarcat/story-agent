# Section 31 Week 2 — Human Gate Approvals
**Date:** 2026-07-11  
**Decision Authority:** familiarcat (human orchestrator)  
**Crew Execution:** Authorized immediately

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
- Timeline: Monday 2026-07-14 09:00 PT
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
✅ **Crew authorized to execute immediately (Monday 2026-07-14 09:00 PT)**

**Crew Execution Model:**
- Troi: Send notification Monday AM (Gate 1 complete)
- Quark: Deploy cost monitoring + alerts Monday AM (Gate 2 active)
- Picard: Daily status reporting + escalation protocol (Gate 3 active)
- Picard: Friday EOD Gate 2→3 decision package (Gate 4 scheduled)

**RAG/Aha Storage:**
- Gate decisions documented to crew memory (RAG)
- Aha stories auto-created per gate (linked to PROD-E-5)
- Daily crew decisions logged as story comments (living journal)
- Friday Gate 2→3 assessment committed to story (full decision trace)

**Human Engagement Points:**
- **Monday AM:** Receive notification from Troi, cost alerts wired (confirm via Slack)
- **Daily:** Receive status from Picard (GREEN=acknowledge, YELLOW=decide, RED=decide)
- **Friday EOD:** Receive Gate 2→3 assessment from Picard (decide GO/HOLD/MODIFY)

**Timeline:**
- **Now (2026-07-11):** Approvals finalized, crew prepped
- **Monday 2026-07-14 09:00 PT:** Week 2 canary launch (notification, cost alerts, daily protocol live)
- **Daily Mon–Fri:** Picard daily status
- **Friday 2026-07-18 EOD:** Gate 2→3 assessment + human decision

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

## NEXT ACTIONS (Crew-Only, No Human Required)

1. ✅ Finalize notification copy (Troi, ready to send Monday)
2. ✅ Deploy cost monitoring + alerts (Quark, ready Monday)
3. ✅ Activate daily escalation protocol (Picard, ready Monday)
4. ✅ Prep Gate 2→3 analysis framework (Picard, ready Friday)
5. ✅ Auto-create Aha stories per gate (all crew, immediately)
6. ✅ Store decision record to RAG (Picard, immediately)

**Crew moves to execution NOW (Monday 09:00 PT, no calendar delays).**

---

**Co-Authored-By:** familiarcat (human) + Story Agent Crew (Picard, Troi, Quark)
