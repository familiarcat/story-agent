# Crew Briefing Card — Staging Deployment Prep (2026-07-17)

## STATUS: MISSION ACTIVE — 90 MIN EXECUTION WINDOW

All VSCode extension Phase 1 fixes committed + tested. Ready for staging deployment gate.

---

## TEAM ASSIGNMENTS (Autonomous Execution)

### 🧪 TEAM 1: QA & E2E Testing [T+0 to T+30]
**Lead**: Lt. Tasha Yar | **Support**: Dr. Beverly Crusher

**Execute 5 E2E Tests** (5 min each):
1. HTTP timeout recovery (30s AbortController)
2. Message batching (5 msgs, 0 drops)
3. Rate limit backoff (429 → 60s wait)
4. Error sanitization (no token leaks)
5. WebSocket routing (WS protocol confirmed)

**Deliverable**: "Staging QA Cleared ✅" + latency/error metrics

---

### 📊 TEAM 2: Production Monitoring [T+0 to T+45]
**Lead**: Geordi La Forge | **Support**: Chief Miles O'Brien

**Deploy 3 CloudWatch Alarms**:
1. Connection failure >5%/min
2. Rate limits (429) >10/min
3. Message loss >1/hour

**Plus**: Slack integration + live metrics dashboard

**Deliverable**: "Production monitoring ready ✅"

---

### 📖 TEAM 3: Documentation & Runbook [T+0 to T+45]
**Lead**: Lt. Uhura | **Support**: Counselor Deanna Troi

**Create 3 Ops Documents**:
1. Troubleshooting guide (common errors + fixes)
2. Metrics interpretation (what each metric means)
3. Escalation procedures (when to page, how to escalate)

**Deliverable**: "Ops documentation complete ✅"

---

### ✅ TEAM 4: Deployment Readiness [T+0 to T+75]
**Lead**: Commander William Riker | **Support**: Commander Data

**Orchestrate All Teams + Aggregate Results**:
- Every 15 min: Status sync with Teams 1-3
- T+75: Synthesize final go/no-go decision
- Route to Picard for executive approval

**Deliverable**: "Staging deployment gate: GO ✅" (or blockers identified)

---

### 💾 TEAM 5: Knowledge Base & Learnings [T+60 to T+90]
**Lead**: Commander Data | **Support**: Counselor Deanna Troi

**Store 5 Crew Learnings to RAG**:
1. Error sanitization pattern (reusable, 0.95 confidence)
2. Rate limit backoff strategy (resilience pattern)
3. Message batching race condition (challenge + resolution)
4. Phase 1 vs Phase 2 execution speed (predicted 30 min/fix, actual 1.6 min/fix!)
5. Next VSCode feature rollout template (process improvement)

**Deliverable**: "RAG learnings stored ✅" (tagged: vscode-extension, staging-prep)

---

## EXECUTION TIMELINE

| Time | Event | Owner |
|------|-------|-------|
| T+0 | All teams start | All |
| T+15 | Status check #1 | Riker |
| T+30 | Status check #2 | Riker |
| T+45 | Status check #3 | Riker |
| T+60 | Teams 1-3 complete; Team 5 begins | Data |
| T+75 | Final decision made | Riker |
| T+90 | Mission complete | All |

---

## GO/NO-GO DECISION CHECKLIST

```
[ ] Team 1: 5/5 E2E tests pass
[ ] Team 2: 3 alarms armed + Slack verified
[ ] Team 3: 3 docs complete + reviewed
[ ] Team 4: Checklist 100% complete
[ ] Team 5: 5 learnings stored + tagged
[ ] No critical blockers identified
[ ] Ops team can execute procedures
[ ] Crew consensus: READY FOR STAGING
```

**If all checked**: Route to Picard → "STAGING DEPLOYMENT GATE: GO ✅"
**If any blocker**: Route to Picard → "Blockers identified" + remediation plan

---

## DEPLOYMENT (If Approved)

```bash
pnpm deploy:auto -- --apply --stage=staging --target=vscode-extension
```

---

## CREW RESOURCES

- Full plan: `/Users/bradygeorgen/Developer/story-agent/STAGING_DEPLOYMENT_PREP.md`
- Prior learnings: Recall crew RAG for Phase 1 patterns (error handling, rate limiting, messaging)
- Team leads: Use crew memory tools to recall context before tasks
- Riker: Coordinate via 15-min status sync + escalate blockers immediately

---

## CONTACTS

- **Team 1 (QA)**: Yar (lead), Crusher (health metrics)
- **Team 2 (Monitoring)**: Geordi (lead), O'Brien (DevOps)
- **Team 3 (Docs)**: Uhura (lead), Troi (stakeholder alignment)
- **Team 4 (Orchestration)**: Riker (lead), Data (support)
- **Team 5 (Learnings)**: Data (lead), Troi (insight synthesis)
- **Executive**: Picard (final approval)

---

**MISSION START: NOW**
**TARGET: T+90 min**
**DECISION POINT: T+75 min**

Make it so.
