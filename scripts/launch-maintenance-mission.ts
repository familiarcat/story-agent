import 'dotenv/config';
import { executeFullMissionLifecycle } from '../packages/mcp-server/src/lib/crew-coordinator.js';
import { runObservationLoungeSession } from '../packages/mcp-server/src/lib/crew-lounge.js';

/**
 * Maintenance Mission: Resolve Codebase Errors
 * 
 * Tasks the crew with investigating mispointed libraries and missing dependencies.
 */
async function launchMaintenanceMission() {
  console.log('🖖 [BRIDGE] Launching Maintenance Mission: SYS-FAULT-RESOLVE');

  const story = {
    id: 'sys-maintenance-001',
    referenceNum: 'SYS-FAULT-001',
    name: 'Resolve Monorepo Library Pointing & Dependency Errors',
    description: 'Investigate errors where target libraries are mispointed and dependencies are missing. #infrastructure:configuration',
    acceptanceCriteria: '1. pnpm workspace is healthy\n2. All packages point to valid dist paths\n3. Learned patterns stored in memory',
    url: 'internal://missions/maintenance-001',
    workflowStatus: 'ready'
  };

  const result = await executeFullMissionLifecycle({
    story: story as any,
    repoFullName: 'familiarcat/story-agent',
    targetBranch: 'main',
    executionMode: 'autonomous',
    acceptanceCriteria: story.acceptanceCriteria, // Added missing acceptanceCriteria
    clientId: 'internal',
    techStack: 'pnpm Workspaces, TypeScript'
  });

  console.log(`✅ [BRIDGE] Maintenance Result: ${result.status.toUpperCase()}`);

  console.log('\n🛋️ [BRIDGE] Convening lounge to finalize maintenance learnings...');
  await runObservationLoungeSession({ sessionLabel: 'Dependency Health Retrospective' });
}

launchMaintenanceMission().catch(console.error);