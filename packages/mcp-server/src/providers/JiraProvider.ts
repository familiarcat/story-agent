import type {
  AgileProvider,
  AgileProviderName,
  AgileProject,
  AgileStory,
  AgileSprint,
  AgileSprintStory,
} from '@story-agent/shared';

/**
 * Jira Cloud provider.
 *
 * Env vars:
 *   JIRA_DOMAIN    — e.g. yourorg.atlassian.net
 *   JIRA_EMAIL     — Atlassian account email (used for basic auth)
 *   JIRA_API_TOKEN — Atlassian API token
 *
 * Reference IDs use Jira issue keys (e.g. PROJ-123).
 * Sprints require the Jira Software (Agile) API and a board ID.
 */
export class JiraProvider implements AgileProvider {
  readonly name: AgileProviderName = 'jira';

  private domain: string;
  private email: string;
  private apiToken: string;

  constructor(domain: string, email: string, apiToken: string) {
    if (!domain || !email || !apiToken) {
      throw new Error('JiraProvider requires domain, email, and apiToken');
    }
    this.domain = domain;
    this.email = email;
    this.apiToken = apiToken;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`;
  }

  private get headers() {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetch(path: string, apiVersion = 3): Promise<Record<string, unknown>> {
    const res = await fetch(
      `https://${this.domain}/rest/api/${apiVersion}/${path}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  private async agileGet(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(
      `https://${this.domain}/rest/agile/1.0/${path}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Jira Agile API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  async getStory(referenceNum: string): Promise<AgileStory> {
    // referenceNum is a Jira issue key e.g. PROJ-123
    const data = await this.fetch(`issue/${referenceNum}?fields=summary,description,status,customfield_10016,issuetype,subtasks`);
    const fields = data.fields as Record<string, unknown>;
    const description = this.extractAdf(fields.description as Record<string, unknown> | null);
    const subtasks = (fields.subtasks as Record<string, unknown>[] | undefined) ?? [];
    const acceptanceCriteria = subtasks.map(s => `- ${(s.fields as Record<string, unknown>)?.summary ?? s.key}`).join('\n');

    return {
      id: data.id as string,
      referenceNum: data.key as string,
      name: fields.summary as string,
      description,
      acceptanceCriteria,
      url: `https://${this.domain}/browse/${data.key}`,
      workflowStatus: (fields.status as Record<string, unknown>)?.name as string ?? 'unknown',
    };
  }

  async listProjects(page = 1): Promise<AgileProject[]> {
    const startAt = (page - 1) * 50;
    const data = await this.fetch(`project/search?startAt=${startAt}&maxResults=50&orderBy=name`);
    const values = (data.values as Record<string, unknown>[]) ?? [];
    return values.map(p => ({
      id: p.id as string,
      name: p.name as string,
      referencePrefix: p.key as string,
      url: `https://${this.domain}/jira/software/projects/${p.key}/boards`,
    }));
  }

  async listStoriesForProject(projectId: string, page = 1): Promise<AgileStory[]> {
    const startAt = (page - 1) * 50;
    const data = await this.fetch(
      `search?jql=${encodeURIComponent(`project="${projectId}" AND issuetype in standardIssueTypes() ORDER BY created DESC`)}&startAt=${startAt}&maxResults=50&fields=summary,status`
    );
    const issues = (data.issues as Record<string, unknown>[]) ?? [];
    return issues.map(i => {
      const fields = i.fields as Record<string, unknown>;
      return {
        id: i.id as string,
        referenceNum: i.key as string,
        name: fields.summary as string,
        description: '',
        acceptanceCriteria: '',
        url: `https://${this.domain}/browse/${i.key}`,
        workflowStatus: (fields.status as Record<string, unknown>)?.name as string ?? 'unknown',
      };
    });
  }

  async listSprints(projectId: string): Promise<AgileSprint[]> {
    // Jira Agile: find boards for the project then list sprints
    const boardData = await this.agileGet(`board?projectKeyOrId=${encodeURIComponent(projectId)}`);
    const boards = (boardData.values as Record<string, unknown>[]) ?? [];
    if (boards.length === 0) return [];

    const boardId = boards[0].id as string;
    const sprintData = await this.agileGet(`board/${boardId}/sprint?state=active,future,closed`);
    const sprints = (sprintData.values as Record<string, unknown>[]) ?? [];

    return sprints.map(s => ({
      id: String(s.id),
      name: s.name as string,
      startDate: (s.startDate as string | undefined) ?? null,
      endDate: (s.endDate as string | undefined) ?? null,
      url: `https://${this.domain}/jira/software/projects/${projectId}/boards/${boardId}`,
      totalStoryPoints: 0,   // requires separate capacity query
      doneStoryPoints: 0,
      remainingStoryPoints: 0,
      featureCount: 0,
    }));
  }

  async getSprint(sprintId: string): Promise<AgileSprint> {
    const data = await this.agileGet(`sprint/${sprintId}`);
    return {
      id: String(data.id),
      name: data.name as string,
      startDate: (data.startDate as string | undefined) ?? null,
      endDate: (data.endDate as string | undefined) ?? null,
      url: data.self as string,
      totalStoryPoints: 0,
      doneStoryPoints: 0,
      remainingStoryPoints: 0,
      featureCount: 0,
    };
  }

  async getSprintStories(sprintId: string): Promise<AgileSprintStory[]> {
    const data = await this.agileGet(
      `sprint/${sprintId}/issue?fields=summary,status,story_points,customfield_10016`
    );
    const issues = (data.issues as Record<string, unknown>[]) ?? [];
    return issues.map(i => {
      const fields = i.fields as Record<string, unknown>;
      return {
        referenceNum: i.key as string,
        name: fields.summary as string,
        storyPoints: (fields.customfield_10016 as number | null | undefined) ?? null,
        workflowStatus: (fields.status as Record<string, unknown>)?.name as string ?? 'unknown',
        url: `https://${this.domain}/browse/${i.key}`,
      };
    });
  }

  async updateStoryStatus(issueKey: string, statusName: string): Promise<void> {
    // Jira uses transitions — find the transition ID for the target status
    const transData = await this.fetch(`issue/${issueKey}/transitions`);
    const transitions = (transData.transitions as Record<string, unknown>[]) ?? [];
    const transition = transitions.find(
      t => (t.name as string).toLowerCase() === statusName.toLowerCase()
    );
    if (!transition) {
      throw new Error(`Jira: no transition named "${statusName}" found for ${issueKey}`);
    }
    const res = await fetch(
      `https://${this.domain}/rest/api/3/issue/${issueKey}/transitions`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ transition: { id: transition.id } }),
      }
    );
    if (!res.ok) throw new Error(`Jira transition ${res.status}: ${await res.text()}`);
  }

  async addStoryComment(issueKey: string, body: string): Promise<void> {
    const res = await fetch(
      `https://${this.domain}/rest/api/3/issue/${issueKey}/comment`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`Jira comment ${res.status}: ${await res.text()}`);
  }

  /** Extract plain text from Atlassian Document Format (ADF) */
  private extractAdf(node: Record<string, unknown> | null | undefined): string {
    if (!node) return '';
    if (node.type === 'text') return (node.text as string) ?? '';
    const children = (node.content as Record<string, unknown>[]) ?? [];
    return children.map(c => this.extractAdf(c)).join('');
  }
}
