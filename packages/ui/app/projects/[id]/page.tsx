'use client';

import { SprintBoard } from '../../components/pm';
import { useCallback, useState } from 'react';

/** UUID type alias */
type UUID = string;

/**
 * Project Detail Page
 * 
 * Shows sprint board, project metrics, and project settings.
 */

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const [projectId, setProjectId] = useState<UUID | undefined>(undefined);
  const [activeSprint, setActiveSprint] = useState<UUID | undefined>(undefined);

  // Resolve params (Next.js 15 pattern)
  const resolveParams = async () => {
    const resolved = await params;
    setProjectId(resolved.id as UUID);
  };

  // Call on mount
  if (!projectId) {
    resolveParams();
  }

  const handleSelectSprint = useCallback((sprintId: UUID) => {
    setActiveSprint(sprintId);
  }, []);

  if (!projectId) {
    return <div className="page loading">Loading project...</div>;
  }

  return (
    <main className="page project-detail-page">
      <div className="page-container">
        <div className="project-detail-header">
          <h1>Project Details</h1>
          {/* TODO: Fetch and display project metadata */}
        </div>

        <div className="project-detail-tabs">
          <div className="tab-sprint">
            <SprintBoard
              projectId={projectId}
              activeSprint={activeSprint}
              onSelectSprint={handleSelectSprint}
            />
          </div>

          <div className="tab-metrics">
            {/* TODO: Add ProjectMetrics component */}
            <section>
              <h2>Metrics</h2>
              <p>Project metrics placeholder</p>
            </section>
          </div>

          <div className="tab-settings">
            {/* TODO: Add ProjectSettings component */}
            <section>
              <h2>Settings</h2>
              <p>Project settings placeholder</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
