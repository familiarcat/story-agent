"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_AUTHORITY = void 0;
exports.initialStructuredMemoryState = initialStructuredMemoryState;
exports.mergeStructuredMemoryPatch = mergeStructuredMemoryPatch;
exports.buildStructuredMemoryPatchFromDebate = buildStructuredMemoryPatchFromDebate;
exports.summarizeStructuredMemory = summarizeStructuredMemory;
exports.SOURCE_AUTHORITY = {
    system: 4,
    user: 3,
    tool: 2,
    assistant: 1,
};
function initialStructuredMemoryState() {
    return {
        facts: {},
        constraints: {},
        decisions: [],
        openQuestions: {},
    };
}
function rank(source) {
    return exports.SOURCE_AUTHORITY[source] ?? 0;
}
function decisionId(statement) {
    const input = String(statement ?? '').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
function normalizeConfidence(confidence) {
    return Math.max(0, Math.min(1, confidence));
}
function mergeFacts(existing, incoming = []) {
    const next = { ...existing };
    for (const fact of incoming) {
        const candidate = { ...fact, confidence: normalizeConfidence(fact.confidence) };
        const current = next[candidate.key];
        if (!current) {
            next[candidate.key] = candidate;
            continue;
        }
        if (rank(candidate.source) > rank(current.source)) {
            next[candidate.key] = candidate;
            continue;
        }
        if (rank(candidate.source) === rank(current.source) && candidate.confidence >= current.confidence) {
            next[candidate.key] = candidate;
        }
    }
    return next;
}
function mergeConstraints(existing, incoming = []) {
    const next = { ...existing };
    for (const constraint of incoming) {
        const candidate = { ...constraint, confidence: normalizeConfidence(constraint.confidence) };
        const current = next[candidate.key];
        if (!current) {
            next[candidate.key] = candidate;
            continue;
        }
        if (rank(candidate.source) > rank(current.source)) {
            next[candidate.key] = candidate;
            continue;
        }
        if (rank(candidate.source) === rank(current.source)) {
            if (candidate.enforcement === 'hard' && current.enforcement === 'soft') {
                next[candidate.key] = candidate;
                continue;
            }
            if (candidate.confidence >= current.confidence) {
                next[candidate.key] = candidate;
            }
        }
    }
    return next;
}
function mergeDecisions(existing, incoming = []) {
    const next = [...existing.map(item => ({ ...item }))];
    const byId = new Map();
    for (let i = 0; i < next.length; i += 1) {
        const id = next[i]?.id;
        if (!id)
            continue;
        const list = byId.get(id) ?? [];
        list.push(i);
        byId.set(id, list);
    }
    for (const decision of incoming) {
        const id = decision.id || decisionId(decision.statement);
        const candidate = {
            ...decision,
            id,
            confidence: normalizeConfidence(decision.confidence),
        };
        const matches = byId.get(id) ?? [];
        for (const idx of matches) {
            const current = next[idx];
            if (!current)
                continue;
            if (rank(candidate.source) > rank(current.source)) {
                current.status = 'superseded';
            }
            else if (rank(candidate.source) === rank(current.source) && candidate.confidence >= current.confidence) {
                current.status = 'superseded';
            }
        }
        next.push(candidate);
        byId.set(id, [...matches, next.length - 1]);
    }
    return next;
}
function mergeOpenQuestions(existing, incoming = []) {
    const next = { ...existing };
    for (const question of incoming) {
        const candidate = { ...question, confidence: normalizeConfidence(question.confidence) };
        const current = next[candidate.key];
        if (!current) {
            next[candidate.key] = candidate;
            continue;
        }
        if (current.resolved && !candidate.resolved) {
            continue;
        }
        next[candidate.key] = {
            ...current,
            ...candidate,
            blocking: current.blocking || candidate.blocking,
            confidence: Math.max(current.confidence, candidate.confidence),
            source: rank(candidate.source) >= rank(current.source) ? candidate.source : current.source,
        };
    }
    return next;
}
function mergeStructuredMemoryPatch(state, patch) {
    return {
        facts: mergeFacts(state.facts, patch.facts),
        constraints: mergeConstraints(state.constraints, patch.constraints),
        decisions: mergeDecisions(state.decisions, patch.decisions),
        openQuestions: mergeOpenQuestions(state.openQuestions, patch.openQuestions),
    };
}
function buildStructuredMemoryPatchFromDebate(input) {
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
    const facts = [
        {
            key: 'observation.finalDecision',
            value: finalDecision,
            source,
            confidence: 0.9,
            evidence: consensusSummary,
        },
    ];
    const decisions = [
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
    const constraints = unresolvedRisks.map((risk, idx) => ({
        key: `risk.${idx + 1}`,
        rule: `Mitigate risk: ${risk}`,
        naturalLanguage: `Avoid unresolved risk: ${risk}`,
        source,
        confidence: 0.75,
        enforcement: 'soft',
        evidence: consensusSummary,
    }));
    const openQuestions = unresolvedRisks.map((risk, idx) => ({
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
function summarizeStructuredMemory(state) {
    const questions = Object.values(state.openQuestions);
    return {
        factCount: Object.keys(state.facts).length,
        constraintCount: Object.keys(state.constraints).length,
        decisionCount: state.decisions.length,
        openQuestionCount: questions.length,
        blockingQuestions: questions.filter(item => item.blocking && !item.resolved).length,
    };
}
//# sourceMappingURL=structured-memory.js.map