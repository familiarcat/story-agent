"use strict";
/**
 * Pure embedding and vector math utilities.
 * Shared by db.ts and db-docs.ts — exported for testing and reuse.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_DIMENSION = void 0;
exports.toEmbedding = toEmbedding;
exports.toPgVector = toPgVector;
exports.parseVector = parseVector;
exports.cosineSimilarity = cosineSimilarity;
const crypto_1 = require("crypto");
exports.EMBEDDING_DIMENSION = 64;
/**
 * Deterministic 64-dim embedding from a string using SHA-256 byte normalization.
 * Same input always produces the same vector (no API calls required).
 */
function toEmbedding(text, dimension = exports.EMBEDDING_DIMENSION) {
    const vector = [];
    for (let i = 0; i < dimension; i++) {
        const digest = (0, crypto_1.createHash)('sha256').update(`${i}:${text}`).digest();
        // Normalize byte [0,255] to [-1,1]
        vector.push((digest[0] / 127.5) - 1);
    }
    return vector;
}
/**
 * Serialize a number[] to Postgres vector literal: [x,y,z,...]
 */
function toPgVector(vector) {
    return `[${vector.map(v => Number(v.toFixed(6))).join(',')}]`;
}
/**
 * Parse a Postgres vector literal or plain number[] back to number[].
 */
function parseVector(value) {
    if (Array.isArray(value)) {
        return value.map(v => Number(v)).filter(v => Number.isFinite(v));
    }
    if (typeof value !== 'string')
        return [];
    const trimmed = value.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']'))
        return [];
    return trimmed
        .slice(1, -1)
        .split(',')
        .map(part => Number(part.trim()))
        .filter(v => Number.isFinite(v));
}
/**
 * Cosine similarity between two vectors. Returns 0 for zero-magnitude inputs.
 */
function cosineSimilarity(a, b) {
    const n = Math.min(a.length, b.length);
    if (n === 0)
        return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < n; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
//# sourceMappingURL=embedding.js.map