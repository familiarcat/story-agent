/**
 * pages/api/missions/classify.ts
 * 
 * POST endpoint: Classify user input into mission category (A1-B3)
 * 
 * Request:
 *   POST /api/missions/classify
 *   { userInput: string }
 * 
 * Response:
 *   {
 *     category: 'A1' | 'A2' | 'B1' | 'B2' | 'B3',
 *     confidence: 0.0-1.0,
 *     reasoning: string,
 *     estimatedTime: string,
 *     estimatedCost: number,
 *     assignedCrew: string[]
 *   }
 * 
 * Classification Logic:
 *   A1 (Shake-Down): audit, lint, check, scan, verify
 *   A2 (Quick Standup): summarize, status, health, report, metrics
 *   B1 (Design Sprint): design, architecture, review, propose
 *   B2 (Incident): incident, failure, postmortem, rca, debug
 *   B3 (Innovation): imagine, brainstorm, moonshot, invent
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  MissionClassificationResponseSchema,
  MissionClassificationRequest,
  validateMissionClassificationRequest,
  MISSION_CATEGORY_CONFIG,
  MissionCategory,
} from '@story-agent/shared/mission-types';

// Classification keyword patterns
const CLASSIFICATION_PATTERNS: Record<MissionCategory, { keywords: string[]; confidence: number }> = {
  A1: {
    keywords: ['audit', 'lint', 'check', 'scan', 'verify', 'validate', 'test', 'analyze type', 'strict mode', 'security check'],
    confidence: 0.95,
  },
  A2: {
    keywords: ['summarize', 'status', 'health', 'report', 'metrics', 'summary', 'velocity', 'progress', 'overview', 'standup'],
    confidence: 0.85,
  },
  B1: {
    keywords: ['design', 'architecture', 'review', 'propose', 'refactor', 'improve', 'discuss', 'strategy', 'plan', 'structure'],
    confidence: 0.80,
  },
  B2: {
    keywords: ['incident', 'failure', 'postmortem', 'rca', 'debug', 'root cause', 'what went wrong', 'investigate', 'error', 'issue'],
    confidence: 0.90,
  },
  B3: {
    keywords: ['imagine', 'brainstorm', 'moonshot', 'invent', 'explore', 'idea', 'concept', 'vision', 'innovation', 'think about'],
    confidence: 0.85,
  },
};

/**
 * Classify user input using keyword matching + semantic scoring
 * Returns highest-confidence match
 */
function classifyMission(userInput: string): {
  category: MissionCategory;
  confidence: number;
  reasoning: string;
} {
  const lowerInput = userInput.toLowerCase();
  const inputWords = lowerInput.split(/\s+/);

  // Score each category
  const scores: Record<MissionCategory, { score: number; matchedKeywords: string[] }> = {
    A1: { score: 0, matchedKeywords: [] },
    A2: { score: 0, matchedKeywords: [] },
    B1: { score: 0, matchedKeywords: [] },
    B2: { score: 0, matchedKeywords: [] },
    B3: { score: 0, matchedKeywords: [] },
  };

  // Calculate keyword matches per category
  for (const category of Object.keys(CLASSIFICATION_PATTERNS) as MissionCategory[]) {
    const { keywords, confidence } = CLASSIFICATION_PATTERNS[category];

    for (const keyword of keywords) {
      if (lowerInput.includes(keyword)) {
        scores[category].score += confidence;
        scores[category].matchedKeywords.push(keyword);
      }
    }
  }

  // Find highest-scoring category
  let bestCategory: MissionCategory = 'A1'; // Default fallback
  let bestScore = -1;
  let normalizedConfidence = 0.5;

  for (const category of Object.keys(scores) as MissionCategory[]) {
    if (scores[category].score > bestScore) {
      bestScore = scores[category].score;
      bestCategory = category;
      // Normalize confidence: 1 keyword match = 0.6, 2+ = 0.85+
      normalizedConfidence = Math.min(0.95, 0.6 + scores[category].matchedKeywords.length * 0.15);
    }
  }

  // Generate reasoning
  let reasoning = '';
  if (scores[bestCategory].matchedKeywords.length > 0) {
    reasoning = `Matched keywords: ${scores[bestCategory].matchedKeywords.join(', ')}`;
  } else {
    reasoning = `Classified as ${bestCategory} based on input analysis`;
  }

  return {
    category: bestCategory,
    confidence: normalizedConfidence,
    reasoning,
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const payload = validateMissionClassificationRequest(req.body);

    // Classify the mission
    const { category, confidence, reasoning } = classifyMission(payload.userInput);

    // Get configuration for this category
    const config = MISSION_CATEGORY_CONFIG[category];

    // Build response
    const response = MissionClassificationResponseSchema.parse({
      category,
      confidence,
      reasoning,
      estimatedTime:
        config.estimatedSeconds < 30
          ? '~15 seconds'
          : config.estimatedSeconds < 120
            ? '~1 minute'
            : config.estimatedSeconds < 300
              ? '~5 minutes'
              : config.estimatedSeconds < 1800
                ? '~15 minutes'
                : config.estimatedSeconds < 3600
                  ? '~30 minutes'
                  : '~1 hour',
      estimatedCost: config.estimatedCostUSD,
      assignedCrew: config.defaultCrew,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Classification error:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: 'Classification failed',
        message: error.message,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
