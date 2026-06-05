# Autonomous Crew System - Architecture Diagram

```mermaid
graph TB
    subgraph MCP["MCP Server (Backend)"]
        CAM["CrewAutonomyManager"]
        CCB["CrewCommunicationBus"]
        CBS["CrewStateBroadcaster"]
        WS["WebSocket Server"]
        
        CAM -->|"monitors"| CBS
        CAM -->|"requests consensus"| CCB
        CAM -->|"broadcasts insights"| WS
        CBS -->|"pushes state updates"| WS
    end
    
    subgraph DB["Database (Supabase)"]
        SA["sa_crew_state"]
        SA2["sa_crew_insights"]
        SA3["sa_crew_decisions"]
        
        CAM -->|"persists"| SA
        CAM -->|"logs"| SA2
        CAM -->|"tracks"| SA3
    end
    
    subgraph DevUI["VS Code Extension"]
        DEV["DeveloperAdvisor"]
        PANEL["StoryExecutionPanel"]
        COPILOT["CrewCopilot Provider"]
        
        DEV -->|"displays"| PANEL
        PANEL -->|"connects"| WS
        DEV -->|"fetches insights"| API1
    end
    
    subgraph PMUI["Web Dashboard"]
        PM["ProjectManagerAdvisor"]
        DASH["ProjectBoard"]
        MON["CrewMonitor"]
        
        PM -->|"displays"| DASH
        DASH -->|"real-time"| WS
        PM -->|"fetches data"| API2
    end
    
    subgraph API["API Routes"]
        API1["GET /api/crew/insights"]
        API2["GET /api/crew/insights/<br/>GET /api/crew/decisions"]
        API3["POST /api/crew/decisions/<br/>[id]/approve|reject"]
        
        API1 -->|"queries"| CAM
        API2 -->|"queries"| CAM
        API3 -->|"calls"| CAM
    end
    
    subgraph Types["Shared Types"]
        T1["CrewInsight"]
        T2["CrewDecision"]
        T3["CrewExecutionState"]
    end
    
    T1 -.->|"exported from"| T3
    T2 -.->|"exported from"| T3
    
    MCP -.->|"imports"| T3
    DevUI -.->|"imports"| T3
    PMUI -.->|"imports"| T3
    
    API1 -.->|"returns"| T1
    API2 -.->|"returns"| T1
    API2 -.->|"returns"| T2
    API3 -.->|"updates"| T2

    style CAM fill:#ff9999
    style CCB fill:#ff9999
    style DEV fill:#99ccff
    style PM fill:#99ff99
    style MCP fill:#ffe6e6
    style DevUI fill:#e6f2ff
    style PMUI fill:#e6ffe6
```

## Data Flow: Story Execution to Insights

```mermaid
sequenceDiagram
    participant Dev as Developer<br/>(VS Code)
    participant CAM as CrewAutonomy<br/>Manager
    participant CCB as CrewComm<br/>Bus
    participant DA as DeveloperAdvisor
    participant API as API<br/>/crew/insights
    
    Dev->>CAM: Story execution starts
    CAM->>CAM: monitorStory(storyRef, state)
    
    par Monitoring Loop
        CAM->>CAM: Every 5 seconds:<br/>Check progress, risks, bottlenecks
        CAM->>CAM: generateProactiveInsights()
        CAM->>CAM: evaluateAutonomousDecisions()
        CAM->>CAM: facilitateConsensus()
    end
    
    CAM->>API: Insights created/updated
    API->>DA: GET /api/crew/insights?role=developer
    DA->>DA: Display cards with<br/>priority coloring
    DA->>Dev: Shows architecture,<br/>security, quality guidance
    
    opt Crew Decision Needed
        CAM->>CCB: requestConsensus(topic, crew)
        CCB->>CCB: Crew debates asynchronously
        CCB->>CAM: Consensus: approved|rejected|needs_human
        CAM->>API: Decision created
        API->>Dev: Decision pending approval
    end
    
    Dev->>CAM: Approves crew decision
    CAM->>CAM: Execute decision
    CAM->>DA: Update insights based on decision
```

## Project Manager View

```mermaid
sequenceDiagram
    participant PM as Project Manager<br/>(Dashboard)
    participant CAM as CrewAutonomy<br/>Manager
    participant CCB as CrewComm<br/>Bus
    participant PMA as Project Manager<br/>Advisor
    participant API as API<br/>/crew
    
    PM->>API: Load dashboard
    API->>CAM: Get insights for project_manager
    CAM->>CAM: Collect PM-relevant insights
    API->>PMA: Insights + pending decisions
    PMA->>PMA: Group by priority<br/>Display tabbed UI
    PMA->>PM: Shows timeline risks,<br/>budget concerns, decisions
    
    opt PM Needs Crew Input
        PM->>CAM: requestAutonomousDecision(...)
        CAM->>CCB: Gather crew perspectives
        CCB->>CAM: Consensus reached
        CAM->>API: Decision returned to PM
        API->>PMA: Display decision card
        PMA->>PM: "Approve" or "Reject"
    end
    
    PM->>API: POST /api/crew/decisions/[id]/approve
    API->>CAM: approveDecision(...)
    CAM->>CAM: Execute decision
    CAM->>API: Update insights
    PMA->>PM: Auto-refresh board
```

## Crew Consensus Mechanism

```mermaid
graph LR
    A["Decision<br/>Needed"] -->|"requestConsensus"| B["Crew<br/>Debate"]
    B --> C{"Evaluate"}
    
    C -->|"Security veto<br/>triggered"| D["🛑 BLOCKED"]
    C -->|"2+ support<br/>0-1 challenge"| E["✅ APPROVED"]
    C -->|"Conflicting<br/>views"| F["❓ HUMAN INPUT"]
    
    D -->|"Alert stakeholders"| G["Decision Result"]
    E -->|"Auto-execute"| G
    F -->|"Return reasoning"| G
    
    style D fill:#ff9999
    style E fill:#99ff99
    style F fill:#ffff99
    style G fill:#f0f0f0
```

## Authority Hierarchy

```mermaid
graph TD
    A["Decision<br/>Authority"] --> B["Individual<br/>(Single Crew)"]
    A --> C["Consensus<br/>(Multiple Crew)"]
    A --> D["Veto<br/>(Security)"]
    
    B -->|"Low risk"| E["Can execute<br/>autonomously"]
    C -->|"Moderate risk"| F["2:1 approval<br/>needed"]
    D -->|"Any risk"| G["Can block<br/>anything"]
    
    style B fill:#99ff99
    style C fill:#ffff99
    style D fill:#ff9999
```

## Real-Time Monitoring Loop

```mermaid
graph LR
    A["Story<br/>Starts"] --> B["monitorStory<br/>registered"]
    B --> C["5s Loop<br/>Begins"]
    C --> D["Check<br/>Progress"]
    D --> E{"Issues<br/>Found?"}
    E -->|"Yes"| F["Generate<br/>Insight"]
    E -->|"No"| G["Log<br/>Status"]
    F --> H["Broadcast<br/>to UIs"]
    G --> H
    H --> I["Next<br/>5s Cycle"]
    I --> C
    
    style A fill:#e6f2ff
    style C fill:#ff9999
    style F fill:#ffff99
    style H fill:#99ccff
```
