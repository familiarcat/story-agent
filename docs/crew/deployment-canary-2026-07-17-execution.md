# Canary Deployment Execution Record — 2026-07-17

## Deployment Authorization
- **Crew Vote**: 7-0 APPROVED
- **Confidence Level**: 85%
- **Staging Validation**: 5/5 E2E tests pass, monitoring live, ops runbooks complete
- **Authorized by**: Crew consensus (Picard, Riker, Data, Geordi, O'Brien, Yar, Worf)

## Deployment Objective
Execute a staged rollout of the Story Agent production image with:
- **Traffic Split**: 95% production (stable) / 5% canary (staging)
- **Duration**: 24-hour observation window
- **Rollback Condition**: Any critical alert or manual escalation

## Pre-Deployment Checklist
- [x] Terraform canary infrastructure validated
- [x] Weighted target group routing configured
- [x] CloudWatch alarms for rollback triggers created
- [x] SNS notification topic established
- [x] Canary task definition with CANARY_VARIANT=true flag
- [x] Service discovery registered for canary
- [x] Dashboard created for real-time monitoring
- [x] Crew monitoring rotation scheduled

## Terraform Variables (Deploy-Time)
```hcl
enable_canary_deployment = true
mcp_image_canary        = "<staging-image-digest>"
canary_alert_email      = "<crew-alert-email>"
```

## Deployment Commands

### Step 1: Validate Terraform
```bash
cd terraform
terraform init
terraform plan -var="enable_canary_deployment=true" -var="mcp_image_canary=<staging-digest>"
```

### Step 2: Apply Terraform (BILLABLE)
```bash
terraform apply \
  -var="enable_canary_deployment=true" \
  -var="mcp_image_canary=<staging-digest>" \
  -var="canary_alert_email=crew@story-agent.internal"
```

### Step 3: Monitor Canary (24 hours)
- Real-time dashboard: CloudWatch → story-agent-canary-monitoring
- Alert topics: AWS SNS → story-agent-canary-alerts
- Log streams: CloudWatch Logs → /ecs/story-agent-mcp-canary

## Success Criteria (First 5 Minutes)
- [ ] Canary service deployed: desired=1, running=1
- [ ] ALB routing: traffic split verified (95/5)
- [ ] Health checks: both target groups 1/1 healthy
- [ ] Errors: zero 5xx errors in first 5 minutes
- [ ] Latency: canary ≤ production +10%

## Monitoring Thresholds (24-Hour Window)
| Metric | Threshold | Action |
|--------|-----------|--------|
| Latency | +10% vs baseline | Alert + manual review |
| 5xx Errors | >0.5% | Alert + escalate |
| Task Health | <1/1 running | Immediate alert + manual review |
| Connection Pool Wait | >100ms | Alert + manual review |

## Rollback Procedure
1. **Manual Rollback**: Set `enable_canary_deployment = false` in Terraform
2. **Auto Rollback**: Circuit breaker enabled; failed health checks trigger ECS auto-rollback
3. **Crew Escalation**: Riker arbitrates any ambiguous decisions

## Post-24h Decision Gate
After 24 hours of observation, the crew will decide:
- **PROMOTE**: Scale canary to 50% traffic and continue observation
- **HOLD**: Keep at 5% for extended observation
- **ROLLBACK**: Return to 100% production

## Documentation
- Terraform config: `/terraform/ecs.tf`, `/terraform/alb.tf`, `/terraform/canary-monitoring.tf`
- Monitoring: CloudWatch → story-agent-canary-monitoring dashboard
- Crew Memory: Stored in RAG for post-deployment analysis

## Execution Log
- **Initiated**: 2026-07-17T14:32:00Z
- **Crew Approval**: 2026-07-17T14:35:00Z (consensus vote)
- **Terraform Plan**: [pending deployment]
- **Terraform Apply**: [pending deployment]
- **Canary Live**: [pending activation]
- **Observation Window**: 2026-07-18T14:35:00Z (24h cutoff)

---

**Crew Responsibility Matrix**:
- **Geordi La Forge**: Infrastructure provisioning, deployment health
- **Dr. Beverly Crusher**: System health diagnostics, anomaly detection
- **Commander Riker**: Tactical decisions, escalations, manual interventions
- **Chief O'Brien**: Ops validation, CI/CD integration
- **Worf**: Security audit of deployment changes
