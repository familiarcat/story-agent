/**
 * breadcrumb-utils.ts — Utilities for breadcrumb generation and hierarchy navigation
 *
 * Pure functions for generating breadcrumb paths, formatting labels, and building navigation URLs.
 * No side effects; suitable for unit testing.
 */

import type { HierarchyContext, HierarchyLevel } from '@/components/HierarchyBreadcrumb';

/**
 * Generate a breadcrumb path from a hierarchy context
 * @param hierarchy The hierarchy context
 * @returns Array of [label, id] tuples representing the breadcrumb path
 */
export function generateBreadcrumbPath(hierarchy: HierarchyContext): Array<[string, string]> {
  const path: Array<[string, string]> = [['Dashboard', 'dashboard']];

  if (hierarchy.client) {
    path.push([`Client: ${hierarchy.client.name}`, hierarchy.client.id]);
  }
  if (hierarchy.project) {
    path.push([`Project: ${hierarchy.project.name}`, hierarchy.project.id]);
  }
  if (hierarchy.mission) {
    path.push([`Mission: ${hierarchy.mission.name}`, hierarchy.mission.id]);
  }
  if (hierarchy.sprint) {
    path.push([`Sprint: ${hierarchy.sprint.name}`, hierarchy.sprint.id]);
  }
  if (hierarchy.story) {
    path.push([`Story: ${hierarchy.story.name}`, hierarchy.story.id]);
  }
  if (hierarchy.task) {
    path.push([`Task: ${hierarchy.task.name}`, hierarchy.task.id]);
  }

  return path;
}

/**
 * Format a hierarchy level name with type label
 * @param level The hierarchy level ('client' | 'project' | 'mission' | 'sprint' | 'story' | 'task')
 * @param name The display name
 * @returns Formatted label string
 */
export function formatHierarchyLabel(level: string, name: string): string {
  const levelCapitalized = level.charAt(0).toUpperCase() + level.slice(1);
  return `${levelCapitalized}: ${name}`;
}

/**
 * Build a navigation URL for a breadcrumb level
 * @param level The hierarchy level
 * @param id The entity ID
 * @returns URL string for navigation
 */
export function buildNavigationUrl(level: string, id: string): string {
  const routes: Record<string, (id: string) => string> = {
    dashboard: () => '/dashboard',
    client: (id) => `/clients/${id}`,
    project: (id) => `/projects/${id}`,
    mission: (id) => `/missions/${id}`,
    sprint: (id) => `/sprints/${id}`,
    story: (id) => `/story/${id}`,
    task: (id) => `/tasks/${id}`,
  };

  const builder = routes[level];
  if (!builder) {
    return '/dashboard';
  }

  return builder(id);
}

/**
 * Get the hierarchy depth (how many levels deep)
 * @param hierarchy The hierarchy context
 * @returns Number of levels populated in the hierarchy
 */
export function getHierarchyDepth(hierarchy: HierarchyContext): number {
  let depth = 0;
  if (hierarchy.client) depth++;
  if (hierarchy.project) depth++;
  if (hierarchy.mission) depth++;
  if (hierarchy.sprint) depth++;
  if (hierarchy.story) depth++;
  if (hierarchy.task) depth++;
  return depth;
}

/**
 * Get the current hierarchy level name
 * @param hierarchy The hierarchy context
 * @returns The deepest populated level name
 */
export function getCurrentHierarchyLevel(hierarchy: HierarchyContext): string {
  if (hierarchy.task) return 'task';
  if (hierarchy.story) return 'story';
  if (hierarchy.sprint) return 'sprint';
  if (hierarchy.mission) return 'mission';
  if (hierarchy.project) return 'project';
  if (hierarchy.client) return 'client';
  return 'dashboard';
}

/**
 * Extract a specific level from the hierarchy
 * @param hierarchy The hierarchy context
 * @param level The level to extract
 * @returns The level data or undefined
 */
export function getHierarchyLevelData(
  hierarchy: HierarchyContext,
  level: keyof HierarchyContext
): HierarchyLevel | undefined {
  return hierarchy[level];
}

/**
 * Create a breadcrumb display string (human-readable full path)
 * @param hierarchy The hierarchy context
 * @returns A string like "Dashboard > Client: Familiarcat > Project: Story Agent > ..."
 */
export function createBreadcrumbDisplayString(hierarchy: HierarchyContext): string {
  const path = generateBreadcrumbPath(hierarchy);
  return path.map(([label]) => label).join(' > ');
}
