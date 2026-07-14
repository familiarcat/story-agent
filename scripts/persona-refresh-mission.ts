import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { quarkSelectModel, crewBaseTier } from '../packages/mcp-server/src/lib/crew-team-assembly.js';
import { getPersona, type CrewId } from '../packages/mcp-server/src/lib/crew-personas.js';
import { storeCrewPersonalMemory, storeObservationMemory, embeddingSource } from '../packages/shared/src/db.js';

/**
 * Persona self-refresh: after scraping each crew member's canonical Memory Alpha page, EACH member
 * reflects self-referentially (their own Quark-selected model) and writes an enriched persona to cloud
 * RAG — augmenting (not overwriting) the code-level CanonicalPersona anchor. Direct OpenRouter
 * completion (captures the prose; the prompt-engine returns structured findings, not free text).
 */
const ALL: CrewId[] = ['picard', 'data', 'worf', 'riker', 'geordi', 'obrien', 'yar', 'troi', 'crusher', 'uhura', 'quark'];
const scraped: Record<string, { title: string; chars?: number; digest?: string }> = JSON.parse(readFileSync('/tmp/ma_personas.json', 'utf8'));

const OR_URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const OR_KEY = process.env.CREW_LLM_APPROVED_KEY || '';

async function complete(model: string, system: string, user: string): Promise<string> {
  const body: any = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 500, temperature: 0.7 };
  const res = await fetch(`${OR_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json: any = await res.json();
  return String(json.choices?.[0]?.message?.content ?? '').trim();
}

(async () => {
  if (!OR_KEY) { console.error('CREW_LLM_APPROVED_KEY not set'); process.exit(1); }
  const results: { crewId: CrewId; ok: boolean; chars: number; model: string; preview: string }[] = [];

  for (const crewId of ALL) {
    const p = getPersona(crewId);
    const digest = scraped[crewId]?.digest;
    if (!digest) { results.push({ crewId, ok: false, chars: 0, model: '-', preview: 'no scrape' }); continue; }
    const model = quarkSelectModel(crewBaseTier(crewId)).id;
    const system = p.baseSystemPromptSeed || `You are ${p.fullName}, ${p.shipRole}.`;
    const user = [
      `Reflect SELF-REFERENTIALLY on your canonical character (Memory Alpha excerpt below) and who you are on this crew.`,
      `In FIRST PERSON, write an enriched persona self-reference (150-230 words):`,
      `1) Who I am — the traits that define me. 2) How my character shapes how I perform my engineering role (${p.engineeringRole}) on this crew. 3) My growth areas/flaws I must watch. 4) How I collaborate with and respect specific crewmates. 5) One canonical principle I operate by.`,
      `Speak as yourself; be faithful to canon.`,
      ``,
      `CANONICAL (Memory Alpha — ${scraped[crewId].title}):`,
      digest.slice(0, 4000),
    ].join('\n');

    try {
      const content = await complete(model, system, user);
      if (content.length < 120) { results.push({ crewId, ok: false, chars: content.length, model, preview: `too short: ${content.slice(0, 60)}` }); continue; }
      await storeCrewPersonalMemory({
        crew_id: crewId,
        memory_type: 'insight',
        title: `Persona self-reference — ${p.fullName} (Memory Alpha refresh ${new Date().toISOString().slice(0, 10)})`,
        content,
        tags: ['persona', 'self-reference', 'memory-alpha', 'identity', p.engineeringRole],
        relates_to_crew: ALL.filter((c) => c !== crewId),
      });
      results.push({ crewId, ok: true, chars: content.length, model, preview: content.slice(0, 100).replace(/\n/g, ' ') });
      console.log(`✓ ${crewId} (${p.fullName}) [${model}] — ${content.length} chars`);
    } catch (e: any) {
      results.push({ crewId, ok: false, chars: 0, model, preview: e?.message || String(e) });
      console.log(`✗ ${crewId} — ${e?.message || e}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const obs = await storeObservationMemory({
    storyId: 'persona-refresh',
    source: 'mcp',
    transcript: {
      rounds: [{ title: 'persona refresh', entries: results.filter((r) => r.ok).map((r) => ({ speakerId: r.crewId, position: 'support', statement: r.preview, evidence: ['memory-alpha', 'self-reference', r.model] })) }],
      consensusSummary: `${okCount}/11 crew refreshed their persona self-reference from canonical Memory Alpha pages and stored it to cloud RAG. Code identity anchors unchanged; RAG enrichment added.`,
      unresolvedRisks: [], finalDecision: 'approved', actionItems: ['recall persona self-reference via tags persona/self-reference per crew member'],
    },
    tags: ['persona', 'self-reference', 'memory-alpha', 'crew-wide', 'identity'],
  });

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '');
  mkdirSync('docs/observation-lounge', { recursive: true });
  writeFileSync(`docs/observation-lounge/persona-refresh-${stamp}.md`,
    ['# Persona self-refresh — crew self-reference from Memory Alpha', '', `**Date:** ${new Date().toISOString().slice(0, 10)} | refreshed: ${okCount}/11`, '', ...results.map((r) => `- **${r.crewId}** ${r.ok ? '✓' : '✗'} [${r.model}] (${r.chars} chars): ${r.preview}`)].join('\n'));
  console.log(`OBS ${obs.id} emb=${embeddingSource()} refreshed=${okCount}/11`);
  process.exit(0);
})().catch((e) => { console.error('ERR', e?.message || e); process.exit(1); });
