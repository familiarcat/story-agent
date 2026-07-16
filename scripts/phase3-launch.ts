/**
 * Phase 3 Autonomous Execution Launcher
 * 
 * This script activates the crew to proceed autonomously through Phase 3:
 * 1. Observation Lounge deliberation (crew deliberates on available stories)
 * 2. Self-assignment (each crew member claims stories matching their domain)
 * 3. Daily execution + standups (real-time Aha sync via MCP tools)
 * 4. Blocker escalation (YELLOW→Riker, RED→Admiral)
 * 5. Validation + shipping (Yar approves; milestone creation)
 * 
 * Usage: npx tsx scripts/phase3-launch.ts
 * Or via MCP: crew_phase3_launch MCP tool
 */

import { runMissionDebrief, storeObservationMemory } from '@story-agent/shared/db';
import { createAhaClient } from '@story-agent/shared/aha-client';
import type { AhaStory } from '@story-agent/shared';

interface Phase3LaunchConfig {
  releaseId: string; // Aha release ID for Phase 3
  executionMode: 'AUTO' | 'YELLOW' | 'INTERACTIVE';
  dryRun?: boolean;
  memoryRecall?: boolean;
}

export async function launchPhase3(config: Phase3LaunchConfig) {
  const startTime = Date.now();
  const phaseLogId = `phase3-launch-${new Date().toISOString().split('T')[0]}`;

  try {
    console.log(`🚀 Phase 3 Autonomous Execution Launching...`);
    console.log(`📋 Release ID: ${config.releaseId}`);
    console.log(`🎯 Mode: ${config.executionMode}`);

    // Step 1: Fetch Phase 3 stories from Aha
    console.log(`\n📂 Fetching Phase 3 stories from Aha...`);
    const ahaClient = createAhaClient({
      domain: process.env.AHA_DOMAIN || '',
      token: process.env.AHA_API_KEY || '',
    });

    const phase3Sprint = await ahaClient.getSprint(config.releaseId);
    const phase3Stories = await ahaClient.getSprintStories(config.releaseId);

    console.log(`✅ Found ${phase3Stories.length} Phase 3 stories:`);
    phase3Stories.forEach((s) => console.log(`   - ${s.reference_number}: ${s.name}`));

    // Step 2: Store Phase 3 launch event to crew memory
    console.log(`\n🧠 Logging Phase 3 launch to crew memory...`);
    await storeObservationMemory({
      storyId: phaseLogId,
      source: 'mcp',
      transcript: {
        storyRef: 'PHASE3-LAUNCH',
        summary: `Phase 3 autonomous execution initiated. Release: ${phase3Sprint.name}. Stories: ${phase3Stories.length}`,
        participants: ['picard', 'data', 'riker', 'worf', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark'],
        rounds: [],
        consensus: `Launch Phase 3 with ${config.executionMode} gate mode`,
        decisions: phase3Stories.map((s) => `${s.reference_number}: ${s.name}`),
      } as any,
      tags: ['phase-3', 'launch', 'autonomous-execution', config.releaseId],
    });

    // Step 3: Prepare Observation Lounge briefing
    console.log(`\n🖖 Preparing Observation Lounge briefing...`);
    const briefing = generateObservationLoungeBriefing(phase3Stories);

    if (!config.dryRun) {
      console.log(`\n🔄 Syncing Phase 3 configuration to Aha...`);
      // Mark stories as ready for Observation Lounge
      for (const story of phase3Stories) {
        await ahaClient.updateFeature(story.reference_number, {
          description: `${story.description || ''}\n\n**Phase 3 Status:** Ready for crew self-assignment\n**Briefing:** See crew memory log ${phaseLogId}`,
        });
      }
    }

    // Step 4: Create Phase 3 milestone in crew memory
    console.log(`\n🏁 Creating Phase 3 milestone marker...`);
    const milestoneId = `PHASE3-MILESTONE-START-${new Date().toISOString().split('T')[0]}`;
    await storeObservationMemory({
      storyId: milestoneId,
      source: 'mcp',
      transcript: {
        storyRef: 'PHASE3-MILESTONE',
        summary: `🚀 PHASE 3 MILESTONE: Autonomous Execution Started`,
        participants: ['picard', 'all-crew'],
        rounds: [],
        consensus: `All 11 crew members proceeding autonomously through Phase 3. Daily Observation Lounges begin immediately.`,
        decisions: [`Release: ${phase3Sprint.name}`, `Stories: ${phase3Stories.length}`, `Mode: ${config.executionMode}`],
      } as any,
      tags: ['phase-3', 'milestone', 'launch', 'autonomous-start'],
    });

    console.log(`\n✅ Phase 3 Launch Complete`);
    console.log(`📊 Elapsed: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`\n🎯 Next Steps:`);
    console.log(`   1. Observation Lounge deliberates on Phase 3 stories (09:00 PST daily)`);
    console.log(`   2. Each crew member calls aha_crew_self_assign()`);
    console.log(`   3. Daily standups via aha_crew_standup_update() at 17:00 PST`);
    console.log(`   4. Blockers escalated via aha_crew_blocker_escalate()`);
    console.log(`   5. Crew ships stories when ready (Yar validates)`);

    return {
      success: true,
      phaseId: 'PHASE3',
      releaseId: config.releaseId,
      storyCount: phase3Stories.length,
      launchTime: new Date().toISOString(),
      milestoneId,
      memoryLogId: phaseLogId,
      briefing,
    };
  } catch (error) {
    console.error(`❌ Phase 3 Launch Failed:`, error);
    throw error;
  }
}

function generateObservationLoungeBriefing(stories: AhaStory[]): string {
  const briefing = [
    `🖖 **OBSERVATION LOUNGE BRIEFING - PHASE 3**`,
    ``,
    `**Release:** Phase 3 Autonomous Execution`,
    `**Stories:** ${stories.length}`,
    `**Crew:** All 11 members`,
    ``,
    `**Available Stories:**`,
    ...stories.map(
      (s, i) =>
        `${i + 1}. **${s.reference_number}** — ${s.name}` +
        (s.description ? `\n   ${s.description.slice(0, 100)}...` : '')
    ),
    ``,
    `**Execution Rules:**`,
    `- Each crew member self-assigns to ONE primary story`,
    `- Self-assignment rationale logged to crew memory`,
    `- Daily standups at 17:00 PST (progress, health, risks, decisions)`,
    `- Blockers escalated to Riker (YELLOW, 30-min decision) or Admiral (RED, post-sprint review)`,
    `- Yar validates before SHIPPED`,
    `- Milestones created at phase transitions`,
    ``,
    `**Current Phase:** 3 of ~6 phases planned`,
    `**Velocity Target:** ≥1.4 pts/hr (+26% vs Phase 1-2)`,
    `**Success Criteria:** 85%+ crew participation, <1% false consensus, ≤6.8/10 avg cognitive load`,
    ``,
  ].join('\n');

  return briefing;
}

// Main entry point for CLI
if (require.main === module) {
  const config: Phase3LaunchConfig = {
    releaseId: process.env.PHASE3_RELEASE_ID || 'R-PHASE3-2026-Q3',
    executionMode: (process.env.PHASE3_MODE as 'AUTO' | 'YELLOW' | 'INTERACTIVE') || 'AUTO',
    dryRun: process.env.DRY_RUN === 'true',
    memoryRecall: process.env.RECALL_MEMORY !== 'false',
  };

  launchPhase3(config)
    .then((result) => {
      console.log(`\n📋 Launch Result:`, JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Fatal error:`, error);
      process.exit(1);
    });
}

export default launchPhase3;
