#!/usr/bin/env node

import { executeAhaStoryWithMemory } from '../dist/src/lib/crew-aha-mission.js';

const args = process.argv.slice(2);
const releaseId = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const executor = (args.find((a) => a.startsWith('--executor=')) ?? '--executor=riker').split('=')[1];
const clientId = (args.find((a) => a.startsWith('--client=')) ?? '--client=').split('=')[1] || null;

if (!releaseId) {
  console.error('Usage: node scripts/create-project-management-ui-story.mjs <releaseId> [--executor=riker] [--client=familiarcat] [--dry-run]');
  process.exit(1);
}

const story = {
  name: 'Project management UI for current Aha backlog and crew workflow',
  description: `Organize the current Aha project management UI so the dashboard and VS Code extension surface the Story Agent backlog, Aha story lifecycle, and the team-coordinated OpenRouter crew workflow.

This story should capture:
- a project management queue view for the current Aha project,
- unified dashboard + VS Code extension backlog visibility,
- prompt architecture defaults that route natural language through the OpenRouter crew,
- WorfGate-gated write actions, RAG recall, and cross-platform story lifecycle tracking.`,
};

const mode = dryRun ? 'DRY RUN' : 'LIVE';
console.log(`Preparing Aha! story in release ${releaseId} as ${executor} (${mode})\n`);

async function main() {
  if (dryRun) {
    console.log('Dry-run mode: no Aha! write will be performed.');
    console.log('Story payload:');
    console.log(JSON.stringify({ releaseId, executor, clientId, story }, null, 2));
    console.log('\nTo commit live, rerun this command without --dry-run.');
    return;
  }

  const result = await executeAhaStoryWithMemory({ executor, releaseId, story, clientId, confirm: true });
  console.log('Result:');
  console.log(`  executed: ${result.executed}`);
  console.log(`  ahaRef: ${result.ahaRef ?? 'none'}`);
  console.log(`  agreementMemoryId: ${result.agreementMemoryId}`);
  console.log(`  resultMemoryId: ${result.resultMemoryId}`);
  console.log('  audit:');
  for (const line of result.audit) {
    console.log(`    - ${line}`);
  }
}

main().catch((error) => {
  console.error('Failed to create the Aha! story:', error);
  process.exit(1);
});
