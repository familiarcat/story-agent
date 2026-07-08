import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CREW_MISSION_ORDER, CREW_PERSONAS } from '../packages/mcp-server/dist/src/lib/crew-personas.js';
import { executePromptEngineCall } from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { getCrewPersonalMemories, storeObservationMemory, embeddingSource } from '../packages/shared/dist/src/db.js';

/**
 * Crew Stand-Up — a DATA-BACKED daily roll call. (Runnable .mjs mirror of crew-standup.ts.)
 *
 *   node scripts/crew-standup.mjs [--members picard,worf,...] [--memories 6] [--no-store]
 *
 * Unlike the Observation Lounge (self-referential reflection on project purpose), a stand-up asks
 * each officer the operational question: "since last time — what did you ship, what's in progress,
 * what's blocking you, what's next?" Each answer is GROUNDED in their actual recent RAG memories
 * (getCrewPersonalMemories), narrated in their canonical voice on their Quark-selected OpenRouter
 * model. Frugal by design (short cost-optimized calls).
 *
 * The parser is deliberately robust: if a member's model does not emit the section headers, we fall
 * back to using the raw prose as their report rather than printing "[not provided]" — the failure
 * mode that silences officers in the strict Observation Lounge parser (crew-lounge.ts:156-168).
 *
 * Runs against dist (node ESM) because the crew LLM path transitively imports the bare
 * `@story-agent/shared` workspace package, which npx-tsx cannot resolve from src. Run `pnpm run build` first.
 */

const STANDUP_USER_PROMPT_TEMPLATE = (activityLog) => `This is the crew's daily stand-up. Keep it tight and operational — this is not a philosophical reflection.

Below is YOUR OWN recent activity log, pulled from the crew's persistent memory (most recent first). Ground your stand-up in THIS log — refer to the actual work, do not invent new work.

--- YOUR RECENT ACTIVITY LOG ---
${activityLog}
--- END LOG ---

Give your stand-up in your authentic voice. Be specific and concrete — name the actual work above. If the log is empty, say so plainly and state what you intend to pick up next in your domain.

Format your response EXACTLY as:

WORKED_ON: [1-3 sentences — what you recently shipped or completed, drawn from the log]

IN_PROGRESS: [1-2 sentences — what you are actively carrying right now]

BLOCKERS: [1 sentence — what is blocking you, or "No blockers." if none]

NEXT: [1-2 sentences — what you pick up next in your domain]`;

function standupSystemPrompt(crewId) {
  const persona = CREW_PERSONAS[crewId];
  return `${persona.baseSystemPromptSeed}

You are giving a daily stand-up to the crew. Speak in your own voice, but be brief and operational — a stand-up, not a speech. Report only on real work from the activity log you are given.`;
}

/** Guard a per-officer call so one stalled LLM request can't block the whole sequential stand-up. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Robust extraction: return the section if present, else empty string (never a placeholder). */
function extractSection(raw, key) {
  const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
  return match ? match[1].trim() : '';
}

function formatActivityLog(memories) {
  if (!memories.length) return '(no recent activity recorded in crew memory)';
  return memories
    .map((m, i) => {
      const when = (m.created_at ?? '').slice(0, 10);
      const tags = Array.isArray(m.tags) && m.tags.length ? ` [${m.tags.slice(0, 4).join(', ')}]` : '';
      const gist = String(m.content ?? '').replace(/\s+/g, ' ').slice(0, 220);
      return `${i + 1}. (${when}) ${m.title}${tags}\n   ${gist}`;
    })
    .join('\n');
}

async function callAndParse(crewId, activityLog) {
  const result = await executePromptEngineCall(
    crewId,
    {
      loungeMode: 'true',
      loungeContext: standupSystemPrompt(crewId),
      loungePrompt: STANDUP_USER_PROMPT_TEMPLATE(activityLog),
    },
    'CREW-STANDUP',
    ['crew-standup', 'daily', `crew:${crewId}`],
  );

  // prompt-engine's loungeMode returns reasoning === findings[0]; dedupe so raw text isn't doubled.
  const parts = [result.reasoning, ...result.findings, ...result.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(p => p.trim()))].join('\n').trim();

  return {
    raw,
    workedOn: extractSection(raw, 'WORKED_ON'),
    inProgress: extractSection(raw, 'IN_PROGRESS'),
    blockers: extractSection(raw, 'BLOCKERS'),
    next: extractSection(raw, 'NEXT'),
  };
}

async function runStandupForMember(crewId, memoryLimit) {
  const persona = CREW_PERSONAS[crewId];
  const memories = await getCrewPersonalMemories(crewId, memoryLimit, false);
  const activityLog = formatActivityLog(memories);

  // Self-healing retry: cost-optimized endpoints intermittently return empty content, which
  // prompt-engine silently swaps for canned demo text (off-format vs our stand-up template). One
  // retry usually lands a real, grounded, correctly-formatted response.
  let parsed = await callAndParse(crewId, activityLog);
  let retried = false;
  if (!parsed.workedOn && !parsed.inProgress && !parsed.next) {
    retried = true;
    parsed = await callAndParse(crewId, activityLog);
  }

  const rawFallback = !parsed.workedOn && !parsed.inProgress && !parsed.next;

  return {
    crewId,
    fullName: persona.fullName,
    rank: persona.rank,
    role: persona.engineeringRole,
    memoryCount: memories.length,
    workedOn: parsed.workedOn || (rawFallback ? parsed.raw : '—'),
    inProgress: parsed.inProgress || '—',
    blockers: parsed.blockers || 'No blockers.',
    next: parsed.next || '—',
    rawFallback,
    retried,
    rawText: parsed.raw,
  };
}

function formatStandupMarkdown(entries, stardate) {
  const lines = [
    `# Crew Stand-Up — ${stardate}`,
    ``,
    `Data-backed daily roll call. Each officer reports on their **actual** recent RAG memory.`,
    `Embedding/RAG source: \`${embeddingSource()}\`.`,
    ``,
    `| Officer | Domain | Recent memories | Status |`,
    `|---|---|---|---|`,
  ];
  for (const e of entries) {
    const status = e.rawFallback ? '⚠️ raw (off-format)' : e.memoryCount ? '✅ grounded' : '➖ no activity';
    lines.push(`| ${e.fullName} | ${e.role} | ${e.memoryCount} | ${status} |`);
  }
  lines.push(``, `---`, ``);
  for (const e of entries) {
    lines.push(`### ${e.rank} ${e.fullName} — ${e.role}`);
    lines.push(``);
    if (e.rawFallback) {
      lines.push(`> ⚠️ Model returned off-format prose; showing raw report.`);
      lines.push(``);
      lines.push(e.rawText || '(empty response)');
    } else {
      lines.push(`- **Shipped:** ${e.workedOn}`);
      lines.push(`- **In progress:** ${e.inProgress}`);
      lines.push(`- **Blockers:** ${e.blockers}`);
      lines.push(`- **Next:** ${e.next}`);
    }
    lines.push(``);
  }
  return lines.join('\n');
}

(async () => {
  const argv = process.argv.slice(2);
  const membersArg = argv.find(a => a.startsWith('--members='))?.split('=')[1]
    ?? (argv.includes('--members') ? argv[argv.indexOf('--members') + 1] : undefined);
  const memoryLimit = Number(
    argv.find(a => a.startsWith('--memories='))?.split('=')[1]
    ?? (argv.includes('--memories') ? argv[argv.indexOf('--memories') + 1] : 6),
  ) || 6;
  const noStore = argv.includes('--no-store');

  const roster = membersArg
    ? membersArg.split(',').map(s => s.trim()).filter(Boolean)
    : CREW_MISSION_ORDER;

  const stardate = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`CREW STAND-UP — DAILY ROLL CALL   |   Stardate ${stardate}`);
  console.log(`Attendees: ${roster.map(id => CREW_PERSONAS[id].fullName).join(', ')}`);
  console.log(`RAG source: ${embeddingSource()}`);
  console.log(`${'═'.repeat(80)}\n`);

  const entries = [];
  for (const crewId of roster) {
    const persona = CREW_PERSONAS[crewId];
    console.log(`[${persona.fullName}] reporting in (${persona.engineeringRole})...`);
    try {
      const entry = await withTimeout(runStandupForMember(crewId, memoryLimit), 60000, persona.fullName);
      entries.push(entry);
      const flag = entry.rawFallback ? '⚠️ off-format' : entry.memoryCount ? `${entry.memoryCount} memories` : 'no activity';
      console.log(`done (${flag})`);
      console.log(`   Shipped: ${entry.workedOn.replace(/\n/g, ' ').slice(0, 140)}`);
      console.log(`   Next:    ${entry.next.replace(/\n/g, ' ').slice(0, 140)}\n`);
    } catch (error) {
      console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  const md = formatStandupMarkdown(entries, stardate);
  const outDir = 'docs/observation-lounge';
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/crew-standup-${stardate}.md`;
  writeFileSync(outPath, md, 'utf8');
  console.log(`${'─'.repeat(80)}`);
  console.log(`Stand-up complete: ${entries.length}/${roster.length} officers reported.`);
  const offFormat = entries.filter(e => e.rawFallback).map(e => e.crewId);
  const noActivity = entries.filter(e => !e.memoryCount).map(e => e.crewId);
  const retriedList = entries.filter(e => e.retried).map(e => e.crewId);
  const grounded = entries.filter(e => !e.rawFallback && e.memoryCount).length;
  console.log(`Grounded (data-backed): ${grounded}/${entries.length}`);
  if (retriedList.length) console.log(`↻  Retried once (first call empty/off-format): ${retriedList.join(', ')}`);
  if (offFormat.length) console.log(`⚠️  Off-format after retry (raw fallback used): ${offFormat.join(', ')}`);
  if (noActivity.length) console.log(`➖  No recent memory: ${noActivity.join(', ')}`);
  console.log(`Artifact: ${outPath}`);

  if (!noStore) {
    try {
      const obs = await storeObservationMemory({
        storyId: 'crew-standup',
        source: 'mcp',
        transcript: {
          rounds: [{
            title: `Crew stand-up ${stardate}`,
            entries: entries.map(e => ({
              speakerId: e.crewId,
              position: 'support',
              statement: `SHIPPED: ${e.workedOn} | IN-PROGRESS: ${e.inProgress} | BLOCKERS: ${e.blockers} | NEXT: ${e.next}`,
              evidence: [`${e.memoryCount} recent memories`],
            })),
          }],
          consensusSummary: `Daily stand-up: ${entries.length} officers reported; ${offFormat.length} off-format, ${noActivity.length} with no recent activity.`,
          unresolvedRisks: entries.map(e => e.blockers).filter(b => b && b !== 'No blockers.'),
          finalDecision: 'approved',
          actionItems: entries.map(e => `${e.fullName}: ${e.next}`).filter(Boolean),
        },
        tags: ['crew-standup', 'daily', stardate],
      });
      console.log(`Stored to RAG: observation memory ${obs?.id ?? 'n/a'}`);
    } catch (error) {
      console.warn(`Could not store stand-up to RAG: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`${'═'.repeat(80)}\n`);
  // Explicit exit: the Supabase/Redis/OpenAI clients hold open sockets that keep the event loop
  // alive, so the process would otherwise linger indefinitely after the work is done.
  process.exit(0);
})();
