import 'dotenv/config';
import { getDbClient } from '../packages/shared/src/db.js';
import { executeFullMissionLifecycle } from '../packages/mcp-server/src/lib/crew-coordinator.js';

/**
 * Strategic script to launch the VS Code CLI Scaffolding mission.
 * This mission leverages Geordi's new scaffolding tools.
 */
async function launchVsCodeMission() {
  console.log('🖖 [BRIDGE] Launching VS Code Scaffolding Mission: VSCODE-CLI-001');

  const story = {
    id: 'vscode-scaffold-001',
    referenceNum: 'VSCODE-CLI-001',
    name: 'Initialize VS Code Extension Scaffolding',
    description: 'Autonomously generate the technical foundation for the story-agent extension. #infrastructure:scaffolding',
    acceptanceCriteria: '1. package.json exists\n2. extension.ts generated\n3. Build config ready',
    url: 'internal://missions/vscode-001',
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
    tags: ['infrastructure:scaffolding', 'vscode:extension'],
    client_id: 'internal'
  }, { onConflict: 'story_id' });

  console.log('🚀 [BRIDGE] Mission briefing delivered. Crew is assembling in the Observation Lounge.');

  const result = await executeFullMissionLifecycle({
    story: story as any,
    repoFullName: 'familiarcat/story-agent',
    targetBranch: 'main',
    executionMode: 'autonomous',
    acceptanceCriteria: story.acceptanceCriteria,
    clientId: 'internal',
    techStack: 'TypeScript, VS Code API, MCP SDK'
  });

  console.log(`✅ [BRIDGE] Mission Status: ${result.status.toUpperCase()}`);
  console.log(`📁 [BRIDGE] Generated Files:`, result.implementation?.files.map(f => f.path));
  console.log(`📝 [BRIDGE] Commit Message: ${result.summary?.commitMessage}`);
}

launchVsCodeMission().catch(console.error);