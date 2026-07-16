/**
 * Aha Project Structure Tree Provider
 * Displays project roadmap with releases and stories, grouped by status
 */

import * as vscode from 'vscode';
import { SYSTEM_STATUS_LABEL, SYSTEM_STATUS_ORDER, type SystemStatusBucket } from '@story-agent/shared/system-status';
import { TIER_ICONS, formatRefLabel } from '@story-agent/shared/ui-tokens';
import { getProjectHierarchy, listAhaProjects, type AhaProject, type AhaSprint, type AhaSprintStory, type AhaStory } from '../aha';

interface ProjectHierarchyData {
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
    storiesByStatus: Record<SystemStatusBucket, AhaSprintStory[]>;
  }>;
  unreleasedStories: AhaStory[];
  statusesUsed: SystemStatusBucket[];
}

export class AhaProjectStructureProvider
  implements vscode.TreeDataProvider<ProjectStructureItem>
{
  private onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    ProjectStructureItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private projects: AhaProject[] = [];
  private projectHierarchies: Map<string, ProjectHierarchyData> = new Map();
  private selectedProjectId: string | null = null;

  constructor(private context?: vscode.ExtensionContext) {
    this.loadProjects();
  }

  private async loadProjects(): Promise<void> {
    try {
      this.projects = await listAhaProjects();
      this.onDidChangeTreeDataEmitter.fire();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load Aha projects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getTreeItem(element: ProjectStructureItem): vscode.TreeItem {
    if (element instanceof ProjectTreeItem) {
      return element.getTreeItem();
    }
    if (element instanceof ReleaseTreeItem) {
      return element.getTreeItem();
    }
    if (element instanceof StatusGroupTreeItem) {
      return element.getTreeItem();
    }
    if (element instanceof StoryTreeItem) {
      return element.getTreeItem();
    }
    if (element instanceof BacklogGroupTreeItem) {
      return element.getTreeItem();
    }
    return new vscode.TreeItem('Unknown');
  }

  async getChildren(element?: ProjectStructureItem): Promise<ProjectStructureItem[]> {
    // Root: show all projects
    if (!element) {
      return this.projects.map(
        (p) =>
          new ProjectTreeItem(p, this.onDidChangeTreeDataEmitter, async () => {
            await this.loadProjectHierarchy(p.id);
          })
      );
    }

    // Project level: show stats + releases
    if (element instanceof ProjectTreeItem) {
      if (!this.projectHierarchies.has(element.project.id)) {
        await this.loadProjectHierarchy(element.project.id);
      }
      const hierarchy = this.projectHierarchies.get(element.project.id);
      if (!hierarchy) return [];

      this.context?.workspaceState.update('aha.lastActiveProjectId', element.project.id);

      const items: ProjectStructureItem[] = [];

      // Add releases
      items.push(
        ...hierarchy.releases.map(
          (r) =>
            new ReleaseTreeItem(
              r.release,
              r.storiesByStatus,
              element.project.id,
              this.onDidChangeTreeDataEmitter
            )
        )
      );

      // Add backlog if has unreleased stories
      if (hierarchy.unreleasedStories.length > 0) {
        items.push(
          new BacklogGroupTreeItem(
            hierarchy.unreleasedStories,
            element.project.id,
            this.onDidChangeTreeDataEmitter
          )
        );
      }

      return items;
    }

    // Release level: show story status groups
    if (element instanceof ReleaseTreeItem) {
      return SYSTEM_STATUS_ORDER
        .map((status) => ({ status, stories: element.storiesByStatus[status] ?? [] }))
        .filter(({ stories }) => stories.length > 0)
        .map(({ status, stories }) =>
          new StatusGroupTreeItem(status, stories, element.projectId, element.release.id, this.onDidChangeTreeDataEmitter)
        );
    }

    // Status group level: show individual stories
    if (element instanceof StatusGroupTreeItem) {
      return element.stories.map(
        (s) => new StoryTreeItem(s, element.projectId, element.releaseId, this.onDidChangeTreeDataEmitter)
      );
    }

    // Backlog group level: show stories
    if (element instanceof BacklogGroupTreeItem) {
      return element.stories.map(
        (s) => new StoryTreeItem(s, element.projectId, null, this.onDidChangeTreeDataEmitter)
      );
    }

    return [];
  }

  private async loadProjectHierarchy(projectId: string): Promise<void> {
    try {
      const hierarchy = await getProjectHierarchy(projectId);
      this.projectHierarchies.set(projectId, hierarchy);
      this.onDidChangeTreeDataEmitter.fire();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load project hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  refresh(): void {
    this.projectHierarchies.clear();
    this.loadProjects();
  }
}

type ProjectStructureItem =
  | ProjectTreeItem
  | ReleaseTreeItem
  | StatusGroupTreeItem
  | StoryTreeItem
  | BacklogGroupTreeItem;

class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    readonly project: AhaProject,
    private onDidChangeTreeData: vscode.EventEmitter<
      ProjectStructureItem | undefined | null | void
    >,
    private onExpand: () => Promise<void>
  ) {
    super(project.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'ahaProject';
    this.tooltip = `Project: ${project.name}\nReference Prefix: ${project.referencePrefix || 'N/A'}`;
    this.iconPath = new vscode.ThemeIcon(TIER_ICONS.project);
    this.command = {
      title: 'Open Project',
      command: 'story-agent.openAhaProject',
      arguments: [project.url],
    };
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}

class ReleaseTreeItem extends vscode.TreeItem {
  constructor(
    readonly release: AhaSprint,
    readonly storiesByStatus: Record<SystemStatusBucket, AhaSprintStory[]>,
    readonly projectId: string,
    private onDidChangeTreeData: vscode.EventEmitter<
      ProjectStructureItem | undefined | null | void
    >
  ) {
    const totalStories = Object.values(storiesByStatus).reduce(
      (sum, stories) => sum + stories.length,
      0
    );
    const totalPoints = Object.values(storiesByStatus)
      .flat()
      .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);

    super(
      `${release.name} (${totalStories} stories, ${totalPoints} pts)`,
      vscode.TreeItemCollapsibleState.Collapsed
    );

    this.contextValue = 'ahaRelease';
    const progress =
      release.totalStoryPoints > 0
        ? Math.round((release.doneStoryPoints / release.totalStoryPoints) * 100)
        : 0;
    this.tooltip = `Sprint: ${release.name}\n${release.doneStoryPoints}/${release.totalStoryPoints} points done (${progress}%)\nStart: ${release.startDate || 'N/A'}\nEnd: ${release.endDate || 'N/A'}`;
    this.description = `${progress}% done`;
    this.iconPath = new vscode.ThemeIcon(TIER_ICONS.release);
    this.command = {
      title: 'Open Sprint',
      command: 'story-agent.openAhaSprint',
      arguments: [release.url],
    };
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}

class StatusGroupTreeItem extends vscode.TreeItem {
  constructor(
    readonly status: SystemStatusBucket,
    readonly stories: AhaSprintStory[],
    readonly projectId: string,
    readonly releaseId: string,
    private onDidChangeTreeData: vscode.EventEmitter<
      ProjectStructureItem | undefined | null | void
    >
  ) {
    super(`${SYSTEM_STATUS_LABEL[status]} (${stories.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'statusGroup';
    this.description = status;
    this.iconPath = new vscode.ThemeIcon('list-filter');
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}

class BacklogGroupTreeItem extends vscode.TreeItem {
  constructor(
    readonly stories: AhaStory[],
    readonly projectId: string,
    private onDidChangeTreeData: vscode.EventEmitter<
      ProjectStructureItem | undefined | null | void
    >
  ) {
    super(`Backlog / Unreleased (${stories.length})`, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'backlogGroup';
    this.description = `${stories.length} story(ies)`;
    this.iconPath = new vscode.ThemeIcon('inbox');
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}

class StoryTreeItem extends vscode.TreeItem {
  private readonly _projectId: string;
  private readonly _releaseId: string | null;

  constructor(
    readonly story: AhaSprintStory | AhaStory,
    projectId: string,
    releaseId: string | null,
    private onDidChangeTreeData: vscode.EventEmitter<
      ProjectStructureItem | undefined | null | void
    >
  ) {
    const refNum = (story as any).referenceNum;
    const storyPoints =
      'storyPoints' in story ? ` (${(story as any).storyPoints} pts)` : '';

    super(`${formatRefLabel(refNum, story.name)}${storyPoints}`);
    this._projectId = projectId;
    this._releaseId = releaseId;
    this.contextValue = 'ahaStory';
    const status = typeof (story as { workflowStatus?: string }).workflowStatus === 'string'
      ? (story as { workflowStatus: string }).workflowStatus
      : 'unknown';
    this.tooltip = `${story.url}\nStatus: ${status}\nRelease: ${releaseId ?? 'unreleased backlog'}`;
    this.iconPath = new vscode.ThemeIcon(TIER_ICONS.story);
    this.command = {
      title: 'Open Story',
      command: 'story-agent.openAhaStory',
      arguments: [story.url],
    };
  }

  get projectId(): string {
    return this._projectId;
  }

  get releaseId(): string | null {
    return this._releaseId;
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}
