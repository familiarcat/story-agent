import { callMcpTool } from '../../mcp-server/src/client';

export async function listProjects(clientId: string) {
  return callMcpTool('pm-list-projects', { clientId });
}

export async function listSprints(projectId: string) {
  return callMcpTool('pm-list-sprints', { projectId });
}

export async function listStories(sprintId: string) {
  return callMcpTool('pm-list-stories', { sprintId });
}

export async function createStory(sprintId: string, story: { title: string; description?: string; storyPoints?: number }) {
  return callMcpTool('pm-create-story', { sprintId, story });
}