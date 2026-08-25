export interface PmAdapter {
  // Vendor identity
  toolType: 'aha' | 'jira' | 'monday' | 'azure-devops';
  
  // Schema mapping: external field → canonical field
  fieldMapping: Record<string, string>;
  
  // Authentication
  authenticate(config: PmToolConfig): Promise<PmCredentials>;
  
  // Read operations (normalized MCP tools will call these)
  listProjects(): Promise<SaPmProject[]>;
  listSprints(projectId: string): Promise<SaPmSprint[]>;
  listStories(sprintId: string): Promise<SaPmStory[]>;
  getStory(storyId: string): Promise<SaPmStory>;
  listTasks(storyId: string): Promise<SaPmTask[]>;
  
  // Write operations
  createStory(sprint: SaPmSprint, story: Omit<SaPmStory, 'id'>): Promise<SaPmStory>;
  updateStory(story: SaPmStory): Promise<SaPmStory>;
  createTask(story: SaPmStory, task: Omit<SaPmTask, 'id'>): Promise<SaPmTask>;
  
  // Field normalization
  normalizeFields(externalFields: Record<string, any>): SaPmStory['canonicalFields'];
  denormalizeFields(canonical: SaPmStory['canonicalFields']): Record<string, any>;
}

export interface PmToolConfig {
  type: 'aha' | 'jira' | 'monday' | 'azure-devops';
  apiBaseUrl: string;
  authToken?: string;
  oauth2Config?: { clientId: string; clientSecret: string; tenant?: string };
}

export interface PmCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface SaPmProject {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface SaPmSprint {
  id: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
  state: string;
}

export interface SaPmStory {
  id: string;
  title: string;
  description?: string;
  storyPoints?: number;
  status: string;
  canonicalFields: Record<string, any>;
}

export interface SaPmTask {
  id: string;
  title: string;
  assignee?: string;
  status: string;
  priority: string;
}