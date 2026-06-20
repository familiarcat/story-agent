/**
 * Documentation corpus retrieval helpers.
 * Query vectorized docs for phase-aware, agent-accessible guidance.
 */
export interface DocKnowledgeChunk {
    id: string;
    doc_id: string;
    doc_path: string;
    phase: string;
    title: string;
    heading: string | null;
    chunk_index: number;
    tags: string[];
    content_text: string;
    similarity?: number;
}
export interface DocRetrievalOptions {
    phase?: string;
    tags?: string[];
    query?: string;
    limit?: number;
}
/**
 * Retrieve doc chunks filtered by phase/tags, optionally ranked by semantic similarity.
 */
export declare function retrieveDocKnowledge(options: DocRetrievalOptions): Promise<DocKnowledgeChunk[]>;
/**
 * List available doc phases (for UI phase selector).
 */
export declare function listDocPhases(): Promise<string[]>;
/**
 * Get guidance for a specific role (filtered by tags, limited to current phase).
 */
export declare function getRoleGuidance(role: 'project_manager' | 'developer' | 'lead', phase?: string): Promise<DocKnowledgeChunk[]>;
/**
 * Full-text search across doc corpus (in Markdown content).
 */
export declare function searchDocs(keyword: string, phase?: string): Promise<DocKnowledgeChunk[]>;
//# sourceMappingURL=db-docs.d.ts.map