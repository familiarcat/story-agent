import type { AhaProject, AhaSprint, AhaSprintStory, AhaStory } from '@story-agent/shared';
import { createAhaClient } from '@story-agent/shared/aha-client';

/**
 * Server-side Aha adapter — thin wrapper over the canonical client (@story-agent/shared/aha-client),
 * sourcing credentials from the environment. The domain logic lives in ONE place now; this file only
 * supplies creds and preserves the historical export names so existing call sites are untouched.
 */
function client() {
  return createAhaClient({
    domain: process.env.AHA_DOMAIN ?? '',
    token: process.env.AHA_API_KEY ?? '',
  });
}

export const getAhaStory = (referenceNum: string): Promise<AhaStory> => client().getStory(referenceNum);
export const listAhaStoriesForProject = (projectId: string, page = 1): Promise<AhaStory[]> => client().listStoriesForProject(projectId, page);
export const listAhaProjects = (page = 1): Promise<AhaProject[]> => client().listProjects(page);
export const updateAhaStoryStatus = (featureId: string, statusName: string): Promise<void> => client().updateStoryStatus(featureId, statusName);
export const linkAhaStoryToPR = (featureId: string, prUrl: string, prTitle: string): Promise<void> => client().linkStoryToPR(featureId, prUrl, prTitle);
export const listAhaSprints = (projectId: string): Promise<AhaSprint[]> => client().listSprints(projectId);
export const getAhaSprint = (releaseId: string): Promise<AhaSprint> => client().getSprint(releaseId);
export const getAhaSprintStories = (releaseId: string): Promise<AhaSprintStory[]> => client().getSprintStories(releaseId);
export const getProjectRoadmap = (projectId: string) => client().getRoadmap(projectId);
export const getProjectHierarchy = (projectId: string) => client().getHierarchy(projectId);
