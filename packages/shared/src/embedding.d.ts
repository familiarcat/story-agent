/**
 * Pure embedding and vector math utilities.
 * Shared by db.ts and db-docs.ts — exported for testing and reuse.
 */
export declare const EMBEDDING_DIMENSION = 64;
/**
 * Deterministic 64-dim embedding from a string using SHA-256 byte normalization.
 * Same input always produces the same vector (no API calls required).
 */
export declare function toEmbedding(text: string, dimension?: number): number[];
/**
 * Serialize a number[] to Postgres vector literal: [x,y,z,...]
 */
export declare function toPgVector(vector: number[]): string;
/**
 * Parse a Postgres vector literal or plain number[] back to number[].
 */
export declare function parseVector(value: unknown): number[];
/**
 * Cosine similarity between two vectors. Returns 0 for zero-magnitude inputs.
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
//# sourceMappingURL=embedding.d.ts.map