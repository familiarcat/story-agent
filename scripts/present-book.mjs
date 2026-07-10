import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREW_PERSONAS } from '../packages/mcp-server/dist/src/lib/crew-personas.js';
import { executePromptEngineCall } from '../packages/mcp-server/dist/src/lib/prompt-engine.js';
import { assembleAndOptimize } from '../packages/mcp-server/dist/src/lib/crew-team-assembly.js';
import { beginAsync, heartbeatAsync, endAsync } from '../packages/shared/dist/src/async-status.js';
import { storeObservationMemory } from '../packages/shared/dist/src/db.js';
import { relinkPdf } from './lib/pdf-relink.mjs';

/**
 * present-book.mjs — the system pitches ITSELF, top level down, as an interlinked "pitch book".
 *
 * Flow (as directed): RIKER assembles a team per pillar via assembleAndOptimize → all teams COMMIT
 * (a barrier: every pillar's crew is finalized before any drafting) → then the whole set of
 * (pillar × officer) drafts DYNAMICALLY SPLITS into parallel executions (one flat Promise.all) on
 * their Quark-assigned OpenRouter models. Output: a top-level cover deck + one deck per pillar,
 * interlinked in BOTH HTML and PDF. Wired into async-status; stored to RAG. Runs on dist.
 *
 *   node scripts/present-book.mjs [--minutes 3] [--no-store]
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const BOOK = 'docs/pitch/pitch-book';
const VENDOR_ABS = join(REPO, 'docs/pitch/presentation/vendor');

const FACTS = `PLATFORM FACTS (verified — ground strictly in these; invent nothing):
- Story Agent: self-hosted autonomous coding assistant; 11-agent crew on OpenRouter. Premium model ORCHESTRATES only; the cheap crew does the work. MCP (open standard) → plugs into Claude Code/Cursor/Copilot.
- Scale: 4 packages (mcp-server, shared, ui/Next.js, vscode-extension); ~61k LOC TS; ~150 MCP tools; 41 skill theories; AWS Fargate.
- Quark routing: cheapest adequate model per task; Anthropic only tier-4. WorfGate: credential broker (secrets never logged) + green/yellow/red auto-remediating governor. RAG (pgvector): recall→act→store, compounds, portable. Control-lane: cost attribution, ~$0.002-0.003/deliberation. async-status: live progress + timeout guardrail.
- Honest: shadow-test for full autonomy is a CRITERION not passed; cost figures per-deliberation; reference clients illustrative.`;

const DIAGRAMS = {
  control:`flowchart LR
  U([NL request]) --> MCP{{"Model Context Protocol"}}
  MCP --> ORCH["Thin premium orchestrator"]
  ORCH -->|deliberate| PIPE["Crew Mission Pipeline"]
  ORCH -->|code| LOOP["agent-core loop"]
  PIPE --> QUARK["Quark routing"]
  LOOP --> QUARK
  QUARK --> OR[("OpenRouter")]
  LOOP -. every op .-> WG["WorfGate"]
  PIPE -. recall/store .-> RAG[("pgvector RAG")]`,
  lanes:`flowchart TB
  subgraph A["ANTHROPIC (thin)"]
    O["Orchestrate · verify"]
  end
  subgraph C["CREW (cheap OpenRouter — does the work)"]
    D["Deliberate"] --> E["Read · edit · run"]
  end
  O -->|delegate| D
  E -->|verify| O`,
  routing:`flowchart TD
  T[Task] --> Q{tier?}
  Q -->|routine| A["llama / gpt-4o-mini"]
  Q -->|advanced| B["deepseek"]
  Q -->|frontier| C["claude-sonnet"]
  A --> P[Cheapest adequate wins]
  B --> P
  C --> P`,
  loop:`flowchart LR
  P([Prompt]) --> R[Recall] --> Ac[Act on cheap crew] --> G[WorfGate] --> S[Store]
  S -. next prompt builds on it .-> P`,
};

/* The system's top-down pillars. `brief` is what Riker assembles a team from (keyword-rich). */
const PILLARS = [
  { slug:'orchestration', title:'Orchestration & the Crew', diagrams:['control'],
    brief:'crew orchestration mission pipeline deliberation, agent-core implement build execute code, plan then execute, command strategy' },
  { slug:'cost-routing', title:'Cost & Model Routing', diagrams:['lanes','routing'],
    brief:'cost budget optimize spend ROI value model routing cheapest provider quark finance' },
  { slug:'security', title:'Security & Governance', diagrams:[],
    brief:'security auth permission secret credential governance audit rls access worfgate' },
  { slug:'memory', title:'Memory & Learning', diagrams:['loop'],
    brief:'memory RAG recall embeddings architecture data model consistency health monitor reliability' },
  { slug:'delivery', title:'Delivery & Project Management', diagrams:[],
    brief:'aha story feature release sprint stakeholder client user experience delivery roadmap' },
  { slug:'infra-ops', title:'Infrastructure & Operations', diagrams:[],
    brief:'infrastructure deploy fargate terraform docker aws ops ci cd release runbook async status monitoring' },
];

const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
const clean = (s) => String(s||'').replace(/\*\*/g,'').replace(/^[-*•\s]+/,'').trim();
const extract = (raw,k) => { const m = raw.match(new RegExp(`${k}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`)); return m?clean(m[1]):''; };
const bulletsOf = (raw) => { const b = raw.match(/BULLETS:\s*([\s\S]*?)(?=\nCLIENT_VALUE:|\nNOTES:|$)/); if(!b) return []; return b[1].split('\n').map(clean).filter(x=>x&&!/^BULLETS/i.test(x)).slice(0,4); };

async function draft(pillar, officer) {
  const p = CREW_PERSONAS[officer.crewId];
  const sys = `${p.baseSystemPromptSeed}

You are on the team Riker assembled for the "${pillar.title}" pillar of the Story Agent platform. Author YOUR slide — your domain's angle on this pillar — for a shared-screen technical pitch. Confident, concrete, no Star Trek in-jokes, ground strictly in the facts.`;
  const user = `Draft your "${pillar.title}" slide (your ${officer.domain} angle).

${FACTS}

Respond EXACTLY as:
SLIDE_TITLE: [<= 6 words, plain text]
BULLETS:
- [concrete point]
- [concrete point]
- [concrete point]
CLIENT_VALUE: [one sentence]
NOTES: [2-3 sentences speaker notes]`;
  const r = await executePromptEngineCall(officer.crewId,
    { loungeMode:'true', loungeContext:sys, loungePrompt:user }, 'PRESENT-BOOK', ['present-book', pillar.slug, `crew:${officer.crewId}`]);
  const parts = [r.reasoning, ...r.findings, ...r.recommendations].filter(Boolean);
  const raw = [...new Set(parts.map(x=>x.trim()))].join('\n').trim();
  const b = bulletsOf(raw);
  return { crewId:officer.crewId, owner:p.fullName, role:officer.domain, model:officer.model,
    title:clean(extract(raw,'SLIDE_TITLE'))||`${p.fullName}'s view`, bullets:b.length?b:[clean(raw).slice(0,240)],
    value:extract(raw,'CLIENT_VALUE'), notes:extract(raw,'NOTES')||clean(raw) };
}

const diagramHTML = (key) => `<div class="diagram-wrap"><div class="diagram"><pre class="mermaid" data-key="${key}">${DIAGRAMS[key]}</pre></div><div class="dhint">↕ scroll to zoom · drag to pan · reset (Z)</div></div>`;

function renderDeck(outAbs, title, minutes, SLIDES) {
  const template = readFileSync(join(HERE,'lib','deck-template.html'),'utf8');
  const vendorRel = (relative(dirname(outAbs), VENDOR_ABS) || 'vendor').replace(/\\/g,'/');
  const html = template.replace('__TITLE__', esc(title)).replace(/__VENDOR__/g, vendorRel)
    .replace('/*__SLIDES__*/ []', JSON.stringify(SLIDES)).replace('/*__SECONDS__*/ 600', String(minutes*60));
  mkdirSync(dirname(outAbs), { recursive:true });
  writeFileSync(outAbs, html, 'utf8');
  try {
    const pdfPath = outAbs.replace(/index\.html$/,'deck.pdf');
    execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ['--headless','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=9000',`--print-to-pdf=${pdfPath}`,`file://${outAbs}`], { stdio:'ignore' });
    relinkPdf(pdfPath); // WorfGate: strip absolute file:// paths Chrome bakes into link annotations
  } catch (e) { console.warn(`  PDF skipped for ${title}: ${e.message}`); }
}

(async () => {
  const minutes = Number((process.argv.find(a=>a.startsWith('--minutes='))||'').split('=')[1] || 3) || 3;
  const noStore = process.argv.includes('--no-store');
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const jobId = beginAsync(dir, { kind:'pitch-book', label:`system self-pitch — ${PILLARS.length} pillars`, timeoutMs:240_000 }, Date.now());

  console.log(`\n${'═'.repeat(78)}\nPITCH BOOK — the system pitches itself, top level down\n${'═'.repeat(78)}`);

  // ── PHASE A · RIKER ASSEMBLES (barrier: all pillar teams commit before any drafting) ──
  console.log(`\n[RIKER] assembling a team per pillar …`);
  const assembled = PILLARS.map(pillar => {
    const plan = assembleAndOptimize(pillar.brief, 3);
    const team = plan.team.slice(0, 4); // cap for deck sanity
    console.log(`  • ${pillar.title}: ${team.map(t=>`${t.crewId}(${t.model.split('/').pop()})`).join(', ')}`);
    return { pillar, team };
  });
  const totalDrafts = assembled.reduce((n,a)=>n+a.team.length,0);
  console.log(`[RIKER] ${PILLARS.length} teams committed · ${totalDrafts} officer-sections. Splitting into parallel execution.\n`);

  // ── PHASE B · DYNAMIC PARALLEL SPLIT (one flat Promise.all across all pillar×officer drafts) ──
  const flat = assembled.flatMap(({pillar,team}) => team.map(officer => ({pillar,officer})));
  let done = 0;
  const drafted = await Promise.all(flat.map(({pillar,officer}) =>
    draft(pillar, officer)
      .then(s => { done++; heartbeatAsync(dir, jobId, {progress:Math.round(done/flat.length*100)}, Date.now());
        console.log(`  ✓ [${pillar.slug}] ${s.owner} — ${s.title}`); return {pillarSlug:pillar.slug, ...s}; })
      .catch(e => { done++; console.log(`  ✗ [${pillar.slug}] ${officer.crewId} FAILED: ${e.message}`); return null; })
  ));
  endAsync(dir, jobId, 'done', Date.now());
  const bySlug = new Map(PILLARS.map(p=>[p.slug,[]]));
  for (const d of drafted.filter(Boolean)) bySlug.get(d.pillarSlug).push(d);

  // ── ASSEMBLE INTERLINKED DECKS ──
  // Pillar decks (L1). Each links back to the book cover in both HTML and PDF.
  for (const pillar of PILLARS) {
    const secs = bySlug.get(pillar.slug);
    const SLIDES = [];
    SLIDES.push([`<div class="kicker"><span>Story Agent · Pillar</span></div><h1>${esc(pillar.title)}</h1>
      <p class="lead">How this pillar works and why it matters.</p>
      <p class="fine">Team assembled by Riker: ${esc(secs.map(s=>s.owner).join(', ')||'—')}.</p>
      <p class="fine"><a href="../index.html">↑ Story Agent overview (HTML)</a> · <a href="../deck.pdf">↑ overview (PDF)</a></p>`,
      `This is the "${pillar.title}" pillar. Walk the sections, then return to the overview.`]);
    if (pillar.diagrams[0]) SLIDES.push([`<div class="kicker"><span>${esc(pillar.title)}</span></div><h2>At a glance</h2>${pillar.diagrams.length>=2?`<div class="cols">${pillar.diagrams.slice(0,2).map(diagramHTML).join('')}</div>`:diagramHTML(pillar.diagrams[0])}`, `Diagram for ${pillar.title}. Zoom/pan live during Q&A.`]);
    secs.forEach((s,i)=>SLIDES.push([`<div class="kicker"><span>${i+1} / ${secs.length}</span><span class="owner">${esc(s.owner)} · ${esc(s.role)}</span></div>
      <h2>${esc(s.title)}</h2><ul>${s.bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>
      ${s.value?`<div class="value"><b>Why it matters:</b> ${esc(s.value)}</div>`:''}`, `<b>${esc(s.owner)}:</b> ${esc(s.notes)}`]));
    SLIDES.push([`<div class="kicker"><span>End of pillar</span></div><h2>${esc(pillar.title)} — recap</h2>
      <ul>${secs.map(s=>`<li><b>${esc(s.owner)}:</b> ${esc(s.title)}</li>`).join('')}</ul>
      <p class="fine"><a href="../index.html">↑ Back to Story Agent overview (HTML)</a> · <a href="../deck.pdf">↑ overview (PDF)</a></p>`,
      `Recap, then return to the book cover to pick the next pillar.`]);
    renderDeck(join(REPO, BOOK, pillar.slug, 'index.html'), `Story Agent — ${pillar.title}`, minutes, SLIDES);
    console.log(`  → deck: ${BOOK}/${pillar.slug}/index.html`);
  }

  // Cover / index deck (L0): headline + top-down directory linking to every pillar (HTML + PDF).
  const COVER = [];
  COVER.push([`<div class="kicker"><span>Interlinked pitch book · authored by the crew</span></div>
    <h1>Story&nbsp;Agent</h1>
    <p class="lead">An 11-agent crew that keeps the expensive model <span class="big accent">thin</span> — pitched from the top level down.</p>
    <p class="fine">Riker assembled a team per pillar; the teams committed, then split into parallel execution on cost-optimized OpenRouter models.</p>`,
    `Open at the top: the platform in one line, then descend into each pillar. Timer set to ${minutes} min per deck.`]);
  COVER.push([`<div class="kicker"><span>The system, top down</span></div><h2>How it works, in one picture</h2>${diagramHTML('control')}`,
    `The whole control flow. Each pillar below zooms into one part of this.`]);
  COVER.push([`<div class="kicker"><span>Contents</span></div><h2>Pillars — pick a thread</h2>
    <ul class="agenda">${PILLARS.map((p,i)=>`<li>${i+1} · <b>${esc(p.title)}</b> — <a href="${p.slug}/index.html">HTML</a> · <a href="${p.slug}/deck.pdf">PDF</a></li>`).join('')}</ul>
    <p class="fine">Each pillar is its own crew-authored deck; links open the drill-down. In the PDF, the PDF links open the sibling pillar PDFs.</p>`,
    `This is the directory. On a shared screen, click a pillar to drill in; the pillar deck links back here.`]);
  COVER.push([`<div class="kicker"><span>Close</span></div>
    <p class="quote">Keep the expensive model thin; make the cost of every decision visible.</p>
    <p class="lead">It runs today; the bar for full autonomy is defined and honest.</p>`,
    `Close on the through-line. The pillars back the claim up in depth.`]);
  renderDeck(join(REPO, BOOK, 'index.html'), 'Story Agent — Pitch Book', minutes, COVER);
  console.log(`  → cover: ${BOOK}/index.html`);

  if (!noStore) {
    try {
      const obs = await storeObservationMemory({ storyId:'pitch-book', source:'mcp',
        transcript:{ rounds:[{ title:'System self-pitch (top-down pitch book)', entries: drafted.filter(Boolean).map(s=>({ speakerId:s.crewId, position:'support', statement:`[${s.pillarSlug}] ${s.title} — ${s.value}`, evidence:s.bullets.slice(0,2) })) }],
          consensusSummary:`Interlinked top-down pitch book: cover + ${PILLARS.length} pillar decks, Riker-assembled teams, ${totalDrafts} sections drafted in parallel.`, unresolvedRisks:[], finalDecision:'approved', actionItems:[`Open ${BOOK}/index.html`] },
        tags:['pitch-book','present','system','hierarchical'] });
      console.log(`Stored to RAG: ${obs?.id ?? 'n/a'}`);
    } catch (e) { console.warn(`RAG store failed: ${e.message}`); }
  }
  console.log(`\n${'═'.repeat(78)}\nPitch book: file://${join(REPO, BOOK, 'index.html')}\n${'═'.repeat(78)}\n`);
  process.exit(0);
})();
