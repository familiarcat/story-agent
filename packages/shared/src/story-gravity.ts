/**
 * Einstein-style story sizing:
 * - "mass" approximates story scope/complexity
 * - "gravity" approximates risk/coupling drag on delivery speed
 * - score is snapped to Fibonacci planning points for sprint planning
 */

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21, 34, 55] as const;

export type StoryRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface StoryGravityInput {
  name: string;
  description?: string;
  acceptanceCriteria?: string;
  dependencyCount?: number;
  integrationSurfaceCount?: number;
  riskLevel?: StoryRiskLevel;
  uncertainty?: number; // 0..1
}

export interface StoryGravityEstimate {
  model: 'einstein_fibonacci_v1';
  storyPoints: number;
  gravityWeight: number;
  effectiveVelocityLoad: number;
  curvature: number;
  mass: number;
  rationale: string[];
}

const COMPLEXITY_TERMS = ['migrate', 'refactor', 'distributed', 'concurrency', 'integration', 'schema', 'pipeline', 'orchestr', 'cross-team'];
const RISK_TERMS = ['security', 'compliance', 'regulated', 'incident', 'rollback', 'critical', 'prod', 'data loss'];
const UNKNOWN_TERMS = ['unknown', 'investigate', 'spike', 'discovery', 'research', 'unclear', 'tbd'];

function countHits(text: string, terms: string[]): number {
  const source = text.toLowerCase();
  return terms.reduce((sum, term) => sum + (source.includes(term) ? 1 : 0), 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeUncertainty(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return clamp(value, 0, 1);
}

function riskMultiplier(level: StoryRiskLevel | undefined): number {
  switch (level) {
    case 'critical': return 1.4;
    case 'high': return 1.25;
    case 'medium': return 1.1;
    default: return 1;
  }
}

function toFibByCurvature(curvature: number): number {
  const thresholds = [1.3, 1.9, 2.6, 3.5, 4.6, 6.2, 8.1, 10.7, Number.POSITIVE_INFINITY];
  for (let i = 0; i < thresholds.length; i += 1) {
    if (curvature <= thresholds[i]) return FIBONACCI_POINTS[i];
  }
  return FIBONACCI_POINTS[FIBONACCI_POINTS.length - 1];
}

export function estimateStoryGravity(input: StoryGravityInput): StoryGravityEstimate {
  const text = `${input.name || ''}\n${input.description || ''}\n${input.acceptanceCriteria || ''}`.trim();
  const tokenEstimate = Math.max(1, Math.ceil(text.length / 4));
  const complexityHits = countHits(text, COMPLEXITY_TERMS);
  const riskHits = countHits(text, RISK_TERMS);
  const unknownHits = countHits(text, UNKNOWN_TERMS);
  const deps = Math.max(0, input.dependencyCount ?? 0);
  const integrations = Math.max(0, input.integrationSurfaceCount ?? 0);
  const uncertainty = normalizeUncertainty(input.uncertainty);

  const baseMass = 1
    + Math.min(3.2, tokenEstimate / 180)
    + complexityHits * 0.35
    + deps * 0.18
    + integrations * 0.2
    + unknownHits * 0.22
    + uncertainty * 0.6;

  const gravityWeight = clamp(
    (1
      + riskHits * 0.09
      + deps * 0.05
      + integrations * 0.06
      + unknownHits * 0.07
      + uncertainty * 0.2) * riskMultiplier(input.riskLevel),
    1,
    2.8,
  );

  const mass = Number(baseMass.toFixed(2));
  const curvature = Number((mass * gravityWeight).toFixed(2));
  const storyPoints = toFibByCurvature(curvature);
  const effectiveVelocityLoad = Number((storyPoints * gravityWeight).toFixed(2));

  const rationale = [
    `mass=${mass} from scope/signals (${tokenEstimate} tokens, complexity=${complexityHits}, dependencies=${deps}, integrations=${integrations})`,
    `gravity=${gravityWeight.toFixed(2)} from risk/coupling (riskTerms=${riskHits}, unknowns=${unknownHits}, uncertainty=${uncertainty.toFixed(2)})`,
    `curvature=${curvature} mapped to Fibonacci story points=${storyPoints}`,
  ];

  return {
    model: 'einstein_fibonacci_v1',
    storyPoints,
    gravityWeight: Number(gravityWeight.toFixed(2)),
    effectiveVelocityLoad,
    curvature,
    mass,
    rationale,
  };
}
