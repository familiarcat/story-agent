/**
 * Crew Copilot - Tree view provider showing crew members and current assignments
 */

import * as vscode from 'vscode';

interface CrewMemberItem {
  crewId: string;
  crewName: string;
  status: 'idle' | 'executing' | 'error';
  currentAssignments?: string[];
}

export class CrewCopilotProvider implements vscode.TreeDataProvider<CrewCopilotItem> {
  private onDidChangeTreeDataEmitter = new vscode.EventEmitter<
    CrewCopilotItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private crewMembers: CrewMemberItem[] = [
    { crewId: 'captain', crewName: 'Picard', status: 'idle' },
    { crewId: 'architect', crewName: 'Data', status: 'idle' },
    { crewId: 'developer', crewName: 'Riker', status: 'idle' },
    { crewId: 'infrastructure', crewName: 'Geordi', status: 'idle' },
    { crewId: 'devops', crewName: "O'Brien", status: 'idle' },
    { crewId: 'security', crewName: 'Worf', status: 'idle' },
    { crewId: 'qa', crewName: 'Yar', status: 'idle' },
    { crewId: 'analyst', crewName: 'Troi', status: 'idle' },
    { crewId: 'health', crewName: 'Crusher', status: 'idle' },
    { crewId: 'communications', crewName: 'Uhura', status: 'idle' },
    { crewId: 'finance', crewName: 'Quark', status: 'idle' },
  ];

  getTreeItem(element: CrewCopilotItem): vscode.TreeItem {
    if (element instanceof CrewMemberTreeItem) {
      return element.getTreeItem();
    }
    if (element instanceof AssignmentTreeItem) {
      return element.getTreeItem();
    }
    return new vscode.TreeItem('Unknown');
  }

  async getChildren(element?: CrewCopilotItem): Promise<CrewCopilotItem[]> {
    // Root level: show all crew members
    if (!element) {
      return this.crewMembers.map(
        member => new CrewMemberTreeItem(member, this.onDidChangeTreeDataEmitter)
      );
    }

    // Crew member level: show assignments
    if (element instanceof CrewMemberTreeItem) {
      const assignments = element.member.currentAssignments || [];
      return assignments.map(
        storyRef => new AssignmentTreeItem(storyRef, element.onDidChangeTreeData)
      );
    }

    return [];
  }

  updateCrewStatus(updates: Partial<CrewMemberItem>[]): void {
    updates.forEach(update => {
      const member = this.crewMembers.find(m => m.crewId === update.crewId);
      if (member) {
        Object.assign(member, update);
      }
    });
    this.onDidChangeTreeDataEmitter.fire();
  }

  async refresh(): Promise<void> {
    // Fetch latest crew status from MCP server
    // This is called periodically to refresh the tree
    this.onDidChangeTreeDataEmitter.fire();
  }
}

type CrewCopilotItem = CrewMemberTreeItem | AssignmentTreeItem;

class CrewMemberTreeItem extends vscode.TreeItem {
  member: CrewMemberItem;
  onDidChangeTreeData: vscode.EventEmitter<CrewCopilotItem | undefined | null | void>;

  constructor(
    member: CrewMemberItem,
    onDidChangeTreeData: vscode.EventEmitter<CrewCopilotItem | undefined | null | void>
  ) {
    super(member.crewName, vscode.TreeItemCollapsibleState.Collapsed);
    this.member = member;
    this.onDidChangeTreeData = onDidChangeTreeData;

    this.iconPath = this.getIcon();
    this.description = this.getDescription();
    this.contextValue = 'crewMember';

    this.command = {
      title: 'View Crew Member',
      command: 'storyAgent.viewCrewMember',
      arguments: [member.crewId],
    };
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }

  private getIcon(): vscode.ThemeIcon | string {
    const icons: Record<string, string> = {
      captain: '🖖',
      architect: '🏗️',
      developer: '💻',
      infrastructure: '⚙️',
      devops: '🔧',
      security: '🔒',
      qa: '✅',
      analyst: '📊',
      health: '⚕️',
      communications: '📡',
      finance: '💰',
    };
    return icons[this.member.crewId] || '👤';
  }

  private getDescription(): string {
    const statuses: Record<string, string> = {
      idle: '😴 Idle',
      executing: '🔄 Executing',
      error: '⚠️ Error',
    };
    return statuses[this.member.status] || 'Unknown';
  }
}

class AssignmentTreeItem extends vscode.TreeItem {
  storyRef: string;

  constructor(
    storyRef: string,
    onDidChangeTreeData: vscode.EventEmitter<CrewCopilotItem | undefined | null | void>
  ) {
    super(storyRef, vscode.TreeItemCollapsibleState.None);
    this.storyRef = storyRef;
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    this.contextValue = 'assignment';
    this.iconPath = new vscode.ThemeIcon('file');

    this.command = {
      title: 'Open Story Execution',
      command: 'storyAgent.executeStory',
      arguments: [storyRef],
    };
  }

  getTreeItem(): vscode.TreeItem {
    return this;
  }
}
