# Implementation Roadmap: Autonomous Crew System Integration

## Current Status: 85% Complete

| Component | Status | Notes |
|-----------|--------|-------|
| CrewAutonomyManager | ✅ Built | 380 lines, fully typed, ready to integrate |
| CrewCommunicationBus | ✅ Built | 320 lines, consensus logic complete |
| DeveloperAdvisor UI | ✅ Built | React component, API ready |
| ProjectManagerAdvisor UI | ✅ Built | React component with tabs |
| WebSocket Integration | ✅ Existing | From Phase 3, working well |
| API Routes (mock) | ✅ Built | All 4 endpoints with mock data |
| Types & Exports | ✅ Built | CrewInsight, CrewDecision, CrewWorkload |
| Architecture Docs | ✅ Complete | Workflows, scenarios, diagrams |
| **MCP Server Integration** | ⏳ TODO | Wire into startup |
| **Real Data Injection** | ⏳ TODO | Connect APIs to autonomy manager |
| **Autonomous Actions** | ⏳ TODO | PR merge, status updates, etc. |

---

## Phase 1: MCP Server Integration (Day 1-2)

### 1.1 Import CrewAutonomyManager

**File:** `packages/mcp-server/src/index.ts`

```typescript
// Add import at top
import { crewAutonomyManager } from './lib/crew-autonomy-manager.js';

// In main() function, after WebSocket server creation:
async function main() {
  const server = new StdioServer({...});
  const httpServer = createServer();
  const wsServer = new WebSocketServer(httpServer);
  
  // START CREW AUTONOMY SYSTEM
  crewAutonomyManager.start();
  console.error('[CREW] Autonomy manager started');
  
  // Register MCP tools...
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    crewAutonomyManager.stop();
    await server.close();
  });
}
```

### 1.2 Wire Story Monitoring

**File:** `packages/mcp-server/src/lib/crew-agents.ts` (each crew function)

After crew execution, record findings:

```typescript
// Example: After executePromptEngineCall in crewArchitect()

const findings = parseArchitectureOutput(response);

// Record with crew autonomy system
crewStateBroadcaster.recordCrewFinding(storyRef, 'architect', {
  findings: findings.findings,
  recommendations: findings.recommendations,
  confidence: findings.confidence || 85,
  costUsd: execution.cost,
  durationMs: execution.duration,
  isVeto: false
});

// Monitor for crew insights
crewAutonomyManager.monitorStory(storyRef, 
  crewStateBroadcaster.getState(storyRef)
);
```

### 1.3 Handle Worf Security Veto

**File:** `packages/mcp-server/src/lib/crew-agents.ts` (crewSecurity function)

```typescript
const hasSecurityConcerns = response.includes('SECURITY_VETO');

crewStateBroadcaster.recordCrewFinding(storyRef, 'security', {
  findings: securityFindings,
  recommendations: securityFixes,
  confidence: 95,
  costUsd: 0.05,
  durationMs: 2000,
  isVeto: hasSecurityConcerns  // IMPORTANT: Set veto flag
});

if (hasSecurityConcerns) {
  crewStateBroadcaster.blockStory(storyRef, 
    'Security veto: ' + securityConcerns);
}
```

**Expected Outcome:** 
- CrewAutonomyManager receives monitoring updates
- Generates security-focused insights
- Blocks story from proceeding
- Alerts both developer and PM

---

## Phase 2: Connect API Routes to Real Data (Day 2-3)

### 2.1 Replace Mock Insights

**File:** `packages/ui/src/app/api/crew/insights/route.ts`

```typescript
import { crewAutonomyManager } from '@story-agent/mcp-server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storyRef = searchParams.get('storyRef');
  const role = searchParams.get('role') as 'developer' | 'project_manager';
  const projectId = searchParams.get('projectId');

  // REPLACE MOCK DATA WITH REAL CALLS:
  const insights = crewAutonomyManager.getInsightsForRole(
    role,
    storyRef || projectId
  );

  return NextResponse.json({ success: true, insights });
}
```

### 2.2 Replace Mock Decisions

**File:** `packages/ui/src/app/api/crew/decisions/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storyRef = searchParams.get('storyRef');
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  // REPLACE WITH REAL CALLS:
  const decisions = crewAutonomyManager.getDecisions(
    storyRef || projectId,
    status as 'pending' | 'approved' | 'rejected'
  );

  return NextResponse.json({ success: true, decisions });
}
```

### 2.3 Wire Decision Execution

**File:** `packages/ui/src/app/api/crew/decisions/[id]/approve/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { approvedBy } = await request.json();

  // EXECUTE THE DECISION:
  await crewAutonomyManager.approveDecision(params.id, approvedBy);

  // If decision involves PR merge, auto-merge here
  // If decision involves status update, call that here
  // If decision involves resource allocation, execute that here

  return NextResponse.json({ 
    success: true, 
    message: 'Decision approved and executed' 
  });
}
```

**Expected Outcome:**
- API returns real insights from crew
- API returns real pending decisions
- Approvals execute autonomously

---

## Phase 3: Implement Autonomous Actions (Day 3-4)

### 3.1 Auto-Merge on Approval

**File:** New: `packages/mcp-server/src/lib/autonomous-actions.ts`

```typescript
export async function autoMergePR(prNumber: number, storyRef: string) {
  const github = new GitHubClient(process.env.GITHUB_TOKEN);
  
  try {
    // Get PR details
    const pr = await github.getPullRequest(prNumber);
    
    // Check all conditions met
    if (pr.reviewDecision !== 'APPROVED') {
      throw new Error('PR not approved by crew');
    }
    if (pr.statusCheckRollup !== 'SUCCESS') {
      throw new Error('CI/CD checks not passing');
    }
    
    // Merge
    await github.mergePullRequest(prNumber, {
      mergeMethod: 'squash',
      commitTitle: `[${storyRef}] Crew-approved implementation`,
      commitMessage: 'Auto-merged by autonomous crew system'
    });
    
    console.log(`✅ Auto-merged PR #${prNumber}`);
    
    // Record action
    crewStateBroadcaster.recordCrewAction(storyRef, {
      type: 'auto_merge',
      details: `PR #${prNumber} merged autonomously`
    });
    
  } catch (err) {
    console.error(`Failed to auto-merge: ${err}`);
    // Alert PM
  }
}
```

### 3.2 Auto-Update Story Status

**File:** Extend `autonomous-actions.ts`

```typescript
export async function autoUpdateStoryStatus(storyRef: string, newStatus: string) {
  const ahaDomain = process.env.AHA_DOMAIN;
  const ahaKey = process.env.AHA_API_KEY;
  
  try {
    // Update Aha story status
    await fetch(`${ahaDomain}/api/v1/stories/${storyRef}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${ahaKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus // "In Progress" → "In Review" → "Complete"
      })
    });
    
    console.log(`✅ Updated ${storyRef} to ${newStatus}`);
    
  } catch (err) {
    console.error(`Failed to update status: ${err}`);
  }
}
```

### 3.3 Auto-Post PR Comments

**File:** Extend `autonomous-actions.ts`

```typescript
export async function autoPostPRComment(
  prNumber: number, 
  storyRef: string,
  comment: string
) {
  const github = new GitHubClient(process.env.GITHUB_TOKEN);
  
  try {
    await github.createPullRequestComment(prNumber, {
      body: `## 🤖 Crew Autonomous Review

${comment}

*Posted by Story Agent Crew (${new Date().toISOString()})*`
    });
    
    console.log(`✅ Posted comment on PR #${prNumber}`);
    
  } catch (err) {
    console.error(`Failed to post comment: ${err}`);
  }
}
```

### 3.4 Trigger Autonomous Actions from Crew

**File:** Update `crew-autonomy-manager.ts`

```typescript
// When decision approved, trigger action
approveDecision(decisionId: string, approvedBy: string): void {
  const decision = this.decisions.get(decisionId);
  if (!decision) return;
  
  decision.approved = true;
  decision.approvedBy = approvedBy;
  
  // EXECUTE THE ACTION:
  switch (decision.type) {
    case 'approve_implementation':
      autoMergePR(decision.metadata.prNumber, decision.storyRef);
      autoUpdateStoryStatus(decision.storyRef, 'In Review');
      break;
      
    case 'request_revision':
      autoPostPRComment(
        decision.metadata.prNumber,
        decision.storyRef,
        decision.reasoning
      );
      break;
      
    case 'block_for_security':
      autoPostPRComment(
        decision.metadata.prNumber,
        decision.storyRef,
        `🛑 SECURITY VETO: ${decision.reasoning}`
      );
      break;
      
    case 'accelerate_timeline':
      autoUpdateStoryStatus(decision.storyRef, 'Fast Track');
      break;
  }
}
```

**Expected Outcome:**
- Crew-approved PRs merge automatically
- Story status updates automatically
- PR comments posted with crew guidance
- No human intervention needed for routine decisions

---

## Phase 4: Monitoring & Analytics (Day 4-5)

### 4.1 Add MCP Tools for Crew Analytics

**File:** `packages/mcp-server/src/tools/crew-analytics-tools.ts`

```typescript
export const crewAnalyticsTools = {
  crew_pending_insights: {
    schema: z.object({
      storyRef: z.string(),
      role: z.enum(['developer', 'project_manager'])
    }),
    handler: async (input) => {
      const insights = crewAutonomyManager.getInsightsForRole(input.role, input.storyRef);
      return { insights };
    }
  },
  
  crew_pending_decisions: {
    schema: z.object({}),
    handler: async () => {
      const decisions = crewAutonomyManager.getDecisions(undefined, 'pending');
      return { decisions };
    }
  },
  
  crew_workload: {
    schema: z.object({}),
    handler: async () => {
      const workload = crewAutonomyManager.getWorkload();
      return { workload };
    }
  },
  
  crew_performance: {
    schema: z.object({ crewMemberId: z.string() }),
    handler: async (input) => {
      const performance = crewAutonomyManager.getPerformanceMetrics(input.crewMemberId);
      return { performance };
    }
  }
};

// Register in index.ts:
server.tool('crew_pending_insights', ..., crewAnalyticsTools.crew_pending_insights);
```

### 4.2 Dashboard Analytics Component

**File:** `packages/ui/src/components/CrewAnalytics.tsx`

```typescript
export function CrewAnalytics() {
  const [stats, setStats] = useState({
    totalDecisions: 0,
    approvalRate: 0,
    vetoRate: 0,
    avgConfidence: 0,
    crewUtilization: 0
  });
  
  useEffect(() => {
    // Fetch crew metrics
    fetch('/api/crew/analytics')
      .then(r => r.json())
      .then(data => setStats(data.stats));
  }, []);
  
  return (
    <div className="grid grid-cols-5 gap-4">
      <StatCard label="Total Decisions" value={stats.totalDecisions} />
      <StatCard label="Approval Rate" value={`${stats.approvalRate}%`} />
      <StatCard label="Veto Rate" value={`${stats.vetoRate}%`} />
      <StatCard label="Avg Confidence" value={`${stats.avgConfidence}%`} />
      <StatCard label="Crew Utilization" value={`${stats.crewUtilization}%`} />
    </div>
  );
}
```

---

## Integration Checklist

### Week 1
- [ ] Phase 1.1: Import CrewAutonomyManager in MCP
- [ ] Phase 1.2: Wire monitoring in crew-agents.ts
- [ ] Phase 1.3: Handle Worf security veto
- [ ] Test: Verify monitorStory receives updates
- [ ] Test: Verify insights generated

### Week 2
- [ ] Phase 2.1: Replace mock insights
- [ ] Phase 2.2: Replace mock decisions
- [ ] Phase 2.3: Wire decision execution
- [ ] Test: Verify API returns real data
- [ ] Test: Verify decisions execute

### Week 3
- [ ] Phase 3.1: Implement auto-merge
- [ ] Phase 3.2: Implement auto-status-update
- [ ] Phase 3.3: Implement auto-comments
- [ ] Phase 3.4: Trigger actions from decisions
- [ ] Test: Full end-to-end autonomous workflow

### Week 4
- [ ] Phase 4.1: Add MCP analytics tools
- [ ] Phase 4.2: Create analytics dashboard
- [ ] Performance tuning and optimization
- [ ] Documentation and team training

---

## Testing Strategy

### Unit Tests
```typescript
// crew-autonomy-manager.test.ts
describe('CrewAutonomyManager', () => {
  it('generates architecture insights', () => {});
  it('detects security issues', () => {});
  it('triggers consensus on complex decisions', () => {});
  it('blocks story on veto', () => {});
});

// crew-communication.test.ts
describe('CrewCommunicationBus', () => {
  it('reaches consensus with 2:1 support', () => {});
  it('blocks on security veto', () => {});
  it('requires human input on split vote', () => {});
});
```

### Integration Tests
```typescript
// autonomous-workflow.test.ts
describe('End-to-end Autonomous Workflow', () => {
  it('story start → insights → developer acts → crew approval → PR merge', async () => {
    // 1. Create story
    // 2. Wait for insights
    // 3. Simulate developer fix
    // 4. Wait for crew approval
    // 5. Verify PR merged
  });
});
```

### Manual Testing
1. Start MCP server with autonomy manager
2. Trigger story execution
3. Monitor insights in Developer Advisor
4. Monitor decisions in Project Manager Advisor
5. Test approval/rejection flows
6. Verify autonomous actions execute

---

## Success Criteria

✅ **Crew Autonomy System Ready When:**
- CrewAutonomyManager starts with server
- Insights appear in developer advisor within 5 seconds of story start
- PM advisor shows pending decisions within 10 seconds
- Decision approval executes autonomous action (PR merge, status update, comment)
- Security veto blocks story immediately
- Consensus reached on complex decisions
- Zero impact on existing story execution flow
- All TypeScript compiles without errors
- 90%+ test coverage on autonomy components

---

## Key Success Metric

**Time from PR open to merge without human intervention:** < 3 minutes

This shows that the autonomous crew system is truly working in tandem with developers and PMs.
