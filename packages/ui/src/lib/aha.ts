import type { AhaProject, AhaSprint, AhaSprintStory, AhaStory } from '@story-agent/shared';
import { createAhaClient } from '@story-agent/shared/aha-client';

/**
 * Web-side Aha adapter — thin wrapper over the canonical client (@story-agent/shared/aha-client),
 * sourcing credentials from the (server-side) environment. Domain logic lives in ONE place now; this
 * file only supplies creds + the "not configured" guard + Next's `cache: 'no-store'`, and preserves
 * the historical export names so the /api/aha/* routes are untouched.
 */
function client() {
  const domain = process.env.AHA_DOMAIN ?? '';
  const token = process.env.AHA_API_KEY ?? '';
  if (!domain || !token) {
    throw new Error('AHA_DOMAIN and AHA_API_KEY must be configured for Aha integration.');
  }
  // Preserve the web's no-store semantics (Next caches fetch by default).
  const fetchImpl: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });
  return createAhaClient({ domain, token, fetchImpl });
}

export const listAhaProjects = (page = 1): Promise<AhaProject[]> => client().listProjects(page);
export const listAhaStoriesForProject = (projectId: string, page = 1): Promise<AhaStory[]> => client().listStoriesForProject(projectId, page);
export const getAhaStory = (referenceNum: string): Promise<AhaStory> => client().getStory(referenceNum);
export const updateAhaStoryStatus = (featureId: string, statusName: string): Promise<void> => client().updateStoryStatus(featureId, statusName);
export const linkAhaStoryToPR = (featureId: string, prUrl: string, prTitle: string): Promise<void> => client().linkStoryToPR(featureId, prUrl, prTitle);
export const listAhaSprints = (projectId: string): Promise<AhaSprint[]> => client().listSprints(projectId);
export const getAhaSprint = (releaseId: string): Promise<AhaSprint> => client().getSprint(releaseId);
export const getAhaSprintStories = (releaseId: string): Promise<AhaSprintStory[]> => client().getSprintStories(releaseId);
export const getProjectRoadmap = (projectId: string) => client().getRoadmap(projectId);
export const getProjectHierarchy = (projectId: string) => client().getHierarchy(projectId);
export const createAhaStory = (releaseId: string, input: { name: string; description?: string }): Promise<AhaStory> =>
  client().createFeature(releaseId, input);
