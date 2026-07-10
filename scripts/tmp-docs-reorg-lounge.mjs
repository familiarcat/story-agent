// Temp lounge: docs reorganization (DOCS-REORG). Deleted after run.
import * as dbMod from '../packages/shared/dist/src/db.js';
import * as engineMod from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { readFileSync } from 'node:fs';

const db = dbMod.default ?? dbMod;
const engine = engineMod.default ?? engineMod;
const { getRelevantObservationMemories, storeObservationMemory } = db;
const { executePromptEngineCall } = engine;

const recall = await getRelevantObservationMemories('documentation organization docs folder structure RAG knowledge', 4);
const recallText = (recall ?? []).map((m) => `- ${String(m.content ?? m.observation ?? '').slice(0, 250)}`).join('\n');

const inventory = readFileSync('/tmp/docs-inventory.txt', 'utf8');

const grounding = `
MISSION DOCS-REORG: ~46 stray .md files sit at the top level of docs/. Reorganize: combine where content overlaps, move into a coherent folder structure. The crew must debate VARIATIONS of combining/moving before ruling.

EXISTING SUBFOLDERS: architecture, automation, crew, crew/security, design, domain-driven, knowledge, observation-lounge, phases, pitch, prompts, proposals, runbooks, security, setup, status (status/completions, status/sessions, status/todos), templates, testing, vector.

TOP-LEVEL FILE INVENTORY (name | lines | inbound refs from rest of repo | title):
${inventory}

HARD CONSTRAINTS:
- refs:N > 0 means N other files (CLAUDE.md, code, scripts, other docs) link to it — every move requires updating those references (the orchestrator does this mechanically; still prefer FEWER moves of high-ref files unless the win is real).
- docs/README.md stays as the index and must be rewritten to reflect the final structure.
- git mv (history preserved). Merges only where content GENUINELY overlaps — a merge rewrites two docs into one coherent doc, so it costs more than a move.
- ALL-CAPS files are mostly historical status/completion reports — likely docs/status/completions candidates rather than merges.
- CLAUDE.md links these (must stay working after reference updates): aha-nomenclature, claude-code-mcp, crew-live-feedback-and-approvals, crew-memory-recall-protocol, session-bootstrap, embeddings, innovation-lounge, shadow-test-story-agent-primary, system-test-guide, docs/observation-lounge/*.

PRIOR MEMORIES:
${recallText || '(none)'}`;

async function ask(id, prompt, tag) {
  const res = await executePromptEngineCall(
    id,
    { loungeMode: 'true', loungeContext: grounding, loungePrompt: prompt },
    'DOCS-REORG',
    ['docs-reorg', 'observation-lounge', tag],
  );
  const text = typeof res === 'string' ? res : res?.content ?? res?.findings?.join('\n') ?? JSON.stringify(res);
  console.log(`\n===== ${id.toUpperCase()} =====\n${text}`);
  return text;
}

const [dataProposal, troiProposal] = await Promise.all([
  ask('data', 'Propose STRUCTURE VARIANT A from pure information-architecture logic: for EVERY top-level file, assign destination folder (existing or at most 1-2 new) and name the merges (file pairs/groups with genuinely overlapping content). Use terse lines "file -> dest" and "A + B -> dest/name.md". ≤350 words.', 'data-variant'),
  ask('troi', 'Propose STRUCTURE VARIANT B optimizing for a NEWCOMER finding answers fast (navigation UX): group by reader intent (getting-started / how-it-works / operations / history). For EVERY top-level file assign a destination; name merges. Terse "file -> dest" lines. ≤350 words.', 'troi-variant'),
]);

const critiqueCtx = `VARIANT A (Data):\n${dataProposal}\n\nVARIANT B (Troi):\n${troiProposal}`;
const [geordi, quark] = await Promise.all([
  ask('geordi', `${critiqueCtx}\nCritique both for REFERENCE INTEGRITY and maintenance: which moves of high-ref files are worth it, which merges risk losing load-bearing content? Which variant (or hybrid) do you back? ≤200 words.`, 'geordi-critique'),
  ask('quark', `${critiqueCtx}\nCritique both for COST: count moves+merges each; where is churn not buying findability? Which variant (or hybrid) do you back? ≤150 words.`, 'quark-critique'),
]);

const ruling = await ask(
  'riker',
  `VARIANT A (Data):\n${dataProposal}\n\nVARIANT B (Troi):\n${troiProposal}\n\nGEORDI: ${geordi}\n\nQUARK: ${quark}\n\nRule the FINAL plan. Output ONLY directive lines, one per file, EXACT formats:\nMOVE docs/<file>.md -> docs/<dir>/<file>.md\nMERGE docs/<a>.md + docs/<b>.md -> docs/<dir>/<name>.md\nKEEP docs/<file>.md\nEvery one of the ~46 top-level files must appear exactly once. docs/README.md is KEEP. New dirs allowed only if a variant proposed them.`,
  'riker-ruling',
);

await storeObservationMemory(
  `DOCS-REORG ruling (Riker, after Data/Troi variants + Geordi/Quark critiques): ${ruling}`,
  ['docs-reorg', 'ruling', 'documentation'],
);
console.log('\nSTORED');
process.exit(0);
