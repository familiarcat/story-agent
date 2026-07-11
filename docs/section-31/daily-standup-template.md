# Week 1 Daily Standup Template

**Date:** [YYYY-MM-DD]  
**Day:** [1-7]  
**Channel:** #section-31-dogfood

---

## O'BRIEN — DevOps & Monitoring

**Metrics Overnight (24h period):**
- Opt-out rate: ___% (target <2%)
- Error rate: ___% (target <0.1%)
- Latency p99: +___ms (target <+50ms)
- Cost/user: $____ (Copilot baseline $2.00)
- Uptime: ___% (target 100%)

**Incidents:** [none / describe]

**Rollback Drill** (if scheduled today):
- Status: [PASS / FAIL]
- Time to complete: ____ min (SLA <5 min)
- Issues: [none / describe]

**Anomalies Detected:** [none / describe]

**Status:** GREEN / YELLOW / RED

**Recommendation:** PROCEED to next day / ESCALATE for investigation

---

## YAR — QA & Error Monitoring

**Error Rate & Breakdown:**
- Total error rate: ___% (target <0.1%)
- Crew Infra Down: ___% of errors
- Token Validation Fail: ___% of errors
- User Regression: ___% of errors
- Transient Network: ___% of errors
- Unknown: ___% of errors

**Token Fidelity Audit:**
- Fidelity rate: ___% (target ≥99.99%)
- Checksum mismatches: [count]
- Alert triggered: YES / NO

**Fallback Events:**
- Auto-fallback triggers: [count]
- All recovered: YES / NO
- Any data loss: YES / NO

**Status:** GREEN / YELLOW / RED

**Recommendation:** PROCEED / ESCALATE

---

## TROI — Product & UX Monitoring

**Sentiment Breakdown (overnight):**
- Thumbs up: ___%
- Neutral: ___%
- Thumbs down: ___%

**Opt-out Incidents:**
- Opt-out rate: __% (target <2%)
- Testers who switched: [count]
- Reasons (if reported): [describe]

**Synthetic Test Status** (if deployed):
- Pass rate: ___%
- Test failures: [count]
- Escalations triggered: YES / NO

**UX Issues Reported:**
- [none / list issues]

**Status:** GREEN / YELLOW / RED

**Recommendation:** PROCEED / ESCALATE

---

## QUARK — Finance & Cost Tracking

**Daily Cost Summary:**
- Total spend overnight: $____
- Cost/user: $____
- Cost vs Copilot baseline ($2.00): $____ difference
- Savings percentage: ___%

**Cost by Feature:**
- Ask: $____
- Agent: $____
- Inline: $____
- Review: $____

**Anomalies Detected:**
- Anomalies (>2σ): [count]
- Tester(s) affected: [names]
- Root cause: [investigate]

**Status:** GREEN / YELLOW / RED

**Recommendation:** PROCEED / ESCALATE

---

## PICARD — Arbiter Synthesis

**Overall Status:** GREEN / YELLOW / RED

**Decision:** PROCEED to next day / ESCALATE for remediation

**Notes:**
[Synthesis of all officer reports + any escalations]

---

## ESCALATION DECISIONS (if any)

**Escalation 1:**
- Issue: [describe]
- Root cause: [TBD / describe]
- Remediation: [action]
- Owner: [officer]
- ETA: [by when?]

---

## DRILL RESULTS (Tue/Thu/Sat if scheduled)

**Drill Type:** Rollback dogfood (disable hijack → verify revert → re-enable hijack)

**Start Time:** [HH:MM PT]  
**End Time:** [HH:MM PT]  
**Duration:** ____ min

**Steps:**
1. [ ] Execute scripts/rollback_dogfood.sh
2. [ ] Verify extension reverts to Copilot
3. [ ] Confirm <5 min SLA
4. [ ] Re-enable hijack
5. [ ] Verify crew routing restored

**SLA Achievement:** YES / NO (if NO, investigate why)

**Issues Encountered:** [none / describe]

**Lessons Learned:** [any improvements for next drill?]

---

**STANDUP CALL:** 09:00–09:15 PT (sync discussion)

**Participants:** O'Brien, Yar, Troi, Quark, Picard

**Agenda:**
1. O'Brien: 3-min ops summary
2. Yar: 2-min error summary
3. Troi: 2-min UX summary
4. Quark: 2-min cost summary
5. Picard: 2-min decision + escalation resolution
