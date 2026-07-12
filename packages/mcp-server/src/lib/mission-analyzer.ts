/**
 * Mission analyzer — parses mission scope and extracts subtasks.
 *
 * Input: natural language mission brief (e.g. "deploy new auth service across 3 regions with migration")
 * Output: structured subtasks with complexity/duration estimates for team assignment.
 *
 * Used by Riker to understand what actual work needs doing, so team assembly can be
 * proportional to the actual scope (not just keyword matching).
 */

export interface ExtractedSubtask {
  id: string;
  description: string;
  domain: string; // e.g. 'security', 'infrastructure', 'implementation'
  complexity: number; // 0..1, drives capability tier
  estimatedMinutes: number; // rough guidance for scheduling
  dependencies: string[]; // other subtask IDs this depends on
  skillsRequired: string[]; // keywords like 'terraform', 'auth', 'testing'
}

export interface MissionAnalysis {
  title: string;
  goals: string[];
  subtasks: ExtractedSubtask[];
  criticalPath: string[]; // subtask IDs in dependency order
  estimatedTotalMinutes: number;
  complexityBudget: number; // 0..1, aggregate complexity
}

/**
 * Parse mission brief into structured subtasks.
 * Heuristic-based: extract common operation patterns + domain signals.
 */
export function analyzeMission(missionBrief: string): MissionAnalysis {
  const text = missionBrief.toLowerCase();

  // Extract high-level goals (naive: split on period + filter sentences with action verbs)
  const sentences = missionBrief.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const actionVerbs = ['deploy', 'migrate', 'refactor', 'fix', 'implement', 'update', 'build', 'add'];
  const goals = sentences
    .filter(s => actionVerbs.some(v => s.toLowerCase().includes(v)))
    .slice(0, 4); // limit to 4 primary goals

  // Detect operations (deploy, migrate, rollback, etc.)
  const operations = detectOperations(text);
  const domains = extractDomains(text);
  const skillsGlobal = extractSkills(text);

  // Build subtasks from detected operations + domain signals
  const subtasks: ExtractedSubtask[] = [];
  let id = 1;

  // 1. Infrastructure/deployment subtasks
  if (operations.includes('deploy')) {
    subtasks.push({
      id: `deploy-${id++}`,
      description: 'Prepare deployment (build, test, validate)',
      domain: 'infrastructure',
      complexity: 0.4,
      estimatedMinutes: 45,
      dependencies: [],
      skillsRequired: ['deploy', 'ci', 'test'],
    });
    subtasks.push({
      id: `deploy-${id++}`,
      description: 'Execute deployment to target environment',
      domain: 'infrastructure',
      complexity: 0.5,
      estimatedMinutes: 60,
      dependencies: [subtasks[subtasks.length - 1]?.id || 'deploy-1'],
      skillsRequired: ['deploy', 'terraform', 'aws'],
    });
  }

  // 2. Migration/data subtasks
  if (operations.includes('migrate')) {
    subtasks.push({
      id: `migrate-${id++}`,
      description: 'Analyze schema and plan migration path',
      domain: 'architecture',
      complexity: 0.6,
      estimatedMinutes: 90,
      dependencies: [],
      skillsRequired: ['architecture', 'schema', 'data model'],
    });
    subtasks.push({
      id: `migrate-${id++}`,
      description: 'Execute migration with validation',
      domain: 'infrastructure',
      complexity: 0.7,
      estimatedMinutes: 120,
      dependencies: [subtasks[subtasks.length - 1]?.id || 'migrate-1'],
      skillsRequired: ['migrate', 'sql', 'devops'],
    });
  }

  // 3. Security/auth subtasks
  if (domains.includes('security') || skillsGlobal.includes('auth')) {
    subtasks.push({
      id: `security-${id++}`,
      description: 'Design and implement authentication/authorization',
      domain: 'security',
      complexity: 0.7,
      estimatedMinutes: 120,
      dependencies: [],
      skillsRequired: ['security', 'auth', 'permission'],
    });
  }

  // 4. Testing/quality subtasks
  subtasks.push({
    id: `test-${id++}`,
    description: 'Write and run integration tests',
    domain: 'quality',
    complexity: 0.4,
    estimatedMinutes: 60,
    dependencies: [],
    skillsRequired: ['test', 'qa', 'verify'],
  });

  // 5. Documentation/comms
  if (text.includes('doc') || text.includes('report')) {
    subtasks.push({
      id: `doc-${id++}`,
      description: 'Document changes and communicate to stakeholders',
      domain: 'communications',
      complexity: 0.2,
      estimatedMinutes: 30,
      dependencies: subtasks.slice(0, -1).map(s => s.id), // depends on all prior work
      skillsRequired: ['doc', 'communicat'],
    });
  }

  // Compute critical path (topological sort of dependencies)
  const criticalPath = computeCriticalPath(subtasks);
  const estimatedTotalMinutes = Math.max(...subtasks.map(s => s.estimatedMinutes), 0);
  const complexityBudget = subtasks.length > 0
    ? subtasks.reduce((sum, s) => sum + s.complexity, 0) / subtasks.length
    : 0.5;

  return {
    title: missionBrief.split('\n')[0].slice(0, 60),
    goals,
    subtasks,
    criticalPath,
    estimatedTotalMinutes,
    complexityBudget,
  };
}

function detectOperations(text: string): string[] {
  const operations = ['deploy', 'migrate', 'rollback', 'patch', 'hotfix', 'refactor', 'debug'];
  return operations.filter(op => text.includes(op));
}

function extractDomains(text: string): string[] {
  const domainKeywords: Record<string, string[]> = {
    security: ['security', 'auth', 'permission', 'secret', 'rls'],
    infrastructure: ['infra', 'aws', 'terraform', 'docker', 'fargate'],
    architecture: ['architect', 'schema', 'design', 'refactor', 'migration'],
    quality: ['test', 'coverage', 'qa', 'acceptance', 'verify'],
    implementation: ['implement', 'build', 'feature', 'code', 'develop'],
  };

  const detected = [];
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(k => text.includes(k))) detected.push(domain);
  }
  return detected;
}

function extractSkills(text: string): string[] {
  const skills = ['deploy', 'terraform', 'aws', 'docker', 'sql', 'auth', 'security', 'test', 'ci', 'cd'];
  return skills.filter(s => text.includes(s));
}

function computeCriticalPath(subtasks: ExtractedSubtask[]): string[] {
  // Simple topological sort: process items with no dependencies first, then dependents
  const remaining = new Set(subtasks.map(s => s.id));
  const path: string[] = [];

  while (remaining.size > 0) {
    // Find items with no unprocessed dependencies
    const ready = Array.from(remaining).filter(id => {
      const task = subtasks.find(s => s.id === id);
      return !task || task.dependencies.every(d => !remaining.has(d));
    });

    if (ready.length === 0) break; // cycle detected, just take first remaining

    path.push(...ready);
    ready.forEach(id => remaining.delete(id));
  }

  return path;
}
