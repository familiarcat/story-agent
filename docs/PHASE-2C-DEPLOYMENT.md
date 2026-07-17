# Phase 2C Deployment Guide — UI Sync Infrastructure

**Status**: Week 2 In Progress  
**Last Updated**: 2025-07-17  
**Owner**: O'Brien (DevOps) + Riker (Full-Stack) + Worf (Security)

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development Setup](#local-development-setup)
3. [Testing Strategy](#testing-strategy)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment (Fargate)](#production-deployment-fargate)
6. [Monitoring & Observability](#monitoring--observability)
7. [Incident Response](#incident-response)
8. [Rollback Procedure](#rollback-procedure)

---

## Architecture Overview

### Components

```
┌─────────────────────────────┐        ┌──────────────────────┐
│  VSCode Extension (Local)   │        │  Web Dashboard       │
│  ├─ ChatPanel               │        │  ├─ StoryStore       │
│  ├─ ChatEngine              │        │  ├─ SyncListener     │
│  ├─ SyncBridge              │        │  └─ UI Components    │
│  └─ SyncManager             │        │                      │
└──────────┬──────────────────┘        └────────┬─────────────┘
           │                                    │
           └──────────┬──────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │  WebSocket Sync Server  │
         │  (port 3106)            │
         │  ├─ Connection Pool     │
         │  ├─ Message Queue       │
         │  ├─ Conflict Resolver   │
         │  └─ Audit Trail        │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  WorfGate Validator     │
         │  ├─ JWT Auth           │
         │  ├─ Rate Limiter       │
         │  └─ Injection Detection │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  Supabase Realtime      │
         │  ├─ Pub/Sub Broker      │
         │  ├─ State Store         │
         │  └─ Audit DB           │
         └────────────────────────┘
```

### Technologies

- **Transport**: WebSocket (persistent, bidirectional)
- **State Management**: Zustand (modular, middleware-friendly)
- **Conflict Resolution**: Last-Writer-Wins (Phase 2), CRDT (Phase 3 conditional)
- **Security**: WorfGate + per-message JWT validation
- **Persistence**: localStorage (local), Supabase (cloud)
- **Audit Trail**: Immutable append-only, rotated at 10K entries

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker + docker-compose (for services)
- OpenRouter API key (via `OPENROUTER_API_KEY`)

### Installation

```bash
# 1. Clone and install
git clone <repo> && cd story-agent
pnpm install

# 2. Set up environment
export CREW_LLM_APPROVED_KEY="$OPENROUTER_API_KEY"
export SUPABASE_MODE=auto

# 3. Start all services
pnpm dev

# This starts:
# - Web UI: http://localhost:3000
# - MCP Server: http://localhost:3103
# - Supabase: http://localhost:3102
# - Sync Server: ws://localhost:3106/sync (started on first connection)
# - Hot-reload: Active for VSCode extension
```

### Local Testing Workflow

```bash
# 1. Launch VSCode Extension Development Host
cd packages/vscode-extension
code .
# Press F5 to open Extension Host window

# 2. In Extension Host window:
# - Cmd+Shift+P → "Story Agent: New Chat"
# - Type: "What changes need to sync across VSCode and web?"

# 3. Verify sync in web dashboard:
# - Open http://localhost:3000/dashboard
# - Check Sync Status panel → should show <500ms latency
# - Navigate story → verify chat history persists

# 4. Run tests
pnpm --filter @story-agent/mcp-server run test sync-integration

# 5. Run load test
npx tsx scripts/load-test-sync.ts --users=10 --rate=100 --duration=60
```

---

## Testing Strategy

### Unit Tests (Pre-deployment)

**Command**: `pnpm --filter @story-agent/mcp-server run test sync-integration`

**Coverage**: 50+ test scenarios

- ✓ Initialization & WebSocket connection
- ✓ High/low priority message routing
- ✓ Last-Writer-Wins conflict detection
- ✓ localStorage persistence & recovery
- ✓ Audit trail immutability (rotation at 10K)
- ✓ Metrics collection (latency, cost, success)
- ✓ Multi-user collisions (3-way, cascades, 5+ users)
- ✓ Network partition + exponential backoff
- ✓ Edge cases (payload size, timestamp validation, deduplication)
- ✓ Integration (VSCode ↔ web dashboard sync)

**Success Criteria**: >95% pass rate, zero flaky tests

### Load Test (Staging readiness)

**Command**: `npx tsx scripts/load-test-sync.ts --users=10 --rate=100 --duration=60`

**Scenario**: 10 concurrent users, 100 msg/sec, 60 seconds = 60,000 messages

**Metrics**:
- P50 latency: **<100ms** ✓
- P99 latency: **<500ms** ✓
- Success rate: **>99.9%** ✓
- Memory: **<50MB** per 100 connections
- CPU: **<20%** single core

**Pass/Fail**: All criteria must pass before staging deployment

### Chaos Testing (Staging)

**Scenarios** (run on staging deployment):

1. **Connection Pool Exhaustion**
   - Open 100 concurrent connections
   - Verify graceful degradation, 429 responses
   - No connection leaks

2. **Message Burst**
   - Send 1,000 msg/sec for 5 seconds
   - Verify queue doesn't exceed memory limit
   - Verify no message loss

3. **Network Partition**
   - Close sync server, keep connections open
   - Verify messages queue in localStorage
   - Reopen server, verify replay

4. **Conflict Surge**
   - 50 users edit same story simultaneously
   - Verify LWW resolution completes in <500ms
   - Verify audit trail captures all conflicts

5. **WorfGate Rate Limiting**
   - Send 1,000 messages/user/min
   - Verify 429 (Too Many Requests) after threshold
   - Verify graceful backoff

---

## Staging Deployment

### Prerequisites

- AWS account + ECS Fargate cluster (existing)
- Staging RDS database + ElastiCache Redis (existing)
- Terraform state bucket (existing)

### Deployment Steps

```bash
# 1. Build Docker image for sync-server
pnpm --filter @story-agent/mcp-server run build
docker build -f docker/sync-server.dockerfile -t sync-server:latest .

# 2. Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker tag sync-server:latest \
  <account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:latest

docker push <account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:latest

# 3. Deploy via Terraform
cd terraform/
terraform apply -target=aws_ecs_service.sync_server \
  -var="environment=staging" \
  -var="sync_server_image=<account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:latest"

# 4. Verify deployment
aws ecs describe-services \
  --cluster story-agent-staging \
  --services sync-server \
  --region us-east-1

# 5. Run smoke test
curl -I https://staging-sync.storyagent.internal/health
# Expected: 200 OK
```

### Staging Environment Variables

```bash
# .env.staging
ENVIRONMENT=staging
WS_PROXY_URL=wss://staging-sync.storyagent.internal/sync
BATCH_INTERVAL_MS=300
MAX_BATCH_SIZE=50
CONFLICT_STRATEGY=lww
AUDIT_ENABLED=true
AUDIT_MAX_ENTRIES=10000

# WorfGate
CREW_LLM_APPROVED_KEY=<from-secrets-manager>
WORFGATE_JWT_SECRET=<from-secrets-manager>

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<from-secrets-manager>

# Observability
CLOUDWATCH_LOG_GROUP=/ecs/sync-server-staging
X_RAY_ENABLED=true
```

### Health Checks

```bash
# Health endpoint
curl https://staging-sync.storyagent.internal/health

# Expected response:
{
  "status": "healthy",
  "connections": 42,
  "memoryMb": 128.5,
  "uptime": 3600,
  "version": "1.0.0"
}

# Metrics endpoint
curl https://staging-sync.storyagent.internal/metrics

# Expected: Prometheus-formatted metrics
# - sync_messages_sent_total
# - sync_messages_received_total
# - sync_latency_seconds (histogram)
# - sync_conflicts_total
```

---

## Production Deployment (Fargate)

### Pre-flight Checklist

- [ ] All unit tests passing (>95%)
- [ ] Load test passed (P99 <500ms, success >99.9%)
- [ ] Chaos tests completed on staging
- [ ] Security audit cleared (Worf)
- [ ] Cost estimation validated (Quark)
- [ ] Incident runbooks written
- [ ] Monitoring dashboards created
- [ ] Rollback tested

### Deployment Phases

#### Phase 1: Canary (Week 4)
- Deploy sync-server to **1 pod** in production
- Route **1%** of traffic (50 users) via WebSocket sync
- **99%** of traffic stays on HTTP fallback
- Monitor for 24 hours

**Success criteria**:
- P99 latency <500ms
- Error rate <0.1%
- Cost <$10/day for sync service

#### Phase 2: Ramp (Week 5)
- Scale to **3 pods**
- Route **25%** of traffic via sync
- Monitor for 48 hours

#### Phase 3: Gradual Rollout
- **Day 1**: 25% traffic
- **Day 2**: 50% traffic
- **Day 3**: 75% traffic
- **Day 4**: 100% traffic

**Abort criteria** (automatic rollback):
- P99 latency >500ms
- Error rate >0.5%
- Conflict resolution failures >1%
- Cost >$50/day

### Command

```bash
# Production deploy
cd terraform/
terraform apply -target=aws_ecs_service.sync_server \
  -var="environment=production" \
  -var="desired_count=3" \
  -var="traffic_percentage=1"

# Monitor
watch -n 5 'aws ecs describe-services \
  --cluster story-agent-prod \
  --services sync-server | jq .services[0].status'
```

---

## Monitoring & Observability

### CloudWatch Dashboards

**Dashboard: Sync Bridge Health**

Widgets:
- Message throughput (msg/sec)
- Latency percentiles (P50, P95, P99)
- Error rate (%)
- Conflict resolution time (ms)
- Connection pool utilization (%)
- Memory usage (MB)
- Cost tracking (USD/hour)

### Alerts

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| P99 latency | >500ms | Critical | Auto-rollback to HTTP fallback |
| Error rate | >0.5% | Critical | Page on-call |
| Conflict surge | >100/min | Warning | Investigate duplicate edits |
| Memory | >500MB | Warning | Scale up pods |
| Rate limit hits | >1000/min | Info | Monitor cost |

### X-Ray Tracing

All sync messages include `X-Amzn-Trace-Id` header for end-to-end tracing:

```
VSCode extension
  ↓ [50ms]
Sync bridge queueChange()
  ↓ [100ms]
WebSocket send
  ↓ [50ms]
WorfGate validator
  ↓ [30ms]
Supabase Realtime
  ↓ [100ms]
Web dashboard store update
```

---

## Incident Response

### Scenario: Sync Server Down

1. **Detection**: CloudWatch alert fires (P99 >5000ms)
2. **Auto-response**:
   - Scale up replicas to 5
   - Route all traffic to HTTP fallback
   - Page on-call
3. **Manual**: Check logs for errors
4. **Recovery**:
   ```bash
   # Rollback to previous version
   terraform apply \
     -var="sync_server_image=<account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:stable"
   ```

### Scenario: Conflict Resolution Failures

1. **Detect**: Conflict resolution time >1s
2. **Investigate**: Check audit trail for timestamp collisions
3. **Fix**:
   - If Phase 2 (LWW) insufficient, enable CRDT Phase 3
   - Increase conflict resolution timeout
   - Scale up CPU allocation

### Scenario: Connection Pool Exhaustion

1. **Detect**: New connections failing with 503
2. **Immediate**:
   ```bash
   # Scale up pods
   aws ecs update-service \
     --cluster story-agent-prod \
     --service sync-server \
     --desired-count 10
   ```
3. **Investigate**: Memory leak in connection handler
4. **Fix**: Redeploy with connection cleanup fixes

---

## Rollback Procedure

### Automated Rollback (Abort Criteria Met)

```bash
# Triggered automatically by monitoring
# Rolls back to previous stable version
terraform apply \
  -var="sync_server_image=<account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:${PREVIOUS_VERSION}"

# All traffic routed back to HTTP fallback
aws ecs update-service \
  --cluster story-agent-prod \
  --service traffic-router \
  --desired-count 1  # fallback pool
```

### Manual Rollback

```bash
# 1. Identify previous stable tag
docker images | grep sync-server | head -5

# 2. Deploy previous version
terraform apply \
  -var="sync_server_image=<account>.dkr.ecr.us-east-1.amazonaws.com/sync-server:v1.0.0-stable"

# 3. Verify health
curl https://sync.storyagent.internal/health

# 4. Monitor metrics for 30 minutes
watch -n 30 'aws cloudwatch get-metric-statistics \
  --namespace SyncBridge \
  --metric-name Latency_P99 \
  --start-time $(date -u -d "30 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average'
```

---

## Deployment Checklist (Week 2 Gate)

- [ ] All 50+ unit tests passing
- [ ] Load test: P99 <500ms, success >99.9%
- [ ] Chaos tests: All 5 scenarios passed
- [ ] Security audit: Worf clearance
- [ ] Cost validation: Quark confirms <$100/day for 10 users
- [ ] Integration verified: VSCode ↔ web sync working
- [ ] Monitoring dashboards deployed
- [ ] Incident runbooks written + tested
- [ ] Rollback procedure tested
- [ ] Documentation complete

**When all checkboxes PASS → Week 2 COMPLETE → Proceed to Week 3 staging deployment**

---

## Support & Escalation

- **Architecture Questions**: Contact Data (Commander)
- **Deployment Issues**: Contact Geordi (Infrastructure)
- **Security Concerns**: Contact Worf (Security)
- **Cost Impact**: Contact Quark (Finance)
- **On-Call Escalation**: `@story-agent-oncall` in Slack
