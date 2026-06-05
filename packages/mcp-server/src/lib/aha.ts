import type { AhaProject, AhaSprint, AhaSprintStory, AhaStory } from '@story-agent/shared';

const AHA_DOMAIN = process.env.AHA_DOMAIN ?? '';
const AHA_API_KEY = process.env.AHA_API_KEY ?? '';

function ahaHeaders() {
  return {
    Authorization: `Bearer ${AHA_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function ahaFetch(path: string) {
  const url = `https://${AHA_DOMAIN}/api/v1/${path}`;
  const res = await fetch(url, { headers: ahaHeaders() });
  if (!res.ok) throw new Error(`Aha API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getAhaStory(referenceNum: string): Promise<AhaStory> {
  // referenceNum format: STORY-123 (or equivalent) or full URL — normalise to ID
  const id = referenceNum.includes('/')
    ? referenceNum.split('/').pop()!
    : referenceNum;

  const data = await ahaFetch(`features/${id}`);
  const f = data.feature as Record<string, unknown>;

  const descRaw = (f.description as Record<string, unknown> | null)?.body ?? '';
  const acceptanceRaw = ((f.requirements as unknown[]) ?? [])
    .map((r: unknown) => {
      const req = r as Record<string, unknown>;
      return `- ${req.name}: ${(req.description as Record<string, unknown>)?.body ?? ''}`;
    })
    .join('\n');

  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description: descRaw as string,
    acceptanceCriteria: acceptanceRaw,
    url: f.url as string,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
  };
}

export async function listAhaStoriesForProject(projectId: string, page = 1): Promise<AhaStory[]> {
  const data = await ahaFetch(`products/${projectId}/features?page=${page}&per_page=50`);
  const features = data.features as Record<string, unknown>[];
  return features.map(f => ({
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description: '',
    acceptanceCriteria: '',
    url: f.url as string,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
  }));
}

export async function listAhaProjects(page = 1): Promise<AhaProject[]> {
  const data = await ahaFetch(`products?page=${page}&per_page=100`);
  const products = (data.products as Record<string, unknown>[] | undefined) ?? [];
  return products.map(p => ({
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  }));
}

async function ahaPut(path: string, body: Record<string, unknown>) {
  const url = `https://${AHA_DOMAIN}/api/v1/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: ahaHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Aha API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function ahaPost(path: string, body: Record<string, unknown>) {
  const url = `https://${AHA_DOMAIN}/api/v1/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: ahaHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Aha API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Update an Aha story's workflow status by name (e.g. 'In Progress', 'Complete').
 * The feature id is the internal Aha ID returned by getAhaStory().id.
 */
export async function updateAhaStoryStatus(featureId: string, statusName: string): Promise<void> {
  await ahaPut(`features/${featureId}`, {
    feature: { workflow_status: { name: statusName } },
  });
}

/**
 * Add a link on an Aha story pointing at a GitHub PR.
 */
export async function linkAhaStoryToPR(featureId: string, prUrl: string, prTitle: string): Promise<void> {
  await ahaPost(`features/${featureId}/comments`, {
    comment: {
      body: `Pull Request opened: [${prTitle}](${prUrl})`,
    },
  });
}

/**
 * List releases (sprints/iterations) for an Aha project.
 * Aha uses "releases" as the container for sprints/iterations.
 */
export async function listAhaSprints(projectId: string): Promise<AhaSprint[]> {
  const data = await ahaFetch(`products/${projectId}/releases?per_page=50`);
  const releases = (data.releases as Record<string, unknown>[] | undefined) ?? [];
  return releases.map(r => mapRelease(r));
}

/**
 * Get a single release (sprint) with capacity/points summary.
 */
export async function getAhaSprint(releaseId: string): Promise<AhaSprint> {
  const data = await ahaFetch(`releases/${releaseId}`);
  return mapRelease(data.release as Record<string, unknown>);
}

/**
 * List features (stories) assigned to a release (sprint).
 */
export async function getAhaSprintStories(releaseId: string): Promise<AhaSprintStory[]> {
  const data = await ahaFetch(`releases/${releaseId}/features?per_page=100`);
  const features = (data.features as Record<string, unknown>[] | undefined) ?? [];
  return features.map(f => ({
    referenceNum: f.reference_num as string,
    name: f.name as string,
    storyPoints: (f.score as number | null | undefined) ?? null,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
    url: f.url as string,
  }));
}

function mapRelease(r: Record<string, unknown>): AhaSprint {
  const progress = r.progress_source_data as Record<string, unknown> | undefined;
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
