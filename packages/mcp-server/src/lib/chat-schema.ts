/**
 * Unified Chat Schema — HTTP contract for VSCode ↔ Shared Service integration.
 *
 * This module defines the canonical types and validators for chat requests/responses
 * across all Story Agent surfaces (VSCode extension, web UI, CLI). It ensures:
 *
 * 1. **Type Safety**: TypeScript interfaces + Zod runtime validators
 * 2. **Backward Compatibility**: Supports legacy `CanonicalChatRequest` format
 * 3. **Cost Attribution**: Token counts, cost tracking, crew member attribution
 * 4. **WorfGate Scoping**: crewId field for credential access control
 * 5. **Session Tracking**: userId, sessionId, timestamps for analytics
 * 6. **Priority Levels**: high (real-time) vs low (batched) processing
 * 7. **Model Hints**: Optional tier/model preferences for Quark routing
 *
 * HTTP Contract (POST /chat):
 * - Request: ChatRequest (union of UnifiedChatMessage | LegacyCanonicalChatRequest)
 * - Response: ChatResponse with cost metadata, sources, crew attribution
 *
 * Validation:
 * - Use `ChatRequestSchema.parse()` for untrusted input (throws on invalid)
 * - Use `ChatRequestSchema.safeParse()` for defensive parsing
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// 1. MESSAGE SCHEMA
// ────────────────────────────────────────────────────────────────────────────

/**
 * Attachment metadata for rich content (images, audio, files).
 * Size limits enforced at upload time; dataUrl includes base64 or reference.
 */
const ChatAttachmentSchema = z.object({
  /** Filename, max 160 characters */
  name: z.string().min(1).max(160),
  /** MIME type (e.g., 'image/png', 'audio/mp3', 'application/json') */
  mimeType: z.string().min(1).max(256),
  /** File size in bytes; 0 indicates unknown/external */
  size: z.number().nonnegative().int(),
  /** Optional: base64-encoded data URL or external reference */
  dataUrl: z.string().optional(),
}).strict();

export type ChatAttachment = z.infer<typeof ChatAttachmentSchema>;

/**
 * Single turn in chat history (immutable).
 * role: 'user' for user input, 'assistant' for crew/system responses.
 */
const ChatHistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
}).strict();

export type ChatHistoryTurn = z.infer<typeof ChatHistoryTurnSchema>;

// ────────────────────────────────────────────────────────────────────────────
// 2. SESSION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

/**
 * Session metadata for cost attribution and user tracking.
 * Persisted in local database for analytics, replay, and WorfGate auditing.
 */
const ChatSessionSchema = z.object({
  /** Unique session ID (UUID or sequential), generated server-side if omitted */
  sessionId: z.string().min(1).max(256),
  /** User ID or email; used for multi-user workspaces and entitlement checks */
  userId: z.string().optional(),
  /** Client org ID (e.g., 'familiarcat', 'client-int') for isolated RAG/policies */
  clientId: z.string().optional(),
  /** Crew member assigned to this session (for WorfGate credential scoping) */
  crewId: z.string().optional(),
  /** Session start timestamp (ISO 8601) */
  startedAt: z.string().datetime(),
  /** Session last activity timestamp (ISO 8601) */
  lastActivityAt: z.string().datetime(),
  /** Custom metadata bag for extensibility */
  metadata: z.record(z.unknown()).optional(),
}).strict();

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// 3. UNIFIED CHAT REQUEST
// ────────────────────────────────────────────────────────────────────────────

/**
 * Unified chat message request from any surface (VSCode, web, CLI).
 * Supports rich attachments, cost tracking, and WorfGate credential scoping.
 */
const UnifiedChatMessageSchema = z.object({
  /** The user's prompt/message */
  message: z.string().min(1).max(10_000),

  /** Optional conversation history (last 8 turns kept by server) */
  history: z.array(ChatHistoryTurnSchema).max(8).optional(),

  /** Optional attachments (images, audio, files) */
  attachments: z.array(ChatAttachmentSchema).max(6).optional(),

  // Session & Attribution
  /** Session context (generated server-side if omitted) */
  session: ChatSessionSchema.optional(),

  /** Unique request ID for tracing and deduplication (UUID) */
  requestId: z.string().uuid().optional(),

  // Cost & Governance
  /** Crew member ID authorizing this request (WorfGate scoping) */
  crewId: z.string().optional(),

  /** Client organization ID for isolated RAG and policies */
  clientId: z.string().optional(),

  /** User ID/email for multi-user workspace entitlements */
  userId: z.string().optional(),

  // Routing & Optimization
  /** Priority: 'high' (interactive, default) or 'low' (batched) */
  priority: z.enum(['high', 'low']).optional(),

  /** Optional tier hint to override complexity-based routing */
  tier: z.enum(['simple', 'complex']).optional(),

  /** Optional preferred model ID (e.g., 'deepseek/deepseek-chat') */
  preferredModel: z.string().optional(),

  // Crew Coordination
  /** Enable crew self-organization preflight (RAG context, team assembly) */
  crewSelfOrganize: z.boolean().optional(),

  /** Force all-hands crew participation (expensive, used for critical tasks) */
  forceAllHands: z.boolean().optional(),

  // Optimization
  /** Prompt optimization mode: 'safe' (default), 'off' (no optimization) */
  promptOptimizationMode: z.enum(['safe', 'off']).optional(),

  /** Disable crew preflight (for performance-critical requests) */
  noCrewPreflight: z.boolean().optional(),
}).strict();

export type UnifiedChatMessage = z.infer<typeof UnifiedChatMessageSchema>;

// ────────────────────────────────────────────────────────────────────────────
// 4. LEGACY SUPPORT (Backward Compatibility)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Legacy `CanonicalChatRequest` format (pre-unified schema).
 * Supported for backward compatibility; automatically normalized to UnifiedChatMessage.
 */
const LegacyCanonicalChatRequestSchema = z.object({
  message: z.string().min(1).max(10_000),
  history: z.array(ChatHistoryTurnSchema).max(8).optional(),
  clientId: z.string().nullable().optional(),
  crewSelfOrganize: z.boolean().optional(),
  promptOptimizationMode: z.enum(['safe', 'off']).optional(),
  attachments: z.array(ChatAttachmentSchema).max(6).optional(),
}).strict();

export type LegacyCanonicalChatRequest = z.infer<typeof LegacyCanonicalChatRequestSchema>;

// Union of new and legacy request types
export type ChatRequest = UnifiedChatMessage | LegacyCanonicalChatRequest;

export const ChatRequestSchema = z.union([
  UnifiedChatMessageSchema,
  LegacyCanonicalChatRequestSchema,
]);

// ────────────────────────────────────────────────────────────────────────────
// 5. CHAT RESPONSE SCHEMA (with cost & crew metadata)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Cost breakdown for a single chat turn.
 * Used for budget tracking, Section 31 metrics, and WorfGate auditing.
 */
const ChatCostAnalysisSchema = z.object({
  /** Crew preflight (self-organization, RAG recall) cost in USD */
  crewPreparationCostUSD: z.number().nonnegative(),
  crewPreparationTokens: z.number().nonnegative().int(),

  /** LLM chat completion cost in USD */
  chatCostUSD: z.number().nonnegative(),
  chatTokensIn: z.number().nonnegative().int(),
  chatTokensOut: z.number().nonnegative().int(),
  chatTotalTokens: z.number().nonnegative().int(),

  /** Optional: execution (plan-then-execute) cost if activated */
  executionRunCostUSD: z.number().nonnegative().optional(),
  executionRunTokens: z.number().nonnegative().int().optional(),

  /** Total across all components */
  totalCostUSD: z.number().nonnegative(),
  totalTokens: z.number().nonnegative().int(),

  /** Provider used (OpenAI, DeepSeek, etc.) */
  provider: z.string().min(1),

  /** Optimization rules applied (e.g., 'normalize-whitespace', 'missing-context-guard') */
  optimizationRules: z.array(z.string()),

  /** Execution mode: 'chat' or 'plan-then-execute' */
  mode: z.enum(['chat', 'plan-then-execute']).optional(),
}).strict();

export type ChatCostAnalysis = z.infer<typeof ChatCostAnalysisSchema>;

/**
 * Prompt optimization metadata.
 */
const ChatPromptOptimizationSchema = z.object({
  /** Whether optimization was applied */
  applied: z.boolean(),
  originalChars: z.number().nonnegative().int(),
  optimizedChars: z.number().nonnegative().int(),
  netCharDelta: z.number().int(),
  rules: z.array(z.string()),
}).strict();

export type ChatPromptOptimization = z.infer<typeof ChatPromptOptimizationSchema>;

/**
 * WorfGate security assessment of the prompt.
 */
const ChatWorfGateSecuritySchema = z.object({
  /** Is the request protected by WorfGate? */
  protected: z.boolean(),
  /** Risk level: 'low' (safe) or 'elevated' (injection signals detected) */
  riskLevel: z.enum(['low', 'elevated']),
  /** Detected injection signals (empty if low risk) */
  detectedSignals: z.array(z.string()),
  /** Directives blocked due to detected signals */
  blockedDirectives: z.array(z.string()),
}).strict();

export type ChatWorfGateSecurity = z.infer<typeof ChatWorfGateSecuritySchema>;

/**
 * The unified response sent back to VSCode/web/CLI.
 * Contains answer, cost metadata, crew attribution, and security context.
 */
const ChatResponseSchema = z.object({
  /** The assistant's answer/response text */
  answer: z.string().min(1),

  /** Model used (e.g., 'deepseek/deepseek-chat', 'openai/gpt-4o-mini') */
  model: z.string().min(1),

  /** Provider (OpenRouter, Anthropic, OpenAI, etc.) */
  provider: z.string().min(1),

  /** Capability tier used: 3 (cost-optimized) or 4 (quality/complex) */
  tier: z.union([z.literal(3), z.literal(4)]),

  /** Token counts */
  tokensIn: z.number().nonnegative().int(),
  tokensOut: z.number().nonnegative().int(),

  /** Approximate cost in USD (for budgeting) */
  costUSD: z.number().nonnegative(),

  /** Sources consulted (crew RAG memories, documentation, editor context) */
  sources: z.array(z.string()),

  // Metadata & Attribution
  /** Request ID for tracing (same as request) */
  requestId: z.string().optional(),

  /** Crew member IDs that contributed (for multi-agent accountability) */
  crewContributors: z.array(z.string()).optional(),

  /** Cost breakdown for analytics and governance */
  costAnalysis: ChatCostAnalysisSchema,

  /** Prompt optimization applied */
  promptOptimization: ChatPromptOptimizationSchema,

  /** WorfGate security assessment */
  worfGate: ChatWorfGateSecuritySchema,

  // Optional: Advanced Features
  /** Crew self-organization metadata (if enabled) */
  crewSelfOrganization: z.object({
    enabled: z.boolean(),
    goals: z.string(),
    missionPlan: z.string(),
    teams: z.array(z.object({
      teamId: z.string(),
      label: z.string(),
      members: z.array(z.string()),
    })),
  }).optional(),

  /** Rule of Three alternatives (if crew variance detected) */
  crewVariance: z.object({
    exists: z.boolean(),
    alternatives: z.array(z.object({
      label: z.string(),
      plan: z.string(),
      cost: z.number(),
      risk: z.string(),
      reasoning: z.string(),
    })),
    recommendation: z.string(),
    userActionRequired: z.boolean(),
  }).optional(),

  /** Execution activation metadata (if 'make-it-so'/'next-steps' phrase detected) */
  executionActivation: z.object({
    activated: z.boolean(),
    phrase: z.union([z.literal('make-it-so'), z.literal('next-steps'), z.literal(null)]),
    iterations: z.number().int(),
    toolCalls: z.number().int(),
    escalated: z.boolean(),
    stalled: z.boolean(),
  }).optional(),
}).strict();

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ────────────────────────────────────────────────────────────────────────────
// 6. VALIDATORS & UTILITIES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a legacy request to the unified schema.
 * Returns UnifiedChatMessage ready for crew processing.
 */
export function normalizeChatRequest(input: ChatRequest): UnifiedChatMessage {
  const parsed = ChatRequestSchema.parse(input);

  // If it's already UnifiedChatMessage, return as-is
  if ('priority' in parsed || 'tier' in parsed || 'preferredModel' in parsed) {
    return parsed as UnifiedChatMessage;
  }

  // Otherwise, it's legacy format — transform to unified
  const legacy = parsed as LegacyCanonicalChatRequest;
  return {
    message: legacy.message,
    history: legacy.history,
    attachments: legacy.attachments,
    clientId: legacy.clientId ?? undefined,
    crewSelfOrganize: legacy.crewSelfOrganize,
    promptOptimizationMode: legacy.promptOptimizationMode,
    priority: 'high',
    tier: undefined,
  };
}

/**
 * Safe parse with detailed error reporting.
 * Returns { ok: true, data } or { ok: false, error }.
 */
export function validateChatRequest(input: unknown): { ok: true; data: ChatRequest } | { ok: false; error: string } {
  const result = ChatRequestSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const issues = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { ok: false, error: issues };
}

/**
 * Validate a chat response (defensive, for testing/auditing).
 */
export function validateChatResponse(input: unknown): { ok: true; data: ChatResponse } | { ok: false; error: string } {
  const result = ChatResponseSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const issues = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { ok: false, error: issues };
}

// ────────────────────────────────────────────────────────────────────────────
// 7. HTTP CONTRACT SUMMARY
// ────────────────────────────────────────────────────────────────────────────

/**
 * HTTP Contract for VSCode ↔ Shared Service integration.
 *
 * POST /chat
 * Content-Type: application/json
 *
 * REQUEST:
 * {
 *   message: string,                           // Required: user prompt
 *   history?: Array<{ role, content }>,        // Optional: conversation history
 *   attachments?: Array<{ name, mimeType, size, dataUrl }>,  // Optional: rich content
 *   session?: { sessionId, userId, clientId, crewId, startedAt, lastActivityAt },
 *   crewId?: string,                           // Optional: crew member (WorfGate scoping)
 *   clientId?: string,                         // Optional: org ID (RAG isolation)
 *   userId?: string,                           // Optional: user entitlements
 *   priority?: 'high' | 'low',                 // Optional: routing priority
 *   tier?: 'simple' | 'complex',               // Optional: model tier hint
 *   preferredModel?: string,                   // Optional: model preference
 *   crewSelfOrganize?: boolean,                // Optional: enable preflight (default true)
 *   forceAllHands?: boolean,                   // Optional: all-hands crew
 *   promptOptimizationMode?: 'safe' | 'off',   // Optional: optimization
 *   noCrewPreflight?: boolean,                 // Optional: disable preflight
 * }
 *
 * RESPONSE (200 OK):
 * {
 *   answer: string,                            // Assistant's response
 *   model: string,                             // Model used
 *   provider: string,                          // Provider name
 *   tier: 3 | 4,                               // Capability tier
 *   tokensIn: number,                          // Input tokens
 *   tokensOut: number,                         // Output tokens
 *   costUSD: number,                           // Approximate cost
 *   sources: string[],                         // Consulted sources
 *   costAnalysis: { ... },                     // Detailed cost breakdown
 *   promptOptimization: { ... },               // Optimization metadata
 *   worfGate: { ... },                         // Security assessment
 *   crewSelfOrganization?: { ... },            // Crew preflight (if enabled)
 *   crewVariance?: { ... },                    // Rule of Three (if divergent)
 *   executionActivation?: { ... },             // Execution (if activated)
 * }
 *
 * ERROR RESPONSES:
 * 400 Bad Request   — Invalid request format (see error.message)
 * 401 Unauthorized  — WorfGate credential denied
 * 429 Too Many Requests — Rate limited or budget exceeded
 * 502 Bad Gateway   — Crew system unreachable
 * 503 Service Unavailable — OpenRouter down
 */

/**
 * Export validators for use in request handlers.
 */
export { ChatResponseSchema };
