# Copilot Cost Baseline — Week 1 Section 31 Dogfood

**Owner:** Quark (Finance & Cost Analysis)  
**Purpose:** Establish reference cost for GitHub Copilot to compare against OpenRouter crew routing  
**Go/No-Go Decision:** Baseline must be established by EOD 2026-07-10 (Day 1)  
**Data:** Measured during Week 1 dogfood (2026-07-11 to 2026-07-18)

---

## 1. Copilot Pricing Model

**Product:** GitHub Copilot Pro (Legacy; Reference Standard)

### Official Pricing
| Tier | Price | Term | Target Users |
|------|-------|------|--------------|
| **Copilot Pro** | $20 | Per user / month | Individual developers |
| **Copilot Business** | $39 | Per user / month | Enterprise teams |
| **Copilot Enterprise** | Custom | Annual contracts | Large organizations (>500) |

**For this dogfood:** Use **Copilot Pro @ $20/month** as the baseline. This is the retail rate testers would pay if using Copilot independently (no seat license discount).

---

## 2. Usage Assumptions (Tester Cohort)

### Chat Frequency
- **Per user / day:** 10 chats (conservative estimate, range 5–20 based on persona)
  - Data engineers (Data, Geordi): 15–20 chats/day (heavy analysis)
  - Product (Troi, Picard): 8–12 chats/day (planning, decisions)
  - QA (Yar): 10–15 chats/day (test case generation)
  - Finance (Quark): 5–10 chats/day (reporting, math validation)
  - **Average across 10 testers: 10 chats/day**

- **Per tester / week:** 70 chats (10 chats/day × 7 days)
- **Per tester / dogfood week:** 70 chats
- **Cohort (10 testers) / week:** 700 chats

### Tokens per Chat Request

**Average turn structure:**
- User message: ~50 tokens (typical chat query: "What does this code do?")
- System context (RAG injected): ~200 tokens (1–2 code snippets + memory)
- Model response: ~300 tokens (typical multi-line explanation)
- **Total per chat: ~550 tokens**

**Token cost:** Varies by Copilot tier and model used.
- Copilot Pro: Uses OpenAI gpt-4o, gpt-4-turbo, or gpt-4o-mini (Copilot's routing)
- Estimated cost per token: ~$0.0015 per 1K input tokens + $0.006 per 1K output tokens (OpenAI public rates)
- Approximate cost per chat: **~$0.02** (accounting for typical input/output mix)

*Note: GitHub does NOT publish itemized per-request billing, so this is an estimate based on OpenAI's published rates.*

---

## 3. Cost Baseline Calculation

### Daily Cost (Per User)

```
10 chats/day × $0.02/chat = $0.20/user/day
```

### Weekly Cost (Per User)
```
$0.20/day × 7 days = $1.40/user/week
```

### Monthly Cost (Per User) — Plan-Level Assumption
```
Copilot Pro subscription: $20/month ÷ 30 days = $0.67/user/day
OR (from usage): $0.20/day (conservative estimate, only counts chats used)
```

### Cohort Cost (Week 1, 10 Testers)
```
Baseline usage rate: 10 testers × $0.20/user/day × 7 days = $14/week
OR (subscription equivalent): 10 testers × $20/month ÷ 4.3 weeks = $46.51/week (seat-based)
```

**For comparison:** Use the **usage-based estimate ($0.20/user/day)** rather than the seat subscription, since our crew is also usage-metered.

---

## 4. Week 1 OpenRouter vs. Copilot Comparison Plan

### Daily Measurement (EOD Each Day)

**Metrics to collect:**

| Metric | Owner | Method | Alert Threshold |
|--------|-------|--------|-----------------|
| **OpenRouter cost/user** | Quark | Sum OpenRouter API bills by user | >$0.25/user/day (25% above baseline) |
| **Chat frequency (actual)** | Troi | Count chat requests in telemetry | Baseline ±20% (normal variance) |
| **Error rate** | Yar | % of failed requests | >0.1% triggers cost review (flaky requests = wasted cost) |
| **Tokens per chat (OpenRouter)** | Quark | Log token counts from Quark model selector | >20% higher = review model routing |
| **Manual opt-outs** | Troi | Count times testers toggled to Copilot | >20% opt-out = sentiment signal |

### Daily Report (Template)

```
Date: 2026-07-11
Copilot Baseline: $0.20/user/day
OpenRouter Cost (measured): $0.18/user/day
Variance: -10% (SAVINGS)
Error Rate: 0.05% (healthy)
Chat Frequency: 9.8/user/day (expected)
Opt-Out Rate: 0% (strong sentiment)
Recommendation: GREEN — proceed
```

### Weekly Rollup (EOD 2026-07-18)

```
Week 1 Total Cost (OpenRouter): $12.60 (10 users × 7 days × $0.18/day)
Week 1 Baseline (Copilot): $14.00 (10 users × 7 days × $0.20/day)
Savings: $1.40 / week (10% below baseline)
Savings Rate: 90% cost parity vs. Copilot Pro
Cost per token: ~$0.0008 (Quark routing) vs. ~$0.0015 (Copilot estimate)
ROI Signal: POSITIVE (cheaper, comparable fidelity)
```

---

## 5. Known Limitations & Caveats

### Data Quality
1. **Copilot baseline is an ESTIMATE.** GitHub does not publish per-request pricing. Our estimate uses OpenAI's public rates ($0.003/1K input + $0.012/1K output for gpt-4o). Actual Copilot cost may differ ±30%.

2. **Chat frequency assumptions.** Testers may use more/fewer chats than our 10/day estimate. We'll measure actual frequency and adjust baseline daily.

3. **Token inflation in crew.** Our crew's RAG context injection (200–300 tokens of system context) may inflate OpenRouter token counts. Cost comparison should account for "input tokens injected for context quality."

4. **Fallback cost not included.** If crew goes down and testers auto-fallback to Copilot, we measure only OpenRouter spend (fallback cost is opaque/hypothetical).

5. **Multi-model routing.** Quark selects different models per turn (cheap model for simple turns, quality model for complex). Tokens will vary. Average cost is a weighted blend—outliers (very long responses) will skew high.

6. **Regional variance.** OpenRouter pricing varies by region (some models not available in all regions). We assume US-based access.

### Measurement Gaps
- **Copilot's actual token count:** We estimate ~550 tokens/chat. If tests reveal average is 200 or 1000, our baseline shifts.
- **Concurrent requests cost:** We assume sequential chats. If testers run parallel requests, token costs multiply but are not captured per-request.
- **Sentiment vs. cost trade-off:** A cheaper model with lower fidelity may cost less but drive opt-outs. Savings are meaningless if sentiment is negative.

---

## 6. ROI Validation Decision Tree

### Success Scenario (Green Light → Week 2 Canary)
```
IF OpenRouter cost < Copilot baseline ($0.20/user/day)
  AND error rate < 0.1%
  AND sentiment >= neutral (opt-out < 2%)
THEN: ROI positive. Recommend Week 2 expansion to 100 testers.
```

### Marginal Scenario (Amber Light → Iterate)
```
IF OpenRouter cost ≤ Copilot baseline
  AND error rate 0.1%–0.5%
  AND sentiment mixed (opt-out 2%–5%)
THEN: Cost-neutral but UX/reliability concerns. Fix issues, retry Week 2.
```

### Failure Scenario (Red Light → Rollback or Redesign)
```
IF OpenRouter cost > Copilot baseline by >20%
  OR error rate > 0.5%
  OR sentiment negative (opt-out > 5%)
THEN: ROI negative or UX blocking. Rollback, review Quark routing logic, redesign.
```

---

## 7. Copilot Pro Pricing Sensitivity

### What if testers used Copilot more intensively?

| Chats/Day | Cost/Day | Variance from Baseline |
|-----------|----------|------------------------|
| 5 (light user) | $0.10 | −50% |
| 10 (baseline) | $0.20 | 0% |
| 20 (power user) | $0.40 | +100% |
| 50 (extreme) | $1.00 | +400% |

**Implication:** If Week 1 measures higher usage (15–20 chats/day instead of 10), Copilot cost baseline *increases* proportionally. OpenRouter cost may stay flat (usage-independent if we hit a per-user model cap). Cost advantage grows.

---

## 8. Comparison Method

### Daily (Live Dashboard)
- **Copilot baseline line:** Horizontal at $0.20/user/day
- **OpenRouter cost line:** Actual measured spend (ascending/descending)
- **Variance band:** ±10% (green = acceptable)
- **Alert:** If OpenRouter exceeds baseline + 10%, flag for Quark review

### Weekly Rollup (Narrative)
1. Calculate total OpenRouter spend (sum of daily costs × 10 users)
2. Calculate hypothetical Copilot spend (baseline × 10 users × 7 days)
3. Report absolute savings ($ difference) + percent savings (OpenRouter / Copilot × 100%)
4. Cross-tabulate with error rate & sentiment to assess ROI holistically

---

## 9. Sign-Off & Commitment

- [ ] **Quark:** Baseline assumptions documented (chats/day, tokens/chat, cost/token)
- [ ] **Quark:** Daily measurement mechanism live (telemetry, billing integration)
- [ ] **Troi:** Chat frequency & sentiment telemetry active
- [ ] **Yar:** Error rate monitoring + alerts active
- [ ] **Picard:** Baseline accepted as reference for go/no-go decision

---

## 10. Appendix: OpenRouter vs. Copilot Positioning

| Dimension | Copilot Pro | OpenRouter Crew |
|-----------|-------------|-----------------|
| **Pricing Model** | $20/month flat | Pay-per-token (usage) |
| **Cost Advantage** | Predictable cap | Marginal cost + volume savings |
| **Model Selector** | GitHub-opaque | Quark (transparent routing) |
| **RAG Integration** | None (native context only) | Cloud memory + observation lounge |
| **Fallback** | N/A | Auto-fallback to Copilot |
| **Token Visibility** | No itemization | Per-request logging |
| **Data Retention** | GitHub's policy | Our Supabase RAG (compliance scoped) |

---

**Next Steps:**
1. Activate OpenRouter billing integration (Quark to connect account)
2. Deploy telemetry collectors for chat frequency & error rate (Troi, Yar)
3. Day 1 (2026-07-11): Measure baseline Copilot assumption (chat frequency) via real testers
4. Day 2–7: Daily cost comparison reports
5. EOD 2026-07-18: ROI decision (proceed / iterate / rollback)
