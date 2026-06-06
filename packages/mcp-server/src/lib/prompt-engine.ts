/**
 * Prompt Engine - Unified system for all LLM-backed crew agent calls
 * 
 * Integrates:
 * - Prompt template selection
 * - Variable substitution
 * - LLM API calls via pluggable provider (demo/copilot/approved)
 * - Response parsing and validation
 * - Prompt usage archival
 * - Cost tracking and reporting
 * 
 * Provider modes:
 * - demo: Deterministic mock responses (default, no external LLM)
 * - copilot: GitHub Copilot API (requires GITHUB_TOKEN)
 * - approved: Corporate-configured endpoint (requires CREW_LLM_APPROVED_URL and CREW_LLM_APPROVED_KEY)
 */

import OpenAI from 'openai';
import type { PromptTemplate } from './prompt-templates.js';
import { getPromptTemplate } from './prompt-templates.js';
import { promptArchive, calculateTokenCost, type PromptUsageRecord } from './prompt-archiver.js';

/**
 * Get current LLM provider mode from environment
 */
function getLlmProvider(): string {
  const provider = (process.env.CREW_LLM_PROVIDER ?? '').trim().toLowerCase();
  if (!provider) return 'approved';
  if (['demo', 'copilot', 'approved'].includes(provider)) return provider;
  return 'approved';
}

/**
 * Get LLM base URL for the current provider
 */
function getLlmBaseUrl(): string {
  const provider = getLlmProvider();
  if (provider === 'copilot') return 'https://models.inference.ai.github.com';
  if (provider === 'approved') return (process.env.CREW_LLM_APPROVED_URL ?? '').trim();
  return '';
}

/**
 * Get LLM API key for the current provider
 */
function getLlmApiKey(): string {
  const provider = getLlmProvider();
  if (provider === 'copilot') return process.env.GITHUB_TOKEN ?? '';
  if (provider === 'approved') return process.env.CREW_LLM_APPROVED_KEY ?? '';
  return '';
}

/**
 * Create OpenAI client for current provider
 */
function getLlmClient(): OpenAI | null {
  const provider = getLlmProvider();
  if (provider === 'demo') return null;

  const baseUrl = getLlmBaseUrl();
  const apiKey = getLlmApiKey();

  if (!baseUrl || !apiKey) {
    console.warn(`[prompt-engine] LLM provider '${provider}' not fully configured, falling back to demo mode`);
    return null;
  }

  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    defaultHeaders: {
      'HTTP-Referer': 'https://story-agent.dev',
      'X-Title': 'Story Agent Crew System',
    },
  });
}

/**
 * Generate deterministic demo response for testing without external LLM
 */
function generateDemoResponse(crewId: string): string {
  const demoResponses: Record<string, string> = {
    picard:
      'ANALYSIS:\nThe mission parameters are clear and strategically sound. I recommend proceeding with autonomous execution after security veto checks.\n\nFINDINGS:\n1. Governance structure is defined\n2. Crew authority hierarchy is established\n3. Fallback protocols are in place\n\nRECOMMENDATIONS:\n1. Validate all crew member authority levels\n2. Ensure WorfGate security gates are enforced\n3. Archive all decisions to audit trail\n\nCONFIDENCE: 0.92\nHAS_SECURITY_VETO: false',
    data:
      'ANALYSIS:\nArchitectural patterns are sound. Strong domain-driven design principles detected.\n\nFINDINGS:\n1. Type system is well-defined\n2. Memory model is deterministic\n3. Provider abstraction is clean\n\nRECOMMENDATIONS:\n1. Add protocol versioning\n2. Implement backward compatibility checks\n3. Document schema evolution\n\nCONFIDENCE: 0.88\nHAS_SECURITY_VETO: false',
    riker:
      'ANALYSIS:\nImplementation strategy is tactically sound. Resource allocation looks optimal.\n\nFINDINGS:\n1. Development phases are sequenced correctly\n2. Crew task distribution is balanced\n3. Fallback branches handle edge cases\n\nRECOMMENDATIONS:\n1. Add runbook for each fallback scenario\n2. Create operator playbooks\n3. Document decision tree\n\nCONFIDENCE: 0.85\nHAS_SECURITY_VETO: false',
    worf:
      'ANALYSIS:\nSecurity posture requires hardening. Policy enforcement is critical.\n\nFINDINGS:\n1. Network isolation from external AI routes verified\n2. Approved endpoint configuration required\n3. Degraded mode fallback documented\n\nRECOMMENDATIONS:\n1. Use approved Bayer LLM endpoint only\n2. Require explicit downgrade to advisory mode when blocked\n3. Add security banner on degraded operation\n\nCONFIDENCE: 0.95\nHAS_SECURITY_VETO: true',
  };

  return demoResponses[crewId] || demoResponses.picard;
}

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

  // First, remove all conditional blocks for undefined/missing variables
  // Find all {{#key}}...{{/key}} patterns and check if the key is provided
  const conditionalRegex = /{{#(\w+)}}([^]*?){{\/\1}}/g;
  result = result.replace(conditionalRegex, (match, key, content) => {
    const value = variables[key];
    // Include content only if the variable exists and is truthy
    if (value !== undefined && value !== null && value !== false && value !== '' && value !== 0) {
      return content;
    }
    return '';
  });

  // Handle variable substitution {{variable}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value !== undefined && value !== null ? String(value) : '');
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
    // Use demo mode or configured LLM provider
    const client = getLlmClient();
    const provider = getLlmProvider();
    console.log(`[PROMPT_ENGINE] Calling ${crewId} (${template.model}) via ${provider} for story ${storyRef}`);

    let responseText: string;

    if (!client) {
      // Use deterministic demo mode
      console.log(`[PROMPT_ENGINE] Using demo mode for ${crewId}`);
      responseText = generateDemoResponse(crewId);
    } else {
      // Call external LLM
      const response = await client.chat.completions.create({
        model: template.model,
        temperature: template.temperature,
        max_tokens: template.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      responseText = response.choices[0]?.message?.content || '';
    }

    const durationMs = Date.now() - startTime;

    // Parse response
    const parsed = parseStructuredResponse(responseText);

    // Calculate cost (estimate for demo, use actual for external LLM)
    let inputTokens = Math.ceil(systemPrompt.length / 4 + userPrompt.length / 4);
    let outputTokens = Math.ceil(responseText.length / 4);
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

/**
 * Get connectivity diagnostics for the LLM provider
 */
export function getPromptEngineConnectivityDiagnostics() {
  const provider = getLlmProvider();
  const baseUrl = getLlmBaseUrl();
  const apiKey = getLlmApiKey();
  const hasCredentials = Boolean(apiKey && baseUrl);

  let classification = 'not_configured';
  let detail = 'No LLM provider configured';

  if (provider === 'demo') {
    classification = 'demo_mode';
    detail = 'Using deterministic mock responses (no external LLM)';
  } else if (hasCredentials) {
    classification = provider;
    detail = `Using ${provider} provider with credentials configured`;
  } else {
    classification = 'missing_credentials';
    detail = `Provider ${provider} selected but credentials not configured; will fall back to demo mode`;
  }

  return {
    provider,
    configured: hasCredentials || provider === 'demo',
    reachable: hasCredentials || provider === 'demo',
    baseUrl: baseUrl || '(none)',
    hasApiKey: Boolean(apiKey),
    classification,
    detail,
    timestamp: new Date().toISOString(),
  };
}
