# Data + Troi: Sample Missions UI/UX Implementation Spec
**Phase:** 3A UI/UX Foundation · **Duration:** 4 weeks · **Cost Envelope:** $0.50 (implementation), then $0.002–0.20/mission (runtime)  
**Status:** Ready for implementation · **Owners:** Data (architecture), Troi (interaction design)

---

## Overview: Task-Driven Mission Orchestration

Instead of a feature dashboard, users describe a task in natural language → system auto-assembles crew → real-time execution feed → outcome-focused results → one-click follow-ups.

**Three Core Screens:**
1. **Task Entry** — "What do you want to accomplish?"
2. **Live Feed** — Crew working in real-time (with user pause/ask controls)
3. **Outcomes** — Findings + next steps (one-click launch)

---

## 1. TypeScript Data Types (Data)

### Core Mission Schema

```typescript
// packages/shared/src/mission-types.ts

import { z } from 'zod';

// Mission categories per crew consensus
export type MissionCategory = 'A1' | 'A2' | 'B1' | 'B2' | 'B3';

export const MissionCategoryEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'B3']);

export type MissionInfraType = 'ephemeral' | 'persistent';

export const MissionSchema = z.object({
  // Identity
  id: z.string().uuid(),
  storyId: z.string().optional(), // Link to sa_stories if applicable
  
  // User Intent
  userInput: z.string().min(10).max(500), // "Audit TypeScript strict mode"
  
  // Auto-Classification (Data responsibility)
  autoClassification: z.object({
    category: MissionCategoryEnum,
    infraType: z.enum(['ephemeral', 'persistent']),
    confidence: z.number().min(0).max(1), // 0.0–1.0
    reasoning: z.string(), // "Matched to A1 (deterministic linter task)"
  }),
  
  // Crew Assignment (via Quark model selector)
  assignedCrew: z.array(z.string()), // ['data', 'geordi'] 
  primaryOwner: z.string(), // Picard or lead crew member
  
  // Execution State
  status: z.enum(['pending', 'running', 'escalation_needed', 'complete', 'failed']),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  
  // Findings (post-execution)
  findings: z.array(z.object({
    id: z.string().uuid(),
    issue: z.string(), // "Missing return type annotation"
    file: z.string(), // "src/utils/helpers.ts"
    line: z.number(),
    suggestedFix: z.string(),
    owner: z.string(), // "Frontend team" or crew member
    effortMinutes: z.number().min(1).max(480),
    severity: z.enum(['low', 'medium', 'high']), // For prioritization
  })).default([]),
  
  // Stakeholder Impact (Troi responsibility)
  stakeholderImpact: z.string().optional(), 
  // "Frontend team can unblock if you resolve by Friday"
  
  // Cost Tracking (Quark responsibility)
  cost: z.object({
    estimated: z.number().min(0).max(10),
    actual: z.number().min(0).max(10).optional(),
    modelTier: z.enum(['frugal', 'standard', 'frontier']),
    breakdown: z.record(z.string(), z.number()).optional(), // { 'data': 0.001, 'picard': 0.002 }
  }),
  
  // Follow-Up Missions (auto-suggested)
  suggestedNextMissions: z.array(z.object({
    category: MissionCategoryEnum,
    description: z.string(), // "Write fixes for 3 violations"
    reasoning: z.string(), // Why this is the next logical step
    impact: z.string(), // "Unblock frontend team"
  })).default([]),
  
  // Escalation (if crew can't decide)
  escalation: z.object({
    isNeeded: z.boolean(),
    options: z.array(z.object({
      id: z.string(), // 'option_a', 'option_b'
      label: z.string(), // "Quick Fix (Risky)"
      approach: z.string(),
      cost: z.number(),
      timeline: z.string(),
      risk: z.string(),
      recommendation: z.string().optional(), // Troi's recommendation
    })),
    userChoice: z.string().optional(), // Which option user chose
  }).optional(),
});

export type Mission = z.infer<typeof MissionSchema>;
```

### Execution Stream Schema (Live Feed)

```typescript
// packages/shared/src/mission-execution-stream.ts

export const MissionExecutionLogSchema = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  crewId: z.string(), // 'data', 'picard', etc.
  domain: z.string(), // 'architecture', 'infrastructure', 'stakeholder'
  level: z.enum(['debug', 'info', 'action', 'escalation']), // Only show info/action/escalation in UI
  text: z.string(), // "Found 3 violations in TypeScript files"
  emoji: z.string().optional(), // "🔍", "📋", "🎯", "⚠️"
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  // Links
  fileReferences: z.array(z.object({
    file: z.string(), // "src/utils/helpers.ts"
    line: z.number(),
  })).optional(),
});

export type MissionExecutionLog = z.infer<typeof MissionExecutionLogSchema>;
```

### Database Schema (SQL Migration)

```sql
-- supabase/migrations/20260826000001_create_mission_tables.sql

CREATE TABLE sa_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'story-agent',
  
  -- User intent
  user_input TEXT NOT NULL,
  
  -- Auto-classification
  category VARCHAR(3) NOT NULL, -- 'A1', 'A2', 'B1', etc.
  infra_type VARCHAR(20) NOT NULL, -- 'ephemeral', 'persistent'
  classification_confidence DECIMAL(3, 2),
  classification_reasoning TEXT,
  
  -- Crew assignment
  assigned_crew TEXT[] NOT NULL, -- ARRAY['data', 'geordi']
  primary_owner VARCHAR(32),
  
  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  estimated_cost DECIMAL(8, 5),
  actual_cost DECIMAL(8, 5),
  model_tier VARCHAR(20),
  
  -- Results
  findings JSONB, -- Array of { issue, file, line, fix, owner, effort, severity }
  stakeholder_impact TEXT,
  
  -- Escalation
  escalation_needed BOOLEAN DEFAULT FALSE,
  escalation_options JSONB, -- Array of { id, label, approach, cost, timeline, risk, recommendation }
  escalation_choice VARCHAR(32),
  
  -- Follow-up suggestions
  suggested_next_missions JSONB, -- Array of { category, description, reasoning, impact }
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_missions_tenant (tenant_id),
  INDEX idx_missions_status (status),
  INDEX idx_missions_category (category)
);

CREATE TABLE sa_mission_execution_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL,
  crew_id VARCHAR(32) NOT NULL,
  domain VARCHAR(32),
  level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'action', 'escalation'
  text TEXT NOT NULL,
  emoji VARCHAR(10),
  metadata JSONB,
  file_references JSONB, -- Array of { file, line }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (mission_id) REFERENCES sa_missions(id) ON DELETE CASCADE,
  INDEX idx_exec_stream_mission (mission_id),
  INDEX idx_exec_stream_level (level)
);

CREATE TABLE sa_mission_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL,
  issue TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER,
  suggested_fix TEXT,
  owner TEXT,
  effort_minutes INTEGER,
  severity VARCHAR(20), -- 'low', 'medium', 'high'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (mission_id) REFERENCES sa_missions(id) ON DELETE CASCADE,
  INDEX idx_findings_mission (mission_id)
);
```

---

## 2. UI/UX Wireframes & Interaction Flow (Troi)

### Screen 1: Task Entry (Simple Natural Language Input)

```
┌─────────────────────────────────────────────────────┐
│  📋 Story Agent Mission Control                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  What do you want to accomplish?                   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Text input - focus here]                   │   │
│  │ "Audit TypeScript strict mode across repo" │   │
│  │                                             │   │
│  │ (Min 10 chars, Max 500)                     │   │
│  │ Char count: 38 / 500                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Recent missions:                                   │
│  • "Fix linting errors" (completed)                │
│  • "Security audit Supabase perms" (in progress)   │
│  • "Summarize sprint velocity" (completed)         │
│                                                     │
│  [Sample missions ▼]                               │
│  └─ Audit code style                               │
│  └─ Run security scan                              │
│  └─ Summarize project health                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Interaction:**
1. User types task description
2. System real-time classifies (auto-detect A1/A2/B1/B2/B3)
3. Show results below input:

```
┌─────────────────────────────────────────────────────┐
│  [Text input filled]                                │
│  "Audit TypeScript strict mode"                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ Classification: COMPLETE                        │
│                                                     │
│  ⚡ QUICK AUDIT                                      │
│  Category: A1 (Shake-Down Diagnostic)              │
│  │                                                  │
│  ├─ What: Single-crew type-safety audit             │
│  ├─ Crew: Data (TypeScript expert)                  │
│  ├─ Time: ~15 seconds to results                    │
│  ├─ Cost: ~$0.002 (cheaper than coffee)            │
│  └─ Approach: Run tsc --strict + report violations  │
│                                                     │
│  🎯 Impact: Identify type safety issues before      │
│            production deployment                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ [▶ Launch Mission]  [← Change Type]          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Questions? [↙ Ask crew for different approach]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Design Tokens (Troi):**
- Color scheme:
  - **A1/A2 (Quick):** ⚡ Blue (`#0066CC`)
  - **B1/B2 (Collaborative):** 👥 Purple (`#7C3AED`)
  - **B3 (Brainstorm):** 🧠 Green (`#10B981`)
- Typography: Task description in 18px sans-serif, summary in 14px
- Spacing: 24px padding, 16px gap between sections

---

### Screen 2: Live Execution Feed (Real-Time Crew Narration)

```
┌──────────────────────────────────────────────────────┐
│  ✅ Task Launch Confirmed                           │
│  "Audit TypeScript strict mode across repo"         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Status: ▶ IN PROGRESS (Elapsed: 3 sec)             │
│  Crew: Data (TypeScript architecture)               │
│  Estimated completion: 12 more seconds              │
│                                                      │
│  ╔════════════════════════════════════════════════╗ │
│  ║ LIVE EXECUTION FEED                            ║ │
│  ╠════════════════════════════════════════════════╣ │
│  ║                                                ║ │
│  ║ [15:32] 🔍 Data                                ║ │
│  ║         "Starting TypeScript linter scan"     ║ │
│  ║         Checking 42 TypeScript files...       ║ │
│  ║                                                ║ │
│  ║ [15:33] 📋 Data                                ║ │
│  ║         "Found 3 violations in strict mode"   ║ │
│  ║         • Missing return type annotations (2)  ║ │
│  ║         • Implicit 'any' types (1)             ║ │
│  ║                                                ║ │
│  ║ [15:34] 🎯 Data                                ║ │
│  ║         "Ready to show detailed findings?"    ║ │
│  ║                                                ║ │
│  ║                    ⏳ Crew processing...      ║ │
│  ║                                                ║ │
│  ╚════════════════════════════════════════════════╝ │
│                                                      │
│  User Actions (Available anytime):                  │
│  ┌────────────────────────────────────────────────┐ │
│  │ [💬 Ask crew: "Can you auto-fix these?"]      │ │
│  │ [↻ Course-correct: Modify mission scope]      │ │
│  │ [⏸ Pause & review findings]                   │ │
│  │ [⏹ Cancel mission]                            │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ⏱ Cost so far: $0.0008 · Tokens: ~250             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Implementation Notes (Data + Troi):**
- **Data:** Emit logs to `sa_mission_execution_stream` with `level='info'|'action'|'escalation'`
- **Troi:** Subscribe to stream via WebSocket (see HTTP API section below)
- **Filtering:** Only display `level != 'debug'` in UI
- **Formatting:** `[HH:MM] 🎯 CrewId "Natural narrative"`
- **Auto-scroll:** Keep newest messages at bottom, but allow user to scroll up to review
- **Pause:** On user pause, stop subscribing to new logs; allow review mode

---

### Screen 3A: Outcome Results (Success Path)

```
┌──────────────────────────────────────────────────────┐
│  ✅ MISSION COMPLETE                                 │
│  "Audit TypeScript strict mode across repo"         │
│  Duration: 3.2 seconds · Cost: $0.0012              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 FINDINGS (3 Violations)                          │
│  ├─ src/utils/helpers.ts                            │
│  │  Line 42: Missing return type annotation          │
│  │  Issue: Function returns string but annotated     │
│  │         as void                                   │
│  │  Fix: Add -> Promise<string>                     │
│  │  Owner: Frontend team                            │
│  │  Effort: 5 minutes                               │
│  │  Severity: HIGH 🔴                               │
│  │                                                  │
│  │  [👁 View in GitHub] [✏️ View code context]    │
│  │                                                  │
│  ├─ src/types/index.ts                              │
│  │  Line 8: Implicit 'any' type usage               │
│  │  Issue: Parameter lacks type annotation          │
│  │  Fix: Specify type union:                        │
│  │       param: string | number                     │
│  │  Owner: Data (will implement)                    │
│  │  Effort: 2 minutes                               │
│  │  Severity: MEDIUM 🟡                             │
│  │                                                  │
│  │  [👁 View in GitHub]                             │
│  │                                                  │
│  └─ packages/ui/api.ts                              │
│     Line 156: Unsafe type cast (as any)             │
│     Issue: Using 'as any' defeats type safety       │
│     Fix: Use Zod validation + proper type           │
│     Owner: Backend team (external)                  │
│     Effort: 10 minutes                              │
│     Severity: MEDIUM 🟡                             │
│                                                      │
│                                                      │
│  💡 STAKEHOLDER IMPACT                              │
│  ┌────────────────────────────────────────────────┐ │
│  │ Frontend team is blocked on type safety.       │ │
│  │ These 3 fixes unlock deployment by Friday EOD. │ │
│  │ CRITICAL PATH: High priority.                  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  🔗 SUGGESTED NEXT MISSION                          │
│  ┌────────────────────────────────────────────────┐ │
│  │ "Fix TypeScript violations (3 issues)"        │ │
│  │ Category: ⚡ QUICK                             │ │
│  │ Crew: Data + Backend team                      │ │
│  │ Estimated Time: 10 minutes                     │ │
│  │ Cost: $0.005                                   │ │
│  │                                                │ │
│  │ What: Implement fixes for all 3 violations    │ │
│  │       (auto-fixable via prettier + linter)    │ │
│  │ Why: Unblock frontend team (critical path)    │ │
│  │                                                │ │
│  │ [▶ Launch This Mission]  [← Suggest Another]  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Other suggestions:                                  │
│  • "Run full test suite after fixes"               │ │
│  • "Review changes with team before merge"         │ │
│  • "Deploy to staging environment"                 │ │
│                                                      │
│  [← Back]  [Share Results]  [Archive]              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Screen 3B: Escalation Prompt (Crew Needs Decision)

```
┌──────────────────────────────────────────────────────┐
│  ⚠️ CREW NEEDS YOUR DECISION                         │
│  "Refactor type safety across codebase"             │
│  Escalation required: Architectural tradeoff         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🗣️ Data's Assessment:                              │
│  "We have a fundamental tradeoff: quick band-aid    │
│   vs. proper type system. Let me show both paths."  │
│                                                      │
│  ╔════════════════════════════════════════════════╗ │
│  ║ OPTION A: "Quick Fix (Risky)" 🚀               ║ │
│  ╠════════════════════════════════════════════════╣ │
│  ║                                                ║ │
│  ║ Approach:                                      ║ │
│  ║ • Use 'as any' casting (suppress for now)     ║ │
│  ║ • Deploy today                                 ║ │
│  ║                                                ║ │
│  ║ Timeline: 5 minutes                            ║ │
│  ║ Cost: $0.001                                   ║ │
│  ║ Risk: 20% chance of type-related prod bugs    ║ │
│  ║ Impact: Unblock immediately, accrue tech debt ║ │
│  ║                                                ║ │
│  ║ [Choose Option A]                              ║ │
│  ║                                                ║ │
│  ╚════════════════════════════════════════════════╝ │
│                                                      │
│  ╔════════════════════════════════════════════════╗ │
│  ║ OPTION B: "Safe Refactor (Slower)" ✅           ║ │
│  ╠════════════════════════════════════════════════╣ │
│  ║                                                ║ │
│  ║ Approach:                                      ║ │
│  ║ • Define proper TypeScript types              ║ │
│  ║ • Write full test coverage                    ║ │
│  ║ • Code review + team alignment                ║ │
│  ║                                                ║ │
│  ║ Timeline: By Friday EOD (2 days)               ║ │
│  ║ Cost: $0.005                                   ║ │
│  ║ Risk: Low (full test coverage)                 ║ │
│  ║ Impact: No tech debt, production-ready        ║ │
│  ║                                                ║ │
│  ║ [Choose Option B]                              ║ │
│  ║                                                ║ │
│  ╚════════════════════════════════════════════════╝ │
│                                                      │
│  🎯 Crew Recommendation:                            │
│  "OPTION B. Your stakeholders expect Friday EOD.   │ │
│   Type safety prevents costly production incidents.│ │
│   This tradeoff is worth the 2-day timeline." —Troi│
│                                                      │
│  [Ask crew for more details]                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 3. React Components (TypeScript + Next.js)

### Component Structure

```
packages/ui/src/components/missions/
├─ MissionEntryForm.tsx          # Screen 1: Task input
├─ MissionLiveExecutionFeed.tsx  # Screen 2: Real-time stream
├─ MissionResultsView.tsx        # Screen 3A: Outcomes
├─ MissionEscalationPrompt.tsx   # Screen 3B: Decision prompt
├─ MissionFollowUpSuggestion.tsx # Contextual next mission
└─ useMissionStream.hook.ts      # WebSocket subscription hook
```

### Example: Task Entry Form

```typescript
// packages/ui/src/components/missions/MissionEntryForm.tsx

import React, { useState, useEffect } from 'react';
import { Mission, MissionCategoryEnum } from '@story-agent/shared/mission-types';

interface MissionClassification {
  category: 'A1' | 'A2' | 'B1' | 'B2' | 'B3';
  confidence: number;
  reasoning: string;
  estimatedTime: string;
  estimatedCost: number;
  assignedCrew: string[];
}

export const MissionEntryForm: React.FC = () => {
  const [input, setInput] = useState('');
  const [classification, setClassification] = useState<MissionClassification | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Real-time classification (debounced)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (input.length < 10) {
        setClassification(null);
        return;
      }
      setIsClassifying(true);
      try {
        const res = await fetch('/api/missions/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput: input }),
        });
        const data = await res.json();
        setClassification(data);
      } catch (err) {
        console.error('Classification failed:', err);
      } finally {
        setIsClassifying(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [input]);

  const handleLaunch = async () => {
    if (!classification) return;

    const missionRes = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: input,
        category: classification.category,
        assignedCrew: classification.assignedCrew,
      }),
    });

    const mission: Mission = await missionRes.json();

    // Navigate to live feed
    window.location.href = `/missions/${mission.id}/live`;
  };

  return (
    <div className="mission-entry">
      <h1>📋 Story Agent Mission Control</h1>

      <label>What do you want to accomplish?</label>
      <textarea
        placeholder="Audit TypeScript strict mode across repo"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={500}
      />
      <p>
        {input.length} / 500 characters
      </p>

      {isClassifying && <p>🔄 Analyzing...</p>}

      {classification && (
        <div className={`classification-result category-${classification.category}`}>
          <div className="category-badge">
            {classification.category === 'A1' && '⚡ QUICK AUDIT'}
            {classification.category === 'A2' && '⚡ QUICK SUMMARY'}
            {classification.category === 'B1' && '👥 TEAM DESIGN SPRINT'}
            {classification.category === 'B2' && '🔍 INCIDENT POSTMORTEM'}
            {classification.category === 'B3' && '🧠 INNOVATION BRAINSTORM'}
          </div>

          <div className="details">
            <p><strong>What:</strong> {classification.reasoning}</p>
            <p><strong>Crew:</strong> {classification.assignedCrew.join(', ')}</p>
            <p><strong>Time:</strong> {classification.estimatedTime}</p>
            <p><strong>Cost:</strong> ~${classification.estimatedCost.toFixed(3)}</p>
          </div>

          <div className="impact">
            <p>
              {classification.category.startsWith('A') 
                ? '🎯 Quick deterministic task'
                : '👥 Multi-crew collaborative analysis'}
            </p>
          </div>

          <button onClick={handleLaunch} className="btn-primary">
            ▶ Launch Mission
          </button>
          <button className="btn-secondary">← Change Type</button>
        </div>
      )}
    </div>
  );
};
```

### Example: Live Execution Feed

```typescript
// packages/ui/src/components/missions/MissionLiveExecutionFeed.tsx

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMissionStream } from './useMissionStream.hook';
import { MissionExecutionLog } from '@story-agent/shared/mission-execution-stream';

export const MissionLiveExecutionFeed: React.FC = () => {
  const router = useRouter();
  const { missionId } = router.query as { missionId: string };
  
  const { logs, isConnected, isPaused, pause, resume } = useMissionStream(missionId);
  const [userQuestion, setUserQuestion] = useState('');

  const handleAskCrew = async () => {
    if (!userQuestion.trim()) return;

    await fetch(`/api/missions/${missionId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userQuestion }),
    });

    setUserQuestion('');
  };

  return (
    <div className="mission-live-feed">
      <h2>Audit TypeScript strict mode</h2>
      <div className="status-bar">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '▶ IN PROGRESS' : '⏸ PAUSED'}
        </span>
        <span>Elapsed: {/* timer logic */}</span>
      </div>

      <div className="execution-log">
        {logs
          .filter((log) => log.level !== 'debug') // Only show info/action/escalation
          .map((log) => (
            <div key={log.id} className={`log-entry level-${log.level}`}>
              <span className="timestamp">
                [{new Date(log.createdAt).toLocaleTimeString()}]
              </span>
              <span className="emoji">{log.emoji || '📝'}</span>
              <span className="crew-id"><strong>{log.crewId}</strong></span>
              <span className="text">{log.text}</span>

              {log.fileReferences && (
                <div className="file-references">
                  {log.fileReferences.map((ref, i) => (
                    <span key={i} className="file-ref">
                      {ref.file}:{ref.line}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="user-actions">
        <input
          placeholder="💬 Ask crew a question..."
          value={userQuestion}
          onChange={(e) => setUserQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAskCrew();
          }}
        />
        <button onClick={handleAskCrew}>Send</button>

        <button onClick={isPaused ? resume : pause} className="pause-btn">
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>

        <button className="cancel-btn">⏹ Cancel</button>
      </div>

      <div className="cost-display">
        ⏱ Cost so far: $0.0008 · Tokens: ~250
      </div>
    </div>
  );
};
```

### Hook: WebSocket Stream Subscription

```typescript
// packages/ui/src/components/missions/useMissionStream.hook.ts

import { useEffect, useState, useCallback } from 'react';
import { MissionExecutionLog } from '@story-agent/shared/mission-execution-stream';

export const useMissionStream = (missionId: string) => {
  const [logs, setLogs] = useState<MissionExecutionLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!missionId || isPaused) return;

    // WebSocket connection to `/api/missions/{missionId}/stream`
    const ws = new WebSocket(`ws://localhost:3000/api/missions/${missionId}/stream`);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const log: MissionExecutionLog = JSON.parse(event.data);
      setLogs((prev) => [...prev, log]);
    };

    return () => ws.close();
  }, [missionId, isPaused]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  return { logs, isConnected, isPaused, pause, resume };
};
```

---

## 4. Backend API Endpoints (Data)

### Classify Task Input

```typescript
// pages/api/missions/classify.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { MissionSchema } from '@story-agent/shared';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userInput } = req.body as { userInput: string };

  // TODO: Call crew-mission-classifier to auto-detect category
  // For MVP, use regex + keyword matching:

  const classification = classifyMission(userInput);

  res.status(200).json(classification);
}

function classifyMission(input: string) {
  const lowerInput = input.toLowerCase();

  // A1: Deterministic linting/audit
  if (lowerInput.includes('audit') || lowerInput.includes('lint') || lowerInput.includes('check')) {
    return {
      category: 'A1' as const,
      confidence: 0.95,
      reasoning: 'Single-crew deterministic audit task',
      estimatedTime: '~15 seconds',
      estimatedCost: 0.002,
      assignedCrew: ['data'], // Auto-select crew based on keywords
    };
  }

  // A2: Quick summary
  if (lowerInput.includes('summarize') || lowerInput.includes('status') || lowerInput.includes('health')) {
    return {
      category: 'A2' as const,
      confidence: 0.85,
      reasoning: 'Query-based status rollup',
      estimatedTime: '~2 minutes',
      estimatedCost: 0.003,
      assignedCrew: ['uhura'], // Communications lead
    };
  }

  // B1: Design sprint
  if (lowerInput.includes('design') || lowerInput.includes('architecture') || lowerInput.includes('review')) {
    return {
      category: 'B1' as const,
      confidence: 0.80,
      reasoning: 'Multi-crew architectural analysis',
      estimatedTime: '~30 minutes',
      estimatedCost: 0.05,
      assignedCrew: ['data', 'troi', 'geordi'],
    };
  }

  // B2: Incident postmortem
  if (lowerInput.includes('incident') || lowerInput.includes('failure') || lowerInput.includes('postmortem')) {
    return {
      category: 'B2' as const,
      confidence: 0.90,
      reasoning: 'Root-cause analysis',
      estimatedTime: '~1 hour',
      estimatedCost: 0.08,
      assignedCrew: ['crusher', 'worf', 'obrien', 'data'],
    };
  }

  // B3: Innovation (default for exploratory/brainstorm)
  if (lowerInput.includes('imagine') || lowerInput.includes('brainstorm') || lowerInput.includes('moonshot')) {
    return {
      category: 'B3' as const,
      confidence: 0.85,
      reasoning: 'All-crew generative brainstorm',
      estimatedTime: '~20 minutes',
      estimatedCost: 0.10,
      assignedCrew: ['picard', 'data', 'troi', 'geordi', 'obrien', 'worf', 'yar', 'crusher', 'uhura', 'quark', 'riker'],
    };
  }

  // Default: fallback to A1
  return {
    category: 'A1' as const,
    confidence: 0.50,
    reasoning: 'Classified as deterministic task (low confidence)',
    estimatedTime: '~15 seconds',
    estimatedCost: 0.002,
    assignedCrew: ['data'],
  };
}
```

### Launch Mission

```typescript
// pages/api/missions/index.ts (POST)

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@story-agent/shared/db';
import { MissionSchema } from '@story-agent/shared';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userInput, category, assignedCrew } = req.body;

  // Insert mission into sa_missions
  const { data: mission, error } = await supabase
    .from('sa_missions')
    .insert([
      {
        user_input: userInput,
        category,
        infra_type: category.startsWith('A') ? 'ephemeral' : 'persistent',
        assigned_crew: assignedCrew,
        status: 'pending',
        classification_confidence: 0.85,
        estimated_cost: category.startsWith('A') ? 0.002 : 0.05,
        model_tier: category.startsWith('A') ? 'frugal' : 'standard',
      },
    ])
    .select()
    .single();

  if (error) return res.status(400).json({ error });

  // TODO: Trigger crew execution (async job)
  // For MVP: Use agent-core loop via runMissionPipeline
  triggerCrewExecution(mission.id, userInput, assignedCrew);

  res.status(201).json(mission);
}

async function triggerCrewExecution(
  missionId: string,
  userInput: string,
  assignedCrew: string[]
) {
  // TODO: Call mcp_story-agent_run_crew_mission_pipeline
  //       with missionId context for stream logging
}
```

### WebSocket Stream Endpoint

```typescript
// pages/api/missions/[missionId]/stream.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';
import { supabase } from '@story-agent/shared/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket.server.ws) {
    console.log('WS already attached');
    res.end();
    return;
  }

  const ws = new WebSocketServer({ noServer: true });

  res.socket.server.ws = ws;

  res.socket.server.on('upgrade', async (req, socket, head) => {
    if (req.url?.startsWith('/api/missions') && req.url?.includes('/stream')) {
      ws.handleUpgrade(req, socket, head, async (ws) => {
        const missionId = req.url?.split('/')[3];

        // Subscribe to real-time execution logs
        const subscription = supabase
          .from(`sa_mission_execution_stream:mission_id=eq.${missionId}`)
          .on('INSERT', (payload) => {
            ws.send(JSON.stringify(payload.new));
          })
          .subscribe();

        ws.on('close', () => {
          subscription.unsubscribe();
        });
      });
    }
  });

  res.end();
}
```

---

## 5. Implementation Checklist (4 Weeks)

### Week 1: Core Types + DB Schema
- [ ] Data: Define Mission & MissionExecutionLog TypeScript types
- [ ] Data: Write Supabase migrations (sa_missions, sa_mission_execution_stream, sa_mission_findings)
- [ ] Data: Test schema with sample inserts
- [ ] Troi: Design 5 UI screens in Figma (wireframes + color scheme)

### Week 2: Task Entry + Classification
- [ ] Data: Implement `/api/missions/classify` endpoint (regex-based MVP)
- [ ] Data: Write unit tests (classify accuracy >80%)
- [ ] Troi: Build MissionEntryForm component
- [ ] Test: Manual QA of task entry flow

### Week 3: Live Feed + WebSocket
- [ ] Data: Implement WebSocket `/api/missions/[id]/stream` endpoint
- [ ] Data: Integrate crew execution logging (emit logs to sa_mission_execution_stream)
- [ ] Troi: Build MissionLiveExecutionFeed component + useMissionStream hook
- [ ] Test: Manual QA of real-time log streaming

### Week 4: Results + Escalation
- [ ] Data: Implement results aggregation (parse findings from crew output)
- [ ] Data: Write `/api/missions/[id]/outcomes` endpoint
- [ ] Troi: Build MissionResultsView + MissionEscalationPrompt components
- [ ] Troi: Build MissionFollowUpSuggestion with one-click launch
- [ ] Test: Full end-to-end mission flow (entry → live → results → follow-up)

### Week 5: Internal Testing (If schedule allows)
- [ ] Deploy to staging
- [ ] Recruit 10 internal users (crew + ops)
- [ ] Run 20 mission executions, collect feedback
- [ ] Iterate on UX friction points
- [ ] Measure key metrics (time-to-action, clarity, adoption)

---

## 6. Success Criteria

| Metric | Target | Owner |
|--------|--------|-------|
| Time-to-first-action | <15 seconds | Troi |
| Mission completion rate | >85% | Data |
| Code classification accuracy | >80% | Data |
| User understands outcome | 90%+ | Troi |
| Follow-up adoption | 60%+ click launch | Troi |
| WebSocket latency | <2 seconds | Data |
| Zero hallucinations in findings | 100% | Data |
| Escalation clarity | 95%+ understand tradeoff | Troi |

---

## 7. References

- **Crew Synthesis Doc:** `CREW_MISSION_SAMPLE_MISSIONS_UX_DESIGN_SYNTHESIS.md` (full deliberation)
- **Mission Types:** `packages/shared/src/mission-types.ts`
- **Next.js API Routes:** `pages/api/missions/`
- **Supabase Tables:** `sa_missions`, `sa_mission_execution_stream`, `sa_mission_findings`
- **Component Library:** `packages/ui/src/components/missions/`

---

**Status:** Ready for Data + Troi co-authorship  
**Start Date:** 2026-08-27  
**Target Completion:** 2026-09-24  
**Review Checkpoint:** Week 2 (Task Entry + Classification MVP)
