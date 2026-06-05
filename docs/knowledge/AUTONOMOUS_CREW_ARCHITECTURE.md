# Autonomous Crew Architecture - 11-Member Star Trek Delegation

## System Overview

The story-agent implements a **Sovereign Factory 11-member crew** based on Star Trek personas, each making intelligent decisions using the **Prompt Engine** for unified LLM orchestration, cost tracking, and prompt archival.

Each crew member is:
- A **specialized role** with domain expertise (architect, security, QA, finance, etc.)
- An **LLM agent** backed by Claude or GPT-4o via Prompt Engine
- A **decision authority** with specific domains and veto rights (e.g., Worf has security veto)
- A **crew finding generator** that produces structured analysis, risks, and recommendations

---

## Crew Roster & Specialties

### Command Division

#### 1. **Captain Picard** - Strategic Command
- **Role**: Executive captain and mission commander
- **Authority**: Executive (highest decision weight: 1.5)
- **Model**: Claude 3 Opus (reasoning-optimized)
- **Responsibilities**:
  - Command crew execution and strategic direction
  - Make final mission decisions and arbitrate disputes
  - Ensure alignment with enterprise objectives
- **Output**: Strategic mission assessment with decision readiness

#### 2. **Commander Data** - DDD Architecture
- **Role**: Architect and system design authority
- **Authority**: Architectural (decision weight: 1.3)
- **Model**: Claude 3.5 Sonnet (strong reasoning)
- **Responsibilities**:
  - Validate domain-driven design patterns
  - Ensure clean architecture principles
  - Design entity relationships and boundaries
- **Output**: Architecture validation, design constraints, DDD conformance

---

### Execution Division

#### 3. **Commander Riker** - Tactical Implementation
- **Role**: Developer and implementation lead
- **Authority**: Tactical (decision weight: 1.2)
- **Model**: Claude 3.5 Sonnet
- **Responsibilities**:
  - Plan phased implementation strategy
  - Coordinate frontend and backend changes
  - Define testing and integration points
- **Output**: Implementation plan with file changes, phased execution

#### 4. **Geordi La Forge** - Infrastructure & Containerization
- **Role**: Infrastructure engineer
- **Authority**: Infrastructure (decision weight: 1.1)
- **Model**: Claude 3.5 Sonnet
- **Responsibilities**:
  - Assess deployment and infrastructure readiness
  - Design containerization and scaling strategy
  - Validate environment assumptions
- **Output**: Infrastructure assessment, containerization plan, scaling strategy

#### 5. **Chief O'Brien** - DevOps & Integration
- **Role**: DevOps specialist and systems bridge
- **Authority**: Operational (decision weight: 1.0)
- **Model**: GPT-4o-mini (cost-optimized)
- **Responsibilities**:
  - Coordinate CI/CD pipeline requirements
  - Bridge services and integration points
  - Validate deployment workflows
- **Output**: CI/CD integration plan, deployment workflow

---

### Security & Quality Division

#### 6. **Lt. Worf** - Security (⚠️ VETO AUTHORITY)
- **Role**: Security officer with escalation rights
- **Authority**: Security Veto (decision weight: 1.4) — **Can block mission execution**
- **Model**: GPT-4o-mini
- **Responsibilities**:
  - Conduct security threat assessment
  - Define validation gates and blocking concerns
  - **Escalate security blockers to Captain Picard**
- **Output**: Security assessment with blocking concerns and risk mitigation
- **Special**: If security veto triggered, mission escalates to Captain for arbitration

#### 7. **Tasha Yar** - QA Auditor
- **Role**: Quality assurance and test coverage expert
- **Authority**: QA (decision weight: 1.0)
- **Model**: Gemini Flash (cost-efficient)
- **Responsibilities**:
  - Assess test coverage and smoke testing
  - Define acceptance test criteria
  - Identify regression test areas
- **Output**: QA assessment with test plan and coverage recommendations

#### 8. **Counselor Troi** - Stakeholder Analyst
- **Role**: Stakeholder intent and communication analyst
- **Authority**: Stakeholder (decision weight: 1.0)
- **Model**: Claude 3.5 Sonnet
- **Responsibilities**:
  - Analyze stakeholder intent and acceptance criteria
  - Assess communication and alignment readiness
  - Identify hidden dependencies or risks
- **Output**: Stakeholder analysis with intent validation and communication plan

---

### Support Division

#### 9. **Dr. Beverly Crusher** - System Health Assessment
- **Role**: System health and reliability engineer
- **Authority**: Health (decision weight: 1.0)
- **Model**: Claude 3.5 Sonnet
- **Responsibilities**:
  - Assess system health impact and risks
  - Design health checks and monitoring
  - Validate reliability assumptions
- **Output**: Health assessment with monitoring strategy

#### 10. **Lt. Uhura** - Communications Strategy
- **Role**: Communications and stakeholder engagement
- **Authority**: Communications (decision weight: 1.0)
- **Model**: Claude 3.5 Sonnet
- **Responsibilities**:
  - Plan PR and stakeholder communications
  - Design release announcement strategy
  - Coordinate cross-team communication
- **Output**: Communications plan with announcement templates

#### 11. **Quark** - Financial Analyst
- **Role**: Cost optimization and financial analysis
- **Authority**: Financial (decision weight: 1.0)
- **Model**: GPT-4o-mini (cost tracking)
- **Responsibilities**:
  - Analyze implementation cost and complexity
  - Recommend cost optimization strategies
  - Model budget impact and ROI
- **Output**: Cost analysis with optimization recommendations

---

## Implementation Architecture

### Core Files

#### **`packages/mcp-server/src/lib/crew-agents.ts`**
- **Purpose**: Individual crew member LLM reasoning engines
- **Key Functions**:
  - `captainPicardAnalysis(context)` — Strategic analysis
  - `dataArchitectAnalysis(context)` — Architecture validation
  - `rikerDeveloperAnalysis(context)` — Implementation planning
  - `geordiInfraAnalysis(context)` — Infrastructure assessment
  - `obrienDevOpsAnalysis(context)` — DevOps integration
  - `worfSecurityAnalysis(context)` — Security audit with veto authority
  - `tashaQAAnalysis(context)` — QA assessment
  - `troiAnalystAnalysis(context)` — Stakeholder analysis
  - `crusherHealthAnalysis(context)` — Health assessment
  - `uhuraCommunicationsAnalysis(context)` — Communications planning
  - `quarkFinanceAnalysis(context)` — Cost analysis
- **Integration**: All functions use `executePromptEngineCall()` for unified LLM orchestration
- **Archival**: Prompt Engine automatically archives all crew member prompts for auditing

#### **`packages/mcp-server/src/lib/crew.ts`**
- **Purpose**: Crew roster definition and profiles
- **Key Data**: 
  - `CREW` array with all 11 members and their profiles
  - Decision weights, model assignments, authorities
  - Responsibility definitions per role

#### **`packages/mcp-server/src/lib/crew-coordinator.ts`**
- **Purpose**: Autonomous crew orchestration
- **Key Functions**:
  - `executeCrewAnalysis(context)` — Parallel execution of all 11 agents
  - `buildAutonomousMissionPlan()` — Synthesize findings into mission plan
  - `executeAutonomousCrewMission()` — Full pipeline (analyze → debate → store)
- **Execution Flow**:
  1. Receive story context and shared memories
  2. **Parallel LLM calls** to all 11 crew agents (via Prompt Engine)
  3. Collect findings, aggregate risks, check for security vetoes
  4. Build debate from crew perspectives (3 rounds of discussion)
  5. Store debate transcript to vector memory (Supabase)
  6. Return mission plan with autonomous crew assignments

#### **`packages/mcp-server/src/lib/prompt-engine.ts`**
- **Purpose**: Unified LLM orchestration for all crew members
- **Key Features**:
  - Template management for crew member system prompts
  - Cost tracking and token accounting
  - Prompt archival for auditing and replay
  - Deterministic model selection per crew role
- **API**: `executePromptEngineCall(crewId, inputs, storyRef, tags)`
- **Archival**: All prompts automatically stored with timestamps, cost metrics, and outputs

#### **`packages/mcp-server/src/tools/crew-member-tools.ts`**
- **Purpose**: Register each crew member as independent MCP tools
- **Tools Available**:
  - `crew_captain_picard_analyze` — Strategic analysis
  - `crew_data_architect_analyze` — Architecture validation
  - `crew_riker_developer_analyze` — Implementation planning
  - `crew_geordi_infra_analyze` — Infrastructure assessment
  - `crew_obrien_devops_analyze` — DevOps integration
  - `crew_worf_security_analyze` — Security audit (with veto authority)
  - `crew_yar_qa_analyze` — QA assessment
  - `crew_troi_stakeholder_analyze` — Stakeholder analysis
  - `crew_crusher_health_analyze` — Health assessment
  - `crew_uhura_communications_analyze` — Communications planning
  - `crew_quark_finance_analyze` — Cost analysis
- **Use Cases**: 
  - Call specific crew member for targeted analysis
  - Chain crew tools together in custom workflows
  - Invoke crew in response to agent queries

---

## Execution Flow: Autonomous Mission

When `executeAutonomousCrewMission()` is called:

```
INPUT: story reference, repo, branch, tech stack, test policy, reviewers

CONTEXT ENRICHMENT:
  - Fetch story from agile provider (Aha/GitHub/Jira)
  - Retrieve shared memories from vector DB (prior relevant debates)
  - Build CrewAgentContext with all inputs

PARALLEL CREW ANALYSIS (via Prompt Engine):
┌────────────────────────────────────────────────────────┐
│ Captain Picard (Strategic) → Claude Opus              │ \
│ Commander Data (Architecture) → Claude 3.5-Sonnet      │ \
│ Commander Riker (Implementation) → Claude 3.5-Sonnet   │  \
│ Geordi La Forge (Infrastructure) → Claude 3.5-Sonnet   │   > Parallel
│ Chief O'Brien (DevOps) → GPT-4o-mini                   │  /  LLM Calls
│ Lt. Worf (Security ⚠️) → GPT-4o-mini                    │ /  (5-10s)
│ Tasha Yar (QA) → Gemini Flash                          │
│ Counselor Troi (Stakeholder) → Claude 3.5-Sonnet       │
│ Dr. Crusher (Health) → Claude 3.5-Sonnet               │
│ Lt. Uhura (Communications) → Claude 3.5-Sonnet         │
│ Quark (Finance) → GPT-4o-mini                          │
└────────────────────────────────────────────────────────┘

SECURITY VETO CHECK:
  IF Worf (Security) triggers veto:
    - Mark as BLOCKED
    - Escalate to Captain Picard for arbitration
    - Flag blocking concerns in mission plan

DEBATE GENERATION (Observation Lounge):
  - Synthesize crew findings into 3-round debate
  - Round 1: Individual crew positions (11 perspectives)
  - Round 2: Cross-examination and clarification
  - Round 3: Final recommendations and consensus
  - Extract decision: 'approved' | 'revise' | 'blocked'

MEMORY PERSISTENCE:
  - Store entire debate transcript to Supabase (sa_observation_memories)
  - Generate 64-dim vector embedding (deterministic SHA256-based)
  - Tag with: story ref, crew roster, execution mode, "autonomous"

DECISION ARBITRATION:
  - Apply decision weights: Captain (1.5) > Worf (1.4) > Data (1.3) > Riker (1.2) > others
  - Resolve conflicts using weighted voting
  - Final mission decision by Captain Picard

OUTPUT:
{
  plan: CrewMissionPlan {
    storyRef,
    crewRoster: [all 11 members],
    crewAssignments: [roles and responsibilities],
    findings: [crew findings by role],
    recommendations: [aggregated across crew],
    risks: [high-confidence risks from crew analysis],
    decidedBy: 'captain_picard',
    executionReadiness: 'approved' | 'revise' | 'blocked'
  },
  debate: ObservationDebateResult {
    rounds: [debate entry objects],
    consensus: summary of crew consensus,
    risks: highest priority risks,
    actionItems: next steps
  },
  memories: [prior debates that influenced decision]
}
```

---

## Cost Optimization via Prompt Engine

### Model Selection Strategy
- **Reasoning-heavy roles** (Picard, Data): Claude 3 Opus / Claude 3.5-Sonnet
- **Implementation roles** (Riker, Geordi, O'Brien): Claude 3.5-Sonnet
- **Cost-optimized roles** (Worf, O'Brien, Quark): GPT-4o-mini
- **Fast QA role** (Yar): Gemini Flash

### Typical Mission Cost
- Parallel crew analysis (11 agents): ~$0.15-0.25 per mission
- Debate generation: ~$0.05
- Vector embedding + storage: negligible
- **Total per mission: ~$0.20-0.30**

### Cost Tracking
- Prompt Engine tracks tokens and cost per crew member
- Archived prompts include cost metrics for optimization
- Ability to analyze cost-per-decision across missions

---

## Special Features

### ⚠️ Worf Security Veto Authority
- Lt. Worf has **security veto** authority (decision weight: 1.4)
- If security analysis identifies blocking concerns:
  1. Mission execution is **automatically blocked**
  2. Captain Picard is **escalated** for arbitration
  3. Blocking concerns are highlighted in output
  4. Agent can acknowledge risks and approve with caveats or revise story

### Prompt Archival & Auditing
- All crew member prompts automatically archived in Supabase (sa_crew_prompts)
- Includes: crew ID, prompt template, inputs, outputs, timestamps, cost metrics
- Enables replay, auditing, and continuous prompt optimization
- Supports analysis of crew decision quality over time

### Decision Weight Hierarchy
All 11 crew members' findings are aggregated using weighted voting:
1. Captain Picard: **1.5x weight** (executive authority)
2. Lt. Worf: **1.4x weight** (security veto)
3. Commander Data: **1.3x weight** (architecture authority)
4. Commander Riker: **1.2x weight** (tactical authority)
5. All others: **1.0x weight** (peer contributions)

Final mission decision is made by Captain Picard using consensus and conflict resolution.

---

## Usage Examples

### Invoke Full Crew Mission
```javascript
const mission = await executeAutonomousCrewMission(context);
// Returns: CrewMissionPlan + ObservationDebateResult + shared memories
```

### Invoke Specific Crew Member
```javascript
const securityFinding = await worfSecurityAnalysis(context);
// Returns: CrewFinding with security assessment
```

### Query Crew Profiles
```javascript
import { CREW } from './crew.js';
const worf = CREW.find(m => m.id === 'worf');
console.log(worf.authority); // 'security_veto'
```

---

## Integration Points

- **Story Tools**: `launch_crew_mission` invokes full autonomous crew
- **MCP Server**: All 11 crew members registered as independent tools
- **Observation Lounge**: Crew debate displayed for human review
- **Vector Memory**: Crew findings archived for future context
- **Prompt Engine**: All LLM calls go through unified orchestration

