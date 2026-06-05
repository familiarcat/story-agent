/**
 * Prompt Engine - Unified system for all LLM-backed crew agent calls
 * 
 * Integrates:
 * - Prompt template selection
 * - Variable substitution
 * - LLM API calls via OpenRouter
 * - Response parsing and validation
 * - Prompt usage archival
 * - Cost tracking and reporting
 */

import OpenAI from 'openai';
import type { PromptTemplate } from './prompt-templates.js';
import { getPromptTemplate } from './prompt-templates.js';
import { promptArchive, calculateTokenCost, type PromptUsageRecord } from './prompt-archiver.js';

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://story-agent.dev',
    'X-Title': 'Story Agent Crew System',
  },
});

export interface PromptEngineResult {
  reasoning: string;
  findings: string[];
  recommendations: string[];
  confidence: number;
  hasSecurityVeto: boolean;
}

interface PromptVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Substitute variables in a template string
 * Supports {{variable}} and {{#condition}}text{{/condition}} syntax
 */
export function substitutePromptVariables(template: string, variables: PromptVariables): string {
  let result = template;

  // Handle conditional blocks {{#variable}}...{{/variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{#${key}}}([^]*?){{/${key}}}`, 'g');
    if (value) {
      result = result.replace(regex, '$1');
    } else {
      result = result.replace(regex, '');
    }
  }

  // Handle variable substitution {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  return result;
}

/**
 * Execute a crew agent using the prompt engine
 */
export async function executePromptEngineCall(
  crewId: string,
  variables: PromptVariables,
  storyRef: string,
  additionalTags: string[] = []
): Promise<PromptEngineResult> {
  const startTime = Date.now();

  // Get prompt template
  const template = getPromptTemplate(crewId);
  if (!template) {
    throw new Error(`No prompt template found for crew member: ${crewId}`);
  }

  // Validate required variables
  const missingVars = template.requiredVariables.filter(v => !variables[v]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required variables for ${crewId}: ${missingVars.join(', ')}`);
  }

  // Substitute variables in prompts
  const systemPrompt = template.systemPrompt; // System prompts are static
  const userPrompt = substitutePromptVariables(template.userPromptTemplate, variables);

  try {
    // Call LLM via OpenRouter
    console.log(`[PROMPT_ENGINE] Calling ${crewId} (${template.model}) for story ${storyRef}`);

    const response = await openrouter.chat.completions.create({
      model: template.model,
      temperature: template.temperature,
      max_tokens: template.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const durationMs = Date.now() - startTime;
    const responseText = response.choices[0]?.message?.content || '';

    // Parse response
    const parsed = parseStructuredResponse(responseText);

    // Calculate cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const costUSD = calculateTokenCost(template.model, inputTokens, outputTokens);

    // Record usage in archive
    const usageRecord: PromptUsageRecord = {
      id: '', // Set by archive
      crewId,
      templateId: template.id,
      model: template.model,
      storyRef,
      systemPrompt,
      userPrompt,
      parameters: {
        temperature: template.temperature,
        maxTokens: template.maxTokens,
      },
      response: {
        raw: responseText,
        reasoning: responseText,
        findings: parsed.findings,
        recommendations: parsed.recommendations,
        confidence: parsed.confidence,
      },
      tokens: {
        prompt: inputTokens,
        completion: outputTokens,
        total: inputTokens + outputTokens,
      },
      costUSD,
      executedAt: new Date().toISOString(),
      durationMs,
      tags: [template.category, `crew:${crewId}`, `story:${storyRef}`, ...additionalTags],
    };

    promptArchive.record(usageRecord);

    // Log execution
    console.log(
      `[PROMPT_ENGINE] ✓ ${crewId} | ${template.model.padEnd(18)} | tokens: ${inputTokens + outputTokens} | cost: $${costUSD.toFixed(4)} | ${durationMs}ms`
    );

    return {
      reasoning: responseText,
      findings: parsed.findings,
      recommendations: parsed.recommendations,
      confidence: parsed.confidence,
      hasSecurityVeto: parsed.hasSecurityVeto,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Record error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const usageRecord: PromptUsageRecord = {
      id: '',
      crewId,
      templateId: template.id,
      model: template.model,
      storyRef,
      systemPrompt,
      userPrompt,
      parameters: {
        temperature: template.temperature,
        maxTokens: template.maxTokens,
      },
      response: {
        raw: errorMessage,
        reasoning: errorMessage,
        findings: [],
        recommendations: ['Retry after resolving error'],
        confidence: 0,
      },
      tokens: { prompt: 0, completion: 0, total: 0 },
      costUSD: 0,
      executedAt: new Date().toISOString(),
      durationMs,
      error: errorMessage,
      tags: [template.category, `crew:${crewId}`, `story:${storyRef}`, 'error', ...additionalTags],
    };

    promptArchive.record(usageRecord);

    console.error(`[PROMPT_ENGINE] ✗ ${crewId} | ERROR: ${errorMessage}`);

    throw error;
  }
}

/**
 * Parse structured response from LLM
 */
function parseStructuredResponse(content: string): {
  findings: string[];
  recommendations: string[];
  confidence: number;
  hasSecurityVeto: boolean;
} {
  const findings: string[] = [];
  const recommendations: string[] = [];
  let confidence = 0.75;
  let hasSecurityVeto = false;

  // Extract findings
  const findingsMatch = content.match(/FINDINGS:\s*([\s\S]*?)(?=RECOMMENDATIONS:|SECURITY_VETO:|CONFIDENCE:|$)/i);
  if (findingsMatch) {
    findings.push(
      ...findingsMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)
    );
  }

  // Extract recommendations
  const recsMatch = content.match(/RECOMMENDATIONS:\s*([\s\S]*?)(?=CONFIDENCE:|SECURITY_VETO:|$)/i);
  if (recsMatch) {
    recommendations.push(
      ...recsMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)
    );
  }

  // Extract confidence
  const confMatch = content.match(/CONFIDENCE:\s*([\d.]+)/i);
  if (confMatch) {
    confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1]) / 100));
  }

  // Check for security veto
  if (content.match(/SECURITY_VETO:/i)) {
    hasSecurityVeto = true;
    // Add security veto to recommendations for visibility
    const vetoMatch = content.match(/SECURITY_VETO:\s*([^\n]+)/i);
    if (vetoMatch) {
      recommendations.push(`⚠️ SECURITY_VETO: ${vetoMatch[1]}`);
    }
  }

  return {
    findings: findings.length > 0 ? findings : ['Unable to extract findings from response'],
    recommendations: recommendations.length > 0 ? recommendations : ['Unable to extract recommendations'],
    confidence,
    hasSecurityVeto,
  };
}

/**
 * Execute multiple crew agents in parallel
 */
export async function executeParallelPromptCalls(
  calls: Array<{ crewId: string; variables: PromptVariables; storyRef: string; tags?: string[] }>,
  maxConcurrency = 11
): Promise<Map<string, PromptEngineResult>> {
  const results = new Map<string, PromptEngineResult>();
  const errors = new Map<string, Error>();

  // Execute in batches to respect rate limits
  for (let i = 0; i < calls.length; i += maxConcurrency) {
    const batch = calls.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async call => {
      try {
        const result = await executePromptEngineCall(call.crewId, call.variables, call.storyRef, call.tags);
        results.set(call.crewId, result);
      } catch (error) {
        errors.set(call.crewId, error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(batchPromises);
  }

  if (errors.size > 0) {
    console.error(`[PROMPT_ENGINE] ${errors.size} calls failed:`);
    for (const [crewId, error] of errors) {
      console.error(`  ${crewId}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Get prompt engine statistics
 */
export function getPromptEngineStats() {
  return promptArchive.getStats();
}

/**
 * Export prompts for auditing or backup
 */
export function exportPromptArchive() {
  return {
    records: promptArchive.export(),
    stats: getPromptEngineStats(),
    exportedAt: new Date().toISOString(),
  };
}
