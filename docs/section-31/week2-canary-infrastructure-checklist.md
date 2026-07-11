# Week 2 Prep: Canary Infrastructure Deployment Checklist

**Mission Owner:** O'Brien  
**Target Delivery:** Friday EOD Week 1 (2026-07-18)  
**Deployment Target:** Monday 2026-07-19 09:00 PT (if gates pass)

---

## Executive Summary

**Objective:** Deploy 1% GitHub Copilot user canary infrastructure for A/B testing crew routing vs Copilot control group.

**What's Being Deployed:**
- Feature flag `storyAgent.canary.enabled` (default: false)
- User cohort randomization (1% experiment, 99% control)
- Separate telemetry tracking (experiment vs control)
- A/B test comparison dashboard
- Canary rollback procedure (<5 min SLA)

**Success Criteria:**
- [ ] Feature flag gated (safe default off)
- [ ] User cohort deterministic + consistent
- [ ] Experiment vs control telemetry tracked separately
- [ ] A/B dashboard live + metrics flowing
- [ ] Rollback tested (enable → disable, <5 min)
- [ ] Deployment checklist signed off (all items PASS)

---

## Phase 1: A/B Test Architecture (Mon 2026-07-12)

### 1.1 Cohort Selection Strategy

**Decision: Random 1% by user_id hash (deterministic)**

Why deterministic?
- Same user always sees same experience (no flipping between experiment + control)
- Reproducible for debugging
- Easy to verify (hash(userId) < 0.01)

**Algorithm:**
```typescript
function getCanaryCohort(userId: string): 'experiment' | 'control' {
  const hash = crypto
    .createHash('sha256')
    .update(`canary-v1-${userId}`)  // v1 = version, userId = input
    .digest();
  
  // Convert first 4 bytes to 0–1 range
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return value < 0.01 ? 'experiment' : 'control';
}

// Test:
// user_id='alice@github' => hash(...) => value=0.00523 => experiment ✓
// user_id='bob@github' => hash(...) => value=0.8234 => control ✓
```

**Cache:** User cohort assignment cached per session (no re-rolling mid-week)

**Verification:**
```bash
# Simulate: route 100k GitHub users through cohort function
# Expect: ~1k in experiment, ~99k in control
# Histogram: should show clean 1% / 99% split

# Determinism check: same userId always gets same cohort
for i in {1..10}; do
  hashCanary(alice@github)  # should always return 'experiment'
done
```

**Deliverable:** Cohort selection algorithm implemented + verified

### 1.2 Feature Flag Design

**Flag Name:** `storyAgent.canary.enabled`  
**Default:** `false` (safe default, no routing until explicitly enabled)  
**Storage:** rollout.yml (single source of truth)

**Gating Logic:**
```typescript
async function shouldRouteToCrew(userId: string): Promise<boolean> {
  // 1. Check if canary is enabled
  const canaryEnabled = await getFeatureFlag('storyAgent.canary.enabled');
  if (!canaryEnabled) return false;

  // 2. Check user's cohort assignment
  const cohort = getCanaryCohort(userId);
  return cohort === 'experiment';
}

// Usage:
if (await shouldRouteToCrew(userId)) {
  // Route to crew (OpenRouter)
} else {
  // Route to Copilot (control group)
}
```

**Deployment:** Config change only (no code release required to toggle)

**Deliverable:** Feature flag gating logic implemented

### 1.3 Rollout.yml Integration

**Update rollout.yml:**
```yaml
obrien:
  phases:
    week1:
      description: "Dogfood with crew + 10 trusted testers"
      canary_weight: 0.01
    week2:
      description: "1% canary to GitHub Copilot users (A/B test)"
      canary_weight: 0.01
      feature_flag: "storyAgent.canary.enabled"
      cohort_seed: "canary-v1"  # for reproducible hashing
```

**Deliverable:** rollout.yml updated with canary configuration

---

## Phase 2: Feature Flag Implementation (Tue 2026-07-13)

### 2.1 Feature Flag Provider

**Option A:** Stored in rollout.yml (static)
**Option B:** Stored in crew memory (dynamic, updatable)
**Option C:** Stored in Supabase flags table (persistent, queryable)

**Decision:** Option C (Supabase flags table)
- Why: Dynamic update without code deploy
- Why: Queryable for audit trail
- Why: Scalable for future feature flags

**Schema:**
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,  -- e.g., 'storyAgent.canary.enabled'
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR,  -- who enabled/disabled it
  reason TEXT,  -- why enabled/disabled
);
```

**Migration:** `supabase/migrations/20260715_feature_flags_table.sql`

### 2.2 Feature Flag Access Function

**Location:** `packages/shared/src/feature-flags.ts` (new file)

```typescript
import { createClient } from '@supabase/supabase-js';

export class FeatureFlagProvider {
  private supabase = createClient();
  private cache = new Map<string, { value: boolean; expiry: number }>();
  private CACHE_TTL = 60 * 1000;  // 60-sec cache

  /**
   * Get feature flag value (with caching)
   */
  async getFlag(flagName: string): Promise<boolean> {
    // Check cache
    const cached = this.cache.get(flagName);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    // Query database
    const { data, error } = await this.supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', flagName)
      .single();

    if (error || !data) {
      console.warn(`Feature flag ${flagName} not found, defaulting to false`);
      return false;
    }

    // Cache result
    this.cache.set(flagName, {
      value: data.enabled,
      expiry: Date.now() + this.CACHE_TTL,
    });

    return data.enabled;
  }

  /**
   * Set feature flag (admin only)
   */
  async setFlag(
    flagName: string,
    enabled: boolean,
    reason: string,
    updatedBy: string
  ): Promise<void> {
    const { error } = await this.supabase.from('feature_flags').upsert({
      name: flagName,
      enabled,
      reason,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Invalidate cache
    this.cache.delete(flagName);
  }
}

export const featureFlagProvider = new FeatureFlagProvider();
```

**Usage:**
```typescript
import { featureFlagProvider } from '@story-agent/shared';

// Check if canary is enabled
const canaryEnabled = await featureFlagProvider.getFlag('storyAgent.canary.enabled');
if (canaryEnabled && getCanaryCohort(userId) === 'experiment') {
  // Route to crew
}
```

**Deliverable:** FeatureFlagProvider implemented + integrated

### 2.3 Admin UI for Flag Control

**Location:** `packages/ui/src/app/admin/feature-flags/page.tsx`

```typescript
// Simple admin UI to toggle flags
// - List all flags (name, enabled status, last updated)
// - Toggle button (requires admin auth)
// - Reason text field
// - Update button

// Expected UI:
// Feature Flags
// ├─ storyAgent.canary.enabled [OFF] Updated 2026-07-18 by O'Brien
//    └─ Reason: "Ready for canary launch"
//       [Toggle] [Save]
```

**Deliverable:** Admin UI deployed

---

## Phase 3: User Cohort Implementation (Wed 2026-07-14)

### 3.1 Cohort Assignment Service

**Location:** `packages/mcp-server/src/lib/canary-cohort.ts` (new file)

```typescript
import crypto from 'crypto';

const COHORT_SEED = process.env.CANARY_COHORT_SEED || 'canary-v1';

/**
 * Deterministically assign user to canary cohort
 */
export function getCanaryCohort(userId: string): 'experiment' | 'control' {
  if (!userId) {
    console.warn('userId missing, defaulting to control');
    return 'control';
  }

  const hash = crypto
    .createHash('sha256')
    .update(`${COHORT_SEED}-${userId}`)
    .digest();

  // First 4 bytes -> 0-1 range
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return value < 0.01 ? 'experiment' : 'control';
}

/**
 * Get experiment group size (for debugging)
 */
export function estimateExperimentSize(totalUsers: number): number {
  return Math.floor(totalUsers * 0.01);
}

// Tests
export function testCanaryCohort() {
  // Consistency: same user always gets same cohort
  const cohort1 = getCanaryCohort('alice@github.com');
  const cohort2 = getCanaryCohort('alice@github.com');
  assert(cohort1 === cohort2, 'Cohort assignment should be consistent');

  // Distribution: ~1% in experiment
  const sampleSize = 100000;
  let experimentCount = 0;
  for (let i = 0; i < sampleSize; i++) {
    if (getCanaryCohort(`user${i}@github.com`) === 'experiment') {
      experimentCount++;
    }
  }
  const percentage = (experimentCount / sampleSize) * 100;
  console.log(`Experiment cohort: ${percentage}% (expected 1%)`);
  assert(Math.abs(percentage - 1) < 0.1, 'Cohort distribution should be ~1%');
}
```

**Deliverable:** Cohort assignment service tested + verified

### 3.2 Cohort Assignment Middleware

**Location:** `packages/ui/src/middleware/canary-cohort.ts` (new file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCanaryCohort } from '@story-agent/mcp-server';
import { featureFlagProvider } from '@story-agent/shared';

/**
 * Middleware: Assign user to canary cohort and inject into request
 */
export async function canaryMiddleware(request: NextRequest) {
  // 1. Get user ID (from auth context or session)
  const userId = await getUserId(request);

  // 2. Check if canary is enabled
  const canaryEnabled = await featureFlagProvider.getFlag('storyAgent.canary.enabled');

  // 3. Assign cohort
  const cohort = canaryEnabled ? getCanaryCohort(userId) : 'control';

  // 4. Inject cohort into request headers
  request.headers.set('X-Canary-Cohort', cohort);

  // 5. Continue to next middleware/handler
  return NextResponse.next({
    request,
  });
}
```

**Deliverable:** Cohort middleware deployed

---

## Phase 4: Separate Telemetry (Thu 2026-07-15)

### 4.1 Telemetry API with Cohort Bucketing

**Location:** `packages/ui/src/app/api/telemetry/canary/route.ts` (new endpoint)

```typescript
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/telemetry/canary?cohort=experiment&metric=opt_out_rate
 *
 * Returns telemetry for specific cohort
 */
export async function GET(request: NextRequest) {
  const cohort = request.nextUrl.searchParams.get('cohort') as 'experiment' | 'control';
  const metric = request.nextUrl.searchParams.get('metric');  // opt_out_rate, error_rate, etc.

  if (!cohort || !['experiment', 'control'].includes(cohort)) {
    return NextResponse.json(
      { error: 'Invalid cohort parameter' },
      { status: 400 }
    );
  }

  // Query telemetry database filtered by cohort
  const telemetry = await getTelemetryByCohort(cohort);

  return NextResponse.json({
    cohort,
    opt_out_rate: telemetry.opt_out_rate,
    error_rate: telemetry.error_rate,
    sentiment: telemetry.sentiment,
    latency_p99: telemetry.latency_p99,
    cost_per_user: telemetry.cost_per_user,
    sample_size: telemetry.sample_size,
    timestamp: new Date().toISOString(),
  });
}

async function getTelemetryByCohort(cohort: string) {
  // Query metrics from crew memory or durable table, filtered by cohort
  // Assumed structure: telemetry table with user_cohort column
  
  const supabase = createClient();
  const { data, error } = await supabase
    .from('telemetry_events')
    .select('*')
    .eq('user_cohort', cohort)
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) throw error;

  return aggregateTelemetry(data || []);
}
```

### 4.2 Telemetry Injection in Chat Handlers

**Location:** `packages/mcp-server/src/agent-core/chat.ts`

```typescript
// When logging telemetry events, inject cohort:
async function logTelemetryEvent(event: TelemetryEvent, userId: string) {
  const cohort = getCanaryCohort(userId);
  
  const eventWithCohort = {
    ...event,
    user_cohort: cohort,  // NEW: inject cohort
    timestamp: new Date().toISOString(),
  };

  // Log to crew memory or telemetry table
  await storeTelemetryEvent(eventWithCohort);
}
```

**Deliverable:** Telemetry API + cohort bucketing implemented

### 4.3 Separate Cost Tracking

**Location:** `packages/ui/src/app/api/cost/canary/route.ts` (new endpoint)

```typescript
/**
 * GET /api/cost/canary?cohort=experiment
 *
 * Returns cost metrics for specific canary cohort
 */
export async function GET(request: NextRequest) {
  const cohort = request.nextUrl.searchParams.get('cohort') as 'experiment' | 'control';

  // Get cost data filtered by cohort
  const costs = await getCostByCohort(cohort);

  return NextResponse.json({
    cohort,
    total_cost: costs.total,
    cost_per_user: costs.per_user,
    cost_by_feature: costs.by_feature,
    sample_size: costs.user_count,
    timestamp: new Date().toISOString(),
  });
}
```

**Deliverable:** Cost tracking separated by cohort

---

## Phase 5: A/B Dashboard (Wed–Thu 2026-07-14–15)

### 5.1 Dashboard Component

**Location:** `packages/ui/src/app/ab-test-dashboard/page.tsx` (new page)

```typescript
import React, { useState, useEffect } from 'react';

/**
 * A/B Test Dashboard — Experiment vs Control side-by-side
 */
export default function ABTestDashboard() {
  const [experimentMetrics, setExperimentMetrics] = useState(null);
  const [controlMetrics, setControlMetrics] = useState(null);

  useEffect(() => {
    // Fetch metrics for both cohorts
    Promise.all([
      fetch('/api/telemetry/canary?cohort=experiment').then(r => r.json()),
      fetch('/api/telemetry/canary?cohort=control').then(r => r.json()),
    ]).then(([exp, ctrl]) => {
      setExperimentMetrics(exp);
      setControlMetrics(ctrl);
    });
  }, []);

  return (
    <div className="ab-test-dashboard">
      <h1>Canary A/B Test (Week 2)</h1>
      
      <div className="comparison-grid">
        {/* Left: Experiment (Crew Routing) */}
        <div className="metric-panel">
          <h2>Experiment (Crew Routing)</h2>
          <MetricCard
            label="Opt-out Rate"
            value={`${experimentMetrics?.opt_out_rate}%`}
            target="<2%"
          />
          <MetricCard
            label="Error Rate"
            value={`${experimentMetrics?.error_rate}%`}
            target="<0.1%"
          />
          <MetricCard
            label="Sentiment (↑)"
            value={`${experimentMetrics?.sentiment.thumbs_up}%`}
            target=">50%"
          />
          <MetricCard
            label="Latency p99"
            value={`${experimentMetrics?.latency_p99}ms`}
            target="<50ms"
          />
          <MetricCard
            label="Cost/User"
            value={`$${experimentMetrics?.cost_per_user}`}
            target="<$0.50"
          />
        </div>

        {/* Right: Control (Copilot) */}
        <div className="metric-panel">
          <h2>Control (Copilot)</h2>
          <MetricCard
            label="Opt-out Rate"
            value={`${controlMetrics?.opt_out_rate}%`}
            target="baseline"
          />
          <MetricCard
            label="Error Rate"
            value={`${controlMetrics?.error_rate}%`}
            target="baseline"
          />
          <MetricCard
            label="Sentiment (↑)"
            value={`${controlMetrics?.sentiment.thumbs_up}%`}
            target="baseline"
          />
          <MetricCard
            label="Latency p99"
            value={`${controlMetrics?.latency_p99}ms`}
            target="baseline"
          />
          <MetricCard
            label="Cost/User"
            value={`$${controlMetrics?.cost_per_user}`}
            target="baseline"
          />
        </div>
      </div>

      {/* Comparison: Experiment vs Control */}
      <div className="comparison-table">
        <h3>Relative Performance (Experiment vs Control)</h3>
        <table>
          <tr>
            <td>Opt-out Delta</td>
            <td>{experimentMetrics?.opt_out_rate - controlMetrics?.opt_out_rate}%</td>
            <td>{delta < 0 ? '✓ Better' : '✗ Worse'}</td>
          </tr>
          <tr>
            <td>Error Rate Delta</td>
            <td>{experimentMetrics?.error_rate - controlMetrics?.error_rate}%</td>
            <td>{delta < 0 ? '✓ Better' : '✗ Worse'}</td>
          </tr>
          {/* ... */}
        </table>
      </div>
    </div>
  );
}
```

**Deliverable:** A/B dashboard live + metrics flowing

### 5.2 Dashboard Alerts

**Location:** `packages/mcp-server/src/lib/canary-alerts.ts` (new file)

```typescript
/**
 * Canary-specific alert rules
 */
export const canaryAlertRules = [
  {
    id: 'experiment_error_spike',
    rule: (exp, ctrl) => exp.error_rate > ctrl.error_rate * 2,  // >2x control
    action: 'escalate_to_picard',
    severity: 'CRITICAL',
    message: 'Experiment error rate >2x control — possible rollback trigger',
  },
  {
    id: 'experiment_sentiment_drop',
    rule: (exp, ctrl) => exp.sentiment.thumbs_up < ctrl.sentiment.thumbs_up - 10,  // >10% drop
    action: 'escalate_to_troi',
    severity: 'WARNING',
    message: 'Experiment sentiment drop >10% vs control — UX issue?',
  },
  {
    id: 'experiment_cost_spike',
    rule: (exp, ctrl) => exp.cost_per_user > ctrl.cost_per_user * 2,  // >2x control
    action: 'escalate_to_quark',
    severity: 'WARNING',
    message: 'Experiment cost >2x control — cost creep detected',
  },
];

/**
 * Check canary alerts and escalate if needed
 */
export async function checkCanaryAlerts() {
  const [exp, ctrl] = await Promise.all([
    getTelemetryByCohort('experiment'),
    getTelemetryByCohort('control'),
  ]);

  for (const rule of canaryAlertRules) {
    if (rule.rule(exp, ctrl)) {
      console.log(`🚨 Alert: ${rule.message}`);
      await escalateAlert(rule);
    }
  }
}
```

**Deliverable:** Alert rules implemented + escalation logic

---

## Phase 6: Canary Rollback Procedure (Thu 2026-07-15)

### 6.1 Rollback Script

**Location:** `scripts/rollback_canary.sh`

```bash
#!/bin/bash
set -e

echo "🔄 Rolling back canary deployment..."

# 1. Disable feature flag
echo "Disabling storyAgent.canary.enabled..."
curl -X POST http://localhost:3000/api/admin/feature-flags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "storyAgent.canary.enabled",
    "enabled": false,
    "reason": "Canary rollback triggered",
    "updated_by": "obrien@storyagent.dev"
  }'

# 2. Verify flag is disabled
echo "Verifying flag disabled..."
ENABLED=$(curl -s http://localhost:3000/api/admin/feature-flags/storyAgent.canary.enabled \
  | jq -r '.enabled')

if [ "$ENABLED" != "false" ]; then
  echo "❌ Rollback FAILED: flag still enabled"
  exit 1
fi

# 3. Invalidate cache (all clients fetch new flag state)
echo "Invalidating cache..."
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. Verify: all users routed to control (Copilot)
echo "Verifying users routed to control..."
sleep 5  # Wait for cache invalidation
COHORT=$(curl -s http://localhost:3000/api/test/cohort?userId=test-user@github.com \
  | jq -r '.cohort')

if [ "$COHORT" != "control" ]; then
  echo "❌ Rollback FAILED: users still routed to experiment"
  exit 1
fi

# 5. Log rollback event
echo "Logging rollback event..."
curl -X POST http://localhost:3000/api/audit-trail \
  -H "Content-Type: application/json" \
  -d '{
    "event": "canary_rollback",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "reason": "Triggered by O'Brien",
    "all_users_affected": true
  }'

echo "✅ Rollback COMPLETE: all users now on Copilot (control group)"
echo "Rollback SLA: <5 minutes"
```

**Deliverable:** Rollback script tested + SLA verified (<5 min)

### 6.2 Rollback Testing

**Test Procedure:**
1. Enable canary: `storyAgent.canary.enabled = true`
2. Verify: ~1% of test users routed to crew
3. Check metrics: experiment metrics flowing
4. Execute rollback script: `bash scripts/rollback_canary.sh`
5. Verify: all test users routed to control (Copilot)
6. Check metrics: experiment cohort stops receiving traffic
7. Check SLA: <5 min end-to-end

**Deliverable:** Rollback tested + SLA verified

---

## Phase 7: Deployment Readiness (Fri 2026-07-17)

### 7.1 Pre-Deployment Checklist

```markdown
## Canary Deployment Checklist

### Code
- [ ] Feature flag implementation deployed
- [ ] User cohort service deployed + tested
- [ ] Telemetry API with cohort bucketing deployed
- [ ] Cost tracking separated by cohort
- [ ] A/B dashboard live + metrics flowing
- [ ] Alert rules configured + tested
- [ ] Rollback script tested (<5 min SLA)

### Configuration
- [ ] Feature flag `storyAgent.canary.enabled` created (default: false)
- [ ] Canary cohort seed set in environment (e.g., CANARY_COHORT_SEED=canary-v1)
- [ ] Telemetry pipeline configured to track cohort
- [ ] Cost API configured to bucket by cohort

### Testing
- [ ] Cohort assignment algorithm tested (1% / 99% distribution verified)
- [ ] Cohort consistency verified (same user always same cohort)
- [ ] Feature flag toggle tested (on → off → on)
- [ ] Telemetry bucketing tested (experiment + control metrics separate)
- [ ] Cost tracking tested (separate by cohort)
- [ ] Rollback tested (enable → disable, <5 min)
- [ ] A/B dashboard verified (metrics rendering correctly)
- [ ] Alert rules tested (sample triggers verified)

### Load Testing
- [ ] Simulate 1% of GitHub Copilot users (~100k users)
- [ ] Verify telemetry pipeline doesn't bottleneck
- [ ] Verify cost tracking scales
- [ ] Verify A/B dashboard remains responsive

### Deployment
- [ ] Feature flag stored in Supabase (flags table)
- [ ] Admin UI ready for flag toggle
- [ ] O'Brien has admin credentials
- [ ] Rollback SLA confirmed (<5 min)
- [ ] Monitoring dashboard live

### Communication
- [ ] GitHub notified about 1% user routing
- [ ] Canary user notification drafted (Troi)
- [ ] Support team briefed on escalation procedure
- [ ] Incident response team on standby

---

**Sign-Off:** O'Brien ________  (date/time)
```

### 7.2 Deployment Gate Approval

**Picard's Gate Assessment:**
- [ ] All code deployed + tested
- [ ] All config ready
- [ ] All tests pass
- [ ] Deployment checklist complete
- [ ] Rollback SLA verified
- [ ] APPROVAL: Ready for canary launch Monday 2026-07-19

---

## Dependencies & Blockers

- **Blocker 1:** Feature flags table migration (Supabase)
- **Blocker 2:** Admin UI for flag toggle (need admin auth gating)
- **Blocker 3:** Telemetry pipeline enhancement (cohort bucketing)
- **Blocker 4:** Cost API changes (separate by cohort)
- **Blocker 5:** GitHub coordination (1% user routing definition)

---

## Knowledge Retention

### Crew Memory Tags:
- `#section-31-canary-feature-flag` — Feature flag storage + toggle logic
- `#section-31-canary-cohort` — User cohort assignment (deterministic hash)
- `#section-31-canary-telemetry` — Experiment vs control telemetry bucketing
- `#section-31-canary-rollback` — Rollback procedure + SLA

### Reference Files:
- `packages/shared/src/feature-flags.ts` — FeatureFlagProvider
- `packages/mcp-server/src/lib/canary-cohort.ts` — Cohort assignment
- `packages/ui/src/app/api/telemetry/canary/route.ts` — Telemetry API
- `packages/ui/src/app/ab-test-dashboard/page.tsx` — A/B dashboard
- `scripts/rollback_canary.sh` — Rollback procedure

---

## Owner Sign-Off

**O'Brien (DevOps):**
- [ ] Canary infrastructure designed
- [ ] Feature flag + cohort service implemented
- [ ] Telemetry + cost tracking separated
- [ ] A/B dashboard live + alerts configured
- [ ] Rollback tested + SLA verified
- [ ] Deployment ready

---

**Status:** READY FOR EXECUTION (Start Mon 2026-07-15)

🖖 **STEADY AS SHE GOES**
