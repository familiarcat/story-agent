import type { AhaEpic, AhaProject, AhaSprint, AhaSprintStory, AhaStory } from './index.js';
import { mapProduct, mapEpic, mapFeatureSummary, mapFeatureToStory, mapRelease, mapSprintStory } from './aha-mappers.js';
import { SYSTEM_STATUS_ORDER, type SystemStatusBucket, systemBucketFromWorkflowStatus } from './system-status.js';

/**
 * Canonical Aha REST client — the single source of truth for the Aha/PM domain.
 *
 * PURE + INJECTED: it takes `{ domain, token, fetchImpl? }` and sources NO credentials itself, so
 * every surface wraps it with its own cred/transport adapter (server: env/WorfGate, web: env,
 * VS Code: config/OAuth). This kills the triplicated Aha client that previously lived in
 * mcp-server/lib/aha.ts, ui/lib/aha.ts, and vscode-extension/src/aha.ts. Types stay in @story-agent/shared.
 */
export interface AhaClientConfig {
  /** Aha domain, e.g. "familiarcat.aha.io" (no protocol). */
  domain: string;
  /** Bearer token / API key. */
  token: string;
  /** Override fetch (tests / non-global-fetch runtimes). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface AhaClient {
  getStory(referenceNum: string): Promise<AhaStory>;
  listStoriesForProject(projectId: string, page?: number): Promise<AhaStory[]>;
  listEpicsForProject(projectId: string, page?: number): Promise<AhaEpic[]>;
  getEpic(epicId: string): Promise<AhaEpic>;
  listProjects(page?: number): Promise<AhaProject[]>;
  updateStoryStatus(featureId: string, statusName: string): Promise<void>;
  linkStoryToPR(featureId: string, prUrl: string, prTitle: string): Promise<void>;
  listSprints(projectId: string): Promise<AhaSprint[]>;
  getSprint(releaseId: string): Promise<AhaSprint>;
  getSprintStories(releaseId: string): Promise<AhaSprintStory[]>;
  createFeature(releaseId: string, input: { name: string; description?: string }): Promise<AhaStory>;
  getRoadmap(projectId: string): Promise<{
    project: AhaProject;
    releases: Array<AhaSprint & { stories: AhaSprintStory[] }>;
    unreleasedStories: AhaStory[];
  }>;
  getHierarchy(projectId: string): Promise<{
    project: AhaProject;
    stats: { totalStories: number; totalStoryPoints: number; plannedPoints: number; completedPoints: number; releaseCount: number };
    releases: Array<{ release: AhaSprint; storiesByStatus: Record<SystemStatusBucket, AhaSprintStory[]> }>;
    unreleasedStories: AhaStory[];
    statusesUsed: SystemStatusBucket[];
  }>;
}

export function createAhaClient(cfg: AhaClientConfig): AhaClient {
  const f = cfg.fetchImpl ?? fetch;
  const base = `https://${cfg.domain}/api/v1`;
  const headers = () => ({
    Authorization: `Bearer ${cfg.token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  async function get(path: string): Promise<Record<string, unknown>> {
    const res = await f(`${base}/${path}`, { headers: headers() });
    if (!res.ok) throw new Error(`Aha API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }
  async function send(method: 'PUT' | 'POST', path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await f(`${base}/${path}`, { method, headers: headers(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Aha API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  const listStoriesForProject: AhaClient['listStoriesForProject'] = async (projectId, page = 1) => {
    const data = await get(`products/${projectId}/features?page=${page}&per_page=50`);
    const features = (data.features as Record<string, unknown>[] | undefined) ?? [];
    return features.map(mapFeatureSummary);
  };

  const listEpicsForProject: AhaClient['listEpicsForProject'] = async (projectId, page = 1) => {
    const data = await get(`products/${projectId}/epics?page=${page}&per_page=50`);
    const epics = (data.epics as Record<string, unknown>[] | undefined) ?? [];
    return epics.map(mapEpic);
  };

  const listSprints: AhaClient['listSprints'] = async (projectId) => {
    const data = await get(`products/${projectId}/releases?per_page=50`);
    const releases = (data.releases as Record<string, unknown>[] | undefined) ?? [];
    return releases.map(mapRelease);
  };

  const getSprintStories: AhaClient['getSprintStories'] = async (releaseId) => {
    const data = await get(`releases/${releaseId}/features?per_page=100`);
    const features = (data.features as Record<string, unknown>[] | undefined) ?? [];
    return features.map(mapSprintStory);
  };

  const getRoadmap: AhaClient['getRoadmap'] = async (projectId) => {
    const projectData = await get(`products/${projectId}`);
    const project = mapProduct(projectData.product as Record<string, unknown>);
    const releases = await listSprints(projectId);
    const releasesWithStories = await Promise.all(
      releases.map(async (release) => ({ ...release, stories: await getSprintStories(release.id) })),
    );
    const allStories = await listStoriesForProject(projectId);
    const releasedStoryIds = new Set(releasesWithStories.flatMap((r) => r.stories.map((s) => s.referenceNum)));
    const unreleasedStories = allStories.filter((s) => !releasedStoryIds.has(s.referenceNum));
    return { project, releases: releasesWithStories, unreleasedStories };
  };

  const getHierarchy: AhaClient['getHierarchy'] = async (projectId) => {
    const roadmap = await getRoadmap(projectId);
    const releasesWithGroupedStories = roadmap.releases.map((release) => {
      const storiesByStatus: Record<SystemStatusBucket, AhaSprintStory[]> = {
        pending: [],
        active: [],
        blocked: [],
        done: [],
      };
      for (const story of release.stories) {
        storiesByStatus[systemBucketFromWorkflowStatus(story.workflowStatus)].push(story);
      }
      return { release, storiesByStatus };
    });

    const statusesUsed = new Set<SystemStatusBucket>();
    for (const rel of releasesWithGroupedStories) {
      for (const status of SYSTEM_STATUS_ORDER) {
        if (rel.storiesByStatus[status].length > 0) statusesUsed.add(status);
      }
    }
    for (const story of roadmap.unreleasedStories) {
      statusesUsed.add(systemBucketFromWorkflowStatus(story.workflowStatus));
    }

    const totalStoryPoints = roadmap.releases.reduce((sum, r) => sum + r.totalStoryPoints, 0);
    const completedPoints = roadmap.releases.reduce((sum, r) => sum + r.doneStoryPoints, 0);
    return {
      project: roadmap.project,
      stats: {
        totalStories: roadmap.releases.reduce((sum, r) => sum + r.featureCount, 0) + roadmap.unreleasedStories.length,
        totalStoryPoints,
        plannedPoints: totalStoryPoints,
        completedPoints,
        releaseCount: roadmap.releases.length,
      },
      releases: releasesWithGroupedStories,
      unreleasedStories: roadmap.unreleasedStories,
      statusesUsed: SYSTEM_STATUS_ORDER.filter((status) => statusesUsed.has(status)),
    };
  };

  return {
    listStoriesForProject,
    listEpicsForProject,
    listSprints,
    getSprintStories,
    getRoadmap,
    getHierarchy,
    async getStory(referenceNum) {
      const id = referenceNum.includes('/') ? referenceNum.split('/').pop()! : referenceNum;
      const data = await get(`features/${id}`);
      return mapFeatureToStory(data.feature as Record<string, unknown>);
    },
    async getEpic(epicId) {
      const data = await get(`epics/${epicId}`);
      return mapEpic(data.epic as Record<string, unknown>);
    },
    async listProjects(page = 1) {
      const data = await get(`products?page=${page}&per_page=100`);
      const products = (data.products as Record<string, unknown>[] | undefined) ?? [];
      return products.map(mapProduct);
    },
    async updateStoryStatus(featureId, statusName) {
      await send('PUT', `features/${featureId}`, { feature: { workflow_status: { name: statusName } } });
    },
    async linkStoryToPR(featureId, prUrl, prTitle) {
      await send('POST', `features/${featureId}/comments`, { comment: { body: `Pull Request opened: [${prTitle}](${prUrl})` } });
    },
    async getSprint(releaseId) {
      const data = await get(`releases/${releaseId}`);
      return mapRelease(data.release as Record<string, unknown>);
    },
    async createFeature(releaseId, input) {
      const data = await send('POST', `releases/${releaseId}/features`, {
        feature: { name: input.name, ...(input.description ? { description: input.description } : {}) },
      });
      return mapFeatureToStory(data.feature as Record<string, unknown>);
    },
  };
}
