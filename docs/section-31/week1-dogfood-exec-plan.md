# Week 1 Dogfood Rollout — Executive Plan
**Section 31 Phase 3 Execution | Date: 2026-07-10**

---

## Overview
Week 1 dogfood deploys VSCode native provider hijack (forced OpenRouter routing) to 10 trusted internal testers + core crew. No Copilot fallback. Daily standups, rollback drills, metrics tracking. Go/no-go checkpoint: Worf's TPM signing + crew infra :3103 readiness.

---

## Tester Roster (10 members)

| # | Name | Role | Expertise | Why Selected |
|---|------|------|-----------|--------------|
| 1 | Riker | DevOps | Infrastructure, routing | Core crew — validates deployment layer |
| 2 | Yar | QA | Testing, token validation | Core crew — monitors error budgets & fidelity |
| 3 | Troi | Product | UX/telemetry | Core crew — captures sentiment & regressions |
| 4 | Quark | Finance | Cost analysis | Core crew — ROI validation |
| 5 | Data | Analysis | Logic, debugging | Core crew — deepseek model stability |
| 6 | La Forge | Performance | Latency, optimization | Internal beta — p99 latency baseline |
| 7 | Picard | Leadership | Decisions, edge cases | Core crew — arbiter, exception handling |
| 8 | Worf | Security | Token signing, fallback | Core crew — TPM readiness validation |
| 9 | [Internal Beta Partner A] | Development | IDE usage patterns | Trusted external — real-world workflow |
| 10 | [Internal Beta Partner B] | Development | Long-session stability | Trusted external — endurance testing |

**Recruitment SLA:** Confirmed by EOD 2026-07-10. Onboarding packet sent Day 1.

---

## Daily Standup Cadence
- **Time:** 9:00 AM PT (fixed, no drift)
- **Duration:** 15 min (strictly)
- **Participants:** O'Brien (lead), Yar, Troi, Quark, Picard (decision arbiter)
- **Channel:** #section-31-dogfood (Slack)
- **Cadence:** Daily, Mon–Fri, 7 days/week during Week 1
- **Agenda:**
  1. Overnight metrics summary (opt-out %, error %, latency p99, token cost/user)
  2. Blocker escalation (crew infra down? token fidelity alert? UX regression?)
  3. Rollback drill results (if scheduled — daily drills Tue/Thu/Sat)
  4. Go/no-go for next 24h

---

## Rollback Procedures

### scripts/rollback_dogfood.sh
**Status:** [TO VALIDATE]
- **Function:** Disable native provider, revert to Copilot-only for all testers
- **Trigger:** Manual (via standup decision) OR automatic (3 token validation failures in 5 min)
- **Execution SLA:** <5 minutes end-to-end (code change + extension reload)
- **Validation:** Test rollback → normal operation cycle at least once before go
- **Owner:** O'Brien

### Fallback Logic (nativeChatProvider.ts)
- **Status:** Deployed (Phase 2 b0ef807)
- **Function:** On crew infra failure, surface error message + guide user
- **Test:** Pre-flight: simulate crew :3103 down, verify fallback behavior

---

## Monitoring Dashboards & Metrics

### Real-time Tracking (Live Update Every 30s)
1. **Opt-out Rate** (target: <2%)
   - Daily rolling: % of testers who used Copilot toggle
   - Alert: >1% triggers Troi review, >3% escalates to Picard

2. **Error Rate** (target: <0.1%)
   - Daily: % of chat requests that fail or timeout (crew unavail + transient net)
   - Alert: >0.5% rolls back automatically

3. **Latency p99** (target: <50ms above baseline)
   - Daily: Copilot p99 baseline measure Day 1 (Copilot-only mode), then OpenRouter p99
   - Alert: >100ms above baseline → Geordi reviews + optimizes

4. **Token Expenditure per User** (target: parity or savings vs. Copilot baseline)
   - Daily: $/user for OpenRouter (by feature: chat, agent, inline, review)
   - Comparison: Copilot baseline ($/user, hypothetical) established Day 1
   - Alert: >2σ anomaly (>20% deviation) → Quark investigates

5. **Token Capture Fidelity** (target: 99.99%)
   - Real-time: % of OpenRouter requests checksummed + verified against billing
   - Alert: <99.5% → Yar audit, possible rollback

### Dashboard Owner: Troi (UI/Web UI @ `/dogfood-dashboard`)

---

## Error Taxonomy (Yar's Classification)

| Category | Definition | Fallback? | SLA |
|----------|-----------|-----------|-----|
| **Crew Infra Down** | Agent :3103 unreachable | Yes, Copilot | <2 min detect, <5 min rollback |
| **Token Validation Fail** | Checksum mismatch >1% | Yes, auto-fallback after 3 in 5m | Per rollout.yml |
| **User-Facing Regression** | Chat quality issues, timeouts | Manual review | Flagged in standup |
| **Transient Network** | Intermittent timeouts | Retry (3x, then fallback) | <10s retry budget |

---

## Success Criteria (Week 1 Gate to Week 2 Canary)

| Metric | Target | Owner |
|--------|--------|-------|
| Opt-out Rate | <2% | Troi |
| Error Rate | <0.1% | Yar |
| Token Fidelity | ≥99.99% | Yar |
| Latency p99 | <50ms above Copilot baseline | Geordi |
| Zero crew infra outages >30 min | 100% uptime | Worf |
| Cost tracking active & audited | All features instrumented | Quark |
| Tester feedback sentiment | Net positive or neutral | Troi |

**Go/No-Go Decision:** Friday EOD 2026-07-10 (Picard + crew consensus, requires all 6 metrics met)

---

## Pre-Flight Checklist (Go-Live Readiness)

- [ ] Crew :3103 agent confirmed running & responsive
- [ ] Worf: TPM signing infrastructure staged (needed for Week 2 gate, not Day 1 blocker)
- [ ] rollback_dogfood.sh tested end-to-end (deploy → rollback → deploy cycle)
- [ ] Troi: Telemetry collectors live (opt-out, error, sentiment)
- [ ] Yar: Token validation meter + alert rules active
- [ ] Quark: Cost baseline measured (Copilot p99, token cost per user)
- [ ] Picard: Tester messaging sent (expectations, standup time, how to report)
- [ ] O'Brien: Monitoring dashboard deployed & initial metrics populated
- [ ] All: Standup Slack channel created, invite sent to testers

---

## Tester Communication Template

**Subject:** Section 31 Week 1 Dogfood — You're Invited to Beta Test VSCode Chat on OpenRouter

Hi [Tester Name],

You've been selected as a trusted dogfood tester for **Section 31**: our experiment to make OpenRouter the default chat provider in VSCode.

**What to expect:**
- VSCode chat now routes to our OpenRouter crew by default (not Copilot).
- Daily rollback drills (don't worry—you'll see a "rolling back to Copilot" message; just refresh the extension).
- Daily standup at 9am PT to share feedback and metrics.
- If anything breaks, we'll rollback within 5 minutes.

**How to report issues:**
1. Post in #section-31-dogfood (Slack)
2. Include: error message, chat feature (ask/agent/inline/review), time of day
3. Yar or Troi will investigate

**SLA:** We're collecting real-world metrics. If crew infra goes down or error rates spike, we rollback automatically. Your feedback is critical to validating this works.

**Standup:** Daily 9am PT in #section-31-dogfood (15 min)

Welcome aboard. — Picard & the crew

---

## Crew Sign-Offs

| Officer | Domain | Sign-Off |
|---------|--------|----------|
| **O'Brien** | DevOps/rollback/monitoring | Runbook ready ✓ / Needs X days |
| **Yar** | QA/validation/error taxonomy | Alert rules live ✓ / TBD |
| **Troi** | Telemetry/UX/comms | Collectors + tester messaging ✓ / TBD |
| **Quark** | Cost tracking/baseline | Baseline measured ✓ / TBD |
| **Picard** | Go/no-go arbiter | Ready to proceed → pending sign-offs above |

---

## Timeline
- **Day 1 (2026-07-10 EOD):** Tester roster confirmed, pre-flight checklist complete, go/no-go decision
- **Day 2 (2026-07-11):** Testers onboarded, dashboard live, first standup
- **Days 3–7 (2026-07-12–18):** Daily standups, metrics collection, rollback drills
- **Week 1 Retrospective (EOD 2026-07-18):** Success criteria eval → Week 2 canary decision

---

## Ownership
- **Overall Lead:** O'Brien (DevOps)
- **Executive Sponsor & Gate:** Picard
- **Success Metrics & Go/No-Go:** Crew consensus (all five officers)
