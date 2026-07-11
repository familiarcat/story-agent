# SECTION 31 WEEK 2 — HUMAN INTERACTION POINTS

**Mission:** Canary launch (1% cohort, 6,000 users)  
**Period:** 2026-07-11 to 2026-07-18 (Friday EOD)  
**Crew Status:** Autonomous execution at warp speed

---

## GATE 1: NOTIFICATION COPY REVIEW (Troi)

**Timeline:** Monday 2026-07-14 AM  
**SLA:** 1 hour crew-time  
**Status:** AWAITING CREW PROPOSAL (Troi to prepare copy by Monday 09:00 PT)

**What crew will deliver:**
- Draft email notification (subject line + body, ethical/transparent tone)
- Draft in-app banner text
- A/B test copy variants (if applicable)
- UX rationale (why this messaging, sentiment analysis)

**Human review checklist:**
- [ ] Notification is clear about "beta test" / "experimental" nature
- [ ] Opt-out language is prominent + easy to understand
- [ ] Sentiment is appropriate (not overconfident, not alarmist)
- [ ] Branding/tone matches product voice
- [ ] All critical info present (what, why, opt-out link, support contact)

**Human action:**
- **Approve:** Crew sends notification immediately
- **Request changes:** Specify revisions; crew redelivers (target 30 min turnaround)
- **No response within SLA:** Crew proceeds with recommendation

**Crew artifact location:** TBD (Aha story comment, RAG memory)  
**Tracking:** Update this document after human decision

---

## GATE 2: COST THRESHOLD APPROVAL (Quark)

**Timeline:** Monday 2026-07-14 AM  
**SLA:** 1 hour crew-time  
**Status:** AWAITING CREW PROPOSAL (Quark to finalize threshold by Monday 09:00 PT)

**What crew will deliver:**
- Proposed anomaly threshold: **>20% cost delta** (above baseline)
- Justification: [statistical rationale, historical precedent, risk tolerance]
- Alert recipients: [who gets notified]
- Alert escalation logic: [YELLOW/RED severity thresholds]
- Cost breakdown spreadsheet: [crew cohort vs. control baseline, per-user projections]
- Fallback threshold if threshold is exceeded: [automatic rollback trigger?]

**Human review checklist:**
- [ ] Threshold makes sense given Week 1 baseline
- [ ] Alert recipients are appropriate (Picard? ops team? human?)
- [ ] Cost projections align with budget
- [ ] Escalation logic is clear (YELLOW = investigate, RED = escalate to human)

**Human action:**
- **Approve:** Crew deploys alerts with >20% threshold
- **Adjust:** Propose >X% instead (e.g., >25%, >15%); crew updates and deploys
- **Escalate:** Request additional modeling; crew provides detailed analysis
- **No response within SLA:** Crew proceeds with >20% threshold

**Crew artifact location:** TBD (Aha story, RAG, cost spreadsheet)  
**Tracking:** Update this document after human decision

---

## GATE 3: DAILY METRIC ESCALATIONS (Picard) — CONTINUOUS

**Timeline:** Daily, 09:00 PT (Mon–Fri)  
**SLA:** Continuous advisory (crew flags anomalies, human receives alerts)  
**Status:** READY FOR MONDAY 09:00 PT START

**What crew will deliver (daily):**
- Opt-out count + % (target: <3%)
- Error count + % (target: <0.15%)
- Sentiment analysis (target: >neutral)
- Cost per user / day (target: <$0.25)
- A/B metric comparison (experiment vs. control)
- Status flag: GREEN / YELLOW / RED

**Daily escalation logic:**
- **GREEN:** All metrics nominal → routine summary (stored to RAG)
- **YELLOW:** One metric approaching threshold (e.g., opt-out 2.5%, error 0.13%) → crew alerts human (Slack? email?), includes context
- **RED:** One metric exceeded (e.g., opt-out >3%, error >0.15%) → immediate escalation to human, crew recommends action (continue / investigate / rollback)

**Human action:**
- **GREEN:** Acknowledge (or ignore, crew logs receipt)
- **YELLOW:** Decide: investigate together, or crew continues monitoring?
- **RED:** Decide: continue (accept risk), investigate root cause, or rollback?

**Crew artifact location:** RAG (daily decision records), Aha epic comments  
**Tracking:** Crew logs all daily decisions, human approvals

---

## GATE 4: WEEK 2→3 EXPANSION DECISION (Picard) — GATE 2

**Timeline:** Friday 2026-07-18 EOD  
**SLA:** Decision by Friday EOD  
**Status:** SCHEDULED (weekly synthesis, A/B analysis, expansion recommendation)

**What crew will deliver (Friday EOD):**
- **Full A/B analysis:** Experiment vs. control metrics (5-day snapshot)
  - Opt-out %, error %, sentiment %, cost/user/day
  - Statistical significance (if applicable)
  - Cohort size, device breakdown, usage patterns
- **Risk assessment:** Any anomalies observed? Any clusters or patterns?
- **Cost impact:** Actual cost vs. projection. TPM signing savings (if measurable)?
- **User feedback:** Sentiment analysis (if data available)
- **Crew recommendation:** GO / HOLD / MODIFY
  - GO: "All criteria met, recommend expand to 10% (60,000 users)"
  - HOLD: "X metric borderline, recommend 2-day extension for data"
  - MODIFY: "Change Y parameter and re-run" (e.g., different feature flag, different cohort)
- **Reasoning:** Full context (data, assumptions, alternatives considered)

**Success criteria checklist (human reviews):**
- ✅ 1% canary live (6,000–6,500 users confirmed)
- ✅ A/B metrics flowing (experiment vs control data present)
- ✅ Opt-out <3% (actual value: ___)
- ✅ Error <0.15% (actual value: ___)
- ✅ Sentiment >neutral (actual value: ___)
- ✅ Cost <$0.25/user/day (actual value: ___)
- ✅ TPM signing deployed (100% coverage confirmed)
- ✅ No rollback-triggering anomalies (assessment: ___)

**Human action (3 options):**
1. **GO**: Approve expansion to 10% (60,000 users, Week 3). Crew prepares expanded rollout.
2. **HOLD**: Pause expansion. Crew continues monitoring canary, revisit [date].
3. **MODIFY**: Change [parameter]. Crew retools, re-runs canary, re-assesses Friday+1.

**Crew artifact location:** Aha Epic PROD-E-5 (final story "Gate 2 Assessment"), RAG decision records  
**Tracking:** Human decision logged, crew activation for Week 3 (if GO)

---

## INTERACTION POINT SUMMARY (QUICK REFERENCE)

| Gate | Crew | Type | Date | SLA | Artifact | Decision |
|------|------|------|------|-----|----------|----------|
| 1 | Troi | Review | Mon AM | 1h | Notification copy | Approve / Revise / Proceed |
| 2 | Quark | Decision | Mon AM | 1h | Cost threshold | Approve / Adjust to >X% / Escalate |
| 3 | Picard | Advisory | Daily | Ongoing | Daily metrics | GREEN / YELLOW / RED escalation |
| 4 | Picard | Gate | Fri EOD | Decision | A/B analysis + recommendation | GO / HOLD / MODIFY |

---

## TRACKING LOG

(Human updates this section as decisions are made)

### Gate 1 — Troi Notification Copy
- **Crew proposal received:** [timestamp] — TBD
- **Human decision:** [Approve / Revise]
- **Notes:** [any feedback from human]

### Gate 2 — Quark Cost Threshold
- **Crew proposal received:** [timestamp] — TBD
- **Human decision:** [>20% / >X%]
- **Notes:** [rationale for adjustment, if any]

### Gate 3 — Picard Daily Escalations
- **Daily 1 (Mon):** [status: GREEN/YELLOW/RED] — TBD
- **Daily 2 (Tue):** [status] — TBD
- **Daily 3 (Wed):** [status] — TBD
- **Daily 4 (Thu):** [status] — TBD
- **Daily 5 (Fri):** [status] — TBD

### Gate 4 — Picard Week 2→3 Gate
- **Crew proposal received:** [timestamp] — TBD (Fri EOD)
- **Human decision:** [GO / HOLD / MODIFY]
- **Notes:** [which criteria driven decision, next steps]

---

**All gates logged here for retrospective analysis and learning (retroactive crew decision injection).**
