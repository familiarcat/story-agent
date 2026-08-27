// Note: This file provides a proxy layer for MCP tool calls
// Currently disabled - use pm-db.ts functions directly instead
// To re-enable, implement these functions to call pm-db exports

/*
import { listSprints as dbListSprints, listStories as dbListStories } from '@/lib/pm-db';

export async function listProjects(clientId: string) {
  // TODO: Implement with database access
  throw new Error('Not implemented');
}

export async function listSprints(projectId: string) {
  // Use database directly
  return dbListSprints(projectId);
}

export async function listStories(sprintId: string) {
  return dbListStories(srintId);
}

export async function createStory(sprintId: string, story: { title: string; description?: string; storyPoints?: number }) {
  // TODO: Implement with database
  throw new Error('Not implemented');
}
*/

export const pmProxyDisabled = true;