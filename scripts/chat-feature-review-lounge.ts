import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { runMissionPipeline } from '../packages/mcp-server/dist/src/lib/crew-mission-pipeline.js';
import { storeObservationMemory } from '../packages/shared/dist/src/db.js';

const BRIEF = `## CHAT FEATURE SYSTEM REVIEW — Full Crew Observation Lounge

Story Agent VSCode has an integrated chat system (LIVE since Section 31 Week 1 dogfood). Your task is a FULL crew assessment across all domains, resulting in concrete action plan and phase sequencing.

### Current Deployment:
**Backend:** packages/mcp-server/src/agent-core/chat.ts (1088 lines)
- Crew self-organization via runMissionPipeline
- RAG recall from crew personal memories
- Multi-modal support (images, audio transcription, video notes)
- Activation phrases (make-it-so, next-steps) → plan-then-execute
- Prompt injection protection + WorfGate directive gating
- Cost governance + budget pre-flight checks
- OpenRouter crew LLM routing (Quark cost-optimized)

**VSCode Integration:** packages/vscode-extension/src/panels/ChatPanel.ts + chat-engine.ts
- WebSocket ChatClient with auto-reconnect, connection pooling, batching
- 4 optimization layers: caching (Memento TTL), tiering (Quark model selection), RAG pruning, budget governance
- Status: Routes 100% through OpenRouter crew (zero Copilot tokens)

### Crew Domain Assessment — Each member provides findings:

**DATA (Commander Data — Architecture):**
- Multi-modal pipeline: audio transcription (normalizeAudioFormat, transcribeAudioAttachment), image attachment (buildUserContentParts), video notes. Sound design?
- Team assembly: Dynamic parallel teams (buildDynamicParallelTeams) vs static TEAM_DEFS. Correct logic?
- Cost analysis: 5 vectors (chat, prep, execution, crew, total). Complete and correct?
- Rule of Three: Crew variance surfacing (crewVariance field in response). Should this surface alternatives to user?

**WORF (Lieutenant Worf — Security):**
- WorfGate credential flow: resolveWorfGateCredential('CREW_LLM_APPROVED_KEY') with operation='llm:call', crewId='agent'. Correct gating?
- Prompt injection defense: 14 regex patterns (override-instructions, exfiltration, role-spoofing, bypass, tool-injection). Any gaps?
- Directive blocking: DIRECTIVES_BLOCKED_ON_INJECTION correctly applied under elevated risk?
- Error sanitization in ChatPanel (paths, URLs, tokens, API keys, bearer tokens). Sufficient coverage?

**GEORDI (Geordi La Forge — Infrastructure):**
- WebSocket reliability: Connection pooling, auto-reconnect strategy, 30s timeout. Production-ready?
- Cost governance: DEV vs PROD mode, projectedCostUSD pre-flight check, budget enforcement. Working?
- Model availability: Two-attempt retry with markModelTemporarilyUnavailable(). Correct retry logic?
- Scaling: Token batching, per-session ledger, cache TTL (60min default). Adequate for multi-user?

**YAR (Tasha Yar — QA/Testing):**
- Unit tests: complexity classification (calculateComplexityScore), tier routing (classifyTier), cache TTL, conflict detection?
- Multimodal E2E: Audio transcription, image attachment, video note flows? Coverage?
- Error scenarios: Timeout (30s), malformed JSON, budget exceed, crew unavailable, model unavailable?
- Integration: chat → crew mission pipeline → RAG, with cost ledger verification?

**TROI (Counselor Troi — Stakeholder/UX):**
- UX alignment: Thinking indicator, sources display, cost metadata. Does this match user expectations?
- Responsive actions: make-it-so, next-steps, all-hands, analyze-only. Intuitive and correct?
- Error messaging: Sanitized, non-technical, helpful to users?
- Crew variance notification: Does surfacing alternatives (Rule of Three) improve user trust or create confusion?

**RIKER (Commander Riker — Execution Planning):**
- Organize findings into execution teams by dependency (Phase 1 → Phase 2 → 3 → 4)
- Identify critical path and blockers
- Assign ownership, estimate scope

**PICARD (Captain Picard — Executive Synthesis):**
- Synthesize crew findings into decision-ready brief
- Unresolved risks + recommendations
- Action plan with prioritized phases and success criteria

### Deliverable:
1. Each crew member's authentic findings (domain-specific assessment)
2. Riker's team assembly and execution sequencing (phases, dependencies, ownership)
3. Picard's executive synthesis (recommendations, risks, go/no-go criteria)
4. Concrete action plan (phases 1-4 with ownership, milestones, success metrics)`;

async function main() {
  console.log('\n🖖 Observation Lounge — Chat Feature System Review…\n');

  const result = await runMissionPipeline(BRIEF);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '').slice(0, 12);
  const filename = `docs/observation-lounge/chat-feature-review-${timestamp}.md`;
  mkdirSync('docs/observation-lounge', { recursive: true });

  const markdown = [
    '# Observation Lounge — Chat Feature System Review',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Cost:** $${result.efficiency.totalCostUSD.toFixed(4)} (${result.efficiency.totalTokens} tokens)`,
    `**Top model:** ${result.topModel}`,
    '',
    '## Mission Goals',
    '',
    result.goals,
    '',
    '## Crew Contributions by Domain',
    '',
    ...result.contributions.flatMap((ct) => [
      `### ${ct.crewId} (${ct.domain}) — \`${ct.model}\` ($${ct.costUSD.toFixed(4)})`,
      '',
      ct.text,
      '',
    ]),
    '## Mission Plan',
    '',
    result.missionPlan,
    '',
    ...(result.alternatives && result.alternatives.length > 0 ? [
      '## Alternatives (Rule of Three)',
      '',
      ...result.alternatives.flatMap((alt, i) => [
        `### Option ${i + 1}: ${alt.label} (Risk: ${alt.riskLevel}, Cost delta: $${alt.costDelta.toFixed(4)})`,
        '',
        alt.missionPlan,
        '',
        `**Reasoning:** ${alt.reasoning}`,
        '',
      ]),
    ] : []),
  ].join('\n');

  writeFileSync(filename, markdown);
  console.log(`📄 Transcript written to ${filename}`);

  // Store to RAG
  try {
    await storeObservationMemory({
      storyId: 'chat-feature-review',
      source: 'mcp',
      transcript: {
        rounds: [
          {
            title: 'Chat feature system review — full crew assessment',
            entries: result.contributions.map((ct) => ({
              speakerId: ct.crewId,
              position: 'support',
              statement: ct.text,
              evidence: [`domain:${ct.domain}`, `model:${ct.model}`, `cost:$${ct.costUSD.toFixed(4)}`],
            })),
          },
        ],
        consensusSummary: result.missionPlan,
        unresolvedRisks: result.contributions
          .filter((ct) => ct.text.toLowerCase().includes('risk') || ct.text.toLowerCase().includes('blocker'))
          .map((ct) => `${ct.crewId}: ${ct.text.substring(0, 200)}`),
        finalDecision: 'approved',
        actionItems: [
          'Implement action plan phases with ownership',
          'Address identified security/testing gaps',
          'Execute with crew coordination',
        ],
      },
      tags: ['chat-feature', 'system-review', 'observation-lounge'],
    });
    console.log(`✅ Observation stored to RAG`);
  } catch (e) {
    console.warn(`⚠️ RAG storage skipped: ${e}`);
  }

  console.log(`\n📊 Summary:\n  Contributions: ${result.contributions.length}\n  Cost: $${result.efficiency.totalCostUSD.toFixed(4)}\n  Tokens: ${result.efficiency.totalTokens}\n`);
}

main().catch((e) => {
  console.error(`❌ Mission failed: ${e.message}`);
  process.exit(1);
});
