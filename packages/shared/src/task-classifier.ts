/**
 * Task Classifier — Autonomous Governance MVP (WORKSTREAM 1)
 *
 * Classifies tasks as autonomous-eligible vs requires-human-approval based on:
 * - Task type (bug fix, test, doc, refactor = autonomous-safe)
 * - Complexity heuristics (line count, scope, risk keywords)
 * - Scope validation (within workspace bounds, no production data changes)
 *
 * Used by autonomous-executor to decide whether to execute immediately or escalate.
 */

export type TaskType =
  | 'bug_fix'
  | 'test'
  | 'documentation'
  | 'refactor'
  | 'new_feature'
  | 'architecture_change'
  | 'migration'
  | 'unknown';

export interface TaskClassification {
  isAutonomous: boolean;
  reason: string;
  escalationThreshold?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number; // 0-1
}

/**
 * Keywords that indicate a task is NOT autonomous-eligible (requires approval).
 */
const ESCALATION_KEYWORDS = [
  'production',
  'production-only',
  'security',
  'authentication',
  'payment',
  'credentials',
  'secret',
  'api_key',
  'database_delete',
  'drop_table',
  'migration',
  'breaking_change',
  'major_version',
  'deploy',
  'release',
  'customer_data',
  'pii',
  'phi',
  'regulated',
  'compliance',
  'audit',
];

/**
 * Keywords that indicate SAFE autonomous operations.
 */
const SAFE_KEYWORDS = [
  'fix',
  'bug',
  'test',
  'doc',
  'comment',
  'typo',
  'format',
  'lint',
  'refactor',
  'import',
  'naming',
];

/**
 * Classify a task as autonomous-eligible or requires-approval.
 *
 * @param brief Task description/brief
 * @param taskType Task type enum (bug_fix, test, etc.)
 * @returns Classification with reasoning + risk level
 */
export function classifyTask(brief: string, taskType: TaskType): TaskClassification {
  const briefLower = brief.toLowerCase();
  const briefLength = brief.length;

  // Phase 1: Type-based classification
  const typeBasedClassification = classifyByType(taskType);
  if (!typeBasedClassification.isAutonomous) {
    return typeBasedClassification;
  }

  // Phase 2: Content-based escalation checks
  const escalationMatches = ESCALATION_KEYWORDS.filter(kw =>
    briefLower.includes(kw)
  );
  if (escalationMatches.length > 0) {
    return {
      isAutonomous: false,
      reason: `Found escalation keywords: ${escalationMatches.join(', ')}`,
      escalationThreshold: 'security_or_scope_concern',
      riskLevel: 'high',
      confidenceScore: 0.95,
    };
  }

  // Phase 3: Safe keyword presence increases confidence
  const safeMatches = SAFE_KEYWORDS.filter(kw => briefLower.includes(kw));
  const safeKeywordBonus = safeMatches.length * 0.05; // +5% per safe keyword

  // Phase 4: Scope complexity heuristics
  const complexityScore = calculateComplexity(brief);

  // Final decision: low complexity + safe keywords = high confidence autonomous
  if (complexityScore <= 5 && safeMatches.length > 0) {
    return {
      isAutonomous: true,
      reason: `Low complexity ${taskType} with safe keywords: ${safeMatches.join(', ')}`,
      riskLevel: 'low',
      confidenceScore: Math.min(0.95, 0.7 + safeKeywordBonus),
    };
  }

  // Medium complexity + safe type + safe keywords = likely autonomous
  if (complexityScore <= 8 && typeBasedClassification.isAutonomous) {
    return {
      isAutonomous: true,
      reason: `Medium complexity ${taskType}; low risk within scope`,
      riskLevel: 'low',
      confidenceScore: Math.min(0.8, 0.65 + safeKeywordBonus),
    };
  }

  // Higher complexity requires approval
  if (complexityScore > 8) {
    return {
      isAutonomous: false,
      reason: `High complexity (score: ${complexityScore}) requires human review`,
      escalationThreshold: 'complexity_threshold',
      riskLevel: 'medium',
      confidenceScore: 0.7,
    };
  }

  // Default: if unclear, lean conservative
  return {
    isAutonomous: false,
    reason: 'Could not confidently classify as autonomous; human review recommended',
    riskLevel: 'medium',
    confidenceScore: 0.5,
  };
}

/**
 * Classify based on task type alone (before content analysis).
 */
function classifyByType(taskType: TaskType): TaskClassification {
  const autonomousSafeTypes = ['bug_fix', 'test', 'documentation', 'refactor'];
  const requiresApprovalTypes = [
    'new_feature',
    'architecture_change',
    'migration',
  ];

  if (autonomousSafeTypes.includes(taskType)) {
    return {
      isAutonomous: true,
      reason: `${taskType} is typically safe for autonomous execution`,
      riskLevel: 'low',
      confidenceScore: 0.7,
    };
  }

  if (requiresApprovalTypes.includes(taskType)) {
    return {
      isAutonomous: false,
      reason: `${taskType} requires human approval`,
      riskLevel: taskType === 'migration' ? 'critical' : 'medium',
      confidenceScore: 0.9,
    };
  }

  return {
    isAutonomous: false,
    reason: `Unknown task type: ${taskType}; defaulting to require approval`,
    riskLevel: 'medium',
    confidenceScore: 0.5,
  };
}

/**
 * Calculate complexity score (0-10+) based on brief content.
 * Higher score = higher complexity.
 *
 * Heuristics:
 * - Word count (more = more complex)
 * - Sentence count (more = more complex)
 * - "if", "else", "logic" keywords (logic complexity)
 * - "multiple", "complex", "refactor" (stated complexity)
 */
function calculateComplexity(brief: string): number {
  const words = brief.split(/\s+/).length;
  const sentences = brief.split(/[.!?]+/).length;
  const hasLogicKeywords = /\b(if|else|switch|loop|recursion|algorithm|logic)\b/i.test(
    brief
  );
  const hasComplexityKeywords = /\b(multiple|complex|refactor|refactoring|consolidate|merge)\b/i.test(
    brief
  );
  const hasFileCount = /(\d+|many|multiple)\s+(file|component)/i.test(brief);

  let score = 0;

  // Base: word count (2-3 words per point)
  score += Math.max(0, words - 10) / 3;

  // Sentences: each sentence adds complexity
  score += sentences - 1;

  // Keywords add fixed complexity
  if (hasLogicKeywords) score += 2;
  if (hasComplexityKeywords) score += 2;
  if (hasFileCount) score += 2;

  return Math.min(score, 15); // Cap at 15 for simplicity
}

/**
 * Infer task type from brief text (fallback if not explicitly provided).
 */
export function inferTaskType(brief: string): TaskType {
  const briefLower = brief.toLowerCase();

  if (/\b(bug|fix|issue|broken|crash)\b/.test(briefLower)) return 'bug_fix';
  if (/\b(test|unit|integration|e2e|spec)\b/.test(briefLower)) return 'test';
  if (/\b(doc|documentation|readme|comment|guide)\b/.test(briefLower))
    return 'documentation';
  if (/\b(refactor|optimize|clean|reorg|improve|simplify)\b/.test(briefLower))
    return 'refactor';
  if (/\b(feature|implement|add|create|new)\b/.test(briefLower))
    return 'new_feature';
  if (/\b(architecture|design|migrate|migration)\b/.test(briefLower))
    return 'migration';

  return 'unknown';
}
