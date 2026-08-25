# Phase 3: Breadcrumb System Rewrite — Mission Plan

**Status:** 🚀 EXECUTION AUTHORIZED  
**Plan Selected:** BALANCED  
**Risk Level:** Medium  
**Crew Consensus:** All officers agreed on core 5 steps  
**Execution Cost:** $0.0148 (crew deliberation)  

## Mission Goals

1. **Reduce contextLossClickthrough** from 23.1% → <15%
2. **Optimize getBreadcrumbPath()** performance to <100ms p95 latency
3. **Implement scalable caching** with >70% hit rate, zero regressions

## Crew Deliberation Outcomes

### Consensus Findings (All Officers)

| Finding | Metric | Owner | Validation |
|---------|--------|-------|-----------|
| Current p95 latency exceeds target | 127ms current, 100ms target | Riker | CloudWatch X-Ray traces |
| IAM overhead is significant | ~14ms avg check overhead | O'Brien | X-Ray traces showing 60%+ of 127ms from IAM |
| DynamoDB Query optimization is key | `ConsumedReadCapacity` redundancy | Data | CloudWatch metrics (42% redundant checks) |
| Cache staleness risks breadcrumb accuracy | 23ms latency spikes observed | Uhura | CloudWatch `BreadcrumbTTLMismatch` |
| Security incidents tied to cache validation | 17 IAM breaches in staging | Worf | AWS CloudTrail audit history |

### Key Tradeoffs & Resolutions

| Tension | Resolution | Measurement |
|---------|-----------|-------------|
| IAM scoping now vs. metrics first | Implement IAM scoping first (Worf), validate read patterns after 48h (Data) | CloudWatch `ConsumedReadCapacity` % by operation type |
| Policy staleness vs. latency | Add Lambda trigger on DynamoDB Streams for cache invalidation (Troi) | DynamoDB stream lag + cache clear SLA (5min) |
| Pre-warming risk vs. hit rate | Read-through cache initially, selective pre-warming if <70% hit rate (Yar) | CloudWatch `CacheHitCount` on `/api/v1/policy/*` |
| Revenue impact isolation | Run Quark's 0.5% holdback experiment concurrently (Segment tracking) | Conversion lift measurement vs. holdback cost |

## Execution Plan: BALANCED (5-Step Core + Validation)

### Step 1: Security Hardening — IAM Scoping (Worf Lead)
**Owner:** Worf (Security)  
**Estimated Effort:** 4 hours  
**Deliverable:** AWS Config rules + IAM condition documentation  

**Tasks:**
- [ ] Define DynamoDB cache table IAM policies (`sa_breadcrumb_cache`)
- [ ] Restrict cache writes to `cache-manager` role only
- [ ] Restrict cache reads to approved service roles (`breadcrumb-reader`, `dashboard-reader`)
- [ ] Document IAM conditions in AWS Config (e.g., `dynamodb:PutItem` with role condition)
- [ ] Deploy to staging environment
- [ ] Audit CloudTrail logs for policy compliance (0 unauthorized attempts)

**Success Criteria:**
- All cache writes require `role = "cache-manager"`
- No policy-tree contamination incidents during 48h staging validation
- AWS Config reporting 100% compliance

---

### Step 2: Performance Analytics Dashboard (Data Lead)
**Owner:** Data (Architecture)  
**Estimated Effort:** 6 hours  
**Deliverable:** CloudWatch dashboard + Query metrics tracking  

**Tasks:**
- [ ] Create CloudWatch namespace: `story-agent/breadcrumb-cache`
- [ ] Instrument DynamoDB Query calls to track:
  - `ConsumedReadCapacity` by operation type (Query vs. BatchGetItem vs. Scan)
  - Redundant IAM checks (track via custom metric: `IAMCheckCount`)
  - Cache hit/miss distribution
- [ ] Add X-Ray traces for getBreadcrumbPath() calls (segment by operation type)
- [ ] Create dashboard with:
  - `ConsumedReadCapacity` % breakdown
  - `IAMCheckCount` trend (target: <30% of operations)
  - Current p95 latency (baseline: 127ms)
  - Cache hit rate timeline
- [ ] Deploy to staging for 24-48h baseline measurement

**Success Criteria:**
- Dashboard operational and tracking all 4 metrics
- Baseline p95 latency confirmed (127ms)
- Redundant IAM check % identified (expected: ~30-40%)

---

### Step 3: Cache Invalidation Hook (Troi Lead)
**Owner:** Troi (UX/Engineering)  
**Estimated Effort:** 5 hours  
**Deliverable:** Lambda function + DynamoDB Streams trigger  

**Tasks:**
- [ ] Create Lambda function: `breadcrumb-cache-invalidator`
  - Triggered by DynamoDB Streams on `sa_policy_checksums` table updates
  - Filter: only policy mutations (e.g., `isValid` change, `checksumSHA256` change)
  - Action: Delete matching entries from `sa_breadcrumb_cache` table
  - Idempotent design (no crash on missing cache entries)
- [ ] Set up DynamoDB Streams event source mapping
- [ ] Add CloudWatch metrics:
  - `CacheInvalidationCount` (per policy update)
  - `DynamoDBStreamLag` (measure invalidation latency)
- [ ] Define SLA: Cache clear within 5min of policy update
- [ ] Deploy to staging with 1000-concurrent-mutation load test

**Success Criteria:**
- Lambda triggers within 1sec of policy update
- All affected cache entries cleared within 5min
- DynamoDB stream lag <1sec (p95)
- Zero "stale breadcrumb" incidents during load test

---

### Step 4: getBreadcrumbPath() Optimization (Geordi Lead)
**Owner:** Geordi (Infrastructure)  
**Estimated Effort:** 8 hours  
**Deliverable:** Optimized cache query layer  

**Tasks:**
- [ ] Analyze current getBreadcrumbPath() implementation (packages/shared/src/policy-tree.ts)
  - Profile recursive policy tree traversal
  - Identify deepest paths (where caching has highest impact)
  - Measure IAM check distribution (expect ~60% of 127ms)
- [ ] Implement DynamoDB-backed cache layer:
  - Cache key: `breadcrumb#<policy-id>#<hierarchy-depth>`
  - Pre-materialized paths for depth >3 (trade ~5% storage for 40ms latency savings)
  - TTL: 10 minutes (configurable)
  - Query optimization: Use DynamoDB Query (sort keys) instead of Scan
- [ ] Add performance logging:
  - Track `getBreadcrumbPath()` latency percentiles (p50, p95, p99)
  - Log traversal depth when cache miss occurs
  - Correlate with IAM check timing
- [ ] Deploy to staging; run 48h perf validation

**Success Criteria:**
- Latency p95 <100ms (down from 127ms, 23% improvement)
- Cache hit rate >70% after warmup (1hr)
- Storage cost increase <5%
- No regressions on breadcrumb accuracy (verify via test suite)

---

### Step 5: UI State Tracking & Metrics Integration (Uhura + Quark Lead)
**Owner:** Uhura (Communications) + Quark (Finance)  
**Estimated Effort:** 7 hours  
**Deliverable:** Segment integration + contextLossClickthrough measurement  

**Tasks:**
- [ ] Add BreadcrumbTTLMismatch detection:
  - Compare cached breadcrumb with fresh policy traversal
  - Log timestamp of last cache invalidation vs. current query time
  - Emit `BreadcrumbStaleness` metric (expected: <5min based on TTL)
- [ ] Integrate Segment tracking for contextLossClickthrough:
  - Track user session with stale breadcrumbs (cache-invalidation lag >1min)
  - Measure clickthrough abandonment rate pre/post cache optimization
  - Segment event schema: `breadcrumb_state`, `cache_age`, `user_action`
- [ ] Implement Quark's 0.5% holdback experiment:
  - Randomly hold back 0.5% of optimization benefits (simulate old latency)
  - Measure if click-through improvements are real (not placebo)
  - Track via Segment cohort analysis
- [ ] Add CloudWatch alarms:
  - Alert if contextLossClickthrough increases >1% (regression)
  - Alert if cache hit rate drops <70%
  - Alert if p95 latency exceeds 105ms (buffer above 100ms target)
- [ ] Dashboard update: Add contextLossClickthrough trend graph

**Success Criteria:**
- contextLossClickthrough drops from 23.1% → <15% (8.1pp improvement)
- Holdback experiment confirms causation (not coincidence)
- Cache freshness maintained (staleness <5min in p95)
- Zero clickthrough regression from baseline

---

## Implementation Sequence

### 🔵 Phase 3a: Foundation (Days 1-2)
1. ✅ Crew deliberation complete ($0.0148)
2. ⏳ **Step 1 (Worf):** IAM scoping + AWS Config (4h)
3. ⏳ **Step 2 (Data):** CloudWatch dashboard setup (6h, concurrent)

**Staging Gate:** Metrics baseline established, IAM scoping validated

### 🟡 Phase 3b: Optimization (Days 3-4)
4. ⏳ **Step 3 (Troi):** Lambda trigger + DynamoDB Streams (5h)
5. ⏳ **Step 4 (Geordi):** Cache layer implementation + profiling (8h, concurrent)

**Staging Gate:** p95 <100ms confirmed, hit rate >70%, no regressions

### 🟢 Phase 3c: Validation (Days 5-6)
6. ⏳ **Step 5 (Uhura + Quark):** Segment integration + metrics (7h)
7. ⏳ **Load Test:** 1000-concurrent mutations, 48h shadow testing
8. ⏳ **Metrics Confirmation:** contextLossClickthrough <15%, holdback experiment validation

**Production Gate:** All metrics green, zero regressions, stakeholder approval

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Cache staleness causes stale UI | Medium | High | Troi's Lambda trigger on policy updates + 5min SLA |
| IAM scoping adds >5ms write latency | Medium | High | Measure via X-Ray; rollback if p95 > 105ms |
| Cache hit rate <70% due to high churn | Low | High | Start read-through only; selective pre-warming if needed |
| Segment integration fails to show causation | Low | Medium | Quark's holdback experiment isolates performance impact |
| Backward compatibility break | Low | High | All changes read-only to existing API; zero schema changes |

**Rollback Triggers:**
- If p95 latency > 105ms after Step 4 → Disable pre-materialized caching, revert to simple TTL
- If contextLossClickthrough increases from 23.1% → Disable cache invalidation Lambda, revert to full TTL
- If cache hit rate <50% after 48h warmup → Increase pre-warming, or revert to Compute-on-Demand

---

## Success Metrics

### Primary (Must-Have)
- ✅ contextLossClickthrough: 23.1% → <15% (8.1pp reduction)
- ✅ getBreadcrumbPath() p95 latency: 127ms → <100ms (23% improvement)
- ✅ Cache hit rate: >70% (steady-state)
- ✅ Zero regressions on Phase 1-2 functionality

### Secondary (Nice-to-Have)
- ✅ Storage cost increase: <5%
- ✅ Breadcrumb accuracy: 100% (pre-cache vs. post-cache)
- ✅ IAM security incidents: 0 during optimization
- ✅ Test coverage: ≥95% on new cache layer

---

## Crew Alternatives (If BALANCED Plan Stalls)

### 🟢 CONSERVATIVE Plan (If Medium Risk Too High)
1. IAM scoping only (Worf)
2. Query metrics dashboard (Data)
3. Lambda invalidation trigger (Troi)
4. BreadcrumbTTLMismatch tracking (Uhura)
5. Validate with 24h staging test (no aggressive optimization)

**Risk:** Low  
**Tradeoff:** Slower contextLossClickthrough improvement (estimated <8pp, may not hit 15% target)

### 🔴 AGGRESSIVE Plan (If BALANCED Takes Too Long)
All 8 steps:
1. IAM scoping + Query metrics (parallel)
2. Lambda invalidation + optimization (parallel)
3. Segment integration + holdback experiment
4. Pre-materialized graph caching (higher storage tradeoff)
5. Automatic cache pre-warming (higher complexity)

**Risk:** High  
**Upside:** Faster execution, potential p95 <80ms, hit rate >80%

---

## Deliverables Summary

| Deliverable | Owner | Status | Type |
|-------------|-------|--------|------|
| AWS Config IAM rules | Worf | 🟡 Pending | Config |
| CloudWatch dashboard | Data | 🟡 Pending | Dashboard |
| Lambda function + Streams trigger | Troi | 🟡 Pending | Code |
| Optimized cache layer | Geordi | 🟡 Pending | Code |
| Segment integration | Uhura + Quark | 🟡 Pending | Code |
| Unit tests (95%+ coverage) | Yar | 🟡 Pending | Tests |
| Integration tests (load test) | Yar | 🟡 Pending | Tests |
| Metrics validation report | Riker | 🟡 Pending | Report |

---

## Next Steps

**Immediately:**
1. ✅ Crew deliberation → Mission plan generated
2. 🚀 **You are here** — EXECUTE BALANCED PLAN
3. ⏳ Execute Step 1-2 in parallel (IAM scoping + dashboard)
4. ⏳ Execute Step 3-4 in parallel (Lambda trigger + cache optimization)
5. ⏳ Execute Step 5 + validation (Segment integration + metrics)

**Execution Model:** Crew autonomous with verification gates
- Each crew member executes their assigned step
- I validate: build passing, tests >95%, no regressions
- Metrics confirm Phase 3 goals met before proceeding to Phase 4

**Captain's Log:**
> "The crew has deliberated thoroughly on Phase 3. Worf's security hardening, Data's metrics discipline, Geordi's performance optimization, and Uhura's user-centric tracking create a balanced approach. Troi's cache invalidation strategy addresses the staleness concern. We proceed with BALANCED execution. All hands, execute your stations."

---

**End Phase 3 Mission Plan**
