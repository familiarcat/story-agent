/**
 * Crew Personal Context Tool - answers background and relationship questions
 * Used by crew members to answer personal/emotional questions from canonical perspective
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
}

export function getPersonalContext(query: PersonalContextQuery): PersonalContextResponse {
  const asker = getCrewProfile(query.asCrewMember);
  const question = query.question.toLowerCase();

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
  return queries.map(getPersonalContext);
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
