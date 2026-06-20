import 'dotenv/config';
import { getDbClient } from '@story-agent/shared/db';
import { executeFullMissionLifecycle } from '@story-agent/mcp-server/lib/crew-coordinator.js';
import { runObservationLoungeSession } from '@story-agent/mcp-server/lib/crew-lounge.js';
import { crewAutonomyManager } from '@story-agent/mcp-server/lib/crew-autonomy-manager.js';

/**
 * Strategic script to launch the Project Manager Dashboard UI Construction mission.
 * This mission tasks Geordi with scaffolding the LCARS dashboard component,
 * with full crew debate and Observation Lounge summary.
 */
async function launchPmDashboardMission() {
  console.log('🖖 [BRIDGE] Launching Project Manager Dashboard Construction Mission: BRIDGE-UI-003');

  const story = {
    id: 'bridge-ui-pm-dashboard',
    referenceNum: 'BRIDGE-UI-003',
    name: 'Scaffold Project Manager Dashboard Component',
    description: 'Autonomously scaffold a React component for the Project Manager Dashboard using the LCARS \'dashboard\' layout pattern. #infrastructure:scaffolding #vscode:webview',
    acceptanceCriteria: '1. \'ProjectManagerDashboard.tsx\' component file generated. 2. LCARS \'dashboard\' layout applied. 3. Component includes placeholder for mission data grid. 4. Unit tests for component structure generated.',
    url: 'internal://missions/bridge-ui-003',
    workflowStatus: 'ready'
  };

  // Ensure story exists in registry
  const db = await getDbClient();
  await db.from('stories').upsert({
    story_id: story.referenceNum,
    story_title: story.name,
    story_description: story.description,
    acceptance_criteria: story.acceptanceCriteria,
    status: 'discovery',
    tags: ['infrastructure:scaffolding', 'vscode:webview', 'ui:dashboard'],
    client_id: 'internal'
  }, { onConflict: 'story_id' });

  console.log('🛠️ [OBRIEN] Performing pre-flight dependency synchronization...');
  // Proactive self-healing check
  crewAutonomyManager.emit('operation:sync-dependencies', { crewId: 'obrien' });

  console.log('🔍 [PICARD] Assessing organizational readiness for UI phase...');

  console.log('\n🚀 [BRIDGE] Mission briefing delivered. Crew is assembling in the Observation Lounge for debate.');

  const result = await executeFullMissionLifecycle({
    story: story as any,
    repoFullName: 'familiarcat/story-agent',
    targetBranch: 'main',
    executionMode: 'autonomous',
    acceptanceCriteria: story.acceptanceCriteria,
    clientId: 'internal',
    techStack: 'React, TypeScript, LCARS CSS'
  });

  console.log(`✅ [BRIDGE] Mission Status: ${result.status.toUpperCase()}`);
  console.log(`📁 [BRIDGE] Generated Files:`, result.implementation?.files.map(f => f.path));

  console.log('\n🛋️ [BRIDGE] Mission complete. Convening crew in the Observation Lounge for retrospective summary...');
  await runObservationLoungeSession({ sessionLabel: 'BRIDGE-UI-003 Retrospective' });
}

launchPmDashboardMission().catch(console.error);