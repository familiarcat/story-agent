# Milestone Push & Aha Integration Diagram

## Current Story Lifecycle

```mermaid
graph LR
    A["📝 CREATED<br/>(Riker via<br/>aha:create-feature)"] -->|"Crew starts work"| B["🔨 IN PROGRESS<br/>(Development)"]
    B -->|"PR opened<br/>(Riker calls<br/>updateAhaStoryStatus)"| C["📋 IN CODE REVIEW<br/>(PR pending merge)"]
    C -->|"PR merged<br/>(Riker calls<br/>updateAhaStoryStatus)"| D["✅ SHIPPED<br/>(Merged to base)"]
    
    D -.->|"Milestone Push<br/>extends here" | E["🏁 ARCHIVED<br/>(Release Closed<br/>Read-Only)"]
    
    classDef current fill:#0066cc,stroke:#003d82,color:#fff,font-weight:bold
    classDef new fill:#00aa00,stroke:#005500,color:#fff,font-weight:bold
    
    class A,B,C,D current
    class E new
```

## Story Lifecycle with Milestone Push

```mermaid
graph TD
    S["🖖 Story Execution<br/>(Days 1-14 of sprint)"]
    S -->|"PR merges"| SS["✅ SHIPPED status<br/>recorded in Aha<br/>(updateAhaStoryStatus)"]
    SS -->|"Week 2: All stories<br/>in release merged?"| MP{{"🎬 Milestone Push<br/>Gate"}}
    
    MP -->|"❌ Validation FAILS<br/>(unmerged PRs,<br/>incomplete stories)"| FIX["🔧 Fix & Retry"]
    FIX -->|"Merge remaining PRs"| MP
    
    MP -->|"✅ Validation PASSES<br/>(all stories Shipped)"| REVIEW["👨‍⚖️ Admiral Review<br/>Phase 2: Approval"]
    REVIEW -->|"❌ Admiral VETOES<br/>(concerns)"| FIX
    REVIEW -->|"✅ Admiral APPROVES<br/>(binding decision)"| EXEC["⚙️ Phase 3: Execute<br/>(Riker, O'Brien, Worf)"]
    
    EXEC -->|"1. Confirm Aha<br/>2. Update release<br/>3. Delete branches<br/>4. Archive crew state<br/>5. Sign + audit"| DONE["✨ COMPLETED<br/>(Release read-only<br/>RAG archived)"]
    
    classDef active fill:#0066cc,stroke:#003d82,color:#fff
    classDef gate fill:#ff8800,stroke:#cc4400,color:#fff
    classDef exec fill:#00aa00,stroke:#005500,color:#fff
    classDef final fill:#6600cc,stroke:#440088,color:#fff
    
    class S,SS,FIX,REVIEW active
    class MP gate
    class EXEC exec
    class DONE final
```

## Aha Integration Points

```mermaid
graph TB
    subgraph "Phase 1: Validation (Crew)"
        V1["📊 Data<br/>Aha release schema<br/>+ story completeness"]
        V2["📦 Riker<br/>Crew mission state<br/>+ PR links archived"]
        V3["🔒 Worf<br/>GitHub security<br/>scan + secrets"]
        V4["💰 Quark<br/>Cost ledger<br/>finalized"]
        V5["⚙️ O'Brien<br/>Infrastructure clean<br/>+ branches exist"]
    end
    
    subgraph "Phase 2: Approval (Humans)"
        A1["🎯 Picard<br/>Synthesize & recommend<br/>go/no-go"]
        A2["👨‍⚖️ Admiral<br/>Binding approval<br/>or veto"]
        A3["🔐 Worf<br/>Cryptographic<br/>audit trail"]
    end
    
    subgraph "Phase 3: Execution (Crew + API)"
        E1["📋 Riker<br/>Update Aha stories<br/>→ 'Shipped'"]
        E2["📋 Riker<br/>Update Aha release<br/>→ 'Completed'"]
        E3["🗑️ O'Brien<br/>Delete feature<br/>branches"]
        E4["📦 Data<br/>Create artifact<br/>bundle"]
        E5["💿 Quark<br/>Archive cost<br/>to RAG"]
    end
    
    subgraph "Phase 4: Reporting"
        R1["📰 Uhura<br/>Shipment summary<br/>+ metrics"]
        R2["💡 Picard<br/>Crew learnings<br/>+ improvements"]
        R3["📍 RAG<br/>tag: milestone-push-<br/>release-id"]
    end
    
    V1 --> A1
    V2 --> A1
    V3 --> A1
    V4 --> A1
    V5 --> A1
    
    A1 --> A2
    A3 --> A2
    
    A2 -->|"✅ Approved"| E1
    A2 -->|"❌ Rejected"| A1
    
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    
    E5 --> R1
    R1 --> R2
    R2 --> R3
    
    classDef valid fill:#0066cc,stroke:#003d82,color:#fff
    classDef approval fill:#ff8800,stroke:#cc4400,color:#fff
    classDef execute fill:#00aa00,stroke:#005500,color:#fff
    classDef report fill:#6600cc,stroke:#440088,color:#fff
    
    class V1,V2,V3,V4,V5 valid
    class A1,A2,A3 approval
    class E1,E2,E3,E4,E5 execute
    class R1,R2,R3 report
```

## Aha API Integration

```mermaid
graph LR
    AHA["Aha! API"]
    
    subgraph "Story-Level (Existing)"
        ST1["updateStoryStatus<br/>(In Progress → Shipped)"]
        ST2["linkStoryToPR<br/>(Story ↔ PR URL)"]
    end
    
    subgraph "Release-Level (Milestone Push)"
        RL1["getRelease<br/>(Fetch release details)"]
        RL2["updateReleaseStatus<br/>(Active → Completed)"]
        RL3["addReleaseNote<br/>(Post findings summary)"]
    end
    
    subgraph "Batch Operations (Milestone Push)"
        BATCH["Atomic transaction:<br/>Update all stories<br/>+ release + notes<br/>in sequence"]
    end
    
    AHA --> ST1
    AHA --> ST2
    AHA --> RL1
    AHA --> RL2
    AHA --> RL3
    
    ST1 -.-> BATCH
    ST2 -.-> BATCH
    RL1 -.-> BATCH
    RL2 -.-> BATCH
    RL3 -.-> BATCH
    
    BATCH -->|"Owned by Riker<br/>Gated by Worf<br/>Approved by Admiral"| AHA
    
    classDef api fill:#0066cc,stroke:#003d82,color:#fff
    classDef story fill:#00aa00,stroke:#005500,color:#fff
    classDef release fill:#ff8800,stroke:#cc4400,color:#fff
    classDef batch fill:#6600cc,stroke:#440088,color:#fff
    
    class AHA api
    class ST1,ST2 story
    class RL1,RL2,RL3 release
    class BATCH batch
```

## Release State Machine

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Sprint starts<br/>(Riker creates<br/>stories)
    
    ACTIVE --> ACTIVE: Stories progress<br/>In Progress → Code Review → Shipped
    
    ACTIVE --> VALIDATION: Sprint ends<br/>(All stories<br/>merged?)
    
    VALIDATION --> VALIDATION: Crew validates<br/>in parallel<br/>(Data, Riker, Worf,<br/>Quark, O'Brien)
    
    VALIDATION --> REJECTED: ❌ Validation fails<br/>(unmerged PRs,<br/>incomplete state)
    REJECTED --> ACTIVE: Fix issues<br/>+ retry
    
    VALIDATION --> PENDING_APPROVAL: ✅ Validation passes<br/>(Picard recommends)
    
    PENDING_APPROVAL --> REJECTED: ❌ Admiral vetoes<br/>(concerns)
    
    PENDING_APPROVAL --> EXECUTING: ✅ Admiral approves<br/>(binding)
    
    EXECUTING --> EXECUTING: Phase 3 steps<br/>1. Update Aha stories<br/>2. Update release<br/>3. Delete branches<br/>4. Archive crew<br/>5. Sign + audit
    
    EXECUTING --> COMPLETED: ✅ All steps succeed<br/>(Riker orchestrates)
    
    EXECUTING --> ERROR: ❌ Step fails<br/>(circuit breaker:<br/>30s, 2 retries)
    
    ERROR --> ERROR: O'Brien initiates<br/>rollback<br/>(24h window)
    
    ERROR --> ACTIVE: Branches restored<br/>Stories re-opened
    
    COMPLETED --> ARCHIVED: Crew execution<br/>archived to RAG<br/>(cold path)<br/>Release read-only<br/>in Aha
    
    ARCHIVED --> [*]
    
    note right of ACTIVE
        🔧 Editable
        Stories mutable
        Branches active
    end note
    
    note right of COMPLETED
        ✅ Shipped
        All stories final
        Branches deleted
    end note
    
    note right of ARCHIVED
        🏁 Read-Only
        Crew findings RAG
        Release locked
    end note
```

## Data Flow: Crew Execution State → Archive → RAG

```mermaid
graph LR
    subgraph "Active (Supabase Hot Path)"
        SX["sa_story_executions<br/>(crew findings,<br/>logs, PRs)"]
        DX["sa_deployment_state<br/>(release metadata)"]
    end
    
    subgraph "Milestone Push Phase 4"
        A["Gather crew state<br/>+ learnings"]
        B["Snapshot to<br/>Supabase archive"]
        C["Embed + index<br/>for RAG"]
    end
    
    subgraph "Cold Path (Permanent)"
        SXA["sa_story_executions_archive<br/>(immutable)"]
        RAG["RAG Vector DB<br/>(searchable:<br/>'milestone-push-<id>')"]
    end
    
    SX --> A
    DX --> A
    A --> B
    B --> SXA
    B --> C
    C --> RAG
    
    classDef hot fill:#0066cc,stroke:#003d82,color:#fff
    classDef process fill:#ff8800,stroke:#cc4400,color:#fff
    classDef cold fill:#6600cc,stroke:#440088,color:#fff
    
    class SX,DX hot
    class A,B,C process
    class SXA,RAG cold
```

## 4 Pre-Implementation Clarifications

| Clarification | Current State | Proposed | Owner |
|---|---|---|---|
| **Story Semantics** | Story marked "Shipped" when PR merges | 3-tier: Complete (PR merged) → Shipped (milestone) → Archived (read-only) | Riker |
| **Release State** | No explicit release closure | Milestone push marks release "Completed" (read-only) | Geordi |
| **Approval Tiers** | WorfGate only (story-level) | WorfGate (story) + Admiral (release) separate gates | Worf + Picard |
| **Aha Automation** | Unknown (audit needed) | Create `docs/aha-workflow-rules.md`; audit before each push | Data |

## Integration Checklist

- [ ] Clarification 1: 3-tier story completion model implemented (Riker)
- [ ] Clarification 2: Release state model (read-only after "Completed") documented (Geordi)
- [ ] Clarification 3: Approval tiers (WorfGate + Admiral) defined in milestone_push tool (Worf)
- [ ] Clarification 4: Aha automation audit completed; no conflicting rules (Data)
- [ ] Implementation: Phase 1 crew assignments (Data schemas, O'Brien GitHub Actions, etc.)
- [ ] Testing: Milestone push tested in dev environment with full workflow
- [ ] Documentation: Release notes + crew briefing on new workflow
- [ ] Validation: First production milestone push with Admiral oversight

---

## Key Integration Decisions

1. **No New Aha APIs**: Milestone push reuses existing `updateStoryStatus`, `updateRelease`, etc. Riker orchestrates existing endpoints in sequence.

2. **Loose Coupling**: Milestone push doesn't interfere with day-to-day story execution. It's a release-level ceremony that reads final states and archives them.

3. **Dual Approval Gates**: Story writes go through WorfGate (crew governance). Release closure requires Admiral approval (business authority). Both gates apply independently.

4. **Idempotent Execution**: Milestone push can retry safely. If Aha updates but GitHub branch deletion fails, rollback available within 24h.

5. **Cold Path Archive**: Crew execution state moves from hot (active) to cold (archive) on milestone completion. RAG enables historical search and learning recall.

---

**Document Status**: ✅ CREW-APPROVED INTEGRATION DESIGN  
**RAG Tag**: `milestone-push-aha-integration-v1`  
**Next**: Admiral review + Phase 1 authorization

