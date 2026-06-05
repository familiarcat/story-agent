import type {
  AgileProvider,
  AgileProviderName,
  AgileProject,
  AgileStory,
  AgileSprint,
  AgileSprintStory,
} from '@story-agent/shared';

export class AhaProvider implements AgileProvider {
  readonly name: AgileProviderName = 'aha';

  private domain: string;
  private apiKey: string;

  constructor(domain: string, apiKey: string) {
    if (!domain || !apiKey) {
      throw new Error('AhaProvider requires domain and apiKey');
    }
    this.domain = domain;
    this.apiKey = apiKey;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetch(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`https://${this.domain}/api/v1/${path}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }

  private async put(path: string, body: unknown): Promise<void> {
    const res = await fetch(`https://${this.domain}/api/v1/${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  private async post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`https://${this.domain}/api/v1/${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Aha API ${res.status}: ${await res.text()}`);
  }

  async getStory(referenceNum: string): Promise<AgileStory> {
    const id = referenceNum.includes('/') ? referenceNum.split('/').pop()! : referenceNum;
    const data = await this.fetch(`features/${id}`);
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

  async listProjects(page = 1): Promise<AgileProject[]> {
    const data = await this.fetch(`products?page=${page}&per_page=100`);
    return ((data.products as Record<string, unknown>[]) ?? []).map(p => ({
      id: p.id as string,
      name: p.name as string,
      referencePrefix: (p.reference_prefix as string | undefined) ?? null,
      url: p.url as string,
    }));
  }

  async listStoriesForProject(projectId: string, page = 1): Promise<AgileStory[]> {
    const data = await this.fetch(`products/${projectId}/features?page=${page}&per_page=100`);
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

  async listSprints(projectId: string): Promise<AgileSprint[]> {
    const data = await this.fetch(`products/${projectId}/releases?per_page=50`);
    return ((data.releases as Record<string, unknown>[]) ?? []).map(r => this.mapRelease(r));
  }

  async getSprint(sprintId: string): Promise<AgileSprint> {
    const data = await this.fetch(`releases/${sprintId}`);
    return this.mapRelease(data.release as Record<string, unknown>);
  }

  async getSprintStories(sprintId: string): Promise<AgileSprintStory[]> {
    const data = await this.fetch(`releases/${sprintId}/features?per_page=100`);
    return ((data.features as Record<string, unknown>[]) ?? []).map(f => ({
      referenceNum: f.reference_num as string,
      name: f.name as string,
      storyPoints: (f.score as number | null | undefined) ?? null,
      workflowStatus: (f.workflow_status as Record<string, unknown>)?.name as string ?? 'unknown',
      url: f.url as string,
    }));
  }

  async updateStoryStatus(featureId: string, statusName: string): Promise<void> {
    await this.put(`features/${featureId}`, {
      feature: { workflow_status: { name: statusName } },
    });
  }

  async addStoryComment(featureId: string, body: string): Promise<void> {
    await this.post(`features/${featureId}/comments`, { comment: { body } });
  }

  private mapRelease(r: Record<string, unknown>): AgileSprint {
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
}
