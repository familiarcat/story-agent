import type {
  MemoryConstraint,
  MemoryDecision,
  MemoryFact,
  MemoryQuestion,
  MemorySource,
  ObservationDebateResult,
  StructuredMemoryState,
  StructuredMemoryPatch,
} from './index.js';

export const SOURCE_AUTHORITY: Record<MemorySource, number> = {
  system: 4,
  user: 3,
  tool: 2,
  assistant: 1,
};

export function initialStructuredMemoryState(): StructuredMemoryState {
  return {
    facts: {},
    constraints: {},
    decisions: [],
    openQuestions: {},
  };
}

function rank(source: MemorySource): number {
  return SOURCE_AUTHORITY[source] ?? 0;
}

function decisionId(statement: unknown): string {
  const input = String(statement ?? '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function normalizeConfidence(confidence: number): number {
  return Math.max(0, Math.min(1, confidence));
}

function mergeFacts(existing: StructuredMemoryState['facts'], incoming: MemoryFact[] = []): StructuredMemoryState['facts'] {
  const next = { ...existing };

  for (const fact of incoming) {
    const candidate = { 
      ...fact, 
      confidence: normalizeConfidence(fact.confidence ?? 0.5),
      source: fact.source ?? 'assistant',
    };
    const current = next[candidate.key];
    if (!current) {
      next[candidate.key] = candidate;
      continue;
    }

    if (rank(candidate.source ?? 'assistant') > rank(current.source ?? 'assistant')) {
      next[candidate.key] = candidate;
      continue;
    }

    if (rank(candidate.source ?? 'assistant') === rank(current.source ?? 'assistant') && (candidate.confidence ?? 0) >= (current.confidence ?? 0)) {
      next[candidate.key] = candidate;
    }
  }

  return next;
}

function mergeConstraints(
  existing: StructuredMemoryState['constraints'],
  incoming: MemoryConstraint[] = []
): StructuredMemoryState['constraints'] {
  const next = { ...existing };

  for (const constraint of incoming) {
    const candidate = { 
      ...constraint, 
      confidence: normalizeConfidence(constraint.confidence ?? 0.5),
      source: constraint.source ?? 'assistant',
    };
    const current = next[candidate.key];
    if (!current) {
      next[candidate.key] = candidate;
      continue;
    }

    if (rank(candidate.source ?? 'assistant') > rank(current.source ?? 'assistant')) {
      next[candidate.key] = candidate;
      continue;
    }

    if (rank(candidate.source ?? 'assistant') === rank(current.source ?? 'assistant')) {
      if (candidate.enforcement === 'hard' && current.enforcement === 'soft') {
        next[candidate.key] = candidate;
        continue;
      }
      if ((candidate.confidence ?? 0) >= (current.confidence ?? 0)) {
        next[candidate.key] = candidate;
      }
    }
  }

  return next;
}

function mergeDecisions(existing: StructuredMemoryState['decisions'], incoming: MemoryDecision[] = []): StructuredMemoryState['decisions'] {
  const next = [...existing.map(item => ({ ...item }))];
  const byId = new Map<string, number[]>();

  for (let i = 0; i < next.length; i += 1) {
    const id = next[i]?.id;
    if (!id) continue;
    const list = byId.get(id) ?? [];
    list.push(i);
    byId.set(id, list);
  }

  for (const decision of incoming) {
    const id = decision.id || (decision.statement ? decisionId(decision.statement) : `decision-${Math.random()}`);
    const candidate: MemoryDecision = {
      ...decision,
      id,
      confidence: normalizeConfidence(decision.confidence ?? 0.5),
      source: decision.source ?? 'assistant',
    };

    const matches = byId.get(id) ?? [];
    for (const idx of matches) {
      const current = next[idx];
      if (!current) continue;
      const candidateRank = rank(candidate.source ?? 'assistant');
      const currentRank = rank(current.source ?? 'assistant');
      if (candidateRank > currentRank) {
        current.status = 'superseded';
      } else if (candidateRank === currentRank && (candidate.confidence ?? 0) >= (current.confidence ?? 0)) {
        current.status = 'superseded';
      }
    }

    next.push(candidate);
    byId.set(id, [...matches, next.length - 1]);
  }

  return next;
}

function mergeOpenQuestions(
  existing: StructuredMemoryState['openQuestions'],
  incoming: MemoryQuestion[] = []
): StructuredMemoryState['openQuestions'] {
  const next = { ...existing };

  for (const question of incoming) {
    const key = question.key || `question-${Math.random()}`;
    const candidate = { 
      ...question, 
      key,
      confidence: normalizeConfidence(question.confidence ?? 0.5),
      source: question.source ?? 'assistant',
    };
    const current = next[key];
    if (!current) {
      next[key] = candidate;
      continue;
    }

    if (current.resolved && !candidate.resolved) {
      continue;
    }

    next[key] = {
      ...current,
      ...candidate,
      blocking: current.blocking || candidate.blocking,
      confidence: Math.max(current.confidence ?? 0, candidate.confidence ?? 0),
      source: (rank(candidate.source ?? 'assistant') >= rank(current.source ?? 'assistant')) ? candidate.source : current.source,
    };
  }

  return next;
}

export function mergeStructuredMemoryPatch(
  state: StructuredMemoryState,
  patch: StructuredMemoryPatch
): StructuredMemoryState {
  return {
    facts: mergeFacts(state.facts, patch.facts),
    constraints: mergeConstraints(state.constraints, patch.constraints),
    decisions: mergeDecisions(state.decisions, patch.decisions),
    openQuestions: mergeOpenQuestions(state.openQuestions, patch.openQuestions),
  };
}

export function buildStructuredMemoryPatchFromDebate(input: {
  debate: ObservationDebateResult;
  source?: MemorySource;
  owner?: 'user' | 'assistant';
}): StructuredMemoryPatch {
  const source = input.source ?? 'assistant';
  const owner = input.owner ?? 'assistant';
  const finalDecision = input.debate?.finalDecision ?? 'revise';
  const consensusSummary = String(input.debate?.consensusSummary ?? '').trim();
  const unresolvedRisks = Array.isArray(input.debate?.unresolvedRisks)
    ? input.debate.unresolvedRisks
    : [];
  const actionItems = Array.isArray(input.debate?.actionItems)
    ? input.debate.actionItems
    : [];
  const decisionStatement = consensusSummary || `Decision: ${finalDecision}`;

  const facts: MemoryFact[] = [
    {
      key: 'observation.finalDecision',
      value: finalDecision,
      source,
      confidence: 0.9,
      evidence: consensusSummary,
    },
  ];

  const decisions: MemoryDecision[] = [
    {
      id: decisionId(decisionStatement),
      statement: decisionStatement,
      status: finalDecision === 'approved' ? 'accepted' : 'proposed',
      owner,
      source,
      confidence: 0.85,
      evidence: actionItems.join('; '),
    },
  ];

  const constraints: MemoryConstraint[] = unresolvedRisks.map((risk, idx) => ({
    key: `risk.${idx + 1}`,
    rule: `Mitigate risk: ${risk}`,
    naturalLanguage: `Avoid unresolved risk: ${risk}`,
    source,
    confidence: 0.75,
    enforcement: 'soft',
    evidence: consensusSummary,
  }));

  const openQuestions: MemoryQuestion[] = unresolvedRisks.map((risk, idx) => ({
    key: `question.risk.${idx + 1}`,
    question: `How will we address risk: ${risk}?`,
    blocking: true,
    resolved: false,
    source,
    confidence: 0.7,
    evidence: risk,
  }));

  return { facts, constraints, decisions, openQuestions };
}

export function summarizeStructuredMemory(state: StructuredMemoryState): {
  factCount: number;
  constraintCount: number;
  decisionCount: number;
  openQuestionCount: number;
  blockingQuestions: number;
} {
  const questions = Object.values(state.openQuestions);
  return {
    factCount: Object.keys(state.facts).length,
    constraintCount: Object.keys(state.constraints).length,
    decisionCount: state.decisions.length,
    openQuestionCount: questions.length,
    blockingQuestions: questions.filter(item => item.blocking && !item.resolved).length,
  };
}
