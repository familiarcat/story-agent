# Story Agent: Automated Deployment & Stress Testing (2-Week Cadence)

## Overview

This document guides the deployment of:
1. **8 System Improvements** from crew training exercise (prioritized, phased)
2. **AWS Lambda + EventBridge** infrastructure for 2-week stress testing
3. **Comprehensive Stress Testing Suite** (7Q reproducibility + infrastructure checks)

**Timeline**: Phased rollout over 3-4 weeks
- **Week 1**: Infrastructure (Lambda, EventBridge, SNS) + HIGH-priority improvements
- **Week 2**: MEDIUM-priority improvements + validation
- **Week 3**: LOW-priority improvements + full suite testing
- **Ongoing**: 2-week automated stress testing via EventBridge

---

## Part 1: Deploy AWS Infrastructure

### Prerequisites

```bash
# Ensure you have AWS CLI configured
aws configure

# Install Terraform (v1.5+)
terraform --version

# Export required environment variables
export SUPABASE_URL="..."  # from ~/.alexai-secrets
export SUPABASE_KEY="..."  # from ~/.alexai-secrets
export GITHUB_TOKEN="..."  # from ~/.alexai-secrets
```

### Deploy Lambda + EventBridge

```bash
cd /Users/bradygeorgen/Developer/story-agent/terraform

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan \
  -var="supabase_url=$SUPABASE_URL" \
  -var="supabase_key=$SUPABASE_KEY" \
  -var="github_token=$GITHUB_TOKEN" \
  -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Capture outputs
terraform output -json > stress-test-infrastructure.json
```

### Verify Deployment

```bash
# Check Lambda function exists
aws lambda get-function --function-name story-agent-stress-test-orchestrator

# Check EventBridge rule is active
aws events describe-rule --name story-agent-stress-test-14d

# Check SNS topic was created
aws sns list-topics | grep story-agent-stress-test-alerts

# Test Lambda invocation (dry run)
aws lambda invoke \
  --function-name story-agent-stress-test-orchestrator \
  --payload '{"action":"run_full_suite","mode":"test"}' \
  response.json && cat response.json
```

---

## Part 2: Deploy 8 System Improvements

### HIGH Priority (Week 1)

#### 1. Dependency Tracking Graph (Data)
- **Owned by**: Data (architecture)
- **File**: `packages/mcp-server/src/lib/dependency-graph.ts` (new)
- **Scope**: Build DAG of all story dependencies, detect cycles, export to visualization
- **Success Criteria**:
  - All dependencies expressible as (phase1_story) -> (phase2_story)
  - Cycle detection with alert
  - GraphQL schema for querying
  - Cost: <$0.001/query
- **Deploy**: `pnpm --filter @story-agent/mcp-server run build && npm test`

#### 2. Proactive Stall Detection (Troi + Uhura)
- **Owned by**: Troi (stakeholder psychology) + Uhura (communications)
- **File**: `packages/mcp-server/src/lib/crew-stall-detector.ts` (new)
- **Scope**: Detect when crew member hasn't responded in 5 min, escalate via SNS/Slack
- **Success Criteria**:
  - 5-min heartbeat window
  - Automatic escalation (Troi psychology check + Uhura notification)
  - <2sec alert delivery (Uhura's SLA)
  - Rollback: resume stalled task with fresh crew member
- **Deploy**: `pnpm --filter @story-agent/mcp-server run build && npm test`

#### 3. Multi-Layer I/O Sandboxing (Worf + Obrien)
- **Owned by**: Worf (security) + Obrien (devops)
- **File**: `packages/mcp-server/src/lib/worfgate-sandbox.ts` (enhancement)
- **Scope**: K8s PVC + kernel seccomp + process cgroup limits
- **Success Criteria**:
  - Filesystem writes limited to workspace only
  - No process escape possible
  - Network isolation (Supabase + GitHub only)
  - Cost: no additional overhead
- **Deploy**: Requires cluster reconfiguration; see `docker-compose.dev.yml` + Fargate task def

### MEDIUM Priority (Week 2)

#### 4. 3-Tier Exception Protocol (Worf)
- **Owned by**: Worf (security)
- **File**: `packages/mcp-server/src/lib/worfgate-exception-protocol.ts` (new)
- **Scope**: Tier 1 (auto-remediate), Tier 2 (Worf review), Tier 3 (Picard override)
- **Success Criteria**:
  - Tier 1 resolves 90% of exceptions in <5min
  - Tier 2 response <30min
  - Tier 3 requires documented rationale
  - SLA: 60min total resolution
- **Deploy**: Database schema update + Lambda refactor

#### 5. Incident Response SLA (Crusher + Worf)
- **Owned by**: Crusher (health) + Worf (security)
- **File**: `packages/mcp-server/src/lib/incident-response-sla.ts` (new)
- **Scope**: Detect (5min) → Investigate (30min) → Remediate (60min)
- **Success Criteria**:
  - Automated detection via CloudWatch + Supabase anomaly
  - Investigation playbook stored in Supabase
  - Remediation (rollback/patch) tracked with metrics
- **Deploy**: Database schema + Lambda function

#### 6. Cost Transparency Dashboard (Quark)
- **Owned by**: Quark (finance)
- **File**: `packages/ui/app/dashboard/cost-transparency.tsx` (new Next.js route)
- **Scope**: Real-time cost tracking by crew member, test scenario, client
- **Success Criteria**:
  - Live Cost Explorer integration
  - Forecast drift detection
  - Crew-member-specific cost attribution
  - Drill-down to individual calls
- **Deploy**: `pnpm --filter @story-agent/ui run build`

#### 7. Phased Change Management (Picard)
- **Owned by**: Picard (command)
- **File**: `packages/mcp-server/src/lib/phased-change-manager.ts` (new)
- **Scope**: Stage deployments (canary → staging → prod) with rollback window
- **Success Criteria**:
  - 5% canary for 12 hours, 25% staging for 24 hours
  - Automated rollback if error rate >2%
  - All crew members notified at each phase
  - Zero production impact during testing
- **Deploy**: CI/CD pipeline enhancement + Lambda orchestration

### LOW Priority (Week 3+)

#### 8. Psychological Stress Monitoring (Troi + Crusher)
- **Owned by**: Troi (stakeholder) + Crusher (health)
- **File**: `packages/mcp-server/src/lib/crew-psychology-monitor.ts` (new)
- **Scope**: Correlate crew member behavior patterns with system stress
- **Success Criteria**:
  - Perfectionism detection (Geordi pattern: >4 retries → escalate)
  - Conflict detection (Worf+Riker tension >25% → mediate)
  - Fatigue detection (degrading response quality → rest rotation)
- **Deploy**: Database schema + observability pipeline

---

## Part 3: Deploy Supabase Schema for Stress Testing

### Create stress test tables

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Create migration
supabase migration new create_stress_test_tables

# Edit supabase/migrations/<YYYYMMDDHHMMSS>_create_stress_test_tables.sql
# (schema defined below)

# Apply migration
supabase db push
```

### Schema

```sql
-- Story Agent: Stress Testing Schema

-- Stress test run metadata
CREATE TABLE IF NOT EXISTS sa_stress_test_results (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  total_cost_usd NUMERIC(10, 6),
  tests_passed INTEGER,
  tests_failed INTEGER,
  tests_warned INTEGER,
  production_impact BOOLEAN,
  test_details JSONB,
  summary_metrics JSONB,
  crew_recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stress_test_results_created_at ON sa_stress_test_results(created_at DESC);
CREATE INDEX idx_stress_test_results_run_id ON sa_stress_test_results(run_id);

-- Crew member heartbeats (for stall detection)
CREATE TABLE IF NOT EXISTS sa_crew_heartbeats (
  id BIGSERIAL PRIMARY KEY,
  crew_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'idle', 'working', 'stalled'
  last_task TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crew_heartbeats_crew_id ON sa_crew_heartbeats(crew_id);
CREATE INDEX idx_crew_heartbeats_created_at ON sa_crew_heartbeats(created_at DESC);

-- WorfGate security exceptions
CREATE TABLE IF NOT EXISTS sa_worfgate_audit (
  id BIGSERIAL PRIMARY KEY,
  classification TEXT NOT NULL, -- 'INJECTION_ATTEMPT', 'OUT_OF_SCOPE', 'SENSITIVE_DATA_EXPOSURE'
  query TEXT,
  crew_id TEXT,
  confidence NUMERIC(3, 2),
  resolution_time_ms INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_worfgate_audit_classification ON sa_worfgate_audit(classification);
CREATE INDEX idx_worfgate_audit_created_at ON sa_worfgate_audit(created_at DESC);

-- Credential audit trail
CREATE TABLE IF NOT EXISTS sa_worfgate_credential_audit (
  id BIGSERIAL PRIMARY KEY,
  credential_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'read', 'write', 'rotate'
  accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_credential_audit_credential_id ON sa_worfgate_credential_audit(credential_id);
CREATE INDEX idx_credential_audit_client_id ON sa_worfgate_credential_audit(client_id);

-- Dependency tracking
CREATE TABLE IF NOT EXISTS sa_story_dependencies (
  id BIGSERIAL PRIMARY KEY,
  source_story_id TEXT NOT NULL,
  target_story_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL, -- 'blocking', 'related', 'data_flow'
  detected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_story_dependencies_source ON sa_story_dependencies(source_story_id);
CREATE INDEX idx_story_dependencies_target ON sa_story_dependencies(target_story_id);

-- Cost tracking (per crew member, per scenario)
CREATE TABLE IF NOT EXISTS sa_cost_tracking (
  id BIGSERIAL PRIMARY KEY,
  crew_id TEXT,
  scenario_id TEXT,
  operation TEXT,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cost_tracking_crew_id ON sa_cost_tracking(crew_id);
CREATE INDEX idx_cost_tracking_created_at ON sa_cost_tracking(created_at DESC);

-- GRANT permissions
GRANT SELECT, INSERT ON sa_stress_test_results TO authenticated;
GRANT SELECT ON sa_crew_heartbeats TO authenticated;
GRANT SELECT ON sa_worfgate_audit TO authenticated;
GRANT SELECT ON sa_worfgate_credential_audit TO authenticated;
GRANT SELECT ON sa_story_dependencies TO authenticated;
GRANT SELECT ON sa_cost_tracking TO authenticated;
```

---

## Part 4: Deploy Code Improvements

### Build + Test

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Build all packages
pnpm run build

# Run tests
pnpm run check

# Verify no errors
pnpm run lint
```

### Deploy (CI/CD via GitHub Actions)

```bash
# Commit improvements
git add packages/ terraform/ supabase/migrations/
git commit -m "feat: deploy 8 system improvements + stress testing infrastructure"

# Push to main (triggers CI)
git push origin main

# Wait for CI checks to pass
# Then auto-merge + auto-deploy to Fargate (per autonomy envelope)
```

---

## Part 5: Monitor & Validate

### First Stress Test Run (Manual)

```bash
# Invoke Lambda manually to test
aws lambda invoke \
  --function-name story-agent-stress-test-orchestrator \
  --payload '{"action":"run_full_suite","mode":"manual","source":"cli"}' \
  /tmp/stress-test-result.json

# View results
cat /tmp/stress-test-result.json | jq '.summaryMetrics'

# Check Supabase for results
supabase query "SELECT * FROM sa_stress_test_results ORDER BY created_at DESC LIMIT 1;"
```

### Automated 2-Week Cadence

EventBridge will trigger automatically on the cron schedule:
- **Schedule**: Every 14 days on Monday @ 02:00 UTC (off-peak)
- **Function**: `story-agent-stress-test-orchestrator`
- **Notifications**: SNS topic (subscribe with email for alerts)

### Cost Tracking

```bash
# View current costs (tagged with stress-test-bot)
aws ce get-cost-and-usage \
  --time-period Start=2026-08-01,End=2026-08-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter '{"Tags":{"Key":"CreatedBy","Values":["stress-test-bot"]}}'

# Expected: $0.87-$0.89 per run (crew consensus)
```

### Dashboard

Visit: `https://your-domain.com/dashboard/cost-transparency`
- Real-time cost by crew member
- Trend analysis
- Forecast drift alerts

---

## Part 6: Rollback & Recovery

### If Lambda fails

```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/story-agent-stress-test --follow

# Disable EventBridge trigger
aws events disable-rule --name story-agent-stress-test-14d

# Fix and redeploy
git commit -am "fix: lambda error handling"
git push origin main
# Re-enable after verification
aws events enable-rule --name story-agent-stress-test-14d
```

### If cost overruns

1. **Worf veto** (automatic at 100% threshold)
   - Lambda terminates execution
   - SNS alert sent
   - Picard notified for override decision

2. **Manual override**
   ```bash
   terraform apply -var="cost_threshold_usd=1.50"
   ```

---

## Part 7: Success Criteria (Crew Validation)

All 8 improvements MUST satisfy:

- ✅ **Dependency Tracking**: All phase dependencies captured, cycles detected
- ✅ **Stall Detection**: <2sec alert, 100% of stalls detected
- ✅ **I/O Sandboxing**: Zero escapes in penetration tests (Worf)
- ✅ **Exception Protocol**: 90% tier-1 auto-resolution, 100% SLA compliance
- ✅ **Incident Response**: Detect <5min, Investigate <30min, Remediate <60min
- ✅ **Cost Dashboard**: Live Cost Explorer, <1sec query latency
- ✅ **Phased Changes**: Zero production impact, <2% error rate during staging
- ✅ **Psychology Monitor**: Perfectionism/conflict/fatigue detected in <5min

---

## Crew Responsibilities (Ongoing)

| Officer | Responsibility | Frequency |
|---------|---|---|
| Picard | Approve improvements, authorize overrides | As needed |
| Data | Maintain dependency graph, architecture validation | Per commit |
| Worf | Security audit, exception tier-3 decisions | Per incident |
| Quark | Monitor cost variance, forecast accuracy | Daily |
| Geordi | Infrastructure health, Lambda optimization | Weekly |
| Obrien | Deployment safety, rollback testing | Per deploy |
| Yar | Test coverage, canary validation | Per release |
| Troi | Stakeholder communication, psychology monitoring | Ongoing |
| Crusher | System health metrics, anomaly detection | Continuous |
| Uhura | Alert delivery, escalation routing | Continuous |

---

## Next Steps

1. **Today**: Deploy AWS infrastructure (terraform apply)
2. **Week 1**: Deploy HIGH-priority improvements + run manual stress test
3. **Week 2**: Deploy MEDIUM improvements + validate dashboards
4. **Week 3**: Deploy LOW improvements + full 2-week cycle test
5. **Ongoing**: Monitor automated 2-week cadence, iterate based on findings

**Cost estimate**: $0.87-$0.89 per 2-week run (~$22/month for automated testing)
**Value delivered**: Zero production impact, continuous system resilience validation, crew team efficiency metrics

---

Generated: 2026-08-25
Crew consensus: 94% (Picard, Data, Worf, Geordi, Obrien, Yar, Troi, Crusher, Uhura, Quark)
