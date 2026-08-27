/**
 * mission-execution-stream.ts
 * Real-time execution log types for Mission live feed
 * 
 * These types are streamed to clients via WebSocket as crew executes missions.
 * Only levels 'info', 'action', 'escalation' are displayed in UI.
 * 'debug' is filtered out (used for internal crew logging only).
 */

import { z } from 'zod';

// ============================================================================
// MISSION EXECUTION LOG ENTRY (Individual log line from crew)
// ============================================================================

export const MissionExecutionLogEntrySchema = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  crewId: z.string().min(1), // 'data', 'picard', 'troi', 'geordi', etc.
  
  // Log level (filtering happens on UI side)
  level: z.enum(['debug', 'info', 'action', 'escalation']),
  
  // Domain of the work (for grouping/filtering if needed)
  domain: z.string().optional(),
  
  // The natural language narration
  text: z.string().min(1).max(2000),
  
  // Optional emoji for quick visual parsing
  emoji: z.string().optional(),
  
  // Arbitrary metadata (e.g., number of files processed, memory used, etc.)
  metadata: z.record(z.any()).optional(),
  
  // Timestamp (server time)
  createdAt: z.date(),
  
  // File references (if applicable)
  fileReferences: z
    .array(
      z.object({
        file: z.string(),
        line: z.number().int().positive(),
      })
    )
    .optional(),
});

export type MissionExecutionLogEntry = z.infer<typeof MissionExecutionLogEntrySchema>;

// ============================================================================
// STREAMING REQUEST (For WebSocket subscription)
// ============================================================================

export const MissionStreamSubscribeSchema = z.object({
  missionId: z.string().uuid(),
  levels: z.array(z.enum(['debug', 'info', 'action', 'escalation'])).optional(),
  // If levels is omitted, defaults to ['info', 'action', 'escalation']
});

export type MissionStreamSubscribe = z.infer<typeof MissionStreamSubscribeSchema>;

// ============================================================================
// STREAMING RESPONSE (Message sent over WebSocket)
// ============================================================================

export const MissionStreamMessageSchema = z.union([
  z.object({
    type: z.literal('log'),
    data: MissionExecutionLogEntrySchema,
  }),
  z.object({
    type: z.literal('status'),
    data: z.object({
      missionId: z.string().uuid(),
      status: z.enum(['running', 'complete', 'failed']),
      message: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('error'),
    data: z.object({
      message: z.string(),
    }),
  }),
]);

export type MissionStreamMessage = z.infer<typeof MissionStreamMessageSchema>;

// ============================================================================
// EMIT HELPER FUNCTIONS (For crew to emit logs)
// ============================================================================

/**
 * Creates an info-level log entry (progress update, neutral tone)
 * Example: "Found 3 violations in TypeScript files"
 */
export function createInfoLog(
  missionId: string,
  crewId: string,
  text: string,
  emoji?: string,
  metadata?: Record<string, any>
): MissionExecutionLogEntry {
  return {
    id: crypto.randomUUID?.() || require('uuid').v4(),
    missionId,
    crewId,
    level: 'info',
    text,
    emoji,
    metadata,
    createdAt: new Date(),
  };
}

/**
 * Creates an action-level log entry (decision, outcome, next step)
 * Example: "Ready to show detailed findings?"
 */
export function createActionLog(
  missionId: string,
  crewId: string,
  text: string,
  emoji?: string,
  metadata?: Record<string, any>
): MissionExecutionLogEntry {
  return {
    id: crypto.randomUUID?.() || require('uuid').v4(),
    missionId,
    crewId,
    level: 'action',
    text,
    emoji,
    metadata,
    createdAt: new Date(),
  };
}

/**
 * Creates an escalation-level log entry (crew needs user decision)
 * Example: "We have a fundamental tradeoff..."
 */
export function createEscalationLog(
  missionId: string,
  crewId: string,
  text: string,
  emoji?: string,
  metadata?: Record<string, any>
): MissionExecutionLogEntry {
  return {
    id: crypto.randomUUID?.() || require('uuid').v4(),
    missionId,
    crewId,
    level: 'escalation',
    text,
    emoji,
    metadata,
    createdAt: new Date(),
  };
}

/**
 * Creates a debug-level log entry (internal crew logging, NOT shown to user)
 * Example: "Processing file src/utils/helpers.ts (42 lines)"
 */
export function createDebugLog(
  missionId: string,
  crewId: string,
  text: string,
  metadata?: Record<string, any>
): MissionExecutionLogEntry {
  return {
    id: crypto.randomUUID?.() || require('uuid').v4(),
    missionId,
    crewId,
    level: 'debug',
    text,
    metadata,
    createdAt: new Date(),
  };
}

// ============================================================================
// VALIDATION EXPORTS
// ============================================================================

export const validateExecutionLogEntry = (data: unknown): MissionExecutionLogEntry => {
  return MissionExecutionLogEntrySchema.parse(data);
};

export const validateStreamSubscribe = (data: unknown): MissionStreamSubscribe => {
  return MissionStreamSubscribeSchema.parse(data);
};

export const validateStreamMessage = (data: unknown): MissionStreamMessage => {
  return MissionStreamMessageSchema.parse(data);
};
