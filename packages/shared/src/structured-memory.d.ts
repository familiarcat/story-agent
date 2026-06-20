import type { MemoryConstraint, MemoryDecision, MemoryFact, MemoryQuestion, MemorySource, ObservationDebateResult, StructuredMemoryState } from './index.js';
export declare const SOURCE_AUTHORITY: Record<MemorySource, number>;
export interface StructuredMemoryPatch {
    facts?: MemoryFact[];
    constraints?: MemoryConstraint[];
    decisions?: MemoryDecision[];
    openQuestions?: MemoryQuestion[];
}
export declare function initialStructuredMemoryState(): StructuredMemoryState;
export declare function mergeStructuredMemoryPatch(state: StructuredMemoryState, patch: StructuredMemoryPatch): StructuredMemoryState;
export declare function buildStructuredMemoryPatchFromDebate(input: {
    debate: ObservationDebateResult;
    source?: MemorySource;
    owner?: 'user' | 'assistant';
}): StructuredMemoryPatch;
export declare function summarizeStructuredMemory(state: StructuredMemoryState): {
    factCount: number;
    constraintCount: number;
    decisionCount: number;
    openQuestionCount: number;
    blockingQuestions: number;
};
//# sourceMappingURL=structured-memory.d.ts.map