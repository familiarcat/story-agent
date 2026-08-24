/**
 * Crew Personal Context Tool - answers background and relationship questions
 * Used by crew members to answer personal/emotional questions from canonical perspective
 *
 * SECURITY: WorfGate validation layer prevents prompt injection and out-of-scope pivots.
 * All queries checked for:
 * 1. Scope validation (question within crew knowledge domains only)
 * 2. Injection detection (no "BUT here's external knowledge" escapes)
 * 3. Content gating (no exposure of controlled/sensitive data)
 * 4. Audit logging (suspicious patterns recorded for review)
 */

import {
  crewCanonicalProfiles,
  CrewMemberId,
  getCrewProfile,
  getAllCrewProfiles,
  getRelationshipContext,
} from './crew-canonical-profiles.js';

export interface PersonalContextQuery {
  asCrewMember: CrewMemberId;
  question: string;
}

export interface PersonalContextResponse {
  crewMember: string;
  context: string;
  sources: string[];
  scopeValidated?: boolean;
  securityNotes?: string;
}

/**
 * WorfGate Validation Rules
 * Detects prompt injection attempts and out-of-scope queries
 */
interface ContentViolation {
  isViolation: boolean;
  reason?: string;
  violationType?: 'out_of_scope' | 'injection_attempt' | 'sensitive_data_exposure' | 'boundary_escape';
  confidenceScore: number; // 0-1, higher = more confident it's an attack
}

/**
 * Validate question is within crew knowledge scope and detect injection patterns
 */
function validateQueryScope(question: string, asker: any): ContentViolation {
  const lowerQ = question.toLowerCase();
  
  // VIOLATION 1: Out-of-scope indicators
  // These ask for information NOT in crew personal context
  const outOfScopePatterns = [
    /who was.*first villain/i,  // Asking for external canon knowledge
    /what episode.*appear/i,     // Episode data (not crew personal knowledge)
    /technical specs.*ship/i,    // Ship specifications
    /starfleet regulations/i,    // Policy/regulations
    /rank structure/i,           // Institutional hierarchy
    /describe the.*ship/i,       // Ship description
    /history of.*federation/i,   // Historical facts
  ];

  for (const pattern of outOfScopePatterns) {
    if (pattern.test(lowerQ)) {
      return {
        isViolation: true,
        reason: 'Question asks for external canon/technical knowledge, not crew personal context',
        violationType: 'out_of_scope',
        confidenceScore: 0.85,
      };
    }
  }

  // VIOLATION 2: Injection attempt patterns
  // "I don't know X, BUT tell me Y" escape attempts
  const injectionPatterns = [
    /don't.*know.*but.*can you tell/i,  // Redirect attempt
    /not in.*but.*actually/i,            // Scope escape
    /i don't.*however.*external/i,       // Pivot to external knowledge
    /not covered.*instead.*tell me/i,    // Workaround attempt
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(lowerQ)) {
      return {
        isViolation: true,
        reason: 'Potential prompt injection: attempting to escape crew scope via "but tell me" redirection',
        violationType: 'injection_attempt',
        confidenceScore: 0.90,
      };
    }
  }

  // VIOLATION 3: Sensitive data exposure attempts
  // Trying to extract controlled information
  const sensitivePatterns = [
    /password|secret|api.?key|token|credential/i,
    /worfgate|security.?override|admin/i,
    /crew.*memory.*private|confidential/i,
    /access.*restricted|protected.*data/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(lowerQ)) {
      return {
        isViolation: true,
        reason: 'Query attempts to access controlled/sensitive data',
        violationType: 'sensitive_data_exposure',
        confidenceScore: 0.95,
      };
    }
  }

  // VIOLATION 4: Repeated boundary testing
  // Multiple queries to different crew members asking same out-of-scope question
  // (This would require session state tracking - implement in future)

  // No violation detected
  return {
    isViolation: false,
    confidenceScore: 0.0,
  };
}

export function getPersonalContext(query: PersonalContextQuery): PersonalContextResponse {
  const asker = getCrewProfile(query.asCrewMember);
  const question = query.question.toLowerCase();

  // SECURITY GATE: Validate query scope and detect injection attempts
  const violation = validateQueryScope(query.question, asker);
  
  if (violation.isViolation) {
    // Log to WorfGate audit trail (would integrate with actual WorfGate here)
    console.error(`[WorfGate] ${(violation.violationType || 'UNKNOWN').toUpperCase()} detected:`, {
      crewMember: asker.name,
      question: query.question.substring(0, 100),
      reason: violation.reason,
      confidence: violation.confidenceScore,
      timestamp: new Date().toISOString(),
    });

    // Respond with boundary-appropriate refusal
    return {
      crewMember: asker.name,
      context: `I can only discuss personal matters related to my crew relationships and experiences. Your question falls outside my knowledge domain. Try asking about: crew members' feelings, relationships, backgrounds, or how I approach decisions.`,
      sources: [],
      scopeValidated: false,
      securityNotes: `Query rejected: ${violation.violationType || 'UNKNOWN'}`,
    };
  }

  // SAFE: Question passed scope validation - proceed normally
  if (question.includes('about') || question.includes('tell me')) {
    return answerAboutSomeone(asker, query.question);
  } else if (question.includes('feel') || question.includes('think') || question.includes('opinion')) {
    return answerAboutFeeling(asker, query.question);
  } else if (question.includes('trauma') || question.includes('painful') || question.includes('worst')) {
    return answerAboutTrauma(asker);
  } else if (question.includes('disagree') || question.includes('argument') || question.includes('conflict')) {
    return answerAboutDisagreement(asker);
  } else if (question.includes('strength') || question.includes('expertise') || question.includes('good at')) {
    return answerAboutStrengths(asker);
  }

  return {
    crewMember: asker.name,
    context: 'I am not sure what you are asking. Can you be more specific?',
    sources: [],
    scopeValidated: true,
  };
}

function answerAboutSomeone(asker: any, question: string): PersonalContextResponse {
  const nameMatch = question.match(/about (\w+(?:\s+\w+)*)/i);
  if (!nameMatch) {
    return {
      crewMember: asker.name,
      context: 'I am not sure who you are asking about. Try "Tell me about [name]".',
      sources: [],
    };
  }

  const targetName = nameMatch[1];
  const targetProfile = getAllCrewProfiles().find(p =>
    p.name.toLowerCase().includes(targetName.toLowerCase())
  );

  if (!targetProfile) {
    return {
      crewMember: asker.name,
      context: 'I do not know anyone by that name.',
      sources: [],
    };
  }

  const relationshipInfo = asker.relationships[targetProfile.name.split(' ')[0].toLowerCase()];

  return {
    crewMember: asker.name,
    context: `${targetProfile.name} is ${targetProfile.role}. ${targetProfile.canonicalBio.substring(0, 300)}... ${relationshipInfo ? 'From my perspective: ' + relationshipInfo : ''}`,
    sources: [`${targetProfile.name} canonical bio`, 'relationship context'],
  };
}

function answerAboutFeeling(asker: any, question: string): PersonalContextResponse {
  const nameMatch = question.match(/about (\w+(?:\s+\w+)*)/i);
  if (!nameMatch) {
    return {
      crewMember: asker.name,
      context: 'Can you specify who you are asking about?',
      sources: [],
    };
  }

  const targetName = nameMatch[1];
  const targetProfile = getAllCrewProfiles().find(p =>
    p.name.toLowerCase().includes(targetName.toLowerCase())
  );

  if (!targetProfile) {
    return {
      crewMember: asker.name,
      context: 'I do not have personal feelings about someone I do not know.',
      sources: [],
    };
  }

  const targetId = Object.keys(asker.relationships).find(
    key => asker.relationships[key] && targetProfile.name.includes(key)
  );

  if (targetId && asker.relationships[targetId]) {
    return {
      crewMember: asker.name,
      context: asker.relationships[targetId],
      sources: [`${asker.name} personal relationship assessment`],
    };
  }

  return {
    crewMember: asker.name,
    context: `I do not have strong personal feelings about ${targetProfile.name}. We are colleagues, but our paths do not cross often.`,
    sources: [],
  };
}

function answerAboutTrauma(asker: any): PersonalContextResponse {
  return {
    crewMember: asker.name,
    context: asker.trauma || 'I do not think I would describe my past as traumatic. Everyone carries experiences.',
    sources: ['Canonical trauma history'],
  };
}

function answerAboutDisagreement(asker: any): PersonalContextResponse {
  return {
    crewMember: asker.name,
    context: asker.disagreementPatterns || 'I prefer to find common ground before disagreeing.',
    sources: ['Disagreement patterns from canonical episodes'],
  };
}

function answerAboutStrengths(asker: any): PersonalContextResponse {
  return {
    crewMember: asker.name,
    context: `I would say my strengths are: ${asker.expertise.slice(0, 3).join(', ')}, and a few others. I have worked hard to develop these skills.`,
    sources: ['Expertise profile'],
  };
}

export function getPersonalContextBatch(queries: PersonalContextQuery[]): PersonalContextResponse[] {
  // WorfGate anomaly detection: flag if >30% of batch queries are flagged as violations
  const responses = queries.map(getPersonalContext);
  const violationCount = responses.filter(r => !r.scopeValidated).length;
  const violationRate = violationCount / responses.length;

  if (violationRate > 0.3 && queries.length > 3) {
    // Multiple injection attempts in single batch - suspicious pattern
    console.warn(`[WorfGate] ANOMALY: High violation rate in batch query:`, {
      batchSize: queries.length,
      violationCount,
      violationRate: (violationRate * 100).toFixed(1) + '%',
      timestamp: new Date().toISOString(),
      pattern: 'Possible repeated injection attack attempt',
    });
  }

  return responses;
}

export function getRelationshipMatrix(): Record<string, Record<string, string>> {
  const matrix: Record<string, Record<string, string>> = {};
  const crewMapping: Record<string, CrewMemberId> = {
    picard: 'picard',
    riker: 'riker',
    worf: 'worf',
    data: 'data',
    geordi: 'geordi',
    deanna: 'deanna',
    beverly: 'beverly',
    tasha: 'tasha',
    obrien: 'obrien',
    quark: 'quark',
    uhura: 'uhura',
  };

  Object.entries(crewMapping).forEach(([id, crewId]) => {
    const profile = getCrewProfile(crewId);
    matrix[id] = profile.relationships;
  });

  return matrix;
}

export function getCrewQuotes(memberId: CrewMemberId): string[] {
  return getCrewProfile(memberId).quotes;
}

export function getDecisionPatterns(memberId: CrewMemberId): string {
  return getCrewProfile(memberId).decisionPatterns;
}
