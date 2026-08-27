/**
 * mission-types.ts
 * Core TypeScript schemas for Story Agent mission system
 * 
 * Covers:
 * - Mission lifecycle (creation → execution → outcomes)
 * - Auto-classification (category A1-B3)
 * - Real-time execution stream
 * - Findings parsing + aggregation
 * 
 * All schemas use Zod v3 for validation.
 */

import { z } from 'zod';

// ============================================================================
// MISSION CATEGORIES (Per crew consensus)
// ============================================================================

export type MissionCategory = 'A1' | 'A2' | 'B1' | 'B2' | 'B3';

export const MissionCategoryEnum = z.enum(['A1', 'A2', 'B1', 'B2', 'B3']);

export type MissionInfraType = 'ephemeral' | 'persistent';

export const MissionInfraTypeEnum = z.enum(['ephemeral', 'persistent']);

// ============================================================================
// MISSION FINDING SCHEMA (Individual issue discovered by crew)
// ============================================================================

export const MissionFindingSchema = z.object({
  id: z.string().uuid(),
  issue: z.string().min(5), // e.g., "Missing return type annotation"
  file: z.string(), // e.g., "src/utils/helpers.ts"
  line: z.number().int().positive(),
  suggestedFix: z.string(), // e.g., "Add -> Promise<string>"
  owner: z.string(), // e.g., "Frontend team" or crew member name
  effortMinutes: z.number().int().min(1).max(480),
  severity: z.enum(['low', 'medium', 'high']),
});

export type MissionFinding = z.infer<typeof MissionFindingSchema>;

// ============================================================================
// MISSION AUTO-CLASSIFICATION SCHEMA
// ============================================================================

export const MissionClassificationSchema = z.object({
  category: MissionCategoryEnum,
  infraType: MissionInfraTypeEnum,
  confidence: z.number().min(0).max(1), // 0.0–1.0 confidence score
  reasoning: z.string(), // Why it matched this category
});

export type MissionClassification = z.infer<typeof MissionClassificationSchema>;

// ============================================================================
// MISSION COST SCHEMA (Tracking + estimation)
// ============================================================================

export const MissionCostSchema = z.object({
  estimatedUSD: z.number().min(0).max(10),
  actualUSD: z.number().min(0).max(10).optional(),
  modelTier: z.enum(['frugal', 'standard', 'frontier']),
  breakdown: z
    .record(z.string(), z.number())
    .optional() // { 'data': 0.001, 'picard': 0.002 }
    .describe('Token costs per crew member'),
  tokensUsed: z.number().int().min(0).optional(),
});

export type MissionCost = z.infer<typeof MissionCostSchema>;

// ============================================================================
// MISSION ESCALATION SCHEMA (Crew needs user decision)
// ============================================================================

export const MissionEscalationOptionSchema = z.object({
  id: z.string(), // 'option_a', 'option_b'
  label: z.string(), // e.g., "Quick Fix (Risky)"
  approach: z.string(), // How to tackle it
  cost: z.number().min(0),
  timeline: z.string(), // e.g., "5 minutes" or "By Friday EOD"
  risk: z.string(), // What could go wrong
  recommendation: z.string().optional(), // Troi's recommendation
});

export type MissionEscalationOption = z.infer<typeof MissionEscalationOptionSchema>;

export const MissionEscalationSchema = z.object({
  isNeeded: z.boolean().default(false),
  options: z.array(MissionEscalationOptionSchema).default([]),
  userChoice: z.string().optional(), // Which option user selected
  reasoning: z.string().optional(), // Why escalation was needed
});

export type MissionEscalation = z.infer<typeof MissionEscalationSchema>;

// ============================================================================
// MISSION FOLLOW-UP SUGGESTION SCHEMA (Auto-suggested next missions)
// ============================================================================

export const MissionFollowUpSuggestionSchema = z.object({
  category: MissionCategoryEnum,
  description: z.string(), // e.g., "Write fixes for 3 violations"
  reasoning: z.string(), // Why this is the next logical step
  impact: z.string(), // e.g., "Unblock frontend team"
  estimatedTime: z.string().optional(),
  estimatedCost: z.number().optional(),
});

export type MissionFollowUpSuggestion = z.infer<typeof MissionFollowUpSuggestionSchema>;

// ============================================================================
// CORE MISSION SCHEMA (Full mission object)
// ============================================================================

export const MissionSchema = z.object({
  // ─── Identity ───
  id: z.string().uuid(),
  tenantId: z.string().default('story-agent'),
  storyId: z.string().optional(), // Link to sa_stories if applicable
  
  // ─── User Intent ───
  userInput: z.string().min(10).max(500),
  
  // ─── Auto-Classification (computed at creation) ───
  autoClassification: MissionClassificationSchema,
  
  // ─── Crew Assignment ───
  assignedCrew: z.array(z.string()), // ['data', 'geordi']
  primaryOwner: z.string(), // Picard, Data, etc.
  
  // ─── Execution State ───
  status: z.enum(['pending', 'running', 'escalation_needed', 'complete', 'failed']),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  
  // ─── Findings (post-execution) ───
  findings: z.array(MissionFindingSchema).default([]),
  
  // ─── Stakeholder Context (Troi responsibility) ───
  stakeholderImpact: z.string().optional(),
  
  // ─── Cost Tracking (Quark responsibility) ───
  cost: MissionCostSchema,
  
  // ─── Follow-Up Missions (auto-suggested) ───
  suggestedNextMissions: z.array(MissionFollowUpSuggestionSchema).default([]),
  
  // ─── Escalation (if crew needs decision) ───
  escalation: MissionEscalationSchema.optional(),
  
  // ─── Metadata ───
  updatedAt: z.date().optional(),
  error: z.string().optional(), // If status is 'failed'
});

export type Mission = z.infer<typeof MissionSchema>;

// ============================================================================
// MISSION EXECUTION LOG SCHEMA (Real-time stream entries)
// ============================================================================

export const MissionExecutionLogSchema = z.object({
  id: z.string().uuid(),
  missionId: z.string().uuid(),
  crewId: z.string(), // 'data', 'picard', 'troi', etc.
  domain: z.string().optional(), // 'architecture', 'infrastructure', 'stakeholder'
  level: z.enum(['debug', 'info', 'action', 'escalation']),
  text: z.string(), // Natural language narration
  emoji: z.string().optional(), // "🔍", "📋", "🎯", "⚠️"
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  // File context
  fileReferences: z
    .array(
      z.object({
        file: z.string(),
        line: z.number().int(),
      })
    )
    .optional(),
});

export type MissionExecutionLog = z.infer<typeof MissionExecutionLogSchema>;

// ============================================================================
// MISSION CLASSIFICATION REQUEST/RESPONSE (For /api/missions/classify)
// ============================================================================

export const MissionClassificationRequestSchema = z.object({
  userInput: z.string().min(10).max(500),
});

export type MissionClassificationRequest = z.infer<typeof MissionClassificationRequestSchema>;

export const MissionClassificationResponseSchema = z.object({
  category: MissionCategoryEnum,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  estimatedTime: z.string(), // "~15 seconds" or "~2 minutes"
  estimatedCost: z.number(),
  assignedCrew: z.array(z.string()),
});

export type MissionClassificationResponse = z.infer<typeof MissionClassificationResponseSchema>;

// ============================================================================
// MISSION LAUNCH REQUEST (For /api/missions POST)
// ============================================================================

export const MissionLaunchRequestSchema = z.object({
  userInput: z.string().min(10).max(500),
  category: MissionCategoryEnum.optional(), // If classification already done
  assignedCrew: z.array(z.string()).optional(), // If classification already done
  storyId: z.string().optional(), // Link to story if applicable
});

export type MissionLaunchRequest = z.infer<typeof MissionLaunchRequestSchema>;

// ============================================================================
// MISSION ASK REQUEST (User question during execution)
// ============================================================================

export const MissionAskRequestSchema = z.object({
  question: z.string().min(3).max(200),
});

export type MissionAskRequest = z.infer<typeof MissionAskRequestSchema>;

// ============================================================================
// MISSION ESCALATION CHOICE REQUEST
// ============================================================================

export const MissionEscalationChoiceRequestSchema = z.object({
  optionId: z.string(), // 'option_a', 'option_b'
});

export type MissionEscalationChoiceRequest = z.infer<typeof MissionEscalationChoiceRequestSchema>;

// ============================================================================
// BATCH TYPES (For multi-mission operations)
// ============================================================================

export const MissionListRequestSchema = z.object({
  status: z.enum(['pending', 'running', 'escalation_needed', 'complete', 'failed']).optional(),
  category: MissionCategoryEnum.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type MissionListRequest = z.infer<typeof MissionListRequestSchema>;

export const MissionListResponseSchema = z.object({
  missions: z.array(MissionSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type MissionListResponse = z.infer<typeof MissionListResponseSchema>;

// ============================================================================
// CONSTANTS (For classification + time/cost estimation)
// ============================================================================

export const MISSION_CATEGORY_CONFIG: Record<
  MissionCategory,
  {
    infraType: MissionInfraType;
    estimatedSeconds: number;
    estimatedCostUSD: number;
    defaultCrew: string[];
    description: string;
  }
> = {
  A1: {
    infraType: 'ephemeral',
    estimatedSeconds: 15,
    estimatedCostUSD: 0.002,
    defaultCrew: ['data'],
    description: 'Shake-Down Diagnostic (single-crew, deterministic audit)',
  },
  A2: {
    infraType: 'ephemeral',
    estimatedSeconds: 120,
    estimatedCostUSD: 0.003,
    defaultCrew: ['uhura'],
    description: 'Quick Standup (query-based status rollup)',
  },
  B1: {
    infraType: 'persistent',
    estimatedSeconds: 1800,
    estimatedCostUSD: 0.05,
    defaultCrew: ['data', 'troi', 'geordi'],
    description: 'Design Sprint (multi-crew architecture debate)',
  },
  B2: {
    infraType: 'persistent',
    estimatedSeconds: 3600,
    estimatedCostUSD: 0.08,
    defaultCrew: ['crusher', 'worf', 'obrien', 'data'],
    description: 'Incident Postmortem (root-cause analysis)',
  },
  B3: {
    infraType: 'persistent',
    estimatedSeconds: 1200,
    estimatedCostUSD: 0.1,
    defaultCrew: ['picard', 'data', 'troi', 'geordi', 'obrien', 'worf', 'yar', 'crusher', 'uhura', 'quark', 'riker'],
    description: 'Innovation Lounge (all-crew brainstorm)',
  },
};

// Validation exports (for use in API layers)
export const validateMission = (data: unknown): Mission => {
  return MissionSchema.parse(data);
};

export const validateMissionClassificationRequest = (data: unknown): MissionClassificationRequest => {
  return MissionClassificationRequestSchema.parse(data);
};

export const validateMissionLaunchRequest = (data: unknown): MissionLaunchRequest => {
  return MissionLaunchRequestSchema.parse(data);
};
