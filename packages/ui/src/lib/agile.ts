/**
 * Provider-agnostic agile client for the Next.js UI layer.
 *
 * The UI reads AGILE_PROVIDER from env to determine which provider's
 * env vars to use. Falls back to Aha if not set.
 *
 * All UI agile data fetching should import from this file, not from ./aha.
 */

import type { AgileProject, AgileSprintStory, AgileSprint, AgileStory } from '@story-agent/shared';

const PROVIDER = (process.env.AGILE_PROVIDER ?? 'aha') as
  | 'aha'
  | 'jira'
  | 'linear'
  | 'github-projects'
  | 'azure-devops';

// ── Shared fetch helper ────────────────────────────────────────────────────

function ahaHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.AHA_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function jiraHeaders(): HeadersInit {
  const token = Buffer.from(
    `${process.env.JIRA_EMAIL ?? ''}:${process.env.JIRA_API_TOKEN ?? ''}`
  ).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function ahaFetch(path: string): Promise<Record<string, unknown>> {
  if (!process.env.AHA_DOMAIN || !process.env.AHA_API_KEY) {
    throw new Error('AHA_DOMAIN and AHA_API_KEY must be configured.');
  }
  const res = await fetch(`https://${process.env.AHA_DOMAIN}/api/v1/${path}`, {
    headers: ahaHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function jiraFetch(path: string, version = 3): Promise<Record<string, unknown>> {
  if (!process.env.JIRA_DOMAIN) throw new Error('JIRA_DOMAIN must be configured.');
  const res = await fetch(`https://${process.env.JIRA_DOMAIN}/rest/api/${version}/${path}`, {
    headers: jiraHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

// ── Provider name ─────────────────────────────────────────────────────────

export function getProviderName(): string {
  const labels: Record<string, string> = {
    aha: 'Aha',
    jira: 'Jira',
    linear: 'Linear',
    'github-projects': 'GitHub Projects',
    'azure-devops': 'Azure DevOps',
  };
  return labels[PROVIDER] ?? PROVIDER;
}

// ── Get Story ─────────────────────────────────────────────────────────────

export async function getStory(referenceNum: string): Promise<AgileStory> {
  if (PROVIDER === 'jira') {
    const data = await jiraFetch(`issue/${referenceNum}?fields=summary,description,status`);
    const fields = data.fields as Record<string, unknown>;
    return {
      id: data.id as string,
      referenceNum: data.key as string,
      name: fields.summary as string,
      description: extractJiraAdf(fields.description as Record<string, unknown> | null),
      acceptanceCriteria: '',
      url: `https://${process.env.JIRA_DOMAIN}/browse/${data.key}`,
      workflowStatus: (fields.status as Record<string, unknown>)?.name as string ?? 'unknown',
    };
  }

  // Default: Aha
  const id = referenceNum.includes('/') ? referenceNum.split('/').pop()! : referenceNum;
  const data = await ahaFetch(`features/${id}`);
  const f = data.feature as Record<string, unknown>;
  const description = (f.description as Record<string, unknown> | null)?.body as string ?? '';
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
    description,
    acceptanceCriteria,
    url: f.url as string,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
  };
}

// ── List Projects ─────────────────────────────────────────────────────────

export async function listProjects(page = 1): Promise<AgileProject[]> {
  if (PROVIDER === 'jira') {
    const startAt = (page - 1) * 50;
    const data = await jiraFetch(`project/search?startAt=${startAt}&maxResults=50`);
    return ((data.values as Record<string, unknown>[]) ?? []).map(p => ({
      id: p.id as string,
      name: p.name as string,
      referencePrefix: p.key as string,
      url: `https://${process.env.JIRA_DOMAIN}/jira/software/projects/${p.key}/boards`,
    }));
  }

  const data = await ahaFetch(`products?page=${page}&per_page=100`);
  return ((data.products as Record<string, unknown>[]) ?? []).map(p => ({
    id: p.id as string,
    name: p.name as string,
    referencePrefix: (p.reference_prefix as string | undefined) ?? null,
    url: p.url as string,
  }));
}

// ── List Stories ─────────────────────────────────────────────────────────

export async function listStoriesForProject(projectId: string, page = 1): Promise<AgileStory[]> {
  if (PROVIDER === 'jira') {
    const startAt = (page - 1) * 50;
    const data = await jiraFetch(
      `search?jql=${encodeURIComponent(`project="${projectId}" ORDER BY created DESC`)}&startAt=${startAt}&maxResults=50&fields=summary,status`
    );
    return ((data.issues as Record<string, unknown>[]) ?? []).map(i => {
      const fields = i.fields as Record<string, unknown>;
      return {
        id: i.id as string,
        referenceNum: i.key as string,
        name: fields.summary as string,
        description: '',
        acceptanceCriteria: '',
        url: `https://${process.env.JIRA_DOMAIN}/browse/${i.key}`,
        workflowStatus: (fields.status as Record<string, unknown>)?.name as string ?? 'unknown',
      };
    });
  }

  const data = await ahaFetch(`products/${projectId}/features?page=${page}&per_page=100`);
  return ((data.features as Record<string, unknown>[]) ?? []).map(f => ({
    id: f.id as string,
    referenceNum: f.reference_num as string,
    name: f.name as string,
    description: '',
    acceptanceCriteria: '',
    url: f.url as string,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
  }));
}

// ── Sprints ───────────────────────────────────────────────────────────────

export async function listSprints(projectId: string): Promise<AgileSprint[]> {
  if (PROVIDER === 'jira') {
    throw new Error('Jira sprint support requires a board ID. Use the MCP server sprint tools instead.');
  }

  const data = await ahaFetch(`products/${projectId}/releases?per_page=50`);
  return ((data.releases as Record<string, unknown>[]) ?? []).map(mapAhaRelease);
}

export async function getSprintStories(releaseId: string): Promise<{ stories: AgileSprintStory[]; totalPoints: number }> {
  if (PROVIDER === 'jira') {
    throw new Error('Jira sprint stories require the Agile API. Use the MCP server tools instead.');
  }

  const data = await ahaFetch(`releases/${releaseId}/features?per_page=100`);
  const stories = ((data.features as Record<string, unknown>[]) ?? []).map(f => ({
    referenceNum: f.reference_num as string,
    name: f.name as string,
    storyPoints: (f.score as number | null | undefined) ?? null,
    workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
    url: f.url as string,
  }));
  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
  return { stories, totalPoints };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function mapAhaRelease(r: Record<string, unknown>): AgileSprint {
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

function extractJiraAdf(node: Record<string, unknown> | null | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return (node.text as string) ?? '';
  return ((node.content as Record<string, unknown>[]) ?? []).map(c => extractJiraAdf(c)).join('');
}

// ── Re-export Aha-specific functions for backward compat ────────────────────
// (existing code that imports from ./aha still works)
export {
  listAhaProjects,
  listAhaStoriesForProject,
  getAhaStory,
  listAhaSprints,
  getAhaSprint,
  getAhaSprintStories,
  updateAhaStoryStatus,
  linkAhaStoryToPR,
} from './aha';
