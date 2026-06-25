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
  const id = referenceNum.includes('/')
    ? referenceNum.split('/').pop()!
    : referenceNum;

  // Single-source proxy (cached) with direct-REST fallback.
  const data = (await ahaGet(`features/${id}`)) as Record<string, unknown>;
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

/** Crew server base for Aha (single source) — configured/cloud, then local loop. */
function agentBases(): string[] {
  const configured = (vscode.workspace.getConfiguration('storyAgent').get<string>('chat.agentServiceUrl') || process.env.STORY_AGENT_AGENT_URL || '').replace(/\/$/, '');
  const local = 'http://localhost:3103';
  return configured && configured !== local ? [configured, local] : [local];
}

/**
 * GET an Aha API path through the crew server's read-only proxy (/aha/raw, single source + cache),
 * falling back to direct Aha REST with the local key if the brain is unreachable.
 */
async function ahaGet(path: string): Promise<any> {
  for (const base of agentBases()) {
    try {
      const r = await fetch(`${base}/aha/raw?path=${encodeURIComponent(path)}`);
      if (r.ok) { const d: any = await r.json(); if (d && !d.error) return d; }
    } catch { /* fall through */ }
  }
  const { domain, apiKey } = getConfig();
  const r = await fetch(`https://${domain}/api/v1/${path}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Aha API ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function listAhaProjects(): Promise<AhaProject[]> {
  // Single source: prefer the crew server's cached /aha/products (no per-client key needed); fall
  // back to direct Aha REST if the brain is unreachable or Aha isn't configured there.
  for (const base of agentBases()) {
    try {
      const r = await fetch(base + '/aha/products');
      if (r.ok) {
        const d: any = await r.json();
        if (Array.isArray(d.products) && d.products.length) {
          return d.products.map((p: any) => ({ id: String(p.id), name: p.name, referencePrefix: p.referencePrefix ?? null, url: p.url ?? '' }));
        }
      }
    } catch { /* fall through to direct REST */ }
  }

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
  const data = (await ahaGet(`products/${projectId}`)) as Record<string, unknown>;
  const p = data.product as Record<string, unknown>;

  const project: AhaProject = {
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  };

  // Fetch releases (via the single-source proxy)
  const releasesData = (await ahaGet(`products/${projectId}/releases?per_page=50`)) as Record<string, unknown>;
  const releases = (releasesData.releases as Record<string, unknown>[] | undefined) ?? [];

  // Map releases with their stories
  const releasesWithStories = await Promise.all(
    releases.map(async (r) => {
      const releaseId = r.id as string;
      const storiesData = (await ahaGet(`releases/${releaseId}/features?per_page=100`)) as Record<string, unknown>;
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

  // Fetch all stories to find unreleased ones (via the single-source proxy)
  const allStoriesData = (await ahaGet(`products/${projectId}/features?per_page=100`)) as Record<string, unknown>;
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
