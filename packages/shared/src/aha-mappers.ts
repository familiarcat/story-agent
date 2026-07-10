import type { AhaEpic, AhaProject, AhaSprint, AhaSprintStory, AhaStory } from './index.js';

/**
 * Canonical Aha JSON → typed-domain mappers (Option B of the extension-dedup investigation, OBS
 * memory 112). PURE functions: raw Aha REST shapes in, @story-agent/shared domain types out. Both the
 * direct-REST client (aha-client.ts) AND the proxy-first VS Code extension consume these, so the
 * field-mapping lives in ONE place and can't drift when Aha's JSON contract changes — regardless of
 * which transport fetched the JSON. Type-only shared import erases at build, so esbuild can bundle
 * these into the extension with no runtime @story-agent/shared dependency.
 */

type Raw = Record<string, unknown>;

export function mapProduct(p: Raw): AhaProject {
  return {
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  };
}

/** Feature → story WITHOUT body (list views; description/acceptance left empty for speed). */
export function mapFeatureSummary(f: Raw): AhaStory {
  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description: '',
    acceptanceCriteria: '',
    url: f.url as string,
    workflowStatus: (f.workflow_status as Raw)?.name as string ?? 'unknown',
  };
}

/** Feature → story WITH description body + requirements rolled into acceptance criteria. */
export function mapFeatureToStory(f: Raw): AhaStory {
  const description = ((f.description as Raw | null)?.body as string) ?? '';
  const acceptanceCriteria = ((f.requirements as unknown[]) ?? [])
    .map((r) => {
      const req = r as Raw;
      return `- ${req.name}: ${(req.description as Raw)?.body ?? ''}`;
    })
    .join('\n');
  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description,
    acceptanceCriteria,
    url: f.url as string,
    workflowStatus: (f.workflow_status as Raw)?.name as string ?? 'unknown',
  };
}

export function mapEpic(e: Raw): AhaEpic {
  return {
    id: e.id as string,
    referenceNum: e.reference_num as string,
    name: e.name as string,
    workflowStatus: (e.workflow_status as Raw)?.name as string ?? 'unknown',
    description: ((e.description as Raw | null)?.body as string | undefined),
    url: e.url as string | undefined,
  };
}

export function mapRelease(r: Raw): AhaSprint {
  const progress = r.progress_source_data as Raw | undefined;
  return {
    id: r.id as string,
    name: r.name as string,
    startDate: (r.start_date as string | null | undefined) ?? null,
    endDate: (r.end_date as string | null | undefined) ?? null,
    url: r.url as string,
    totalStoryPoints: (progress?.total_points as number | undefined) ?? 0,
    doneStoryPoints: (progress?.done_points as number | undefined) ?? 0,
    remainingStoryPoints: (progress?.remaining_points as number | undefined) ?? 0,
    featureCount: (r.num_features as number | undefined) ?? 0,
  };
}

export function mapSprintStory(f: Raw): AhaSprintStory {
  return {
    referenceNum: f.reference_num as string,
    name: f.name as string,
    storyPoints: (f.score as number | null | undefined) ?? null,
    workflowStatus: (f.workflow_status as Raw)?.name as string ?? 'unknown',
    url: f.url as string,
  };
}
