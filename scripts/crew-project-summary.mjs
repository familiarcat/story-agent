import 'dotenv/config';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CREW_MISSION_ORDER, CREW_PERSONAS } from '../packages/mcp-server/dist/src/lib/crew-personas.js';
import { executePromptEngineCall } from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { getCrewPersonalMemories, storeObservationMemory, embeddingSource } from '../packages/shared/dist/src/db.js';

/**
 * Observation Lounge — Project Summary & Next Steps (self-organizing).
 *
 *   node scripts/crew-project-summary.mjs
 *
 * Unlike the canned Observation Lounge reflection (crew-lounge.ts, fixed "Sovereign Factory"
 * philosophy prompt) or the daily stand-up (per-officer activity log only), this session asks the
 * crew to SELF-ORGANIZE: each officer is given the same grounding facts (recent commits, recent RAG
 * memories pooled across the whole crew) and decides FOR THEMSELVES which slice of the project is
 * theirs to report on, rather than being assigned a fixed lane. Picard then synthesizes everyone's
 * self-selected slices into one project summary + a prioritized next-steps list.
 *
 * Runs against dist (node ESM) because the MCP server is disconnected this session — bypasses MCP
 * and calls the crew LLM path directly, mirroring crew-standup.mjs / present-book.mjs.
 */

function extractSection(raw, key) {
  const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
  return match ? match[1].trim() : '';
}

function recentCommits(n = 20) {
  try {
    return execSync(`git log --oneline -${n}`, { encoding: 'utf8' }).trim();
  } catch {
    return '(git log unavailable)';
  }
}

function formatMemoryPool(pooled) {
  if (!pooled.length) return '(no recent crew memory found)';
  return pooled
    .slice(0, 24)
    .map((m, i) => `${i + 1}. [${m.crewId}] (${(m.created_at ?? '').slice(0, 10)}) ${m.title}`)
    .join('\n');
}

const SELF_ORGANIZE_PROMPT = (commits, memoryPool) => `The crew is self-organizing in the Observation Lounge to build a PROJECT SUMMARY and NEXT STEPS for
Story Agent — no one has been assigned a fixed lane. Decide for yourself which slice of the project is
genuinely yours to report on, based on your actual domain and the evidence below. Do not repeat what
another officer would obviously already own; pick the angle only you would notice.

--- RECENT COMMITS (ground truth for what has actually shipped) ---
${commits}
--- END COMMITS ---

--- RECENT CREW MEMORY (pooled across all officers, most recent first) ---
${memoryPool}
--- END MEMORY ---

Respond in your authentic voice, grounded in the evidence above (cite specifics, don't invent work).

Format your response EXACTLY as:

MY_SLICE: [one short phrase — the part of the project you're claiming to report on, and why it's yours]

STATE: [2-3 sentences — the current state of that slice, grounded in the evidence above]

NEXT_STEPS: [1-3 concrete next steps you recommend for your slice, prioritized]

CLOSING: [one sentence signature statement]`;

async function callAndParse(crewId, commits, memoryPool) {
  const result = await executePromptEngineCall(
    crewId,
    {
      loungeMode: 'true',
      loungeContext: `${CREW_PERSONAS[crewId].baseSystemPromptSeed}\n\nYou are in the Observation Lounge. The crew is self-organizing to produce a project summary — no fixed agenda. Claim the slice that is genuinely yours.`,
      loungePrompt: SELF_ORGANIZE_PROMPT(commits, memoryPool),
    },
    'CREW-PROJECT-SUMMARY',
    ['observation-lounge', 'project-summary', 'self-organizing', `crew:${crewId}`],
  );
  const parts = [result.reasoning, ...result.findings, ...result.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(p => p.trim()))].join('\n').trim();
  return {
    raw,
    slice: extractSection(raw, 'MY_SLICE'),
    state: extractSection(raw, 'STATE'),
    next: extractSection(raw, 'NEXT_STEPS'),
    closing: extractSection(raw, 'CLOSING'),
  };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const PICARD_SYNTHESIS_PROMPT = (entries) => `Each officer has self-organized and claimed a slice of the project to report on. Here is what they said:

${entries.map(e => `${e.fullName} (${e.role}) — claimed: "${e.slice || '(unclear)'}"
  State: ${e.state || e.raw.slice(0, 200)}
  Next steps: ${e.next || '(none stated)'}`).join('\n\n')}

As Captain, synthesize this into:

PROJECT_SUMMARY: [3-5 sentences — what Story Agent actually is and where it stands right now, drawing only on what the crew reported]

PRIORITIZED_NEXT_STEPS: [a numbered list, 4-6 items, ordered by priority, drawn from what the crew actually proposed — resolve overlaps, don't invent new ones]

CLOSING: [one sentence]`;

async function picardSynthesize(entries) {
  const result = await executePromptEngineCall(
    'picard',
    {
      loungeMode: 'true',
      loungeContext: `${CREW_PERSONAS.picard.baseSystemPromptSeed}\n\nYou are closing the Observation Lounge session, synthesizing what the self-organized crew reported.`,
      loungePrompt: PICARD_SYNTHESIS_PROMPT(entries),
    },
    'CREW-PROJECT-SUMMARY',
    ['observation-lounge', 'project-summary', 'synthesis', 'crew:picard'],
  );
  const parts = [result.reasoning, ...result.findings, ...result.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(p => p.trim()))].join('\n').trim();
  return {
    raw,
    summary: extractSection(raw, 'PROJECT_SUMMARY') || raw,
    nextSteps: extractSection(raw, 'PRIORITIZED_NEXT_STEPS'),
    closing: extractSection(raw, 'CLOSING'),
  };
}

function formatMarkdown(stardate, entries, synthesis) {
  const lines = [
    `# Observation Lounge — Project Summary & Next Steps`,
    ``,
    `Stardate ${stardate}. Self-organizing session — each officer claimed their own slice, Picard synthesized.`,
    `RAG source: \`${embeddingSource()}\`.`,
    ``,
    `## Picard's Synthesis`,
    ``,
    synthesis.summary,
    ``,
    `### Prioritized Next Steps`,
    ``,
    synthesis.nextSteps || '(see per-officer next steps below)',
    ``,
    `> "${synthesis.closing}"`,
    ``,
    `---`,
    ``,
    `## Per-Officer Reports (self-organized)`,
    ``,
  ];
  for (const e of entries) {
    lines.push(`### ${e.rank} ${e.fullName} — claimed: ${e.slice || '(unclear)'}`);
    lines.push(``);
    lines.push(`- **State:** ${e.state || e.raw.slice(0, 240)}`);
    lines.push(`- **Next steps:** ${e.next || '(none stated)'}`);
    lines.push(`- *"${e.closing}"*`);
    lines.push(``);
  }
  return lines.join('\n');
}

(async () => {
  const stardate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const commits = recentCommits(20);

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`OBSERVATION LOUNGE — PROJECT SUMMARY & NEXT STEPS (self-organizing)`);
  console.log(`Stardate: ${stardate}`);
  console.log(`${'═'.repeat(80)}\n`);

  // Pool recent memory across the whole crew as shared grounding evidence.
  let memoryPool = [];
  for (const crewId of CREW_MISSION_ORDER) {
    try {
      const mem = await getCrewPersonalMemories(crewId, 3, false);
      memoryPool.push(...mem.map(m => ({ ...m, crewId })));
    } catch { /* best-effort pool */ }
  }
  memoryPool.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const memoryPoolText = formatMemoryPool(memoryPool);
  console.log(`Grounding: ${memoryPool.length} pooled memories, ${commits.split('\n').length} recent commits.\n`);

  const entries = [];
  for (const crewId of CREW_MISSION_ORDER) {
    const persona = CREW_PERSONAS[crewId];
    console.log(`[${persona.fullName}] self-organizing (${persona.engineeringRole})...`);
    try {
      const parsed = await withTimeout(callAndParse(crewId, commits, memoryPoolText), 60000, persona.fullName);
      entries.push({ crewId, fullName: persona.fullName, rank: persona.rank, role: persona.engineeringRole, ...parsed });
      console.log(`  claimed: ${parsed.slice || '(unclear)'}`);
    } catch (error) {
      console.log(`  FAILED: ${error instanceof Error ? error.message : String(error)}`);
      entries.push({
        crewId, fullName: persona.fullName, rank: persona.rank, role: persona.engineeringRole,
        raw: '', slice: `${persona.engineeringRole} (unavailable)`, state: '(unavailable this session)', next: '', closing: persona.canonicalQuotes?.[0] ?? '',
      });
    }
  }

  console.log(`\n[PICARD] synthesizing...`);
  const synthesis = await picardSynthesize(entries);
  console.log(`\n${synthesis.summary}\n`);
  console.log(synthesis.nextSteps);
  console.log(`\n"${synthesis.closing}"\n`);

  const md = formatMarkdown(stardate, entries, synthesis);
  const outDir = 'docs/observation-lounge';
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/project-summary-${stardate.replace(/\./g, '')}.md`;
  writeFileSync(outPath, md, 'utf8');
  console.log(`Written: ${outPath}`);

  try {
    const stored = await storeObservationMemory({
      storyId: 'CREW-PROJECT-SUMMARY',
      clientId: null,
      source: 'mcp',
      transcript: {
        rounds: [{ title: 'Self-organized project summary', entries: entries.map(e => ({ speakerId: e.crewId, position: 'support', statement: e.state, evidence: [e.slice] })) }],
        consensusSummary: synthesis.summary,
        unresolvedRisks: [],
        finalDecision: 'approved',
        actionItems: (synthesis.nextSteps || '').split('\n').filter(Boolean),
      },
      missionReference: 'CREW-PROJECT-SUMMARY',
      tags: ['observation-lounge', 'project-summary', 'self-organizing', stardate],
    });
    console.log(`Stored to RAG: ${stored?.id ?? '(ok)'}`);
  } catch (error) {
    console.warn(`RAG store failed (non-fatal): ${error instanceof Error ? error.message : String(error)}`);
  }

  process.exit(0);
})();
