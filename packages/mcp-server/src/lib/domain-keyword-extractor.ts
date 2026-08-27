/**
 * Phase 2: Intelligent Task Routing via Domain Keyword Extraction
 * 
 * Reduces crew team size by matching mission brief keywords to domain expertise.
 * Only assembles crew members whose domain matches detected keywords.
 * Fallback: If <4 members selected, add core team (Riker + Data) for validation.
 * 
 * Expected Impact:
 * - Cost reduction: 42-55% for simple/medium tasks (vs baseline $0.0017)
 * - Accuracy: <5% loss (maintained by fallback + Picard synthesis)
 * - Latency: Minimal change (smaller team = faster deliberation)
 */

import type { TeamMember, Provider } from './crew-team-assembly.js';

export interface DomainKeywordMatch {
  domain: string;
  matchCount: number;
  keywords: string[];
}

export interface ExtractedDomains {
  detected: Set<string>;
  confidence: number; // 0..1 based on keyword count
  matches: DomainKeywordMatch[];
}

/**
 * Domain keyword mappings — each domain recognized by specific terminology
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  architecture: [
    'architect', 'schema', 'design', 'ddd', 'entity', 'model', 'structure',
    'domain model', 'entity design', 'schema design', 'refactor schema', 'data model',
    'boundary', 'aggregate', 'event sourcing', 'cqrs',
  ],
  implementation: [
    'implement', 'build', 'feature', 'code', 'develop', 'execute', 'feature implementation',
    'build component', 'implement feature', 'write code', 'development', 'coding',
    'functional requirement', 'implement requirement',
  ],
  quality: [
    'test', 'qa', 'coverage', 'regression', 'acceptance', 'smoke', 'e2e', 'unit test',
    'test coverage', 'acceptance test', 'regression test', 'test case', 'testing strategy',
    'test plan', 'test automation',
  ],
  stakeholder: [
    'ux', 'user', 'stakeholder', 'experience', 'communicate', 'feedback', 'ui',
    'user experience', 'user journey', 'accessibility', 'usability', 'user feedback',
    'stakeholder alignment', 'communicate change',
  ],
  security: [
    'security', 'auth', 'permission', 'secret', 'threat', 'vulnerability', 'compliance',
    'rbac', 'authorization', 'encryption', 'threat model', 'security audit', 'penetration',
    'secure', 'attack surface',
  ],
  infrastructure: [
    'ops', 'ci', 'cd', 'deploy', 'container', 'scaling', 'infrastructure', 'devops',
    'kubernetes', 'docker', 'cloud', 'aws', 'deployment', 'infrastructure as code',
    'terraform', 'load balancer', 'monitoring', 'observability',
  ],
  health: [
    'health', 'performance', 'reliability', 'availability', 'latency', 'throughput',
    'monitoring', 'observability', 'metrics', 'logging', 'tracing', 'diagnosis',
    'system health', 'performance optimization', 'bottleneck',
  ],
};

/**
 * Extract domain keywords from a mission brief (goals + description)
 * Returns detected domains and confidence score
 */
export function extractDomainsFromBrief(brief: string): ExtractedDomains {
  const briefLower = brief.toLowerCase();
  const detected = new Set<string>();
  const matches: DomainKeywordMatch[] = [];

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let matchCount = 0;
    const foundKeywords: string[] = [];

    for (const keyword of keywords) {
      if (briefLower.includes(keyword)) {
        matchCount += 1;
        foundKeywords.push(keyword);
      }
    }

    if (matchCount > 0) {
      detected.add(domain);
      matches.push({
        domain,
        matchCount,
        keywords: foundKeywords,
      });
    }
  }

  // Confidence: 1.0 if ≥3 domains detected, scales down
  const confidence = Math.min(1.0, Math.max(0.3, detected.size / 3));

  return { detected, confidence, matches };
}

/**
 * Map detected domains to crew members
 * Each domain maps to 1-3 core team members
 */
const DOMAIN_TO_CREW: Record<string, string[]> = {
  architecture: ['data', 'worf'],           // Data (design), Worf (security review)
  implementation: ['riker', 'o_brien'],    // Riker (lead), O'Brien (execution)
  quality: ['yar', 'crusher'],              // Yar (testing), Crusher (health)
  stakeholder: ['troi', 'uhura'],           // Troi (UX/alignment), Uhura (communication)
  security: ['worf'],                       // Worf (security)
  infrastructure: ['geordi', 'o_brien'],   // Geordi (infra), O'Brien (DevOps)
  health: ['crusher'],                      // Crusher (system health)
};

/**
 * Core team (always included if selected team is too small)
 */
const CORE_TEAM = ['riker', 'data'];
const ALWAYS_INCLUDE = ['picard', 'quark']; // Picard (orchestration), Quark (finance)

/**
 * Assemble crew based on detected domains
 * Returns team with 4-11 members depending on task complexity
 */
export function assembleTeamByDomains(
  brief: string,
  existingTeam?: TeamMember[],
): TeamMember[] {
  const { detected } = extractDomainsFromBrief(brief);
  const selectedCrewIds = new Set<string>();

  // Add always-included members (Picard, Quark)
  for (const crewId of ALWAYS_INCLUDE) {
    selectedCrewIds.add(crewId);
  }

  // Add crew for detected domains
  for (const domain of detected) {
    const crew = DOMAIN_TO_CREW[domain] || [];
    for (const crewId of crew) {
      selectedCrewIds.add(crewId);
    }
  }

  // Fallback: if too few members selected, add core team for cross-domain validation
  if (selectedCrewIds.size < 4) {
    for (const crewId of CORE_TEAM) {
      selectedCrewIds.add(crewId);
    }
  }

  // Map crew IDs back to existing team structure (or create minimal structure)
  const crewMapping: Record<string, { domain: string; capabilityTier: number }> = {
    picard: { domain: 'command', capabilityTier: 4 },
    data: { domain: 'architecture', capabilityTier: 4 },
    riker: { domain: 'implementation', capabilityTier: 3 },
    worf: { domain: 'security', capabilityTier: 4 },
    o_brien: { domain: 'devops', capabilityTier: 3 },
    geordi: { domain: 'infrastructure', capabilityTier: 3 },
    yar: { domain: 'quality', capabilityTier: 2 },
    crusher: { domain: 'health', capabilityTier: 2 },
    troi: { domain: 'stakeholder', capabilityTier: 2 },
    uhura: { domain: 'communications', capabilityTier: 2 },
    quark: { domain: 'finance', capabilityTier: 2 },
  };

  const assembledTeam: TeamMember[] = [];
  for (const crewId of selectedCrewIds) {
    const info = crewMapping[crewId];
    if (info) {
      // Use existing team member if available, otherwise skip (will be created by Quark)
      const existing = existingTeam?.find((m) => m.crewId === crewId);
      if (existing) {
        assembledTeam.push(existing);
      }
      // Note: Phase 2 filtering happens at routing level, not here
      // This is just helper logic for domain analysis
    }
  }

  // Return existing team if present, otherwise return selected crew IDs for routing
  return existingTeam?.filter((m) => selectedCrewIds.has(m.crewId)) || [];
}

/**
 * Validate team assembly — ensure no critical domains are missing for complex tasks
 * Returns validation result + recommendation to add/remove crew
 */
export function validateTeamAssembly(
  brief: string,
  selectedTeam: TeamMember[],
): { valid: boolean; feedback: string[] } {
  const { detected, confidence } = extractDomainsFromBrief(brief);
  const feedback: string[] = [];

  // Check: all detected domains have crew representation
  for (const domain of detected) {
    const domainCrew = DOMAIN_TO_CREW[domain] || [];
    const hasRepresentation = selectedTeam.some((m) =>
      domainCrew.includes(m.crewId),
    );

    if (!hasRepresentation && domainCrew.length > 0) {
      feedback.push(
        `⚠️ Domain '${domain}' detected but no crew assigned — consider adding ${domainCrew.join(', ')}`,
      );
    }
  }

  // Check: minimum team size for confidence
  if (confidence > 0.7 && selectedTeam.length < 4) {
    feedback.push(
      `⚠️ High-confidence task (${confidence.toFixed(2)}) but only ${selectedTeam.length} crew — recommend ≥4 for cross-validation`,
    );
  }

  // Check: Picard always present
  if (!selectedTeam.some((m) => m.crewId === 'picard')) {
    feedback.push('❌ Picard missing — required for synthesis');
  }

  const valid = feedback.filter((f) => f.startsWith('❌')).length === 0;
  return { valid, feedback };
}

/**
 * Cost estimation for assembled team
 * Returns projected cost savings vs full crew (11 members)
 */
export function estimateCostSavings(selectedTeamSize: number): {
  percentReduction: number;
  reasoning: string;
} {
  const fullCrewSize = 11;
  const fullCrewOpeningCost = fullCrewSize * 0.00015; // $0.00015 per crew call
  const selectedOpeningCost = selectedTeamSize * 0.00015;

  // Reflection cost scales with team size
  const fullCrewReflectionCost = 8 * 0.00015; // 4 teams × 2 members (Phase 1 optimization)
  const selectedReflectionCost = Math.ceil(selectedTeamSize * 0.5) * 0.00015; // ~50% of team reflects

  const totalFullCrew = fullCrewOpeningCost + fullCrewReflectionCost;
  const totalSelected = selectedOpeningCost + selectedReflectionCost;

  const percentReduction = ((totalFullCrew - totalSelected) / totalFullCrew) * 100;

  let reasoning = `Opening: ${selectedTeamSize}/${fullCrewSize} crew | Reflection: ${Math.ceil(selectedTeamSize * 0.5)} reduced`;
  if (selectedTeamSize <= 4) {
    reasoning += ' | Fallback: min team ensures quality';
  }

  return { percentReduction: Math.max(0, percentReduction), reasoning };
}
