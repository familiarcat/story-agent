# Picard Variance Unification: Hallucination Guard Rail Pattern

## Problem

Original design: **Always show 3 alternatives (conservative/balanced/aggressive)** when crew deliberates.

Issue: This creates choice paralysis for users even when crew actually agrees on the core approach.

## Solution: Picard as Unification Layer

Picard's synthesis step now serves as a **quality gate and hallucination detector**:

### The Flow

```
1. Riker assembles team + crew deliberates
   ↓ Multiple positions may emerge (Worf: cautious, Data: aggressive, etc.)

2. Picard Synthesis (NEW: Attempt Unification)
   ├─ Identify hard constraints (must haves): Security requirements, infra limits, compliance rules
   ├─ Identify soft preferences (nice to haves): Risk tolerance, feature breadth, optimization targets
   ├─ Reframe disagreement as: "Do both" or "Sequence these" or "Pick best approach for shared goal"
   ├─ If all concerns addressable → Generate unified plan ✅
   └─ If fundamental tradeoff persists → Keep alternatives ⚠️

3. Return Result
   ├─ Consensus (85% common): Show ONE unified plan → User accepts or proceeds
   └─ Variance (15% rare): Show 3 alternatives → User picks one + provides reasoning
```

### When It Works

```
Team Positions:
  • Worf: "We need approval gates for security"
  • Data: "Two architectures both valid"
  • Geordi: "Approach A is cheaper"
  • Riker: "Need to ship in 3 days"

Picard Unifies:
  "Use Geordi's approach (cheaper + 3-day timeline).
   Add Worf's approval gate (addresses security).
   Data confirms architecture scales.
   Riker confirms timeline feasible."

Result: ONE plan addressing all concerns ✅
```

### When It Fails (Rare)

```
Team Positions:
  • Worf: "Manual review mandatory, can't automate"
  • Riker: "Need fully automated (Romulan deadline)"

Picard Attempts Unification:
  "Could do hybrid: auto + spot checks?"
  Worf: "Not sufficient for this threat model"
  Riker: "We'll miss deadline"

Result: Fundamental tradeoff, show 3 alternatives ⚠️
```

## Quality Signals

Variance detection **IS NOT a failure**—it's a feedback mechanism:

| Signal | Interpretation | Action |
|--------|-----------------|--------|
| High consensus rate (90%+) | Crew alignment is good | Maintain prompt engineering |
| Consensus drops below 80% | Picard struggling to unify | Refine Picard synthesis prompt |
| Crew positions wildly different from start | Poor prompt clarity | Refine Riker/crew member prompts |
| Same variance pattern repeats | Systematic disagreement | Establish domain principle/rule |

## Refinement Levers

### Lever 1: Picard Synthesis Prompt
```
Current: "Generate 3 alternative mission plans"

Refined: "Synthesize crew consensus by:
  1. Identifying must-have requirements vs nice-to-haves
  2. Finding unifying principles all crew agrees on
  3. Proposing ONE plan addressing all requirements
  4. Only if fundamental tradeoff exists, provide alternatives"
```

### Lever 2: Crew Member Prompts
```
Riker (Assembly):
  Current: "Assemble optimal team for this task"
  Refined: "Assemble around SHARED GOAL. If team has different goals, 
           identify shared constraint and reframe as one mission."

Each Crew Member:
  Current: "Contribute your domain perspective"
  Refined: "Contribute your domain's unique insight toward shared goal.
           If you see different approach, explain CONSTRAINT or 
           REQUIREMENT it addresses that other team members missed."

Troi (Empath):
  Current: "Assess team dynamics"
  Refined: "When positions conflict, identify if it's 
           terminology/understanding vs actual disagreement.
           Clarify what each position is trying to protect/achieve."
```

## UX Impact

| Case | User Sees | UX Outcome |
|------|-----------|-----------|
| Consensus (85%+) | "✅ Unified Plan (11/11 crew agreed)" + ONE plan | Clean, no paralysis |
| Variance (rare) | "⚠️ Unresolved Disagreement" + 3 alternatives + WHY crew disagreed | Informed choice |
| No consensus possible | System notes: "Consider asking for clarification" → user provides context | Learning opportunity |

## Data to Track

Store in Observation Lounge:
- `consensus_type`: 'unified' | 'user_resolved' | 'crew_unanimous'
- `unification_attempts`: Count of times Picard tried to reconcile
- `variance_reason`: What crews disagreed on (security vs speed, etc.)
- `user_choice_when_variance`: Which alternative did user pick when shown 3?
- `outcome_of_user_choice`: Did user's choice work out? (feeds back as lesson)

Over time: Learn which variance patterns lead to success, which to failure.

## Success Criteria

1. ✅ Consensus shown for 80%+ of deliberations (no choice paralysis most of the time)
2. ✅ When variance persists, it reflects genuine tradeoff (not hallucination)
3. ✅ Picard synthesis improves: unification rate increases over time as prompt refined
4. ✅ Crew prompts align: crew positions converge earlier, Picard has easier time
5. ✅ User learns: By seeing consensus reasons + variance reasons, user understands crew reasoning
