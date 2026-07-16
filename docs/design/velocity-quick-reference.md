# Velocity System Implementation Quick Reference

**Last Updated:** 2026-07-16  
**For:** Crew members building Phase 1-4

---

## 1. Baseline Velocities (Empirical Defaults)

Use these when creating new estimates. Update quarterly.

| Feature Type | Points/Hour | Cycle Time | Variance | Slow Case (95%) |
|---|---|---|---|---|
| **Infrastructure** | 2.5 pt/h | 8h | ±1.2h | 16h |
| **Logic** (MCP, state) | 1.8 pt/h | 12h | ±1.5h | 20h |
| **UI** (React, LCARS) | 2.0 pt/h | 10h | ±1.3h | 18h |
| **Security** (WorfGate) | 1.5 pt/h | 14h | ±1.6h | 24h |
| **Testing/QA** | 2.2 pt/h | 9h | ±1.1h | 15h |

**How to use:**
```typescript
const velocity = FEATURE_TYPE_BASELINES['logic'];
const hoursNeeded = storyPoints / velocity.avgStoryPointsPerHour; // e.g., 5 pt / 1.8 = 2.8h
const adjustedHours = hoursNeeded * velocity.complexityMultiplier[complexity]; // medium = 1.0x
```

---

## 2. Confidence Intervals (Default: 80%)

When forecasting release dates:

| Confidence | Use Case | Example |
|---|---|---|
| **50%** | Optimistic; when everything goes right | 3 days from now |
| **80%** | **[LEAD WITH THIS]** Realistic; planning default | 5 days from now |
| **95%** | Conservative; executive/risky releases | 8 days from now |

**Formula:**
```
bufferDays = baseDays * (bufferPercent + variance * 30%) / 100
confidence_80 = TODAY + baseDays + bufferDays(30%)
confidence_95 = TODAY + baseDays + bufferDays(60%)
```

---

## 3. Risk Flags (Auto-Alert Threshold)

Flag a story as "at risk" when:

```
RISK_THRESHOLD:
  timePercentage >= 50% 
  AND estimatedProgress < 35%
  
ESCALATION_LEVEL:
  "warning"  : timePercentage >= 50%
  "critical" : timePercentage >= 75%
```

Example:
- Story is 10 points, 2h / point = 20h estimate
- 10 hours elapsed (50% time)
- Story appears ~25% done (only ~5 hours of work visible)
- **FLAG:** "At risk. Recommend scope reduction or timeline adjustment."

---

## 4. Crew Capacity Calculation

**Hours per day:** 6h (8h - meetings/admin)  
**Working days/week:** 5  
**Sprint capacity (per crew member):** 6h/day × 5 days = 30h/week

For team of N crew members:
```typescript
totalCapacity = N * 6; // hours/day for full team
daysToComplete = totalHours / (totalCapacity / workingDaysPerWeek);
```

**Example:** 5 crew members, 50 hours of work
```
capacity = 5 * 6 = 30 h/day
days = 50 / (30 / 5) = 50 / 6 = 8.3 days ≈ 2 weeks
```

---

## 5. Feature Type Detection (Tagging)

When scraping Aha stories, extract feature type from tags:

```typescript
const TAG_MAP = {
  'infra', 'supabase', 'github-actions' → 'infrastructure'
  'mcp-tool', 'state-machine' → 'logic'
  'ui-component', 'lcars', 'dashboard' → 'ui'
  'worfgate', 'audit', 'governance' → 'security'
  'qa', 'test-automation' → 'testing'
};

// Default to 'logic' if no match
```

---

## 6. Blocker Detection (RAG Parsing)

Extract blockers from Aha comments + RAG observations:

```typescript
const BLOCKER_PATTERNS = [
  /blocked by/i,
  /waiting on/i,
  /stuck on/i,
  /needs (\w+)/i,
  /dependency:/i,
];

// Each blocker = ~2 hours (heuristic)
blockedHours = blockerCount * 2;
```

---

## 7. Complexity Classification

Estimate story complexity based on signals:

```typescript
// From cost ledger (tokens as proxy)
if (tokensUsed > 100000) → 'high'
else if (tokensUsed > 50000) → 'medium'
else → 'low'

// OR from story points
if (storyPoints <= 3) → 'low'
else if (storyPoints >= 8) → 'high'
else → 'medium'

// Apply multiplier
adjustedHours = baseHours * complexityMultiplier[complexity];
// low: 0.6-0.8x, medium: 1.0x, high: 1.5-2.2x
```

---

## 8. Cycle Time Calculation

```typescript
cycleTimeHours = (completedDate - startedDate) / (1000 * 60 * 60);

// Median is more robust than mean (handles outliers)
medianCycleTime = sortedCycleTimes[Math.floor(length / 2)];
```

---

## 9. Velocity Trend (Sprint-to-Sprint)

```typescript
velocityTrend = (currentSprintVelocity - previousSprintVelocity) / previousSprintVelocity * 100;

if (trend > 5%) → 'improving'
else if (trend < -5%) → 'degrading'
else → 'stable'
```

---

## 10. Cache Query Paths

Always try these in order:

```
Hot (in-memory) → Warm (Redis) → Cold (Supabase)

// If hot miss:
// Try warm, then promote to hot

// If warm miss:
// Query cold, promote to warm + hot

// If cold miss:
// Use conservative estimate (2h/point)
```

**Fallback:** If Redis unavailable, skip warm layer (100ms vs 500ms latency difference acceptable).

---

## 11. RAG Memory Tags

When storing velocity observations to RAG:

```typescript
tags: [
  'velocity',           // All velocity obs
  'risk',              // Blockers, risks
  'lesson-learned',    // Retrospectives
  'adjustment',        // Baseline changes
  'allocation',        // Crew reallocation
  feature_type,        // 'ui', 'logic', etc.
  crew_member,         // 'picard', 'data', etc.
]
```

---

## 12. Supabase Schema Quick Lookup

**Primary table:** `sa_velocity_snapshots`

**Key queries:**
```sql
-- Latest sprint velocity
SELECT * FROM sa_velocity_snapshots 
WHERE sprint_id = 'PROD-R-8' 
ORDER BY snapshot_timestamp DESC LIMIT 1;

-- Crew velocity trend
SELECT * FROM sa_velocity_snapshots 
WHERE sprint_id = 'PROD-R-8' 
AND crew_member_id = 'data'
ORDER BY snapshot_timestamp DESC LIMIT 10;

-- All crew latest (per sprint)
SELECT DISTINCT ON (crew_member_id) * 
FROM sa_velocity_snapshots 
WHERE sprint_id = 'PROD-R-8'
ORDER BY crew_member_id, snapshot_timestamp DESC;

-- Forecast latest
SELECT forecast_completion_date, confidence_80_date 
FROM sa_velocity_snapshots 
WHERE sprint_id = 'PROD-R-8' 
AND crew_member_id IS NULL
ORDER BY snapshot_timestamp DESC LIMIT 1;
```

---

## 13. Phase Checklist

### Phase 1: Metrics Collection (Week 1-2)
- [ ] Supabase schema deployed
- [ ] Aha scraper (completed stories)
- [ ] Supabase scraper (execution state)
- [ ] Cost ledger scraper
- [ ] RAG memory scraper
- [ ] Aggregation logic
- [ ] First manual report

### Phase 2: Cache & API (Week 3-4)
- [ ] Hot cache implementation
- [ ] Warm cache (Redis optional)
- [ ] Cold cache queries
- [ ] Velocity estimator
- [ ] API endpoints (`GET /api/estimation/velocity`)
- [ ] Cache manager tests

### Phase 3: Dashboard & Automation (Week 5-6)
- [ ] Velocity dashboard UI
- [ ] Burndown chart
- [ ] Forecast panel (50/80/95)
- [ ] Risk flags + notifications
- [ ] Auto-estimate MCP tool
- [ ] E2E dashboard tests

### Phase 4: Optimization & Learning (Week 7+)
- [ ] Crew reallocation recommendations
- [ ] Velocity leaderboard
- [ ] Observation Lounge feedback loop
- [ ] Admiral release dashboard
- [ ] Cross-sprint trend analysis

---

## 14. Common Gotchas

| Gotcha | Fix |
|---|---|
| Aha API rate limits | Batch queries in buckets of 20, implement exponential backoff |
| Crew members with no completed stories | Use default velocity (2h/point), flag for manual adjustment |
| External blockers inflate cycle time | Track blocked hours separately, calculate "unblocked velocity" |
| Feature type misclassification | Crew explicitly tags in Aha, fallback to 'logic' if missing |
| Redis connection drop | Silently fall through to cold cache (adds ~400ms, acceptable) |
| Confidence intervals confuse stakeholders | Always lead with 80% as "the estimate", mention 50/95 as options |
| Stories completed outside normal cycle | Exclude from baseline calculation (tag as "anomaly") |
| Team velocity improves faster than expected | Adjust baselines quarterly, not weekly (avoid noise) |

---

## 15. Admiral Talking Points

When presenting forecast to Admiral:

```
"Release 7.0 estimated complete [CONFIDENCE_80_DATE] (80% confidence).

50% confidence: [DATE] (optimistic, if all goes right)
80% confidence: [DATE] (realistic, planning default)  ← LEAD WITH THIS
95% confidence: [DATE] (conservative, safety margin)

Risk factors:
  • [Blocker 1]: [Hours blocked]
  • [Blocker 2]: [Hours blocked]
  Total blocker hours: [X] (25% buffer added)

Recommendation:
  [At risk | On track | Ahead of schedule]
  
  If at risk, options:
  - Reduce scope by [N points]
  - Extend deadline by [N days]
  - Add [N] crew member(s) to [Feature type]"
```

---

## 16. Crew Observation Lounge Questions

After sprint completion, ask crew:

1. **Velocity:** "Did we move faster/slower this sprint than last? Why?"
2. **Blockers:** "What blockers cost us the most time? How to prevent?"
3. **Estimation:** "Did the 50/80/95 forecasts match reality? Adjust for next sprint?"
4. **Complexity:** "Which story types took longer than expected?"
5. **Team:** "Who was blocked? Who was under capacity?"

---

## 17. Testing Velocity System

**Manual test (Phase 1):**
```bash
npx tsx scripts/velocity-scraper.ts
# Output: velocity-report.json
# Check: 
#   - Completed stories found? ✓
#   - Cycle times calculated? ✓
#   - Feature types detected? ✓
#   - Blockers parsed? ✓
```

**Cache test (Phase 2):**
```typescript
const cache = createVelocityCacheManager(db, redis);
const forecast = await cache.getSprintForecast('PROD-R-8');
console.log(forecast.estimate80.completionDate); // Should match DB
```

**Estimation test (Phase 2):**
```typescript
const estimator = new VelocityEstimator(cache, ahaClient);
const estimate = await estimator.estimateReleaseDate('PROD-R-8');
console.log(estimate.recommendation); // Should be actionable
```

---

## Resources

- **Full Design:** [`docs/design/velocity-tracking-and-estimation.md`](../../docs/design/velocity-tracking-and-estimation.md)
- **Types:** [`packages/shared/src/velocity-metrics.ts`](../../packages/shared/src/velocity-metrics.ts)
- **Cache:** [`packages/shared/src/velocity-cache.ts`](../../packages/shared/src/velocity-cache.ts)
- **Schema:** [`supabase/migrations/20260716000000_velocity_tracking_system.sql`](../../supabase/migrations/20260716000000_velocity_tracking_system.sql)

---

**Print this & reference during implementation!**
