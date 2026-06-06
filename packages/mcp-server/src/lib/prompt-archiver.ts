/**
 * Prompt Archiver - Stores and audits all LLM system prompts and usage
 * 
 * Maintains a complete record of:
 * - All system prompts used in LLM calls
 * - Metadata about prompt execution
 * - Request/response for debugging and auditing
 * - Prompt version history and changes
 */

import type { PromptTemplate } from './prompt-templates.js';

export interface PromptUsageRecord {
  /** Unique ID for this prompt execution */
  id: string;
  /** Which crew member used this prompt */
  crewId: string;
  /** Template ID that was used */
  templateId: string;
  /** Model that was called */
  model: string;
  /** Story reference number */
  storyRef: string;
  /** System prompt that was used */
  systemPrompt: string;
  /** User prompt that was used */
  userPrompt: string;
  /** Request parameters */
  parameters: {
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
  /** LLM response */
  response: {
    raw: string;
    reasoning: string;
    findings: string[];
    recommendations: string[];
    confidence: number;
  };
  /** Token usage */
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Cost in USD */
  costUSD: number;
  /** When this was executed */
  executedAt: string;
  /** Execution duration in ms */
  durationMs: number;
  /** Any errors encountered */
  error?: string;
  /** Tags for categorization */
  tags: string[];
}

export interface PromptArchiveStats {
  totalPrompts: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  byCrewId: Record<string, { count: number; tokens: number; cost: number }>;
  byModel: Record<string, { count: number; tokens: number; cost: number }>;
  errorCount: number;
}

/**
 * In-memory prompt archive (can be extended to persist to database/file)
 */
class PromptArchive {
  private records: PromptUsageRecord[] = [];
  private maxRecords = 10000; // Keep last 10k records in memory

  /**
   * Record a prompt execution
   */
  recordPromptUsage(record: PromptUsageRecord): void {
    this.records.push({
      ...record,
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Trim old records if we exceed max
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    // Log for audit trail
    console.log(`[PROMPT_ARCHIVE] ${record.crewId} | ${record.templateId} | ${record.storyRef} | ${record.costUSD.toFixed(4)}$ | ${record.durationMs}ms`);
  }

  /**
   * Get all records for a crew member
   */
  getCrewRecords(crewId: string): PromptUsageRecord[] {
    return this.records.filter(r => r.crewId === crewId);
  }

  /**
   * Get all records for a story
   */
  getStoryRecords(storyRef: string): PromptUsageRecord[] {
    return this.records.filter(r => r.storyRef === storyRef);
  }

  /**
   * Get all records within time range
   */
  getRecordsByTimeRange(since: Date, until: Date): PromptUsageRecord[] {
    const sinceTime = since.getTime();
    const untilTime = until.getTime();
    return this.records.filter(r => {
      const t = new Date(r.executedAt).getTime();
      return t >= sinceTime && t <= untilTime;
    });
  }

  /**
   * Get statistics
   */
  getStats(): PromptArchiveStats {
    const stats: PromptArchiveStats = {
      totalPrompts: this.records.length,
      totalTokens: 0,
      totalCost: 0,
      avgDuration: 0,
      byCrewId: {},
      byModel: {},
      errorCount: 0,
    };

    let totalDuration = 0;

    for (const record of this.records) {
      stats.totalTokens += record.tokens.total;
      stats.totalCost += record.costUSD;
      totalDuration += record.durationMs;
      if (record.error) stats.errorCount++;

      // Track by crew
      if (!stats.byCrewId[record.crewId]) {
        stats.byCrewId[record.crewId] = { count: 0, tokens: 0, cost: 0 };
      }
      stats.byCrewId[record.crewId].count++;
      stats.byCrewId[record.crewId].tokens += record.tokens.total;
      stats.byCrewId[record.crewId].cost += record.costUSD;

      // Track by model
      if (!stats.byModel[record.model]) {
        stats.byModel[record.model] = { count: 0, tokens: 0, cost: 0 };
      }
      stats.byModel[record.model].count++;
      stats.byModel[record.model].tokens += record.tokens.total;
      stats.byModel[record.model].cost += record.costUSD;
    }

    stats.avgDuration = this.records.length > 0 ? totalDuration / this.records.length : 0;

    return stats;
  }

  /**
   * Export all records (for external storage)
   */
  exportRecords(): PromptUsageRecord[] {
    return [...this.records];
  }

  /**
   * Get recent records
   */
  getRecentRecords(limit = 100): PromptUsageRecord[] {
    return this.records.slice(-limit);
  }

  /**
   * Clear all records
   */
  clearRecords(): void {
    this.records = [];
  }
}

// Global singleton instance
const globalArchive = new PromptArchive();

export const promptArchive = {
  record: (record: PromptUsageRecord) => globalArchive.recordPromptUsage(record),
  getCrewRecords: (crewId: string) => globalArchive.getCrewRecords(crewId),
  getStoryRecords: (storyRef: string) => globalArchive.getStoryRecords(storyRef),
  getRecordsByTimeRange: (since: Date, until: Date) => globalArchive.getRecordsByTimeRange(since, until),
  getStats: () => globalArchive.getStats(),
  export: () => globalArchive.exportRecords(),
  getRecent: (limit?: number) => globalArchive.getRecentRecords(limit),
  clear: () => globalArchive.clearRecords(),
};

export function getPromptEngineStats(): PromptArchiveStats {
  return globalArchive.getStats();
}

export function exportPromptArchive(): { records: PromptUsageRecord[]; stats: PromptArchiveStats; exportedAt: string } {
  return {
    records: globalArchive.exportRecords(),
    stats: globalArchive.getStats(),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Calculate token cost based on model and pricing
 * Prices as of 2024 (update as needed)
 */
export function calculateTokenCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-3-opus': { input: 0.000015, output: 0.000075 },
    'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'global.anthropic.claude-sonnet-4-6': { input: 0.003, output: 0.015 },
    'global.anthropic.claude-3-5-haiku': { input: 0.00025, output: 0.00125 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gemini-flash': { input: 0.0375, output: 0.15 }, // Per 1M tokens
    'gemini-1.5-pro': { input: 0.075, output: 0.3 }, // Per 1M tokens
  };

  const rates = pricing[model] || { input: 0.001, output: 0.001 };
  return inputTokens * rates.input + outputTokens * rates.output;
}

/**
 * Format usage record for display
 */
export function formatPromptUsageRecord(record: PromptUsageRecord): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROMPT USAGE RECORD: ${record.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTION CONTEXT:
  Crew: ${record.crewId}
  Template: ${record.templateId}
  Story: ${record.storyRef}
  Model: ${record.model}
  Time: ${record.executedAt}
  Duration: ${record.durationMs}ms

PARAMETERS:
  Temperature: ${record.parameters.temperature}
  Max Tokens: ${record.parameters.maxTokens}

TOKENS:
  Prompt: ${record.tokens.prompt}
  Completion: ${record.tokens.completion}
  Total: ${record.tokens.total}

COST: $${record.costUSD.toFixed(6)}

RESPONSE:
  Confidence: ${record.response.confidence}
  Findings: ${record.response.findings.length}
  Recommendations: ${record.response.recommendations.length}

TAGS: ${record.tags.join(', ')}
${record.error ? `\nERROR: ${record.error}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
}
