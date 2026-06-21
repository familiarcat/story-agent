import * as vscode from 'vscode';

// AhaStory type — inlined to avoid bundling @story-agent/shared
export interface AhaStory {
  id: string;
  referenceNum: string;
  name: string;
  description: string;
  acceptanceCriteria: string;
  url: string;
  workflowStatus: string;
}

export interface AhaProject {
  id: string;
  name: string;
  referencePrefix: string | null;
  url: string;
}

export interface AhaSprint {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  url: string;
  totalStoryPoints: number;
  doneStoryPoints: number;
  remainingStoryPoints: number;
  featureCount: number;
}

export interface AhaSprintStory {
  referenceNum: string;
  name: string;
  storyPoints: number | null;
  workflowStatus: string;
  url: string;
}

function getConfig(): { domain: string; apiKey: string } {
  const cfg = vscode.workspace.getConfiguration('storyAgent');
  // Resolution order: environment (AWS/SSM or terminal-launch) → VS Code settings (local Dock
  // launch). First non-empty wins (empty strings are treated as unset, unlike `??`).
  const pick = (...vals: Array<string | undefined>): string =>
    vals.map(v => (v ?? '').trim()).find(v => v.length > 0) ?? '';

  const domain = pick(process.env.AHA_DOMAIN, cfg.get<string>('ahaDomain'));
  const apiKey = pick(process.env.AHA_API_KEY, process.env.AHA_API_TOKEN, cfg.get<string>('ahaApiKey'));

  if (!domain || !apiKey) {
    throw new Error(
      'Aha credentials not configured. Set AHA_DOMAIN + AHA_API_KEY (or AHA_API_TOKEN) in your ' +
      'environment, or "Story Agent: Aha Api Key" / "Aha Domain" in VS Code settings.'
    );
  }
  return { domain, apiKey };
}

export async function fetchAhaStory(
  referenceNum: string,
  token?: vscode.CancellationToken
): Promise<AhaStory> {
  const { domain, apiKey } = getConfig();
  const id = referenceNum.includes('/')
    ? referenceNum.split('/').pop()!
    : referenceNum;

  const controller = new AbortController();
  token?.onCancellationRequested(() => controller.abort());

  const res = await fetch(`https://${domain}/api/v1/features/${id}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: controller.signal,
  });

  if (!res.ok) {
    throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const f = data.feature as Record<string, unknown>;

  const description =
    ((f.description as Record<string, unknown> | null)?.body as string) ?? '';

  const acceptanceCriteria = ((f.requirements as unknown[]) ?? [])
    .map((r: unknown) => {
      const req = r as Record<string, unknown>;
      return `- ${req.name}: ${
        (req.description as Record<string, unknown>)?.body ?? ''
      }`;
    })
    .join('\n');

  return {
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description,
    acceptanceCriteria,
    url: f.url as string,
    workflowStatus:
      ((f.workflow_status as Record<string, unknown>)?.name as string) ??
      'unknown',
  };
}

export async function listAhaProjects(): Promise<AhaProject[]> {
  const { domain, apiKey } = getConfig();
  const res = await fetch(`https://${domain}/api/v1/products?per_page=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const products = (data.products as Record<string, unknown>[] | undefined) ?? [];
  return products.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  }));
}

export async function getProjectHierarchy(projectId: string): Promise<{
  project: AhaProject;
  stats: {
    totalStories: number;
    totalStoryPoints: number;
    plannedPoints: number;
    completedPoints: number;
    releaseCount: number;
  };
  releases: Array<{
    release: AhaSprint;
    storiesByStatus: Record<string, AhaSprintStory[]>;
  }>;
  unreleasedStories: AhaStory[];
  statusesUsed: string[];
}> {
  const { domain, apiKey } = getConfig();
  const res = await fetch(`https://${domain}/api/v1/products/${projectId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const p = data.product as Record<string, unknown>;

  const project: AhaProject = {
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  };

  // Fetch releases
  const releasesRes = await fetch(
    `https://${domain}/api/v1/products/${projectId}/releases?per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!releasesRes.ok) {
    throw new Error(`Aha API ${releasesRes.status}: ${await releasesRes.text()}`);
  }

  const releasesData = (await releasesRes.json()) as Record<string, unknown>;
  const releases = (releasesData.releases as Record<string, unknown>[] | undefined) ?? [];

  // Map releases with their stories
  const releasesWithStories = await Promise.all(
    releases.map(async (r) => {
      const releaseId = r.id as string;
      const storiesRes = await fetch(
        `https://${domain}/api/v1/releases/${releaseId}/features?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
        }
      );

      if (!storiesRes.ok) {
        throw new Error(`Aha API ${storiesRes.status}: ${await storiesRes.text()}`);
      }

      const storiesData = (await storiesRes.json()) as Record<string, unknown>;
      const features = (storiesData.features as Record<string, unknown>[] | undefined) ?? [];

      const stories: AhaSprintStory[] = features.map((f) => ({
        referenceNum: f.reference_num as string,
        name: f.name as string,
        storyPoints: (f.score as number | null | undefined) ?? null,
        workflowStatus:
          ((f.workflow_status as Record<string, unknown>)?.name as string) ?? 'unknown',
        url: f.url as string,
      }));

      const storiesByStatus: Record<string, AhaSprintStory[]> = {};
      for (const story of stories) {
        if (!storiesByStatus[story.workflowStatus]) {
          storiesByStatus[story.workflowStatus] = [];
        }
        storiesByStatus[story.workflowStatus].push(story);
      }

      const progress = r.progress_source_data as Record<string, unknown> | undefined;
      const release: AhaSprint = {
        id: releaseId,
        name: r.name as string,
        startDate: (r.start_date as string | null | undefined) ?? null,
        endDate: (r.end_date as string | null | undefined) ?? null,
        url: r.url as string,
        totalStoryPoints: (progress?.total_points as number | undefined) ?? 0,
        doneStoryPoints: (progress?.done_points as number | undefined) ?? 0,
        remainingStoryPoints: (progress?.remaining_points as number | undefined) ?? 0,
        featureCount: (r.num_features as number | undefined) ?? 0,
      };

      return { release, storiesByStatus };
    })
  );

  // Fetch all stories to find unreleased ones
  const allStoriesRes = await fetch(
    `https://${domain}/api/v1/products/${projectId}/features?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    }
  );

  if (!allStoriesRes.ok) {
    throw new Error(`Aha API ${allStoriesRes.status}: ${await allStoriesRes.text()}`);
  }

  const allStoriesData = (await allStoriesRes.json()) as Record<string, unknown>;
  const allFeatures = (allStoriesData.features as Record<string, unknown>[] | undefined) ?? [];
  const releasedIds = new Set(
    releasesWithStories.flatMap((r) =>
      Object.values(r.storiesByStatus)
        .flat()
        .map((s) => s.referenceNum)
    )
  );

  const unreleasedStories: AhaStory[] = allFeatures
    .filter((f) => !releasedIds.has(f.reference_num as string))
    .map((f) => ({
      id: f.id as string,
      referenceNum: f.reference_num as string,
      name: f.name as string,
      description: '',
      acceptanceCriteria: '',
      url: f.url as string,
      workflowStatus: ((f.workflow_status as Record<string, unknown>)?.name as string) ?? 'unknown',
    }));

  // Collect statuses
  const statusesUsed = new Set<string>();
  for (const rel of releasesWithStories) {
    Object.keys(rel.storiesByStatus).forEach((s) => statusesUsed.add(s));
  }
  for (const story of unreleasedStories) {
    statusesUsed.add(story.workflowStatus);
  }

  // Calculate stats
  const totalStoryPoints = releasesWithStories.reduce(
    (sum, r) => sum + r.release.totalStoryPoints,
    0
  );
  const completedPoints = releasesWithStories.reduce(
    (sum, r) => sum + r.release.doneStoryPoints,
    0
  );

  return {
    project,
    stats: {
      totalStories:
        releasesWithStories.reduce((sum, r) => sum + r.release.featureCount, 0) +
        unreleasedStories.length,
      totalStoryPoints,
      plannedPoints: totalStoryPoints,
      completedPoints,
      releaseCount: releasesWithStories.length,
    },
    releases: releasesWithStories,
    unreleasedStories,
    statusesUsed: Array.from(statusesUsed).sort(),
  };
}

export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}
