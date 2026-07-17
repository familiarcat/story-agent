# STAGING DEPLOYMENT — EXECUTIVE SUMMARY
**Story Agent 5% Canary Wave — Ops Team Handoff**

---

## MISSION AT A GLANCE

**What:** Deploy 5% of Story Agent to staging environment (canary wave)  
**Who:** Operations team + DevOps (O'Brien leads)  
**When:** T+0 to T+30 (30 minutes total)  
**Authority:** Captain Picard (command) | Chief O'Brien (rollback)  
**Success Criteria:** All 6 gates pass at T+20 → Proceed to 95% escalation  
**Failure Path:** Any gate fails → Rollback (Section 9, ~10 seconds)  

---

## CONFIDENCE & RISK

| Metric | Value |
|---|---|
| Crew Confidence | **89%** ✅ |
| Blast Radius if Rollback | 5-10% user cohort, <10min |
| Pre-Rollback Detection Time | 30-60 seconds |
| Rollback Execution Time | 10 seconds (ALB) + 30s (cleanup) |
| Budget | $50 staging (15% buffer) |
| Go/No-Go Decision | T+20 (6 criteria) |

---

## CRITICAL PATH (TIMELINE)

```
T+00:00  Start Pre-Flight Checks (Section 1)
T+00:02  Pre-Flight Complete → Proceed to Terraform
T+02:00  Start Terraform Plan & Apply (Section 2)
T+07:00  Terraform Complete → EC2 Canary Running
T+07:00  Start ALB Routing Config (Section 3)
T+12:00  Routing Complete → 5% Traffic Routed
T+12:00  Start Health Observation (Section 4, 5 min loop)
T+17:00  Health Observation Complete → All Metrics Normal
T+17:00  Start Tester Provisioning (Section 5)
T+20:00  ⭐ GO/NO-GO GATE DECISION (Section 7)
T+20:00  IF ✅ PASS → Escalate to 95% (Section 8)
T+30:00  Final confidence vote for production merge (next sprint)
```

---

## THREE DOCUMENTS

### 1. **STAGING_DEPLOYMENT_RUNBOOK.md**
→ **USE THIS FOR STEP-BY-STEP EXECUTION**
- All sections (1-9) with exact AWS CLI commands
- Pre-filled thresholds and decision criteria
- Non-technical operator instructions
- Copy/paste-ready commands

### 2. **STAGING_DEPLOYMENT_DECISIONS.md**
→ **USE THIS FOR GO/NO-GO DECISIONS & RISK REVIEW**
- Detailed risk matrix (10 critical risks + failure modes)
- Full Go/No-Go checklist with evidence collection
- Crew consensus statement + confidence breakdown
- Contingency triggers

### 3. **STAGING_DEPLOYMENT_EXECUTIVE_SUMMARY.md** (this file)
→ **USE THIS FOR HIGH-LEVEL CONTEXT & HAND-OFF**
- Mission overview, timeline, contacts
- Critical decision points
- Quick reference for incident response

---

## KEY DECISION POINTS (When Ops Needs Guidance)

### Q: "What if [X] happens?"

**Latency spikes during health checks?**
→ First spike: monitor for 30s (could be transient)  
→ Second consecutive spike: trigger auto-rollback (Section 9.1)  
→ No human approval needed — rollback executes automatically

**Tester reports critical bug at T+18?**
→ Check Slack #story-agent-staging-canary  
→ If 1 bug: continue to gate decision at T+20  
→ If 2+ bugs from different testers: crew votes ❌ NO-GO at gate, freeze at 5%

**Terraform apply hangs past T+7?**
→ Something is wrong — do NOT proceed  
→ Check: terraform.log for stuck state  
→ Action: terraform destroy canary.plan (rollback), investigate

**Security finding detected (Worf)?**
→ Worf has UNILATERAL VETO — no discussion  
→ Automatic rollback (Section 9) executes immediately  
→ Post-incident review mandatory

**Cost exceeds $50 budget?**
→ Quark escalates to Picard  
→ Pause deployment pending budget approval  
→ Do NOT escalate to 95% without financial sign-off

---

## ESCALATION CONTACTS (by Role)

```
Captain Picard       (Command Authority)       picard@company.com       — Final decision on gate failures
Chief O'Brien        (Rollback Authority)      obrien@company.com       — Can execute rollback ANY TIME
Lt. Worf             (Security Veto)           worf@company.com         — Unilateral abort if security finding
Geordi La Forge      (Infrastructure)          geordi@company.com       — Terraform/AWS issues
Dr. Crusher          (Health/Monitoring)       crusher@company.com      — Metric interpretation
Quark                (Finance)                 quark@company.com        — Budget escalations
```

---

## SUCCESS LOOKS LIKE (T+20 Confidence Check)

✅ Canary EC2 instance healthy ("running" state)  
✅ Latency ≤1.2x prod baseline (no significant increase)  
✅ Error rate ≤1.2x prod baseline (no spike)  
✅ Tester cohort feedback: 0-1 critical bugs  
✅ Security clear (Worf sign-off, 0 HIGH findings)  
✅ Cost ≤$50 (on budget)  
✅ ALB routing 95/5 prod-to-canary  
✅ Crew consensus ≥9/11 votes "GO"  

**All 8 = ✅ PROCEED to 95% escalation**

---

## FAILURE LOOKS LIKE (Trigger Rollback)

❌ Pre-flight gate fails (IAM, terraform state, capacity, etc.)  
❌ Terraform apply shows unexpected destructive changes  
❌ EC2 instance never reaches "healthy" state  
❌ Latency spikes 2x consecutive checks  
❌ Error rate spikes 2x consecutive checks  
❌ Worf veto (security finding detected)  
❌ Tester cohort reports 2+ critical bugs  
❌ Crew consensus < 9/11 votes  

**Any 1 of 8 = ❌ PROCEED to Section 9 (ROLLBACK)**  
**Rollback completes in <30 seconds total**

---

## QUICK REFERENCE: COMMAND CHEAT SHEET

### Pre-Flight (Validate Everything Is Ready)
```bash
aws sts get-caller-identity
aws s3api get-bucket-encryption --bucket story-agent-terraform-state
aws iam simulate-principal-policy --policy-source-arn ... --action-names ec2:RunInstances ...
```

### Deploy (Create Canary Infrastructure)
```bash
cd terraform/
terraform plan -var-file=environments/staging.tfvars -out=canary.plan
terraform apply canary.plan
```

### Route (5% Traffic to Canary)
```bash
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,ForwardConfig="{TargetGroups=[{...Weight=95},{...Weight=5}]}"
```

### Monitor (Watch Health Metrics)
```bash
watch -n 10 'aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB ...'
./health-check-loop.sh  # Continuous 5-min loop
```

### Gate Decision (Review All 6 Criteria)
```bash
# See STAGING_DEPLOYMENT_DECISIONS.md Go/No-Go Checklist
# If all ✅ PASS → proceed to escalation
# If any ❌ FAIL → proceed to rollback
```

### Escalate (Shift to 95%)
```bash
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,ForwardConfig="{TargetGroups=[{...Weight=5},{...Weight=95}]}"
```

### Rollback (Emergency Only)
```bash
# Step 1: Revert traffic to 100% prod
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,TargetGroupArn=...PROD...

# Step 2: Terminate canary instance
aws ec2 terminate-instances --instance-ids $CANARY_INSTANCE_ID

# Step 3: Destroy terraform
cd terraform/ && terraform destroy -auto-approve

# ✅ Complete in ~30 seconds
```

---

## WHAT COULD GO WRONG (5 Most Likely Scenarios)

| Scenario | Probability | Detection | Fix Time |
|---|---|---|---|
| Instance health checks fail | 8% | 30s | Terminate + rollback (30s total) |
| Latency spike during observation | 12% | 60s | Auto-rollback via health loop (10s) |
| Tester reports critical bug | 10% | 5 min | Gate decision: freeze at 5% or rollback |
| Terraform apply hangs | 3% | 2 min | Abort + terraform destroy (30s) |
| Security finding detected | 4% | Real-time | Worf veto → auto-rollback (10s) |

---

## FAQs FOR OPS TEAM

**Q: Do I need to babysit this for 30 minutes?**  
A: Yes. Monitoring loop runs continuously (Section 4). You're watching metrics in real-time. If things go wrong, you execute rollback immediately.

**Q: What if I make a mistake in the AWS CLI command?**  
A: Terraform state is backed up at T+7. Rollback recovers from that. We can re-deploy after investigation.

**Q: Can I skip the pre-flight checks?**  
A: No. Picard + Worf explicitly require all 6 pre-flight gates (Section 1). They catch infrastructure issues before deployment.

**Q: What if the gate decision is split (some crew say GO, some say NO)?**  
A: Consensus threshold is 9/11. If crew splits 8/11 or less, default is NO-GO → rollback.

**Q: How long does rollback actually take?**  
A: ~30 seconds total. ALB revert (5s) + instance termination (5s) + terraform destroy (10s) + verification (5s).

**Q: Who can override Worf's veto?**  
A: Nobody. Worf's security veto is absolute. If security finding detected, rollback is automatic.

**Q: Do I need AWS credentials stored locally?**  
A: Use AWS_PROFILE environment variable pointing to `staging-deploy` role. Never commit creds to git. Use ~/.aws/credentials (local, not in repo).

---

## RUNBOOK NAVIGATION

| Task | Document | Section |
|---|---|---|
| Execute deployment | STAGING_DEPLOYMENT_RUNBOOK.md | 1-8 (sequential) |
| Verify go/no-go | STAGING_DEPLOYMENT_DECISIONS.md | Go/No-Go Checklist |
| Review risks | STAGING_DEPLOYMENT_DECISIONS.md | Risk Matrix |
| Emergency rollback | STAGING_DEPLOYMENT_RUNBOOK.md | 9 (Rollback Procedure) |
| Post-incident | STAGING_DEPLOYMENT_DECISIONS.md | Crew Consensus (post-mortem) |

---

## COMMAND AUTHORITY STATEMENT

```
"Execute this deployment with confidence. We have built redundancy, 
monitoring, and rapid rollback. You have my authority to proceed.

If anything goes wrong, execute Section 9 without waiting for approval.
That's why Chief O'Brien has unilateral rollback authority.

Make it so."

                    — Captain Jean-Luc Picard
                      Starship Story Agent Commanding Officer
```

---

## FINAL CHECKLIST (Before You Start)

- [ ] You have read the full STAGING_DEPLOYMENT_RUNBOOK.md
- [ ] You have AWS credentials configured (AWS_PROFILE=staging-deploy)
- [ ] You have Slack channel open (#story-agent-staging-canary)
- [ ] You have terminal ready to execute Section 1 (Pre-Flight)
- [ ] You understand rollback procedure (Section 9)
- [ ] Captain Picard has given the "go-ahead" command
- [ ] All crew members have given thumbs-up (consensus check)

**When all boxes checked: START SECTION 1 (T+0)**

---

**📁 DOCUMENTS:**
- `/Users/bradygeorgen/Developer/story-agent/STAGING_DEPLOYMENT_RUNBOOK.md` ← **Main playbook**
- `/Users/bradygeorgen/Developer/story-agent/STAGING_DEPLOYMENT_DECISIONS.md` ← **Decision guide**
- `/Users/bradygeorgen/Developer/story-agent/STAGING_DEPLOYMENT_EXECUTIVE_SUMMARY.md` ← **This file**

**🚀 Ready to deploy. Picard out.**

