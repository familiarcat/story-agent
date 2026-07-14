/**
 * Dogfood: have the crew analyze issues via OpenRouter (cost-optimized routing), not Claude.
 * Demonstrates the LLM cost optimization — simple/infra issues route to the cheap model,
 * complex/design issues to the quality model — and reports real token usage + cost.
 *
 * Run: zsh -ic 'npx tsx scripts/crew-analyze-issues.ts'
 */
const URL = (process.env.CREW_LLM_APPROVED_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.CREW_LLM_APPROVED_KEY || '';
const CHEAP = process.env.CREW_LLM_APPROVED_MODEL_CHEAP || 'anthropic/claude-haiku-4.5';
const QUALITY = process.env.CREW_LLM_APPROVED_MODEL || 'anthropic/claude-sonnet-4.6';

const RATES: Record<string, { in: number; out: number }> = {
  'anthropic/claude-haiku-4.5': { in: 1, out: 5 },
  'anthropic/claude-sonnet-4.6': { in: 3, out: 15 },
};
const cost = (m: string, i: number, o: number) => {
  const r = RATES[m] ?? { in: 1, out: 5 };
  return (i / 1e6) * r.in + (o / 1e6) * r.out;
};

const ISSUES = [
  {
    crew: 'Geordi La Forge (infrastructure)',
    tier: 'cheap' as const,
    issue: 'The web dashboard at http://localhost:3000 is unreachable ("site cannot be reached"). Facts: packages/ui is a Next.js app (scripts: next dev/build/start). Nothing is listening on :3000. The VS Code extension command openDashboard only opens the URL via vscode.env.openExternal; it does not start the Next.js server. Diagnose the root cause and give the concrete fix(es), including whether the extension should detect/launch the server.',
  },
  {
    crew: 'Counselor Troi (stakeholder/UX)',
    tier: 'quality' as const,
    issue: 'The Story Agent web dashboard needs a free-form natural-language text input with a streamed prompt response (a chat assistant in the web UI), powered by OpenRouter with the same cost-optimized model tiering as the VS Code assistant. Design the minimal implementation: a Next.js API route that calls OpenRouter (cost-optimized routing) optionally enriched by the RAG read service on localhost:3102, plus a simple chat page/component. Specify the key files and data flow.',
  },
];

async function ask(crew: string, model: string, prompt: string) {
  const resp = await fetch(`${URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [
        { role: 'system', content: `You are ${crew}, a member of the Story Agent crew. Be concise and technical. Give a root-cause + concrete fix with specific files/commands.` },
        { role: 'user', content: prompt },
      ],
      usage: { include: true },
    }),
  });
  const d: any = await resp.json();
  return {
    model: d.model || d.error?.message,
    text: d.choices?.[0]?.message?.content || `(error: ${d.error?.message})`,
    pin: d.usage?.prompt_tokens || 0,
    pout: d.usage?.completion_tokens || 0,
  };
}

async function main() {
  if (!KEY) { console.error('No CREW_LLM_APPROVED_KEY in env'); process.exit(1); }
  let total = 0;
  for (const it of ISSUES) {
    const model = it.tier === 'cheap' ? CHEAP : QUALITY;
    const r = await ask(it.crew, model, it.issue);
    const c = cost(model, r.pin, r.pout);
    total += c;
    console.log('\n' + '═'.repeat(80));
    console.log(`🤖 ${it.crew}  ·  ${it.tier} route → ${r.model}  ·  ↑${r.pin} ↓${r.pout} tok  ·  ~$${c.toFixed(4)}`);
    console.log('─'.repeat(80));
    console.log(r.text.trim());
  }
  console.log('\n' + '═'.repeat(80));
  console.log(`💰 Quark: total OpenRouter spend for this analysis ≈ $${total.toFixed(4)} (cost-optimized: 1 cheap + 1 quality)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
