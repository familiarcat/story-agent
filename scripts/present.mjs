import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREW_PERSONAS } from '../packages/mcp-server/dist/src/lib/crew-personas.js';
import { executePromptEngineCall } from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { beginAsync, heartbeatAsync, endAsync } from '../packages/shared/dist/src/async-status.js';
import { storeObservationMemory, getRelevantObservationMemories } from '../packages/shared/dist/src/db.js';
import { relinkPdf } from './lib/pdf-relink.mjs';

/**
 * present.mjs — the REUSABLE presentation system. Builds a crew-authored, shared-screen deck for
 * ANY scope: the whole system, a client, a project, or a single story.
 *
 *   node scripts/present.mjs --scope system
 *   node scripts/present.mjs --scope client  --name "Jonah" [--client jonah] [--brief brief.md]
 *   node scripts/present.mjs --scope project --name "PM Dashboard" --brief brief.md
 *   node scripts/present.mjs --scope story   --name "Aha branching" --brief brief.md
 *     [--title "…"] [--audience "…"] [--minutes 8] [--out docs/pitch/presentations/<slug>] [--no-store]
 *
 * Pipeline: resolve scope → gather grounded facts (built-in system capabilities + RAG recall for the
 * scope + optional --brief) → the full crew fans out IN PARALLEL, each officer drafting one section →
 * assemble a self-contained deck (scripts/lib/deck-template.html) → print a PDF. Wired into the
 * async-status registry for live feedback; stored to RAG. Runs on dist (node ESM).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');

const BASE_FACTS = `PLATFORM CAPABILITIES (verified — the system every scope is built on):
- Story Agent: a self-hosted autonomous coding assistant; an 11-agent crew on OpenRouter where the premium model only ORCHESTRATES and the cheap crew does the work.
- Model Context Protocol (open standard) — the same crew plugs into Claude Code, Cursor, Copilot.
- Quark routing: cheapest adequate model per task (multi-provider pool); Anthropic only tier-4.
- WorfGate: credential broker (secrets never logged) + green/yellow/red governor that auto-remediates risky ops.
- RAG memory (Supabase pgvector): recall→act→store; the system compounds; portable across AI tools.
- Control-lane: observable crew-vs-premium cost attribution; deliberations ~$0.002-0.003.
- Multi-tenant: firm→client→project→epic→story→task hierarchy with per-client policy + isolation.
- Honest caveats: shadow-test for full autonomy is a CRITERION not passed; cost figures per-deliberation; reference clients illustrative.`;

const DIAGRAMS = {
  control:`flowchart LR
  U([NL request]) --> MCP{{"Model Context Protocol<br/>Claude Code · Cursor · Copilot"}}
  MCP --> ORCH["Thin premium orchestrator"]
  ORCH -->|deliberate| PIPE["Crew Mission Pipeline"]
  ORCH -->|code| LOOP["agent-core loop"]
  PIPE --> QUARK["Quark routing<br/>cheapest adequate model"]
  LOOP --> QUARK
  QUARK --> OR[("OpenRouter<br/>DeepSeek·Llama·OpenAI·Anthropic")]
  LOOP -. every op .-> WG["WorfGate"]
  PIPE -. recall/store .-> RAG[("pgvector RAG")]`,
  lanes:`flowchart TB
  subgraph A["ANTHROPIC lane (thin)"]
    O["Orchestrate · verify"]
  end
  subgraph C["CREW lane (cheap OpenRouter — does the work)"]
    D["Deliberate · plan"] --> E["Read · edit · run"]
  end
  O -->|delegate token-heavy work| D
  E -->|result to verify| O`,
  routing:`flowchart TD
  T[Task] --> TIER{Capability tier?}
  TIER -->|routine| T2["llama / gpt-4o-mini"]
  TIER -->|advanced| T3["deepseek-chat"]
  TIER -->|frontier| T4["claude-sonnet"]
  T2 --> P[Cheapest adequate wins]
  T3 --> P
  T4 --> P`,
  loop:`flowchart LR
  P([Prompt]) --> R[Recall] --> A[Act on cheap crew] --> G[WorfGate governs] --> S[Store]
  S -. next prompt builds on it .-> P`,
};

/* Section presets per scope. Each entry: {crewId, section, focus, diagrams?}. */
const PRESETS = {
  system: [
    { crewId:'picard',  section:'Executive Summary & Vision', focus:'what the project IS and why it matters; end with a memorable one-liner' },
    { crewId:'data',    section:'Architecture', focus:'the control flow end to end', diagrams:['control'] },
    { crewId:'quark',   section:'Cost Model & ROI', focus:'thin premium + cheap crew; measured savings', diagrams:['lanes','routing'] },
    { crewId:'worf',    section:'Security & Governance', focus:'WorfGate broker + governor; audit trail' },
    { crewId:'geordi',  section:'Infrastructure & Deployment', focus:'Fargate/terraform/docker; multi-provider' },
    { crewId:'obrien',  section:'DevOps & Reliability', focus:'operability; async-status guardrail' },
    { crewId:'yar',     section:'Quality & Go-Live', focus:'tests; the shadow test as honest go/no-go' },
    { crewId:'troi',    section:'Client Value', focus:'cost you can see, governance, isolation, it compounds', diagrams:['loop'] },
    { crewId:'riker',   section:'Roadmap', focus:'crew-aware feature branches + Aha; async-viz follow-up' },
    { crewId:'crusher', section:'System Health & Honesty', focus:'what works vs known gaps; candor' },
    { crewId:'uhura',   section:'Narrative & Close', focus:'the through-line; how to close' },
  ],
  client: [
    { crewId:'picard',  section:'Executive Value', focus:'the outcome for THIS client, in business terms' },
    { crewId:'troi',    section:'What You Get', focus:'the client experience + concrete benefits' },
    { crewId:'data',    section:'Solution Fit', focus:'how the platform maps to this client’s needs (architecture at a glance)', diagrams:['control'] },
    { crewId:'worf',    section:'Security & Compliance', focus:'governance, isolation, audit — why it is safe for this client' },
    { crewId:'quark',   section:'Cost & ROI', focus:'the cost argument for this client', diagrams:['lanes'] },
    { crewId:'riker',   section:'Rollout & Roadmap', focus:'how we deliver + what comes next for this client' },
  ],
  project: [
    { crewId:'picard',  section:'Project Overview', focus:'goal, scope, and why now' },
    { crewId:'data',    section:'Architecture & Approach', focus:'the technical approach for this project', diagrams:['control'] },
    { crewId:'riker',   section:'Plan & Milestones', focus:'delivery plan, sequencing, ownership' },
    { crewId:'yar',     section:'Quality & Acceptance', focus:'how we know it is done; test/acceptance strategy' },
    { crewId:'geordi',  section:'Infrastructure', focus:'how it runs + deploys' },
    { crewId:'quark',   section:'Cost & Efficiency', focus:'the cost/effort picture', diagrams:['routing'] },
  ],
  story: [
    { crewId:'picard',  section:'Problem & Goal', focus:'the user problem this story solves and the intended outcome' },
    { crewId:'data',    section:'Approach', focus:'the technical approach' },
    { crewId:'riker',   section:'Implementation Plan', focus:'the concrete steps to build it' },
    { crewId:'yar',     section:'Acceptance Criteria', focus:'the definition of done + how it is verified' },
    { crewId:'troi',    section:'User Impact', focus:'who benefits and how it feels to use' },
  ],
};

// ── args ──
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const eq = argv.find(a => a.startsWith(`--${k}=`)); return eq ? eq.split('=').slice(1).join('=') : d; };
const has = (k) => argv.includes(`--${k}`);

const kind = (arg('scope', 'system')).toLowerCase();
if (!PRESETS[kind]) { console.error(`Unknown --scope "${kind}". Use: ${Object.keys(PRESETS).join(' | ')}`); process.exit(1); }
const name = arg('name', kind === 'system' ? 'Story Agent' : '');
const id = arg('id', '');
const clientId = arg('client', null);
const audience = arg('audience', kind === 'system' ? 'hiring manager / principal engineer'
  : kind === 'client' ? 'client stakeholders' : 'engineering + delivery stakeholders');
const minutes = Number(arg('minutes', kind === 'system' ? 10 : kind === 'client' ? 8 : 7)) || 8;
const slug = (arg('slug', (kind === 'system' ? 'story-agent-summary' : `${kind}-${(name||id||'untitled')}`)))
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const outDir = arg('out', `docs/pitch/presentations/${slug}`);
const title = arg('title', kind === 'system' ? 'Story Agent — Project Summary'
  : kind === 'client' ? `${name} — Story Agent Proposal`
  : kind === 'project' ? `${name} — Project Overview`
  : `${name} — Story Walkthrough`);
const briefFile = arg('brief', null);
const noStore = has('no-store');

// ── grounded facts ──
async function gatherFacts() {
  const parts = [BASE_FACTS];
  if (briefFile) { try { parts.push(`SCOPE BRIEF (${name || id}):\n${readFileSync(briefFile, 'utf8').trim()}`); } catch (e) { console.warn(`brief unreadable: ${e.message}`); } }
  if (kind !== 'system') {
    try {
      const mems = await getRelevantObservationMemories({ queryText: `${kind} ${name} ${id}`.trim(), clientId, limit: 6 });
      const lines = mems.map(m => (m.transcript?.consensusSummary || (m.transcriptText || '').slice(0, 220)).replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (lines.length) parts.push(`RELEVANT RAG MEMORY for this scope:\n${lines.map(l => `- ${l}`).join('\n')}`);
    } catch (e) { console.warn(`RAG recall skipped: ${e.message}`); }
  }
  if (kind !== 'system' && !briefFile) parts.push(`(No brief supplied — grounding on platform capabilities + any RAG memory for "${name || id}". Pass --brief <file> for scope-specific detail.)`);
  return parts.join('\n\n');
}

// ── crew drafting (parallel) ──
const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function clean(s) { return String(s || '').replace(/\*\*/g, '').replace(/^[-*•\s]+/, '').trim(); }
function extract(raw, key) { const m = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`)); return m ? clean(m[1]) : ''; }
function extractBullets(raw) { const b = raw.match(/BULLETS:\s*([\s\S]*?)(?=\nCLIENT_VALUE:|\nNOTES:|$)/); if (!b) return [];
  return b[1].split('\n').map(l => clean(l)).filter(x => x && !/^BULLETS/i.test(x)).slice(0, 4); }

const sysPrompt = (p) => `${CREW_PERSONAS[p.crewId].baseSystemPromptSeed}

You are authoring ONE slide for a project presentation shown on a SHARED SCREEN to: ${audience}. Scope: ${kind.toUpperCase()} "${name || id}". Your section: "${p.section}". Focus: ${p.focus}. Confident, concrete, NO Star Trek in-jokes, no unexplained jargon. Ground strictly in the facts given; do not invent numbers.`;
const userPrompt = (p, facts) => `Draft YOUR "${p.section}" slide. Tight and slide-ready.

${facts}

Respond EXACTLY as:
SLIDE_TITLE: [<= 6 words, plain text, no markdown]
BULLETS:
- [concrete point]
- [concrete point]
- [concrete point]
CLIENT_VALUE: [one sentence]
NOTES: [2-3 sentences of spoken speaker notes]`;

async function draft(p, facts) {
  const persona = CREW_PERSONAS[p.crewId];
  const r = await executePromptEngineCall(p.crewId,
    { loungeMode: 'true', loungeContext: sysPrompt(p), loungePrompt: userPrompt(p, facts) },
    'PRESENT', ['present', kind, `crew:${p.crewId}`]);
  const parts = [r.reasoning, ...r.findings, ...r.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(x => x.trim()))].join('\n').trim();
  const bullets = extractBullets(raw);
  return {
    crewId: p.crewId, owner: persona.fullName, role: persona.engineeringRole, section: p.section,
    diagrams: p.diagrams || [],
    title: clean(extract(raw, 'SLIDE_TITLE')) || p.section,
    bullets: bullets.length ? bullets : [clean(raw).slice(0, 260)],
    value: extract(raw, 'CLIENT_VALUE'),
    notes: extract(raw, 'NOTES') || clean(raw),
  };
}

// ── slide assembly ──
const diagramHTML = (key, hint) => `<div class="diagram-wrap"><div class="diagram"><pre class="mermaid" data-key="${key}">${DIAGRAMS[key]}</pre></div><div class="dhint">↕ scroll to zoom · drag to pan · reset (Z)${hint ? ` — ${hint}` : ''}</div></div>`;
function sectionSlide(s, n, total) {
  let extra = '';
  const ds = (s.diagrams || []).filter(k => DIAGRAMS[k]);
  if (ds.length === 1) extra = diagramHTML(ds[0]);
  else if (ds.length >= 2) extra = `<div class="cols">${ds.slice(0, 2).map(k => diagramHTML(k)).join('')}</div>`;
  const html = `<div class="kicker"><span>Section ${n} / ${total}</span><span class="owner">${esc(s.owner)} · ${esc(s.role)}</span></div>
    <h2>${esc(s.title)}</h2>
    <ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
    ${s.value ? `<div class="value"><b>${kind === 'client' ? 'Value' : 'Why it matters'}:</b> ${esc(s.value)}</div>` : ''}
    ${extra}`;
  return [html, `<b>${esc(s.owner)}:</b> ${esc(s.notes)}`];
}

(async () => {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const jobId = beginAsync(dir, { kind: 'presentation', label: `present --scope ${kind} "${name || id}"`, timeoutMs: 180_000 }, Date.now());
  console.log(`\n${'═'.repeat(78)}\nPRESENT — ${kind.toUpperCase()} · "${name || id}" → ${outDir}\n${'═'.repeat(78)}`);

  const facts = await gatherFacts();
  const preset = PRESETS[kind];
  console.log(`Crew drafting ${preset.length} sections in parallel:\n` + preset.map(p => `  • ${CREW_PERSONAS[p.crewId].fullName} → ${p.section}`).join('\n') + '\n');

  let done = 0;
  const sections = (await Promise.all(preset.map(p =>
    draft(p, facts)
      .then(s => { done++; heartbeatAsync(dir, jobId, { progress: Math.round(done / preset.length * 100) }, Date.now()); console.log(`  ✓ ${s.owner} — ${s.title}`); return s; })
      .catch(e => { done++; console.log(`  ✗ ${CREW_PERSONAS[p.crewId].fullName} FAILED: ${e.message}`); return null; })
  ))).filter(Boolean);
  endAsync(dir, jobId, 'done', Date.now());

  // slides: title + agenda + sections + close
  const total = sections.length;
  const SLIDES = [];
  SLIDES.push([`<div class="kicker"><span>${esc(kind)} summary · authored by the crew</span></div>
    <h1>${esc(title)}</h1>
    <p class="lead">Prepared for <b>${esc(audience)}</b>.</p>
    <p class="fine">Drafted in parallel by ${total} crew officers on cost-optimized models, grounded in verified facts.</p>`,
    `Open: introduce ${esc(name || 'the project')} to ${esc(audience)}. Timer is set to ${minutes} minutes (press T).`]);
  SLIDES.push([`<div class="kicker"><span>Agenda</span></div><h2>What we'll cover</h2>
    <ul class="agenda">${sections.map((s, i) => `<li>${i + 1} · ${esc(s.section)} — <b>${esc(s.owner)}</b></li>`).join('')}</ul>`,
    `~${minutes} minutes. Move faster on sections the audience isn't probing.`]);
  sections.forEach((s, i) => SLIDES.push(sectionSlide(s, i + 1, total)));
  SLIDES.push([`<div class="kicker"><span>Close</span></div>
    <p class="quote">Keep the expensive model thin; make the cost of every decision visible.</p>
    <p class="lead">${kind === 'system' ? 'It runs today; the bar for full autonomy is defined and honest.' : `${esc(name)} — delivered on a governed, cost-attributed, self-improving platform.`}</p>
    <p class="fine">Grounded in the codebase; caveats kept visible.</p>`,
    `Close on the through-line and the memorable line. Invite questions.`]);

  // render from template
  const template = readFileSync(join(HERE, 'lib', 'deck-template.html'), 'utf8');
  const vendorRel = relative(join(REPO, outDir), join(REPO, 'docs/pitch/presentation/vendor')).replace(/\\/g, '/') || 'vendor';
  const html = template
    .replace('__TITLE__', esc(title))
    .replace(/__VENDOR__/g, vendorRel)
    .replace('/*__SLIDES__*/ []', JSON.stringify(SLIDES))
    .replace('/*__SECONDS__*/ 600', String(minutes * 60));

  mkdirSync(join(REPO, outDir), { recursive: true });
  const outHtml = join(REPO, outDir, 'index.html');
  writeFileSync(outHtml, html, 'utf8');
  writeFileSync(join(REPO, outDir, 'sections.json'), JSON.stringify({ scope: kind, name, id, title, audience, minutes, sections }, null, 2) + '\n');
  console.log(`\n${'─'.repeat(78)}\nDeck: ${outDir}/index.html  (${total} sections, ${SLIDES.length} slides)`);

  // PDF via headless Chrome
  const pdf = join(REPO, outDir, 'deck.pdf');
  try {
    execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ['--headless', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=9000', `--print-to-pdf=${pdf}`, `file://${outHtml}`],
      { stdio: 'ignore' });
    relinkPdf(pdf); // WorfGate: strip absolute file:// paths Chrome bakes into link annotations
    console.log(`PDF:  ${outDir}/deck.pdf`);
  } catch (e) { console.warn(`PDF export skipped: ${e.message}`); }

  if (!noStore) {
    try {
      const obs = await storeObservationMemory({ storyId: `present-${slug}`, source: 'mcp',
        transcript: { rounds: [{ title: `Presentation: ${title}`, entries: sections.map(s => ({ speakerId: s.crewId, position: 'support', statement: `${s.section}: ${s.title} — ${s.value}`, evidence: s.bullets.slice(0, 3) })) }],
          consensusSummary: `Crew-authored ${kind} presentation for "${name || id}" (${total} sections).`, unresolvedRisks: [], finalDecision: 'approved', actionItems: [`Present ${outDir}/index.html`] },
        tags: ['present', 'deck', kind, slug] });
      console.log(`Stored to RAG: ${obs?.id ?? 'n/a'}`);
    } catch (e) { console.warn(`RAG store failed: ${e.message}`); }
  }
  console.log(`${'═'.repeat(78)}\nOpen: file://${outHtml}\n`);
  process.exit(0);
})();
