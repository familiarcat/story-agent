import type {
  AgileProvider,
  AgileProviderName,
  AgileProject,
  AgileStory,
  AgileSprint,
  AgileSprintStory,
} from '@story-agent/shared';

/** Base class for providers that are not yet fully implemented. */
abstract class StubProvider implements AgileProvider {
  abstract readonly name: AgileProviderName;

  protected stub(method: string): never {
    throw new Error(`${this.name} provider: ${method} is not yet implemented. Contributions welcome.`);
  }

  getStory(_ref: string): Promise<AgileStory> { this.stub('getStory'); }
  listProjects(_page?: number): Promise<AgileProject[]> { this.stub('listProjects'); }
  listStoriesForProject(_id: string, _page?: number): Promise<AgileStory[]> { this.stub('listStoriesForProject'); }
  listSprints(_id: string): Promise<AgileSprint[]> { this.stub('listSprints'); }
  getSprint(_id: string): Promise<AgileSprint> { this.stub('getSprint'); }
  getSprintStories(_id: string): Promise<AgileSprintStory[]> { this.stub('getSprintStories'); }
  updateStoryStatus(_id: string, _status: string): Promise<void> { this.stub('updateStoryStatus'); }
  addStoryComment(_id: string, _body: string): Promise<void> { this.stub('addStoryComment'); }
}

/**
 * Linear provider stub.
 *
 * Env vars: LINEAR_API_KEY
 * Linear uses a GraphQL API — full implementation would use @linear/sdk.
 */
export class LinearProvider extends StubProvider {
  readonly name: AgileProviderName = 'linear';

  constructor(_apiKey: string) {
    super();
    // Real impl would initialize @linear/sdk LinearClient here
  }
}

/**
 * GitHub Projects v2 provider stub.
 *
 * Env vars: GITHUB_TOKEN, GITHUB_ORG
 * Uses GitHub GraphQL API (Projects v2).
 */
export class GitHubProjectsProvider extends StubProvider {
  readonly name: AgileProviderName = 'github-projects';

  constructor(_token: string, _org: string) {
    super();
  }
}

/**
 * Azure DevOps provider stub.
 *
 * Env vars: AZURE_DEVOPS_ORG, AZURE_DEVOPS_TOKEN
 * Uses Azure DevOps REST API (boards, sprints, work items).
 */
export class AzureDevOpsProvider extends StubProvider {
  readonly name: AgileProviderName = 'azure-devops';

  constructor(_org: string, _token: string) {
    super();
  }
}
