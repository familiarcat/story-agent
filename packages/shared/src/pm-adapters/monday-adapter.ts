import { PmAdapter, PmToolConfig, PmCredentials, SaPmProject, SaPmSprint, SaPmStory, SaPmTask } from './types';

export class MondayAdapter implements PmAdapter {
  toolType = 'monday' as const;
  fieldMapping: Record<string, string> = {};

  async authenticate(config: PmToolConfig): Promise<PmCredentials> {
    // TODO: Implement OAuth2 authentication for Monday.com
    return { accessToken: 'dummy-token' };
  }

  async listProjects(): Promise<SaPmProject[]> {
    // TODO: Implement Monday.com project listing
    return [];
  }

  async listSprints(projectId: string): Promise<SaPmSprint[]> {
    // TODO: Implement Monday.com sprint listing
    return [];
  }

  async listStories(sprintId: string): Promise<SaPmStory[]> {
    // TODO: Implement Monday.com story listing
    return [];
  }

  async getStory(storyId: string): Promise<SaPmStory> {
    // TODO: Implement Monday.com story fetching
    return { id: storyId, title: 'dummy-story', status: 'open', canonicalFields: {} };
  }

  async listTasks(storyId: string): Promise<SaPmTask[]> {
    // TODO: Implement Monday.com task listing
    return [];
  }

  async createStory(sprint: SaPmSprint, story: Omit<SaPmStory, 'id'>): Promise<SaPmStory> {
    // TODO: Implement Monday.com story creation
    return { ...story, id: 'new-id', canonicalFields: {} };
  }

  async updateStory(story: SaPmStory): Promise<SaPmStory> {
    // TODO: Implement Monday.com story update
    return story;
  }

  async createTask(story: SaPmStory, task: Omit<SaPmTask, 'id'>): Promise<SaPmTask> {
    // TODO: Implement Monday.com task creation
    return { ...task, id: 'new-id' };
  }

  normalizeFields(externalFields: Record<string, any>): Record<string, any> {
    // TODO: Implement Monday.com field normalization
    return {};
  }

  denormalizeFields(canonical: Record<string, any>): Record<string, any> {
    // TODO: Implement Monday.com field denormalization
    return {};
  }
}