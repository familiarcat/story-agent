import type { AhaProject, AhaSprint, AhaSprintStory, AhaStory } from '@story-agent/shared';

const AHA_DOMAIN = process.env.AHA_DOMAIN ?? '';
const AHA_API_KEY = process.env.AHA_API_KEY ?? '';

function checkAhaConfig() {
  if (!AHA_DOMAIN || !AHA_API_KEY) {
    throw new Error('AHA_DOMAIN and AHA_API_KEY must be configured for Aha integration.');
  }
}

async function ahaFetch(path: string): Promise<Record<string, unknown>> {
  checkAhaConfig();
  const url = `https://${AHA_DOMAIN}/api/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AHA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
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

export async function listAhaStoriesForProject(projectId: string, page = 1): Promise<AhaStory[]> {
  const data = await ahaFetch(`products/${projectId}/features?page=${page}&per_page=100`);
  const features = (data.features as Record<string, unknown>[] | undefined) ?? [];
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

export async function getAhaStory(referenceNum: string): Promise<AhaStory> {
  const normalized = referenceNum.includes('/') ? referenceNum.split('/').pop()! : referenceNum;
  const data = await ahaFetch(`features/${normalized}`);
  const f = data.feature as Record<string, unknown>;
  const description = (f.description as Record<string, unknown> | null)?.body ?? '';
  const acceptanceCriteria = ((f.requirements as unknown[]) ?? [])
    .map((r: unknown) => {
      const req = r as Record<string, unknown>;
      return `- ${req.name}: ${(req.description as Record<string, unknown>)?.body ?? ''}`;
    })
    .join('\n');

  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description: description as string,
    acceptanceCriteria,
    url: f.url as string,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
  };
}

export async function updateAhaStoryStatus(featureId: string, statusName: string): Promise<void> {
  checkAhaConfig();
  const url = `https://${AHA_DOMAIN}/api/v1/features/${featureId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${AHA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ feature: { workflow_status: { name: statusName } } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
}

export async function linkAhaStoryToPR(featureId: string, prUrl: string, prTitle: string): Promise<void> {
  checkAhaConfig();
  const url = `https://${AHA_DOMAIN}/api/v1/features/${featureId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AHA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ comment: { body: `Pull Request opened: [${prTitle}](${prUrl})` } }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
}

export async function listAhaSprints(projectId: string): Promise<AhaSprint[]> {
  const data = await ahaFetch(`products/${projectId}/releases?per_page=50`);
  const releases = (data.releases as Record<string, unknown>[] | undefined) ?? [];
  return releases.map(r => mapRelease(r));
}

export async function getAhaSprint(releaseId: string): Promise<AhaSprint> {
  const data = await ahaFetch(`releases/${releaseId}`);
  return mapRelease(data.release as Record<string, unknown>);
}

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
