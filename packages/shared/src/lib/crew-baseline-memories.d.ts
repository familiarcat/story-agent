/**
 * Crew Member Baseline Memories
 *
 * These are the foundational knowledge/memories for each crew member.
 * Seeded into sa_observation_memories table so the crew can reference them
 * during missions and learn from their own accumulated experience.
 */
export declare const CREW_BASELINE_MEMORIES: {
    picard: {
        role: string;
        baseline: string;
    };
    data: {
        role: string;
        baseline: string;
    };
    riker: {
        role: string;
        baseline: string;
    };
    geordi: {
        role: string;
        baseline: string;
    };
    obrien: {
        role: string;
        baseline: string;
    };
    worf: {
        role: string;
        baseline: string;
    };
    troi: {
        role: string;
        baseline: string;
    };
    crusher: {
        role: string;
        baseline: string;
    };
    uhura: {
        role: string;
        baseline: string;
    };
    quark: {
        role: string;
        baseline: string;
    };
    yar: {
        role: string;
        baseline: string;
    };
    quark_finance: {
        role: string;
        baseline: string;
    };
};
export declare function getCrewMemoryStory(crewId: keyof typeof CREW_BASELINE_MEMORIES): {
    id: string;
    referenceNum: string;
    name: string;
    description: string;
    status: string;
    url: string;
    acceptanceCriteria: string[];
} | null;
export declare function getAllCrewMemories(): {
    crewId: string;
    role: string;
    baseline: string;
}[];
//# sourceMappingURL=crew-baseline-memories.d.ts.map