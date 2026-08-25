'use client';

import React from 'react';
import Link from 'next/link';
import { color, space, font } from '@/lib/tokens';

/**
 * HierarchyBreadcrumb — transparent hierarchy navigation
 *
 * Shows the complete path through the organization hierarchy (Dashboard > Client > Project > Mission > Sprint > Story > Task)
 * with clickable links to navigate back up the hierarchy. Uses LCARS token-based styling for consistency.
 *
 * @example
 * ```tsx
 * <HierarchyBreadcrumb
 *   hierarchy={{
 *     client: { id: 'c-1', name: 'Familiarcat' },
 *     project: { id: 'p-1', name: 'Story Agent' },
 *     mission: { id: 'm-1', name: 'UI Refactor' },
 *   }}
 *   currentLevel="mission"
 * />
 * ```
 */

export interface HierarchyLevel {
  id: string;
  name: string;
}

export interface HierarchyContext {
  client?: HierarchyLevel;
  project?: HierarchyLevel;
  mission?: HierarchyLevel;
  sprint?: HierarchyLevel;
  story?: HierarchyLevel;
  task?: HierarchyLevel;
}

export interface HierarchyBreadcrumbProps {
  /** The hierarchy context to display */
  hierarchy: HierarchyContext;
  /** Current level in the hierarchy */
  currentLevel: 'dashboard' | 'client' | 'project' | 'mission' | 'sprint' | 'story' | 'task';
  /** Optional callback when breadcrumb is clicked */
  onNavigate?: (level: string, id: string) => void;
}

type BreadcrumbItem = {
  label: string;
  href?: string;
  level: string;
};

/**
 * Generate breadcrumb items from hierarchy context
 */
function generateBreadcrumbs(hierarchy: HierarchyContext, currentLevel: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard', level: 'dashboard' },
  ];

  if (hierarchy.client) {
    items.push({
      label: `Client: ${hierarchy.client.name}`,
      href: `/clients/${hierarchy.client.id}`,
      level: 'client',
    });
  }

  if (hierarchy.project) {
    items.push({
      label: `Project: ${hierarchy.project.name}`,
      href: `/projects/${hierarchy.project.id}`,
      level: 'project',
    });
  }

  if (hierarchy.mission) {
    items.push({
      label: `Mission: ${hierarchy.mission.name}`,
      href: `/missions/${hierarchy.mission.id}`,
      level: 'mission',
    });
  }

  if (hierarchy.sprint) {
    items.push({
      label: `Sprint: ${hierarchy.sprint.name}`,
      href: `/sprints/${hierarchy.sprint.id}`,
      level: 'sprint',
    });
  }

  if (hierarchy.story) {
    items.push({
      label: `Story: ${hierarchy.story.name}`,
      href: `/story/${hierarchy.story.id}`,
      level: 'story',
    });
  }

  if (hierarchy.task) {
    items.push({
      label: `Task: ${hierarchy.task.name}`,
      level: 'task',
    });
  }

  return items;
}

export function HierarchyBreadcrumb({
  hierarchy,
  currentLevel,
  onNavigate,
}: HierarchyBreadcrumbProps): React.ReactElement {
  const items = generateBreadcrumbs(hierarchy, currentLevel);

  return (
    <nav
      aria-label="Hierarchy breadcrumb"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: space(2),
        alignItems: 'center',
        marginBottom: space(4),
        paddingBottom: space(2),
        borderBottom: `1px solid ${color.border}`,
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontFamily: font.mono,
        color: color.muted,
      }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && item.href;

        return (
          <span
            key={`${item.level}-${index}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: space(1),
            }}
          >
            {isClickable ? (
              <Link
                href={item.href!}
                onClick={(e) => {
                  if (onNavigate && item.level) {
                    e.preventDefault();
                    const context = hierarchy as Record<string, HierarchyLevel | undefined>;
                    const levelData = context[item.level];
                    if (levelData) {
                      onNavigate(item.level, levelData.id);
                    }
                  }
                }}
                style={{
                  color: color.accent,
                  textDecoration: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLAnchorElement;
                  target.style.color = color.agent;
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLAnchorElement;
                  target.style.color = color.accent;
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? color.text : color.muted,
                  fontWeight: isLast ? 700 : 400,
                }}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <span style={{ color: color.border, marginLeft: space(1), marginRight: space(1) }}>›</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default HierarchyBreadcrumb;
