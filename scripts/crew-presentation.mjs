import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CREW_PERSONAS } from '../packages/mcp-server/dist/src/lib/crew-personas.js';
import { executePromptEngineCall } from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { beginAsync, heartbeatAsync, endAsync } from '../packages/shared/dist/src/async-status.js';
import { storeObservationMemory } from '../packages/shared/dist/src/db.js';

/**
 * Crew Presentation — the FULL team works IN PARALLEL to author a project-summary presentation.
 *
 *   node scripts/crew-presentation.mjs [--no-store]
 *
 * Each of the 11 officers owns one section (their domain) and drafts it concurrently (Promise.all)
 * on their Quark-selected OpenRouter model, grounded in verified codebase facts. Output is a
 * structured sections.json the assembler turns into a shared-screen deck. Wired into the async-status
 * registry so progress shows live in `pnpm status` / the prompt hook. Runs on dist (node ESM).
 */

const FACTS = `VERIFIED FACTS (use only these; do NOT invent numbers or rename things):
- Story Agent = self-hosted autonomous coding assistant; an 11-member Star Trek crew of specialized agents on OpenRouter. The premium model (Anthropic) only ORCHESTRATES; the cheap crew does the work.
- Scale: monorepo, 4 packages (mcp-server, shared, ui=Next.js, vscode-extension); ~61k lines TypeScript; ~150 MCP tool registrations; 41 skill-theory definitions; deployed on AWS Fargate (terraform+docker).
- MCP = Model Context Protocol (the OPEN standard) — the same crew plugs into Claude Code, Cursor, Copilot.
- Quark routing: cheapest adequate model per task from a multi-provider pool (Meta/OpenAI/DeepSeek/Anthropic/Google); Anthropic only at tier-4 (arch/security).
- WorfGate: credential broker (secrets never logged) + a green/yellow/red local governor that AUTO-REMEDIATES risky ops (clamps paths, downgrades --force) instead of hard-blocking. NOT prompt-injection scanning.
- RAG memory: Supabase pgvector, recall→act→store loop; the system compounds (gets better with use); portable across AI tools.
- Control-lane: observable crew-vs-Anthropic cost attribution (pnpm lanes). Deliberations cost ~$0.002-0.003.
- Async-status (new): live in-flight progress surfaced on every prompt; timeout-as-terminal-state guardrail.
- Honest caveats: shadow-test for full autonomy is a CRITERION not a passed result; cost figures are per-deliberation micro-costs; no verified production customers (Jonah/Bayer illustrative).`;

/* Each officer OWNS one section of the project-summary deck. */
const SECTIONS = [
  { crewId: 'picard',  section: 'Executive Summary & Vision', focus: 'what the project IS and why it matters, in one crisp arc; end with the memorable one-liner' },
  { crewId: 'data',    section: 'Architecture', focus: 'the control flow: MCP → orchestrator → crew pipeline / agent-core → Quark routing → OpenRouter, wrapped by WorfGate + RAG' },
  { crewId: 'quark',   section: 'Cost Model & Client ROI', focus: 'thin premium orchestration + cheap crew; measured savings vs a frontier baseline; the money argument' },
  { crewId: 'worf',    section: 'Security & Governance', focus: 'WorfGate credential broker + green/yellow/red governor; audit trail; why regulated clients care' },
  { crewId: 'geordi',  section: 'Infrastructure & Deployment', focus: 'Fargate/terraform/docker; multi-provider reachability; how it runs in the real environment' },
  { crewId: 'obrien',  section: 'DevOps & Reliability', focus: 'runbooks, operability, the async-status guardrail against invisible hangs' },
  { crewId: 'yar',     section: 'Quality & Go-Live Criteria', focus: 'testing discipline; the shadow test as the honest go/no-go for full autonomy (a criterion, not yet passed)' },
  { crewId: 'troi',    section: 'Client Value & Experience', focus: 'what a client actually gets: cost you can see, governance, multi-tenant isolation, it compounds' },
  { crewId: 'riker',   section: 'Roadmap — What\'s Next', focus: 'crew-aware feature branches tied to Aha stories; async-visualization follow-up (streaming + web/VS Code renderers); crew-table write fix' },
  { crewId: 'crusher', section: 'System Health & Honest Current State', focus: 'what works today vs known gaps; monitoring baseline; candor that earns trust' },
  { crewId: 'uhura',   section: 'The Narrative & How to Present It', focus: 'the through-line a hiring manager should remember; how to open and close the shared-screen walkthrough' },
];

const sysPrompt = (crewId, section, focus) => `${CREW_PERSONAS[crewId].baseSystemPromptSeed}

You are authoring ONE section of a project-summary presentation for a job interview shown on a SHARED SCREEN. Your section: "${section}". Focus: ${focus}. Write for a hiring manager / principal engineer — confident, concrete, NO Star Trek in-jokes, no jargon the audience won't know. Ground everything in the verified facts; do not invent.`;

const userPrompt = (section) => `Draft YOUR slide for the "${section}" section. Keep it slide-ready and tight.

${FACTS}

Respond EXACTLY as:

SLIDE_TITLE: [<= 6 words]
BULLETS:
- [concrete point]
- [concrete point]
- [concrete point]
CLIENT_VALUE: [one sentence: why a client benefits]
NOTES: [2-3 sentences of spoken speaker notes for this slide]`;

function extract(raw, key) {
  const m = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
  return m ? m[1].trim() : '';
}
function extractBullets(raw) {
  const block = raw.match(/BULLETS:\s*([\s\S]*?)(?=\nCLIENT_VALUE:|\nNOTES:|$)/);
  if (!block) return [];
  return block[1].split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean).slice(0, 5);
}

async function draftSection({ crewId, section, focus }) {
  const persona = CREW_PERSONAS[crewId];
  const r = await executePromptEngineCall(
    crewId,
    { loungeMode: 'true', loungeContext: sysPrompt(crewId, section, focus), loungePrompt: userPrompt(section) },
    'CREW-PRESENTATION',
    ['crew-presentation', `crew:${crewId}`],
  );
  const parts = [r.reasoning, ...r.findings, ...r.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(p => p.trim()))].join('\n').trim();
  const bullets = extractBullets(raw);
  return {
    crewId, owner: persona.fullName, role: persona.engineeringRole,
    section, title: extract(raw, 'SLIDE_TITLE') || section,
    bullets: bullets.length ? bullets : [raw.slice(0, 300)],
    clientValue: extract(raw, 'CLIENT_VALUE'),
    notes: extract(raw, 'NOTES') || raw,
    offFormat: bullets.length === 0,
  };
}

(async () => {
  const noStore = process.argv.includes('--no-store');
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const jobId = beginAsync(dir, { kind: 'presentation', label: 'crew project-summary deck (11 officers)', timeoutMs: 180_000 }, Date.now());

  console.log(`\n${'═'.repeat(78)}\nCREW PRESENTATION — full team drafting sections IN PARALLEL\n${'═'.repeat(78)}\n`);
  console.log(SECTIONS.map(s => `  • ${CREW_PERSONAS[s.crewId].fullName} → ${s.section}`).join('\n') + '\n');

  let done = 0;
  const results = await Promise.all(SECTIONS.map(s =>
    draftSection(s)
      .then(r => { done++; heartbeatAsync(dir, jobId, { progress: Math.round(done / SECTIONS.length * 100) }, Date.now());
        console.log(`  ✓ ${r.owner} — ${r.title}${r.offFormat ? ' ⚠️ off-format' : ''}`); return r; })
      .catch(e => { done++; console.log(`  ✗ ${CREW_PERSONAS[s.crewId].fullName} FAILED: ${e.message}`); return null; })
  ));
  endAsync(dir, jobId, 'done', Date.now());

  const sections = results.filter(Boolean);
  const outDir = 'docs/pitch/presentation';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/sections.json`, JSON.stringify(sections, null, 2) + '\n', 'utf8');
  console.log(`\n${'─'.repeat(78)}\n${sections.length}/${SECTIONS.length} sections drafted → ${outDir}/sections.json`);
  const off = sections.filter(s => s.offFormat).map(s => s.crewId);
  if (off.length) console.log(`⚠️  off-format (raw used): ${off.join(', ')}`);

  if (!noStore) {
    try {
      const obs = await storeObservationMemory({
        storyId: 'crew-presentation', source: 'mcp',
        transcript: { rounds: [{ title: 'Crew project-summary presentation', entries: sections.map(s => ({
          speakerId: s.crewId, position: 'support', statement: `${s.section}: ${s.title} — ${s.clientValue}`, evidence: s.bullets.slice(0, 3) })) }],
          consensusSummary: `Full 11-officer project-summary deck authored in parallel; ${sections.length} sections.`,
          unresolvedRisks: [], finalDecision: 'approved', actionItems: ['Assemble shared-screen deck + PDF from sections.json'] },
        tags: ['crew-presentation', 'deck', 'job-interview'],
      });
      console.log(`Stored to RAG: ${obs?.id ?? 'n/a'}`);
    } catch (e) { console.warn(`RAG store failed: ${e.message}`); }
  }
  console.log(`${'═'.repeat(78)}\n`);
  process.exit(0);
})();
