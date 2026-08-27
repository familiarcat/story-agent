/**
 * pages/api/missions/index.ts
 *
 * POST /api/missions - Launch a new mission
 * GET /api/missions - List missions (future)
 *
 * POST Request:
 *   {
 *     userInput: string,
 *     category?: 'A1' | 'A2' | 'B1' | 'B2' | 'B3',
 *     assignedCrew?: string[],
 *     storyId?: string
 *   }
 *
 * POST Response:
 *   {
 *     id: UUID,
 *     userInput: string,
 *     category: string,
 *     infra_type: 'ephemeral' | 'persistent',
 *     assignedCrew: string[],
 *     status: 'pending',
 *     createdAt: ISO8601,
 *     estimatedCostUsd: number,
 *     ...
 *   }
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  MissionLaunchRequest,
  validateMissionLaunchRequest,
  MISSION_CATEGORY_CONFIG,
  MissionCategory,
} from '@story-agent/shared/mission-types';

/**
 * In-memory mission store (for MVP)
 * TODO: Replace with Supabase after migration
 */
const missionsStore: Map<string, any> = new Map();

/**
 * Generate UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Launch a new mission
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate request
    const payload = validateMissionLaunchRequest(req.body);

    // If category is provided, use it; otherwise default to A1
    const category = (payload.category || 'A1') as MissionCategory;
    const config = MISSION_CATEGORY_CONFIG[category];

    if (!config) {
      return res.status(400).json({ error: `Unknown category: ${category}` });
    }

    // Create mission record
    const missionId = generateUUID();
    const mission = {
      id: missionId,
      tenantId: 'story-agent',
      userInput: payload.userInput,
      category,
      infraType: config.infraType,
      classificationConfidence: 0.85,
      classificationReasoning: 'Mission created via API',
      assignedCrew: payload.assignedCrew || config.defaultCrew,
      primaryOwner: 'picard',
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedCostUsd: config.estimatedCostUSD,
      actualCostUsd: null,
      modelTier: config.infraType === 'ephemeral' ? 'frugal' : 'standard',
      findings: [],
      escalationNeeded: false,
      suggestedNextMissions: [],
    };

    // Store in-memory
    missionsStore.set(missionId, mission);

    // TODO: Emit to Supabase sa_missions table
    // const { data, error } = await supabase
    //   .from('sa_missions')
    //   .insert([{ ...mission }])
    //   .select()
    //   .single();

    // TODO: Trigger crew execution
    // Call mcp_story-agent_run_crew_mission_pipeline with missionId context

    res.status(201).json(mission);
  } catch (error) {
    console.error('Mission launch error:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Mission launch failed',
        message: error.message,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * List missions
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    // For MVP: return all missions from in-memory store
    const missions = Array.from(missionsStore.values());

    // TODO: Replace with Supabase query
    // const { data, error } = await supabase
    //   .from('sa_missions')
    //   .select('*')
    //   .order('created_at', { ascending: false })
    //   .limit(20);

    res.status(200).json({
      missions,
      total: missions.length,
      limit: 20,
      offset: 0,
    });
  } catch (error) {
    console.error('Mission list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
