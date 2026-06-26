import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import { executeFullMissionLifecycle } from '../packages/mcp-server/src/lib/crew-coordinator.js';
import { runObservationLoungeSession } from '../packages/mcp-server/src/lib/crew-lounge.js';

/**
 * Strategic script to launch the VS Code Transport Integration mission.
 * This mission tasks Chief O'Brien with integrating WebSocket transport autonomously.
 */
async function launchVsCodeTransportMission() {
  console.log('🖖 [BRIDGE] Launching VS Code Transport Mission: VSCODE-CLI-002');

  const story = {
    id: 'vscode-transport-001',
    referenceNum: 'VSCODE-CLI-002',
    name: 'Integrate WebSocket Transport into VS Code Extension',
    description: 'Autonomously integrate the MCP WebSocket transport layer into the scaffolded extension. #mcp:transport',
    acceptanceCriteria: '1. WebSocket client implemented\n2. Transport handshake working\n3. Bridge communication established',
    url: 'internal://missions/vscode-002',
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
    tags: ['mcp:transport', 'vscode:extension', 'devops:integration'],
    client_id: 'internal'
  }, { onConflict: 'story_id' });

  console.log('🚀 [BRIDGE] Mission briefing delivered. Crew is engaging the warp drive.');

  const result = await executeFullMissionLifecycle({
    story: story as any,
    repoFullName: 'familiarcat/story-agent',
    targetBranch: 'main',
    executionMode: 'autonomous',
    acceptanceCriteria: story.acceptanceCriteria,
    clientId: 'internal',
    techStack: 'TypeScript, MCP SDK, WebSockets'
  });

  console.log(`✅ [BRIDGE] Mission Status: ${result.status.toUpperCase()}`);

  console.log('\n🛋️ [BRIDGE] Mission complete. Convening crew in the Observation Lounge for retrospective summary...');
  await runObservationLoungeSession({ sessionLabel: 'VSCODE-CLI-002 Retrospective' });
}

launchVsCodeTransportMission().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });