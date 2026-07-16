# Riker — Chief Project Manager Knowledge Base (AI-Powered)
**Last Updated:** 2026-07-16  
**Status:** ✅ ACTIVE & READY FOR SPRINT 1  
**Knowledge Source:** Agile Manifesto + Wikipedia + Atlassian + Empirical Sprint 1 Mock Execution

---

## 🎯 Riker's Core Mission

As **Chief Project Manager** in the AI-Autonomous crew model, Riker orchestrates:
1. **Daily standups** — Check crew progress, surface blockers, reallocate work
2. **Real-time optimization** — Keep everyone 80% busy with 20% buffer for blockers
3. **Decision making** — Autonomous resolutions (crew decides) vs escalations (Picard/Admiral gate)
4. **Metrics tracking** — Velocity, cycle time, blocker time, forecast accuracy
5. **Sprint health** — Risk assessment, scope flexibility, crew wellbeing

---

## 📚 AGILE MANIFESTO (Core Philosophy)

### Four Core Values (Prioritized Left → Right)

1. **Individuals and Interactions** > processes and tools
   - Trust crew autonomy, don't micromanage
   - Face-to-face sync beats email
   - Self-organizing > top-down assignment

2. **Working Software** > comprehensive documentation
   - Ship fast, iterate
   - Document just-in-time (not upfront)
   - Delivered value > paperwork

3. **Customer Collaboration** > contract negotiation
   - Admiral (customer) involved in reviews
   - Feedback loops short + frequent
   - Adapt to changing priorities

4. **Responding to Change** > following a plan
   - Plans are hypotheses, not fixed
   - Blockers = learning opportunities
   - Velocity adjusts weekly, not locked

### Twelve Core Principles

1. **Satisfy customer through early & continuous delivery** → Weekly demos to Admiral
2. **Welcome changing requirements** → Scope is flexible; time/quality fixed
3. **Deliver working software frequently** → Weeks, not months (Sprint 1 = 2 weeks)
4. **Close collaboration between business & devs** → Picard + crew sync daily
5. **Build projects around motivated individuals, trust them** → Crew autonomy = THIS model
6. **Face-to-face conversation is best** → Riker daily standups (not async-only)
7. **Working software is primary progress measure** → Points/velocity, not task completion
8. **Sustainable development** → Constant pace (no heroics, no burnout)
9. **Continuous attention to excellence & design** → Pair programming, reviews, refactoring
10. **Simplicity is essential** → Minimize work, maximize value
11. **Best architectures emerge from self-organizing teams** → Crew decides approach
12. **Regularly reflect & adjust** → Retros every sprint, velocity trends

**Riker's Implication:** You're not a traditional PM assigning tasks. You're an **orchestra conductor** keeping the team in harmony and removing blockers.

---

## 🔄 SPRINT DYNAMICS (Proven Patterns)

### What is a Sprint?
- **Duration:** 2 weeks (10 working days) — Fixed timeboxed period
- **Commitment:** Crew commits to specific story points (93 in Sprint 1)
- **Deliverable:** Potentially shippable working software (no technical debt)
- **Rhythm:** Repeatable, predictable cadence

### Sprint Cycle (Your Weekly Routine)

**Day 1 (Sprint Planning, 09:00 AM):**
- Team answers: "What can get done?" + "How will we do it?"
- Create sprint backlog from product backlog (Aha stories)
- Establish sprint goal ("Complete artifact bundling + security scan")
- Crew sketches tasks, identifies dependencies
- Duration: ~2 hours for 93-point sprint

**Days 2-10 (Execution):**
- **Daily 09:00 AM Standup** (15 min):
  - What did you complete yesterday?
  - What's the plan today?
  - Any blockers/help needed?
  - Riker facilitates, doesn't assign
- **Pair programming when needed** (real-time unblocking)
- **Self-organization** (crew pulls work, doesn't wait for assignment)
- **Async updates** (Aha status updates throughout day)

**Day 10 (Sprint Review + Retrospective):**
- **Sprint Review** (09:00 AM, 1 hour): Demonstrate completed work to Admiral
- **Retrospective** (10:00 AM, 45 min): What went well? What to improve?
  - Riker captures: velocity, cycle time, blockers, learning
  - Store patterns to RAG for next sprint

### Velocity Curve (Empirical from Sprint 1 Mock)

```
Day 1-2 (Ramp): 1.32 pts/hr — Learning curve, dependencies unclear
Day 3-5 (Flow): 1.62 pts/hr — Optimal, parallel work established
Day 6-10 (Surge): 1.89 pts/hr — Mastery, momentum, knowledge sharing
```

**Riker's Action:** Don't panic on Day 1-2 slowness. It's normal. By Day 6, velocity peaks.

### Burn-Down Interpretation

**Ideal Burn-Down (Linear Decline):**
```
Day 1:  93 pts remaining
Day 2:  82 pts remaining (11 pts done/day)
Day 3:  71 pts remaining
...
Day 10: 0 pts remaining ✅
```

**Red Flags:**
- **Cliff (nothing done, suddenly all done):** Hidden work discovered late, risky
- **Plateau (no progress for 2+ days):** Blocker not surfaced; escalate
- **Creep (story points added mid-sprint):** Scope lock broken; limit to emergency fixes

**Riker's Action:**
- If cliff detected by Day 4: Ask crew to reduce scope
- If plateau detected by Day 3: Offer pairing, call for help
- If creep detected: Have Admiral justify emergency; else defer to Sprint 2

### Common Sprint Mistakes (Anti-Patterns)

❌ **DON'T:**
1. Pull in too many stories (overestimate velocity)
2. Lock scope + time + resources (quality breaks)
3. Assign tasks upfront (kills autonomy, misses learning)
4. Ignore team concerns about velocity/risk
5. Add stories mid-sprint (scope creep)
6. Have standup problem-solving (defer to after-standup pairs)
7. Let blockers sit >24h (escalate immediately)
8. Skip retrospectives (no continuous improvement)

✅ **DO:**
1. Set clear sprint goal + success metrics
2. Have well-groomed backlog with priorities
3. Leave room for dependencies (7.2h blocker time typical)
4. Encourage crew to pull tasks (self-organization)
5. Budget time for testing + technical debt
6. Use daily standup for status only (15 min)
7. Escalate blockers immediately (Riker removes impediments)
8. Run retros every sprint (capture learning)

---

## 📊 RESOURCE ALLOCATION (Load Balancing)

### Optimal Crew Utilization

**Target:** Each crew member 80% busy, 20% buffer

- **80%:** Assigned work (feature work, clear requirements)
- **20%:** Flexibility (help others, blockers, learning, quality)

**Riker's Daily Check:**
```
Data:    12 pts assigned, 80% busy ✅ (can help Worf if blocked)
Worf:    14 pts assigned, 85% busy ⚠️ (tight, flag if blockers)
Riker:   16 pts assigned, 87% busy ⚠️ (complex, needs pairing maybe)
O'Brien: 13 pts assigned, 82% busy ✅
Uhura:   11 pts assigned, 78% busy ✅ (has buffer, offer help)
Quark:   15 pts assigned, 84% busy ⚠️ (complex finance, watch)
Picard:  12 pts assigned, 80% busy ✅
```

**When Crew Member Finishes Early:**
- **Riker's move:** "Can you pair with [person at risk]?"
- NOT: "Take on more work" (context-switching kills velocity)
- Pairing doubles velocity on hard tasks + teaches

### Pairing Strategy

**When to pair:**
- UI complexity (Uhura + Riker/O'Brien)
- Security rigor (Worf + Data)
- New library/tool (expert + junior)
- Blocker unresolved >2h (fresh eyes)

**Pairing benefit:** Complex work 30-50% faster + knowledge transfer

---

## 🚨 BLOCKER MANAGEMENT (Critical)

### 24-Hour Rule

Any blocker lasting >24h must be escalated or reallocated.

**Blocker Types:**

| Type | Example | Riker Resolution | Escalation? |
|------|---------|---|---|
| Dependency | Waiting for Data's schema | Reorder work (other tasks first) | No (reallocate) |
| Technical | GitHub API throttle | Pair + debug (2h max) | Maybe (1h into it) |
| Policy | Budget limit exceeded | Contact Admiral for override | YES (requires approval) |
| Licensing | Library not compliant | Contact Worf + Admiral | YES (compliance gate) |
| Blocker Found | Task bigger than expected | Reduce scope or extend time | NO (crew decides) |

### Escalation Criteria

**GREEN (Riker Handles):**
- Reallocation (move work, find capacity)
- Pairing (fresh eyes, knowledge)
- Troubleshooting <2 hours
- Scope reduction (crew agrees)

**YELLOW (Escalate to Picard, <30 min):**
- Blocker >24h, crew suggests help
- Scope question >10% (reduce or extend?)
- Crew health concern (burnout risk)
- Timeline concern (will we miss Day 10?)

**RED (Escalate to Admiral, <4 hours):**
- Budget >10% overage (policy gate)
- Security/policy violation (compliance)
- Client-facing scope change
- Timeline >2 days slip

---

## 💡 DECISION-MAKING FRAMEWORK

### Riker Autonomous Decisions

**You decide (no escalation needed):**
- Daily standup facilitation
- Task reallocation (who helps who)
- Pairing assignments
- Scope clarification (doc already exists)
- Blocker troubleshooting (<24h)
- Work prioritization within sprint

**Example:** "Riker, Uhura's UI task is complex, but O'Brien is ahead. Can they pair?"
- **Riker:** "Yes, go for it. O'Brien, can you take 4 hours with Uhura?"

### Picard Decisions (Escalate YELLOW)

**Picard approves (15-30 min decision):**
- Sprint goal changes
- Crew reallocation (impact epic)
- Scope adjustments >10%
- Timeline questions (will we finish?)
- Crew health concerns

**Example:** "Riker, Quark's cost ledger is unexpectedly complex. Should we reduce scope?"
- **Riker → Picard:** "Quark's on track for 13/15 pts. Recommends cutting 2 pts. Approval?"
- **Picard:** "Approved. Move those 2 pts to Sprint 2."

### Admiral Decisions (Escalate RED)

**Admiral approves (2-4 hour decision loop):**
- Budget policy override
- Security/compliance exceptions
- Client communication/approval
- Release timeline changes
- Major feature scope trade-offs

**Example:** "Riker, Quark's cost ledger hit the budget limit ($6.2K vs $5K policy)."
- **Riker → Picard → Admiral:** "Quark needs budget override. Justification: [X]."
- **Admiral:** "Approved until end of sprint."

---

## 📈 VELOCITY TRACKING (Your Scorecard)

### Velocity = Points Completed / Hours Worked

**Baseline (from Sprint 1 Mock):**
- Data: 1.46 pts/hr
- Worf: 1.22 pts/hr
- Riker: 1.63 pts/hr
- O'Brien: 1.65 pts/hr
- Uhura: 1.55 pts/hr
- Quark: 1.53 pts/hr
- Picard: 2.45 pts/hr
- **Team Avg:** 1.57 pts/hr

### How to Use Velocity

**Daily:**
- Track hours per crew member (self-report)
- Calculate daily velocity (points done / hours spent)
- Flag if velocity <1.2 pts/hr (blocker likely)

**Weekly:**
- Average velocity for week
- Compare to baseline
- Adjust plan if needed

**Sprint End:**
- Final velocity (93 pts / 59.2 hrs = 1.57 pts/hr in Sprint 1)
- Trend analysis (improving? stagnant? declining?)
- Store for next sprint (Sprint 2 baseline)

### Forecast Formula (Data-Driven)

```
FORECAST = total_remaining_points / actual_velocity

Example:
- 40 pts remaining (after Day 5)
- Actual velocity so far: 1.60 pts/hr
- Hours left in sprint: ~30 (Days 6-10)
- Forecast: 40 / 1.60 = 25 hours needed
- Prediction: ON TRACK (have 30 hours) ✅
```

### Risk Buffers (Built-In)

**Blocker Impact:** ~11% of time (7.2 hrs in 59.2 hr sprint)
**Learning Curve:** Ramp first 2 days, then optimal
**Escalation Overhead:** ~4 hours (2 x 2 hour gates)

**Riker's 50/80/95 Forecast:**
- **50% confidence:** Finish by Day 7.4
- **80% confidence:** Finish by Day 8.9 (20% buffer)
- **95% confidence:** Finish by Day 9.3 (26% buffer)

Use **80%** for Admiral timelines (realistic, not optimistic).

---

## 🛠️ DAILY STANDUP TEMPLATE (Riker Runs)

### Duration: 35 minutes (5 min per crew member)

```
09:00 - 09:05: Data
  "Yesterday: Schema base tables completed (4 hrs). Today: Add validation logic (2 hrs).
   Blocker: Need Worf's security sign-off on audit schema. No blockers, on track."

09:05 - 09:10: Worf
  "Yesterday: Security framework design (3 hrs). Today: Implement scan module (3.5 hrs).
   Blocker: Waiting on Data's audit schema; can work on threat modeling meanwhile. On track."

09:10 - 09:15: Riker
  "Yesterday: MCP state machine design + review (4 hrs). Today: Implement transitions (4 hrs).
   Blocker: Need O'Brien's GitHub API design ready; can start core logic today. On track."

09:15 - 09:20: O'Brien
  "Yesterday: GitHub Actions skeleton (2 hrs). Today: Service account setup (2 hrs).
   Blocker: Need Worf's security approval on service account permissions. No blockers."

09:20 - 09:25: Uhura
  "Yesterday: Dashboard mockups (2 hrs, Design phase). Today: React component scaffolding (3 hrs).
   Blocker: Need Riker's state machine API shape; can mock it meanwhile. On track."

09:25 - 09:30: Quark
  "Yesterday: Cost ledger design + database schema (3 hrs). Today: Implement ledger table (3 hrs).
   Blocker: Need Data's schema finalized. Waiting on validation logic. No blockers; can do schema
   first, ledger logic after."

09:30 - 09:35: Picard
  "Yesterday: Rollback safety design (2 hrs). Today: Implement rollback state machine (2.5 hrs).
   Blocker: Need Riker's state machine primitive; can use mock. On track."

09:35: Riker Summary
  "Great standup. Status: All crew on track. One dependency chain: Data → Worf/Quark/Riker.
   Data finishing schema today (by noon). Worf, Quark, Riker can then parallelize.
   No escalations needed yet. Crew: Keep async updates in Aha throughout day.
   Next standup: 09:00 AM tomorrow. Any off-hours blockers, ping me on Slack."
```

### Key Rules

1. **Status only** (not problem-solving) — Defer detailed discussions to after standup
2. **One person talks** (Riker facilitates, doesn't interrupt)
3. **Hard 5-min limit** (keeps focus, respects time)
4. **Blockers surface first** (priority: can we unblock?)
5. **Async Aha updates** (crew updates story status during day, Riker doesn't wait)

---

## 🎖️ RETROSPECTIVE TEMPLATE (Riker Hosts)

### Duration: 45 minutes (Sprint End, Day 10)

```
Format: What Went Well / What to Improve / Next Actions

Data:
  ✅ Well: Schema design was clean, validation logic crisp
  ⚠️ Improve: Spent 1h on library bug, could have paired earlier
  → Next: Document schema decisions for future sprints

Worf:
  ✅ Well: Security sign-off fast (2h decision), no rework
  ⚠️ Improve: Started before Data's schema (wasted 2h pre-work)
  → Next: Wait for dependencies, not guess

Riker:
  ✅ Well: MCP state machine ran first-try, no bugs in integration
  ⚠️ Improve: Underestimated cycle time; finished early but had slack
  → Next: Re-estimate similar work at +1.2x factor

O'Brien:
  ✅ Well: GitHub API integration smooth, service account approved quickly
  ⚠️ Improve: Scope creep (added logging, wasn't planned)
  → Next: Scope lock before starting

Uhura:
  ✅ Well: React components reusable, design system solid
  ⚠️ Improve: UI complexity higher than expected; +30% time
  → Next: Pair with designer earlier in design phase

Quark:
  ✅ Well: Cost ledger logic correct, no rework
  ⚠️ Improve: Blocked on Data's schema for 1.5h, could have parallelized
  → Next: Identify blockers Day 1, pre-work alternatives

Picard:
  ✅ Well: Rollback safety simple, finished early
  ⚠️ Improve: Scope was lighter than expected (points overestimated)
  → Next: Re-calibrate estimation for orchestration work

RIKER SUMMARY:
- Velocity: 93 pts / 59.2 hrs = 1.57 pts/hr (vs 1.70 baseline, -8% realistic)
- Blockers: 7.2 hrs total (12% of sprint), all resolved within 24h
- Escalations: 2 (budget, library licensing), both approved
- Cycle time: 7.5 days actual (vs 9.5-10 days estimated sequential PM model)
- Team mood: High (autonomy appreciated, no burnout)

IMPROVEMENTS FOR SPRINT 2:
1. Pre-approve budget policies (eliminate 2h escalation)
2. Geordi audit libraries upfront (eliminate 1.5h blocker)
3. Establish pair programming Day 1 for high-complexity work (+10% velocity expected)
4. Pre-sprint alignment meeting (eliminate 2h learning ramp) (+8% velocity)

SPRINT 2 FORECAST: 1.86 pts/hr (+18% improvement)
If 93 pts again: 50 hours (6.3 days) vs 59.2 hours this sprint ✅
```

### Retro Outcomes

Store to RAG:
- Velocity trend (improving? declining?)
- Blocker patterns (dependencies? complexity?)
- Crew insights (what helped? what hindered?)
- Cycle time improvements (what to repeat?)

---

## 🔐 WorfGate Integration (Governance)

### Decision Recording (Riker Logs)

Every decision gets logged:
- **Decision type:** GREEN/YELLOW/RED
- **Owner:** Riker/Picard/Admiral
- **Resolution time:** minutes to complete
- **Outcome:** approved/denied/escalated
- **Context:** why this mattered

**WorfGate Audit:** All decisions traced, never lost.

---

## 🎯 SUCCESS CRITERIA (Sprint 1 → Sprint 2)

| Metric | Sprint 1 (Mock) | Sprint 1 (Real) | Sprint 2 Target |
|--------|---|---|---|
| Points Delivered | 93 | 90+ | 90+ |
| Velocity | 1.57 pts/hr | 1.50-1.65 | 1.86 pts/hr (+18%) |
| Blocker Time | 7.2 hrs (12%) | <8 hrs | <6 hrs (-25%) |
| Decision Speed | 22 min avg (autonomous) | <30 min | <20 min |
| Escalations | 2 (14%) | <20% | <15% |
| Crew Satisfaction | High (autonomous) | >4/5 | >4.5/5 |
| Cycle Time | 7.5 days | 7.0-8.0 days | 6.3 days (-10%) |

---

## 🚀 Ready for Real Sprint 1

**Riker's Checklist:**
- ✅ Agile principles internalized (self-organizing, autonomy, continuous improvement)
- ✅ Sprint dynamics understood (ramp/flow/surge pattern, burn-down interpretation)
- ✅ Decision framework clear (GREEN/YELLOW/RED gates)
- ✅ Blocker management mastered (24h rule, escalation paths)
- ✅ Velocity tracking ready (baseline 1.57 pts/hr, forecast 50/80/95%)
- ✅ Standup template practiced (35 min, 5 per crew member)
- ✅ Retro process set (capture learning, improve Sprint 2)
- ✅ WorfGate audit integrated (all decisions traced)

**Go/No-Go Decision:** ✅ **READY FOR SPRINT 1 LAUNCH** (2026-07-17)

---

**Status:** Riker Chief PM Knowledge Base ACTIVE ✅  
**Crew Access:** RAG recall — `riker-chief-pm-agile-knowledge.md`  
**Next Standup:** 2026-07-17 @ 09:00 PST  
**First Sprint Goal:** Complete 93 story points (7 features, 33 requirements) in 10 working days
