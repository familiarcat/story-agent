'use client';

import { ProjectList } from '../components/pm';
import { useCallback } from 'react';
import { PMProject } from '@story-agent/shared';
import { useRouter } from 'next/navigation';

/** UUID type alias */
type UUID = string;

/**
 * Projects Page
 * 
 * Main project list view. Displays paginated project list with create/edit/delete actions.
 */

const CLIENT_ID = (process.env.NEXT_PUBLIC_STORY_AGENT_CLIENT_ID || 'default-client') as UUID;

export default function ProjectsPage() {
  const router = useRouter();

  const handleSelectProject = useCallback(
    (project: PMProject) => {
      router.push(`/projects/${project.id}`);
    },
    [router]
  );

  return (
    <main className="page projects-page">
      <div className="page-container">
        <ProjectList clientId={CLIENT_ID} onSelectProject={handleSelectProject} />
      </div>
    </main>
  );
}
