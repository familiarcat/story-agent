# Human + AI Hybrid Team System

## Overview

The story-agent system now supports **three complementary team structures**:

1. **Scenario 1:** Human + OpenRouter Crew (AI as code assistant)
2. **Scenario 2:** GitHub Profile-Based Agents (AI learned from developer behavior)
3. **Scenario 3:** Hybrid teams (Humans, AI Crew, Profile-Based Agents working together)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT TEAM ROSTER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Human Team       │  │ AI Crew          │  │ AI Agents    │  │
│  │ (Engineers,      │  │ (OpenRouter)     │  │ (GitHub-     │  │
│  │  Architects,     │  │ - Picard         │  │  based)      │  │
│  │  Leads)          │  │ - Data           │  │ - Profile    │  │
│  │                  │  │ - Riker          │  │  Built       │  │
│  │ - Availability   │  │ - Etc.           │  │ - Learned    │  │
│  │ - Specializations│  │                  │  │  from GH     │  │
│  │ - Code review    │  │ Role:            │  │                  │
│  │   preferences    │  │ Async assist     │  │ Role:            │
│  │ - GitHub profile │  │ Parallelization  │  │ Implementation   │
│  │                  │  │ Learning loops   │  │ Code review      │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Smart Task Router                                           │ │
│  │ - Routes based on complexity, risk, specialization         │ │
│  │ - Creates handoff sequences                                │ │
│  │ - Manages approval gates                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Human-in-the-Loop Gates                                    │ │
│  │ - Approval before breaking changes, security decisions    │ │
│  │ - Escalation paths for high-risk work                     │ │
│  │ - Learning feedback loops                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scenario 1: Human + AI Crew Assistance

### Use Case
A senior engineer joins the team. The OpenRouter crew acts as their AI code assistant.

### Setup
```typescript
// 1. Add human to team
const human: HumanTeamMember = {
  id: 'uuid-123',
  clientId: 'client-jonah',
  kind: 'human',
  name: 'Sarah Chen',
  email: 'sarah@company.com',
  gitHubHandle: 'sarahchen',
  roles: ['engineer', 'tech-lead'],
  primaryRole: 'engineer',
  skills: ['TypeScript', 'React', 'Node.js'],
  communicationStyle: 'collaborative',
  hoursPerWeek: 40,
  preferredStoryTypes: ['backend', 'infrastructure'],
};

// 2. Assign AI crew to assist
const aiCrew: AICrew = {
  id: 'uuid-456',
  clientId: 'client-jonah',
  kind: 'ai-crew',
  crewMemberId: 'data',
  pairedHumanId: human.id,
  role: 'assistant-to-human',
  autonomyLevel: 1, // Observation & proposal only
};

// 3. Create team roster
const roster = await createClientTeamRoster(
  'client-jonah',
  [human.id],
  [aiCrew.id],
  [],
);
```

### Workflow
```
1. Sarah opens a story
   ↓
2. AI Crew (Data) analyzes requirements
   - Asks clarifying questions
   - Suggests approach
   ↓
3. Sarah reviews Data's suggestions
   ↓
4. Sarah implements (potentially with Crew assistance on async tasks)
   ↓
5. Data handles code review, test generation, documentation
   ↓
6. Sarah approves/revises
   ↓
7. Merge to main
```

### Approval Gates
- Human makes final architectural decisions
- AI Crew cannot merge without human sign-off
- Learning feedback: Sarah's comments → Data learns her preferences

---

## Scenario 2: GitHub Profile-Based Agents

### Use Case
You analyze a developer's GitHub history and instantiate an AI agent that **thinks like them**.

### Setup

#### Step 1: Analyze GitHub Profile
```typescript
import { GitHubProfileAnalyzer } from './github-profile-analyzer.js';

const analyzer = new GitHubProfileAnalyzer({
  gitHubToken: process.env.GITHUB_TOKEN,
  username: 'sarahchen',
  monthsToAnalyze: 12,
  sampleSize: 50, // Analyze 50 recent PRs
});

const profile = await analyzer.analyzeProfile();

// Profile includes:
// - Communication tone (Troi analysis): "collaborative"
// - Decision patterns (Data analysis): "balanced risk tolerance"
// - Technical strengths: TypeScript 95%, React 88%, etc.
// - Code review focus: error-handling, performance, testability
// - Collaboration score: 0.92/1.0
```

#### Step 2: Validate Profile
```typescript
import { validateProfileForAgentInstantiation } from './agent-profile-builder.js';

const validation = validateProfileForAgentInstantiation(profile);
if (!validation.valid) {
  console.error('Profile validation failed:', validation.issues);
  // Issues might be: insufficient PR history, low confidence, etc.
}
```

#### Step 3: Instantiate Agent
```typescript
import { instantiateAgentFromProfile } from './agent-profile-builder.js';

const agent = instantiateAgentFromProfile(profile, {
  clientId: 'client-jonah',
  autonomyLevel: 2, // Active Learning
  requiresApprovalFor: ['breaking-changes', 'data-modifications'],
  escalationContactId: sarah.id, // Escalate to Sarah
});

// Agent gets auto-generated system prompt:
// "You are an AI agent trained on Sarah Chen's GitHub history...
//  Communication style: collaborative (92% confidence)
//  Decision style: balanced risk tolerance, favors stability with innovation
//  Technical strengths: TypeScript, React, Node.js
//  Code review focuses on: error-handling, performance, testability"
```

#### Step 4: Store in RAG Memory
```typescript
import { buildRAGMemories } from './agent-profile-builder.js';

const ragEntries = buildRAGMemories(profile);
// Entries include:
// - GitHub profile summary
// - Communication examples from PR reviews
// - Decision patterns from commit history
// - Technical strengths breakdown
// All tagged with: github-profile, developer-sarahchen, collaborative, balanced-risk
```

### Generated System Prompt (Example)
```
You are an AI agent trained on the GitHub history and decision patterns of a developer named "Sarah Chen".

Your communication style is collaborative. You tend to:
- Focus on: error-handling, performance, testability
- Response pattern: thoughtful and thorough
- Supportiveness level: 92%

Evidence: "Great approach to error handling here. Have you considered..."

Your decision-making style:
- Risk tolerance: balanced (78% confidence)
- Architecture philosophy: modular, SOLID
- Testing approach: pragmatic
- Code review rigor: moderate

When making trade-offs, you typically balance innovation with stability.

Your technical strengths:
- Languages: TypeScript (95%), JavaScript (87%), Python (60%)
- Tools & Frameworks: React, Node.js, Jest, GitHub Actions
- Known weaknesses: DevOps, infrastructure

...continuous learning from feedback...
```

### Workflow
```
1. Mission assigned to Sarah's AI Agent
   ↓
2. Agent (thinking like Sarah):
   - Analyzes story
   - Proposes approach (following Sarah's patterns)
   - Implements with Sarah's code style
   ↓
3. Agent hits approval gate (breaking change)
   - Escalates to Sarah
   ↓
4. Sarah reviews & approves
   - Feedback recorded to RAG
   - Agent's learning score updated
   ↓
5. Agent continues with approval
   ↓
6. Sarah reviews final output
```

### Agent Autonomy Levels
```
Level 0: Observation & Learning
         AI watches, learns, proposes improvements

Level 1: Early Learning
         Passive observation, crew proposes changes

Level 2: Active Learning (START HERE)
         Auto-apply tunings, escalate policy decisions

Level 3: Autonomous
         Self-assign tasks, Admiral gates policy/risk

Level 4: Leadership
         Mid-mission adaptation, execution ownership

Level 5: Mastery
         Crew owns decisions, Admiral oversight only
```

---

## Scenario 3: Hybrid Team (All Three)

### Setup
```typescript
// Build complete team
const roster = await createClientTeamRoster(
  'client-jonah',
  [
    'uuid-sarah',      // Human tech lead
    'uuid-alex',       // Human backend engineer
  ],
  [
    'uuid-data',       // AI Crew: assists humans
    'uuid-worf',       // AI Crew: security focus
  ],
  [
    'uuid-agent-sarah', // AI Agent based on Sarah's GitHub
    'uuid-agent-alex',  // AI Agent based on Alex's GitHub
  ],
);

// Set team structure
roster.teamLead = 'uuid-sarah';
roster.techLead = 'uuid-sarah';
roster.reviewers = ['uuid-sarah', 'uuid-alex'];
```

### Smart Task Routing

#### Example 1: Simple Feature
```
Story: "Add user profile endpoint"
Complexity: simple
Risk: low

→ Routes to: AI Crew (Data)
→ Reason: Quick execution, no human approval needed
→ Handoff: Data implements, Sarah glances at PR
```

#### Example 2: Complex Backend Refactor
```
Story: "Migrate from REST to GraphQL"
Complexity: complex
Risk: medium
Requires approval: YES

→ Routes to: Sarah's AI Agent
→ Why: Best match for backend + decision style
→ Handoff sequence:
   1. Agent (primary implementer)
   2. Alex (code review)
   3. Sarah (architecture approval)
   4. Worf (security audit)
→ Approval gates: Architecture decisions, security considerations
```

#### Example 3: Critical Security Issue
```
Story: "Fix SQL injection vulnerability"
Complexity: critical
Risk: critical
Requires: immediate human decision

→ Routes to: Sarah (tech lead)
→ Crew support:
   1. Worf (AI Crew) analyzes security impact
   2. Data (AI Crew) implements patches
   3. Sarah (human) reviews & approves
   4. Alex (human) verifies in staging
```

### Approval Gates in Action

```typescript
// When Sarah's AI Agent hits a breaking change:
const gate: ApprovalGate = {
  gateType: 'review',
  description: 'Human review required for: breaking-changes',
  requiresApprovalFrom: ['uuid-sarah'],
  proposedChange: {
    category: 'breaking-changes',
    details: 'Database schema migration (users table)',
    riskLevel: 'high',
  },
  status: 'pending',
};

// Sarah gets notification, reviews, approves:
await approveGate(gate.id, 'uuid-sarah', 
  'Looks good. Ensure we have data migration script.');

// Agent learns from feedback:
await recordHumanFeedback({
  feedbackType: 'approval',
  feedbackText: 'Looks good. Ensure we have data migration script.',
  learningOutcome: 'Always include migration scripts for schema changes',
});

// Agent's learning score improves
const newScore = await updateAgentLearningScore('uuid-agent-sarah');
// Score: 0.62 → 0.67 (slight improvement)
```

---

## Key Features

### 1. **Communication Tone Detection (Troi)**
```typescript
// Analyzes PR review comments to determine style
communication.tone: 'collaborative' | 'direct' | 'diplomatic' | 'analytical' | 'mentoring'
communication.supportiveness: 0.92 // How often they help reviewers
communication.emphasisAreas: ['error-handling', 'performance', 'testability']
```

### 2. **Decision Pattern Recognition (Data)**
```typescript
// Analyzes PRs to determine decision style
decisions.riskTolerance: 'balanced' // From merge times vs complexity
decisions.architecturePhilosophy: ['modular', 'SOLID']
decisions.testingPhilosophy: 'pragmatic'
decisions.codeReviewStrictness: 'moderate'
```

### 3. **Engagement Metrics**
```typescript
engagement: {
  totalContributions: 42,
  pullRequestsCreated: 189,
  pullRequestsReviewed: 156,
  averageReviewTimeHours: 2.5,
  reviewResponsivenessRate: 0.94,
  collaborationScore: 0.92,
}
```

### 4. **Escalation & Approval**
```typescript
// Different gates based on risk/complexity
requiresApprovalFor: [
  'breaking-changes',
  'data-modifications',
  'security-decisions',
]

// Humans stay informed even on autonomous work
escalationContact: 'uuid-sarah'
```

### 5. **Learning Feedback Loops**
```typescript
// Every human review is feedback for AI agents
recordHumanFeedback({
  aiAgentId: 'uuid-agent-sarah',
  feedbackType: 'revision', // or 'approval', 'correction', 'suggestion'
  feedbackText: 'Add error handling for null checks',
  learningOutcome: 'Always validate input in API handlers',
});

// Learning score updates over time
agentLearningScore: 0.75 → 0.78 (improving)
```

---

## RAG Memory Structure

When a profile is analyzed, it creates RAG entries for retrieval:

```
TAG: github-profile
Content: Developer profile summary + GitHub metrics
Confidence: 0.85

TAG: communication-collaborative
Content: Communication tone examples + emphasis areas
Confidence: 0.92

TAG: decision-balanced-risk
Content: Decision patterns + architecture philosophy
Confidence: 0.78

TAG: developer-sarahchen
Content: Technical strengths, weaknesses, growth areas
Confidence: 0.90

TAG: autonomy-2
Content: Current autonomy level + approval gates
```

These are retrieval targets when:
- Agent needs to recall its own patterns
- Humans want to understand agent's decision-making
- System needs to adapt agent's behavior
- Learning feedback updates the profile

---

## Database Schema (Supabase)

```sql
-- Human team members
CREATE TABLE sa_human_team_members (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  kind TEXT = 'human',
  name TEXT,
  email TEXT,
  github_handle TEXT,
  roles TEXT[],
  skills TEXT[],
  communication_style TEXT,
  timezone TEXT,
  hours_per_week INT,
  active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES sa_clients(id)
);

-- AI Crew assignments
CREATE TABLE sa_ai_crew (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  kind TEXT = 'ai-crew',
  crew_member_id TEXT, -- picard, data, riker, etc.
  paired_human_id UUID,
  autonomy_level INT,
  role TEXT,
  active BOOLEAN,
  created_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES sa_clients(id),
  FOREIGN KEY (paired_human_id) REFERENCES sa_human_team_members(id)
);

-- GitHub profiles
CREATE TABLE sa_github_profiles (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  kind TEXT = 'ai-profile-based',
  github_username TEXT UNIQUE,
  source_human_id UUID,
  development_name TEXT,
  communication_tone TEXT,
  decision_risk_tolerance TEXT,
  engagement_metrics JSONB,
  analyzed_at TIMESTAMP,
  profile_version INT,
  confidence DECIMAL,
  created_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES sa_clients(id),
  FOREIGN KEY (source_human_id) REFERENCES sa_human_team_members(id)
);

-- AI Agents from profiles
CREATE TABLE sa_ai_agents (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  kind TEXT = 'ai-profile-based',
  profile_id UUID NOT NULL,
  agent_name TEXT,
  system_prompt_seed TEXT,
  autonomy_level INT,
  requires_approval_for TEXT[],
  escalation_contact UUID,
  learning_score DECIMAL,
  missions_completed INT,
  active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES sa_clients(id),
  FOREIGN KEY (profile_id) REFERENCES sa_github_profiles(id),
  FOREIGN KEY (escalation_contact) REFERENCES sa_human_team_members(id)
);

-- Team rosters
CREATE TABLE sa_client_team_rosters (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  human_members UUID[],
  ai_crew UUID[],
  ai_agents UUID[],
  team_lead UUID,
  reviewers UUID[],
  total_capacity_hours INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES sa_clients(id)
);

-- Approval gates
CREATE TABLE sa_approval_gates (
  id UUID PRIMARY KEY,
  mission_id UUID,
  story_id UUID,
  gate_type TEXT, -- review, decision, escalation, learning-feedback
  description TEXT,
  requires_approval_from UUID[],
  approvals_received JSONB[],
  proposed_change JSONB,
  status TEXT, -- pending, approved, rejected, expired
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Human feedback
CREATE TABLE sa_human_feedback (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  ai_agent_id UUID,
  human_id UUID NOT NULL,
  feedback_type TEXT, -- approval, revision, correction, suggestion, escalation
  feedback_text TEXT,
  learning_outcome TEXT,
  created_at TIMESTAMP,
  tags TEXT[],
  FOREIGN KEY (client_id) REFERENCES sa_clients(id),
  FOREIGN KEY (ai_agent_id) REFERENCES sa_ai_agents(id),
  FOREIGN KEY (human_id) REFERENCES sa_human_team_members(id)
);
```

---

## Implementation Timeline

### Phase 1 (Now): Foundations
- ✅ Human team member types
- ✅ GitHub profile analyzer (Troi + Data)
- ✅ Agent profile builder
- ✅ Team roster manager
- ⏳ Database migrations (pending)

### Phase 2 (Sept 2-3): Integration
- [ ] MCP tools for human/AI management
- [ ] Team roster UI dashboard
- [ ] GitHub profile analyzer CLI

### Phase 3 (Sept 4-5): Automation
- [ ] Smart task routing to crew
- [ ] Approval gate enforcement
- [ ] Learning feedback loops
- [ ] Agent re-analysis (quarterly)

### Phase 4 (Sept 6+): Optimization
- [ ] Collaborative team missions (multi-person/agent)
- [ ] Cross-team knowledge sharing
- [ ] Performance dashboards
- [ ] Agent capability discovery

---

## Examples

### Adding a Human Team Member
```typescript
// MCP Tool: add_human_to_team
const human = await addHumanToRoster({
  clientId: 'client-jonah',
  name: 'Sarah Chen',
  gitHubHandle: 'sarahchen',
  roles: ['engineer', 'tech-lead'],
  hoursPerWeek: 40,
});

// System automatically:
// - Creates profile in Supabase
// - Stores to crew RAG
// - Makes available for routing
```

### Analyzing GitHub & Creating Agent
```typescript
// MCP Tool: analyze_github_and_create_agent
const agent = await analyzeGitHubAndCreateAgent({
  clientId: 'client-jonah',
  gitHubUsername: 'sarahchen',
  autonomyLevel: 2,
  requiresApprovalFor: ['breaking-changes', 'data-modifications'],
});

// System:
// - Fetches 50 recent PRs
// - Analyzes communication (Troi)
// - Analyzes decisions (Data)
// - Instantiates agent
// - Stores profile + memories in RAG
// - Adds to team roster
```

### Routing a Story
```typescript
// Story comes in
story = {
  title: "Add admin dashboard",
  type: "backend",
  complexity: "complex",
  riskLevel: "medium",
};

// Smart router decides:
routing = await routeTaskToTeamMember(roster, {
  storyType: story.type,
  complexity: story.complexity,
  requiresHumanApproval: true,
  riskLevel: story.riskLevel,
});

// Returns:
// {
//   assignTo: 'uuid-agent-sarah',
//   assignToKind: 'ai-profile-based',
//   reasoning: ["Complex backend task", "Best match for Sarah's style"],
//   requiresApprovalFrom: ['uuid-sarah'],
//   handoffSequence: [
//     { order: 1, id: 'uuid-agent-sarah', reason: 'Primary implementer' },
//     { order: 2, id: 'uuid-sarah', reason: 'Architecture approval' }
//   ]
// }
```

---

## Empathy + Logic in Action

### Troi's Role (Communication Analysis)
```
"This developer uses a collaborative tone in 92% of their reviews.
 When they suggest changes, they explain the reasoning.
 They mentor junior developers on error handling patterns.
 Their response time is thoughtful (average 2.5 hours).
 They value clarity and testing rigor in code reviews."

→ Agent will:
  - Propose changes diplomatically
  - Provide detailed explanations
  - Include teaching comments in code
  - Wait for thoughtful review cycles
```

### Data's Role (Decision Pattern Analysis)
```
"This developer has balanced risk tolerance.
 Chooses modular architecture patterns.
 Favors pragmatic testing (not comprehensive, not minimal).
 Code review strictness is moderate (rejects ~30% of PRs).
 Technical strengths: TypeScript (95%), React (88%).
 Decision time: merges complex PRs in ~4 hours."

→ Agent will:
  - Propose balanced solutions
  - Implement modular design
  - Add pragmatic tests
  - Make decisions at developer's pace
```

---

## Next Steps

1. **Database Migrations** - Apply sa_human_team_members, sa_github_profiles, etc.
2. **MCP Tools** - Expose analyzer, agent creator, roster manager to crew
3. **Crew Learning** - Have Data + Troi use new tools to analyze teams
4. **UI Dashboard** - Show team composition, agent status, learning scores
5. **Integration Testing** - End-to-end: GitHub → Profile → Agent → Task → Learning

---

**"The difference between a human and a computer is that a human has empathy.
Once you understand another person's position, it becomes impossible to hate them.
And, I believe, it becomes possible to work well with them." — Counselor Deanna Troi**
