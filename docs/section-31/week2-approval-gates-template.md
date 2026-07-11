# Week 2 Approval Gate Decision Template

**Prepared by:** Picard  
**Date:** Friday EOD Week 1 (2026-07-18 EOD)  
**Purpose:** Gate assessment for Week 2 canary launch approval

---

## EXECUTIVE DECISION

**DECISION:** [GO / HOLD]

**Approval Status:**
```
🖖 GO FOR WEEK 2 CANARY LAUNCH (Monday 2026-07-19) ✅
OR
🛑 HOLD — Remediation Required (replanning needed)
```

**Decision Rationale:**
[Executive summary of gate assessment]

---

## GATE ASSESSMENT TABLE

| Gate | Workstream | Deliverable | Acceptance Criteria | Test Result | Status | Owner |
|------|-----------|-------------|-------------------|-------------|--------|-------|
| 1 | Worf | TPM Signing Deployed + Tested | All crew requests signed, signatures validate, audit trail records signer, rollout.yml populated | [PASS/FAIL] | ✅/❌ | Worf |
| 2 | Troi | Telemetry Shows Opt-out <2% | No spikes during Week 1 dogfood (7-day rolling average) | Opt-out rate: __% | ✅/❌ | Troi |
| 3 | Yar | Token Fidelity ≥99.99% | Checksum validation stable, no alerts triggered | Fidelity: __% | ✅/❌ | Yar |
| 4 | O'Brien | Week 1 Ops Success (All 7 Criteria) | All metrics pass for 7-day rolling average | [Details below] | ✅/❌ | O'Brien |
| 5 | O'Brien | Canary Infrastructure Ready | Feature flag, cohort selection, telemetry, rollback script all tested | Deployment checklist: __/N items complete | ✅/❌ | O'Brien |

**Overall Gate Assessment:** [5/5 PASS] → GO | [<5/5 PASS] → HOLD

---

## DETAILED SUCCESS CRITERIA ASSESSMENT (Gate 4)

### Week 1 Operational Readiness Success Metrics (7-day aggregate, 2026-07-12 through 2026-07-18)

| Metric | Target | Actual | Owner | Status |
|--------|--------|--------|-------|--------|
| **Opt-out Rate** | <2% | __% | Troi | ✅/❌ |
| **Error Rate** | <0.1% | __% | Yar | ✅/❌ |
| **Token Fidelity** | ≥99.99% | __% | Yar | ✅/❌ |
| **Latency p99** | <+50ms vs Copilot | +__ms | O'Brien | ✅/❌ |
| **Crew Uptime** | 100% (no outages >30 min) | __%  | O'Brien | ✅/❌ |
| **Sentiment** | ≥neutral (thumbs down <50%) | __% thumbs down | Troi | ✅/❌ |
| **Cost Savings** | ≥50% vs Copilot | __% savings | Quark | ✅/❌ |

**Scoring:**
- All 7 criteria PASS (green) → Week 1 SUCCESS ✅
- Any criterion FAIL (red) → Week 1 HOLD, remediation required ❌

---

## WEEK 2 READINESS ASSESSMENT

### Worf — TPM Signing Deployment (Gate 1)

**Deliverables to Review:**
- [ ] TPM cert provisioned (in ~/.alexai-secrets)
- [ ] signCrewRequest() function deployed (crew-mission-pipeline.ts)
- [ ] validateCrewSignature() function deployed (middleware)
- [ ] X-Signature headers injected (all OpenRouter requests)
- [ ] Audit trail logging deployed
- [ ] All 5 test cases pass (valid sig, tampered, missing sig, invalid cert, audit trail)
- [ ] rollout.yml populated with live `tpm_sig` + `chain_of_custody_hash`

**Sign-Off Questions:**
- [ ] Is TPM cert accessible and secure (not in repo, stored in ~/.alexai-secrets)?
- [ ] Do all crew requests include X-Signature header?
- [ ] Do signatures validate correctly (100% pass rate)?
- [ ] Is audit trail recording signer identity + timestamp?
- [ ] Are tampered requests detected and rejected?
- [ ] Is rollout.yml updated with live TPM metadata?

**Worf's Certification:**
```
☑ I certify that TPM signing infrastructure is:
  ✓ Deployed in production
  ✓ Tested end-to-end (all 5 test cases pass)
  ✓ Audit trail operational
  ✓ Signatures validate correctly
  ✓ Ready for canary launch

Signed: Worf ________ (date/time)
```

**Status:** ✅ PASS / ❌ FAIL

---

### Troi — Telemetry Opt-out Tracking (Gate 2)

**Deliverables to Review:**
- [ ] Opt-out rate <2% (7-day average)
- [ ] No anomalies or spikes (flat trend)
- [ ] No tester feedback about forced switching (sentiment stable)
- [ ] Telemetry pipeline stable (all events captured)

**Key Metric:**
```
Opt-Out Rate (Week 1 Daily):
- Day 1: ___%
- Day 2: ___%
- Day 3: ___%
- Day 4: ___%
- Day 5: ___%
- Day 6: ___%
- Day 7: ___%
- 7-day avg: __% (target <2%)
```

**Troi's Certification:**
```
☑ I certify that Week 1 telemetry shows:
  ✓ Opt-out rate <2% (no anomalies)
  ✓ No sentiment drops (feedback positive/neutral)
  ✓ No tester complaints about forced routing
  ✓ Ready to expose 1% GitHub users to canary

Signed: Troi ________ (date/time)
```

**Status:** ✅ PASS / ❌ FAIL

---

### Yar — Token Fidelity Audit (Gate 3)

**Deliverables to Review:**
- [ ] Token fidelity ≥99.99% (7-day average)
- [ ] Checksum validation 100% (no mismatches)
- [ ] No alerts triggered (<99.5% threshold not reached)
- [ ] Error taxonomy stable (no new categories)

**Key Metric:**
```
Token Fidelity (Week 1 Daily):
- Day 1: ___%
- Day 2: ___%
- Day 3: ___%
- Day 4: ___%
- Day 5: ___%
- Day 6: ___%
- Day 7: ___%
- 7-day avg: __% (target ≥99.99%)
```

**Yar's Certification:**
```
☑ I certify that Week 1 token validation shows:
  ✓ Fidelity ≥99.99% (no alerts)
  ✓ Checksum validation 100% (no mismatches)
  ✓ Error rate <0.1% (stable)
  ✓ Ready for canary deployment

Signed: Yar ________ (date/time)
```

**Status:** ✅ PASS / ❌ FAIL

---

### O'Brien — Week 1 Ops Success + Canary Infrastructure (Gates 4 & 5)

**Gate 4: Week 1 Success Metrics**

```
O'Brien's Operations Report (Week 1):

Opt-out Rate: __% (target <2%)
  - Trend: [stable / improving / degrading]
  - Any incidents: [none / list]

Error Rate: __% (target <0.1%)
  - Trend: [stable / improving / degrading]
  - Top 3 categories: [list]
  - Any escalations: [none / list]

Latency p99: +__ms (target <+50ms vs Copilot)
  - Trend: [stable / improving / degrading]
  - Optimization opportunities: [list]

Crew Uptime: _% (target 100%)
  - Outages >30 min: [count]
  - Root causes: [list]
  - Recovery SLA: [achieved / missed]

Cost/User: $__ (Copilot baseline $2.00)
  - Savings: __% (target ≥50%)
  - Anomalies: [count]
  - Trending: [stable / increasing / decreasing]

Rollback Drills: [count completed]
  - SLA <5 min: [all / some / none]
  - Success rate: ___%
  - Any blockers: [none / list]

Overall Health: GREEN / YELLOW / RED
```

**O'Brien's Certification (Gate 4):**
```
☑ I certify that Week 1 operations achieved:
  ✓ All 7 success criteria on target
  ✓ Rollback drills executed on schedule (<5 min SLA)
  ✓ No critical incidents
  ✓ Cost savings maintained (≥50%)
  ✓ Uptime stable

Signed: O'Brien ________ (date/time)
```

**Gate 5: Canary Infrastructure Ready**

```
O'Brien's Canary Deployment Checklist:

Code
  - [ ] Feature flag implementation deployed
  - [ ] User cohort service deployed + tested
  - [ ] Telemetry API with cohort bucketing deployed
  - [ ] Cost tracking separated by cohort
  - [ ] A/B dashboard live + metrics flowing
  - [ ] Alert rules configured + tested
  - [ ] Rollback script tested (<5 min SLA)

Configuration
  - [ ] Feature flag `storyAgent.canary.enabled` created (default: false)
  - [ ] Canary cohort seed set in environment
  - [ ] Telemetry pipeline configured to track cohort
  - [ ] Cost API configured to bucket by cohort

Testing
  - [ ] Cohort assignment algorithm tested (1% / 99% distribution)
  - [ ] Cohort consistency verified (same user = same cohort)
  - [ ] Feature flag toggle tested (on → off → on)
  - [ ] Telemetry bucketing tested (separate metrics)
  - [ ] Cost tracking tested (separate by cohort)
  - [ ] Rollback tested (enable → disable, <5 min)
  - [ ] A/B dashboard verified (metrics rendering)
  - [ ] Alert rules tested (sample triggers)

Deployment Ready: YES / NO

Completion Rate: __/N checklist items
```

**O'Brien's Certification (Gate 5):**
```
☑ I certify that canary infrastructure is:
  ✓ Fully deployed and tested
  ✓ Feature flag ready (safe default off)
  ✓ User cohort randomization verified (1% / 99% split)
  ✓ Telemetry + cost tracking separated by cohort
  ✓ A/B dashboard live and metrics flowing
  ✓ Rollback procedure tested (<5 min SLA)
  ✓ Ready for Monday deployment

Signed: O'Brien ________ (date/time)
```

**Status (Gates 4 & 5):** ✅ PASS / ❌ FAIL

---

## IF ALL GATES PASS (GO Decision)

**Canary Launch Approval:**
```
🖖 PICARD'S RULING: GO FOR WEEK 2 CANARY LAUNCH ✅

Launch Date: Monday 2026-07-19
Launch Time: 09:00 PT
Target Users: 1% of GitHub Copilot users (~1-10k users, exact count TBD by GitHub)
Provider: Crew routing (OpenRouter) for experiment group
Control: Copilot (baseline)

Deployment Sequence:
  - Saturday EOD 2026-07-18: Final testing + sign-off
  - Monday 09:00 PT: Enable feature flag `storyAgent.canary.enabled = true`
  - Monday 09:15 PT: Notify GitHub (users now routing to crew)
  - Monday 09:30 PT: A/B dashboard live + monitoring
  - Daily 09:00 PT: Standup (canary-specific metrics: experiment vs control)

Success Criteria (Week 2):
  ✓ Experiment error rate ≤ 2x control
  ✓ Experiment sentiment ≥ (control - 10%)
  ✓ Experiment cost ≤ 3x control (arbitrary, adjust as needed)
  ✓ No critical production incidents
  ✓ Rollback SLA maintained (<5 min if needed)

Approval Authority: Picard ✓
Signed: Picard ________ (date/time)
```

**Next Steps:**
1. Send launch notification to GitHub
2. Enable feature flag (O'Brien)
3. Notify support team (Troi)
4. Begin canary daily standups (Monday 09:00 PT)
5. Monitor A/B dashboard 24/7 (O'Brien)
6. Escalate anomalies immediately (if >2x error or sentiment drop)

---

## IF ANY GATE FAILS (HOLD Decision)

**Remediation Planning:**

**Failed Gate:** [Gate 1 / 2 / 3 / 4 / 5]

**Reason for Failure:**
```
Gate X failed because:
[Detailed explanation]

Specific criterion not met:
[Which metric/deliverable]

Root cause:
[Why did it miss]
```

**Remediation Plan:**
```
Action Items to Unblock:
1. [Action] — Owner: [Officer] — ETA: [date/time]
2. [Action] — Owner: [Officer] — ETA: [date/time]
3. [Action] — Owner: [Officer] — ETA: [date/time]

Gate Re-Assessment:
Date: [when will gate be re-assessed?]
Criteria: [what needs to pass for approval?]

Estimated Delay: [days]
New Launch Target: [new date, if applicable]
```

**HOLD Approval:**
```
🛑 PICARD'S RULING: HOLD — Remediation Required ⏳

Reason: [Gate X failed]
Remediation: [Summary of action items]
Re-Assessment Date: [when will we retry?]

Approval Authority: Picard ✓
Signed: Picard ________ (date/time)
```

**Notification:**
- Post to #section-31-dogfood: "Week 2 canary HOLD — remediation plan [details]"
- Notify GitHub: "Week 2 deployment delayed, ETA [new date]"
- Reschedule launch: "New target launch date: [date]"

---

## GATE ASSESSMENT SIGN-OFFS

### Officer Certifications (all must sign off)

**Worf (TPM Signing):**
- [ ] TPM signing deployed + tested
- [ ] All 5 test cases pass
- [ ] Audit trail operational
- [ ] Signature: ________ (date)

**Troi (Telemetry + UX):**
- [ ] Opt-out <2% (no anomalies)
- [ ] Sentiment ≥neutral
- [ ] A/B dashboard ready
- [ ] Signature: ________ (date)

**Yar (QA + Fidelity):**
- [ ] Token fidelity ≥99.99%
- [ ] Error rate <0.1%
- [ ] No critical alerts
- [ ] Signature: ________ (date)

**O'Brien (DevOps + Infrastructure):**
- [ ] Week 1 ops successful (all 7 criteria)
- [ ] Canary infrastructure deployed + tested
- [ ] Rollback SLA verified (<5 min)
- [ ] Signature: ________ (date)

**Quark (Finance):**
- [ ] Cost savings ≥50% (7-day average)
- [ ] Cost tracking stable
- [ ] Canary cost model ready
- [ ] Signature: ________ (date)

### Picard's Final Approval

**Picard (Arbiter + GO Authority):**
- [ ] All 5 gates assessed
- [ ] All officers signed off
- [ ] Decision: [GO / HOLD]
- [ ] Signature: ________ (date/time)

---

## SUMMARY TABLE

| Gate | Criterion | Result | Owner | Approval |
|------|-----------|--------|-------|----------|
| 1 | TPM Signing | ✅/❌ | Worf | ☑ |
| 2 | Opt-out <2% | ✅/❌ | Troi | ☑ |
| 3 | Fidelity ≥99.99% | ✅/❌ | Yar | ☑ |
| 4 | Week 1 Success | ✅/❌ | O'Brien | ☑ |
| 5 | Canary Ready | ✅/❌ | O'Brien | ☑ |

**Overall:** [5/5 PASS → GO] | [<5/5 PASS → HOLD]

**Final Decision:** [GO FOR WEEK 2 CANARY] ✅ OR [HOLD FOR REMEDIATION] ⏳

**Signed by Picard:** ________ (date/time)

---

**Distribution:**
- Picard (decision maker)
- O'Brien (ops execution)
- Yar (QA oversight)
- Troi (product/UX)
- Quark (finance tracking)
- Worf (security sign-off)
- Crew memory (tagged #section-31-week2-gates)

🖖 **ENGAGE!**
