/**
 * Project introspection → crew-derived Aha! backlog.
 *
 * The crew introspects the actual project structure (workspace packages, top-level layout,
 * persistent project memory, recent git history) and the OpenRouter crew derives a proposed
 * Aha! backlog: epics → stories. Cost-optimized tiers (Data/Picard = quality, Riker = cheap).
 *
 * Output is a DRY-RUN backlog + the governed create plan (identity-verified executor + confirm).
 * It does NOT write to Aha!; pass the plan to the aha:create-feature flow (confirm:true) to commit.
 *
 * Run: zsh -ic 'npx tsx scripts/derive-aha-backlog.ts'   (or: pnpm run aha:derive-backlog)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { crewAhaModel, authorizeAhaWrite } from '../packages/mcp-server/src/lib/crew-aha-roles.js';

const ROOT = process.cwd();
const URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const RATES: Record<string, { i: number; o: number }> = { 'anthropic/claude-haiku-4.5': { i: 1, o: 5 }, 'anthropic/claude-sonnet-4.6': { i: 3, o: 15 } };
const cost = (m: string, i: number, o: number) => { const r = RATES[m] ?? { i: 1, o: 5 }; return i / 1e6 * r.i + o / 1e6 * r.o; };

function introspect(): string {
  const lines: string[] = [];
  try { const p = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')); lines.push(`Project: ${p.name} — ${p.description ?? ''}`); } catch { /* */ }
  try {
    const pkgs = readdirSync(join(ROOT, 'packages')).filter(d => { try { return statSync(join(ROOT, 'packages', d)).isDirectory(); } catch { return false; } });
    lines.push(`Packages: ${pkgs.join(', ')}`);
  } catch { /* */ }
  try {
    const top = readdirSync(ROOT).filter(d => !d.startsWith('.') && d !== 'node_modules' && (() => { try { return statSync(join(ROOT, d)).isDirectory(); } catch { return false; } })());
    lines.push(`Top-level dirs: ${top.join(', ')}`);
  } catch { /* */ }
  // Persistent project memory (high-signal: what the project is + recent capabilities).
  const memPath = join(process.env.HOME || '', '.claude/projects/-Users-bradygeorgen-Documents-workspace-story-agent/memory/MEMORY.md');
  if (existsSync(memPath)) { try { lines.push(`\nProject memory (index):\n${readFileSync(memPath, 'utf8').slice(0, 1500)}`); } catch { /* */ } }
  try { lines.push(`\nRecent commits:\n${execSync('git log --oneline -12', { cwd: ROOT }).toString()}`); } catch { /* */ }
  return lines.join('\n');
}

async function ask(system: string, user: string, model: string, maxTokens = 600) {
  const r = await fetch(`${URL}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], usage: { include: true } }),
  });
  const d: any = await r.json();
  return { text: (d.choices?.[0]?.message?.content || '').trim(), model: d.model, c: cost(model, d.usage?.prompt_tokens || 0, d.usage?.completion_tokens || 0) };
}

async function main() {
  if (!KEY) { console.error('No CREW_LLM_APPROVED_KEY'); process.exit(1); }
  const summary = introspect();
  console.log('═'.repeat(80) + '\nPROJECT INTROSPECTION (crew input)\n' + '═'.repeat(80) + '\n' + summary.slice(0, 1200) + '\n');

  let total = 0;
  // Data (architecture, quality): derive EPICS from the structure.
  const dataModel = crewAhaModel('data').model;
  const epics = await ask(
    'You are Commander Data (architecture). From the project introspection, identify 3-5 EPICS (major bodies of work) that represent this system. One line each: "EPIC: <name> — <1-sentence scope>".',
    summary, dataModel, 350);
  total += epics.c;
  console.log(`★ DATA epics (${dataModel.split('/').pop()}) ~$${epics.c.toFixed(4)}\n${epics.text}\n`);

  // Riker (implementation, cheap): derive STORIES under those epics.
  const rikerModel = crewAhaModel('riker').model;
  const stories = await ask(
    'You are Cmdr. Riker (implementation). For each epic below, propose 2-3 concrete STORIES (a developer could pick up each). Format: "EPIC <name>:" then "- STORY: <name> — <what/why>".',
    `Introspection:\n${summary}\n\nEpics:\n${epics.text}`, rikerModel, 600);
  total += stories.c;
  console.log(`  RIKER stories (${rikerModel.split('/').pop()}) ~$${stories.c.toFixed(4)}\n${stories.text}\n`);

  // Picard (executive, quality): synthesize into a clean JSON backlog.
  const picardModel = crewAhaModel('picard').model;
  const synth = await ask(
    'You are Captain Picard. Synthesize the epics + stories into a backlog. Reply ONLY with compact JSON: {"epics":[{"name":"...","stories":[{"name":"...","description":"..."}]}]} (names <= 80 chars).',
    `Epics:\n${epics.text}\n\nStories:\n${stories.text}`, picardModel, 900);
  total += synth.c;
  let backlog: any = {};
  try { backlog = JSON.parse(synth.text.replace(/```json|```/g, '').trim()); } catch { backlog = { epics: [], _raw: synth.text }; }

  const epicCount = backlog.epics?.length ?? 0;
  const storyCount = (backlog.epics ?? []).reduce((s: number, e: any) => s + (e.stories?.length ?? 0), 0);
  console.log('═'.repeat(80) + `\n[PICARD — DERIVED BACKLOG] ${epicCount} epics / ${storyCount} stories (${picardModel.split('/').pop()})\n` + '═'.repeat(80));
  console.log(JSON.stringify(backlog, null, 2));

  // Governed create plan (dry-run): identity-verified executor + confirm gate.
  const executor = 'riker';
  const authz = authorizeAhaWrite(executor, 'aha:create-feature');
  console.log('\n[GOVERNED CREATE PLAN — DRY RUN]');
  console.log(`  executor: ${executor} → ${authz.authorized ? '✅ ' : '⛔ '}${authz.reason}`);
  console.log(`  target: Aha! product (set prefix) → create a release per epic, then aha:create-feature per story with confirm:true`);
  console.log(`  NOT written. To commit: run each via the aha:create-feature flow (agentId=${executor}, confirm:true).`);
  console.log(`\n💰 derivation spend ≈ $${total.toFixed(4)}`);
}
main().catch(e => { console.error(e); process.exit(1); });
