#!/usr/bin/env node

const baseUrl = (process.env.STORY_AGENT_CHAT_BASE_URL || 'http://localhost:3103').replace(/\/$/, '');
const prompt = process.argv.slice(2).join(' ').trim() || process.env.STORY_AGENT_PROBE_PROMPT || 'Can you fix this issue?';

async function callChat(body) {
  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}

function dollars(value) {
  return `$${Number(value || 0).toFixed(6)}`;
}

const baseline = await callChat({ message: prompt, crewSelfOrganize: false, promptOptimizationMode: 'off' });
const optimized = await callChat({ message: prompt });

const baselineCost = baseline.costAnalysis?.totalCostUSD ?? baseline.costUSD ?? 0;
const optimizedCost = optimized.costAnalysis?.totalCostUSD ?? optimized.costUSD ?? 0;
const baselineTokens = baseline.costAnalysis?.totalTokens ?? ((baseline.tokensIn ?? 0) + (baseline.tokensOut ?? 0));
const optimizedTokens = optimized.costAnalysis?.totalTokens ?? ((optimized.tokensIn ?? 0) + (optimized.tokensOut ?? 0));

console.log('story-agent prompt optimization probe');
console.log(JSON.stringify({
  baseUrl,
  prompt,
  baseline: {
    model: baseline.model,
    costUSD: baselineCost,
    totalTokens: baselineTokens,
    promptOptimization: baseline.promptOptimization,
    answerPreview: String(baseline.answer || '').slice(0, 200),
  },
  optimized: {
    model: optimized.model,
    costUSD: optimizedCost,
    totalTokens: optimizedTokens,
    promptOptimization: optimized.promptOptimization,
    crewSelfOrganization: optimized.crewSelfOrganization ? {
      teams: optimized.crewSelfOrganization.teams?.map((team) => ({ teamId: team.teamId, members: team.members })),
      totalCostUSD: optimized.crewSelfOrganization.totalCostUSD,
      totalTokens: optimized.crewSelfOrganization.totalTokens,
    } : null,
    answerPreview: String(optimized.answer || '').slice(0, 200),
  },
  delta: {
    costUSD: Number((optimizedCost - baselineCost).toFixed(6)),
    totalTokens: optimizedTokens - baselineTokens,
    optimizationRules: optimized.promptOptimization?.rules || [],
  },
  summary: `baseline ${dollars(baselineCost)} / ${baselineTokens} tok -> optimized ${dollars(optimizedCost)} / ${optimizedTokens} tok`,
}, null, 2));