/**
 * End-to-end autonomous Aha! mission (Phase A: full-crew debate → consensus → governance check).
 *
 * Exercises the REAL system components: cost-optimized model tiers (crewAhaModel), the full
 * 11-member crew debating in tandem on OpenRouter, and the WorfGate identity check
 * (authorizeAhaWrite) on the executing agent. Emits the exact, authorized write plan as JSON
 * (no Aha write here — Phase B performs the live write).
 *
 * Run: zsh -ic 'npx tsx scripts/aha-autonomous-mission.ts'
 */
import { CREW_AHA_ROLES, crewAhaModel, authorizeAhaWrite } from '../packages/mcp-server/src/lib/crew-aha-roles.js';

const URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const RATES: Record<string, { in: number; out: number }> = {
  'anthropic/claude-haiku-4.5': { in: 1, out: 5 }, 'anthropic/claude-sonnet-4.6': { in: 3, out: 15 },
};
const cost = (m: string, i: number, o: number) => { const r = RATES[m] ?? { in: 1, out: 5 }; return i / 1e6 * r.in + o / 1e6 * r.out; };

// The backlog decision the crew debates.
const DECISION = `Backlog decision: We need ONE new feature (story) added to the Story Agent demo sprint that captures
"crew can autonomously update Aha! via the governed write process". From your role's perspective, in ONE sentence,
state your position and what the feature must include. Be concise.`;

async function deliberate(crewId: string, fullName: string, focus: string, model: string) {
  const r = await fetch(`${URL}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 90,
      messages: [
        { role: 'system', content: `You are ${fullName} of the Story Agent crew. Your Aha! specialty: ${focus}. Speak in ONE concise sentence.` },
        { role: 'user', content: DECISION },
      ], usage: { include: true },
    }),
  });
  const d: any = await r.json();
  return { crewId, model: d.model || d.error?.message, text: (d.choices?.[0]?.message?.content || '').trim(), c: cost(model, d.usage?.prompt_tokens || 0, d.usage?.completion_tokens || 0) };
}

async function main() {
  if (!KEY) { console.error('No CREW_LLM_APPROVED_KEY'); process.exit(1); }
  console.log('═'.repeat(80) + '\nPHASE A — FULL CREW DEBATE (11 in tandem, cost-optimized tiers)\n' + '═'.repeat(80));

  const results = await Promise.all(CREW_AHA_ROLES.map(r => {
    const { model, tier } = crewAhaModel(r.crewId);
    return deliberate(r.crewId, r.fullName, r.ahaFocus, model).then(x => ({ ...x, tier }));
  }));
  let total = 0;
  for (const r of results) { total += r.c; console.log(`\n${r.tier === 'leader' ? '★' : ' '} ${r.crewId.padEnd(8)} (${r.model.split('/').pop()}) ~$${r.c.toFixed(4)}\n   ${r.text}`); }

  // Picard (executive leader, quality model) synthesizes consensus into a concrete feature.
  const picardModel = crewAhaModel('picard').model;
  const synth = await fetch(`${URL}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: picardModel, max_tokens: 200,
      messages: [
        { role: 'system', content: 'You are Captain Picard. Synthesize the crew positions into ONE feature. Reply ONLY with compact JSON: {"name":"...","description":"..."} (name <= 80 chars).' },
        { role: 'user', content: 'Crew positions:\n' + results.map(r => `- ${r.crewId}: ${r.text}`).join('\n') },
      ], usage: { include: true },
    }),
  });
  const sd: any = await synth.json();
  total += cost(picardModel, sd.usage?.prompt_tokens || 0, sd.usage?.completion_tokens || 0);
  let consensus: any = {};
  try { consensus = JSON.parse((sd.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim()); } catch { consensus = { name: 'Crew autonomous Aha! governed write', description: results.map(r => r.text).join(' ') }; }

  console.log('\n' + '─'.repeat(80) + `\n[PICARD — CONSENSUS] (${picardModel.split('/').pop()})\n` + JSON.stringify(consensus, null, 2));

  // WorfGate: identity-verify the executing agent (Riker = execution specialist).
  const executor = 'riker';
  const authz = authorizeAhaWrite(executor, 'aha:create-feature');
  console.log('\n' + '─'.repeat(80) + `\n[WORFGATE IDENTITY CHECK] executor=${executor} → ${authz.authorized ? '✅ AUTHORIZED' : '⛔ REJECTED'}\n   ${authz.reason}`);

  const plan = { executor, model: crewAhaModel(executor).model, authorized: authz.authorized, tool: 'aha:create-feature', confirm: true, feature: consensus };
  console.log('\n[AUTHORIZED WRITE PLAN]\n' + JSON.stringify(plan, null, 2));
  console.log(`\n💰 debate spend ≈ $${total.toFixed(4)} (3 leaders on quality, 8 supporters on cheap)`);
  // Emit a machine-readable line for Phase B.
  console.log('\nWRITE_PLAN_JSON=' + JSON.stringify(plan));
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
