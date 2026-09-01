'use client';

import { SprintBoard } from '../../components/pm';
import { useCallback, useState, useEffect } from 'react';
import { PMProject } from '@story-agent/shared';
import { useProjectList, useProjectMetrics } from '../../hooks/pm';

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
  const [project, setProject] = useState<PMProject | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const { metrics, loading: metricsLoading } = useProjectMetrics(projectId || ('default' as UUID));

  // Resolve params (Next.js 15 pattern)
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      const id = resolved.id as UUID;
      setProjectId(id);
      // Fetch project details
      setProjectLoading(true);
      try {
        const response = await fetch(`/api/pm/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data.data);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setProjectLoading(false);
      }
    };
    resolveParams();
  }, [params]);

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
        <div className="header-content">
          <h1>{project?.name || 'Project'}</h1>
          <p className="project-description">{project?.description}</p>
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
            <section className="metrics-section">
              <h2>Project Metrics</h2>
              {metricsLoading ? (
                <p>Loading metrics...</p>
              ) : metrics ? (
                <div className="metrics-grid">
                  <div className="metric-card">
                    <h4>Completion Rate</h4>
                    <p className="metric-value">{metrics.completion_rate?.toFixed(1)}%</p>
                  </div>
                  <div className="metric-card">
                    <h4>Total Stories</h4>
                    <p className="metric-value">{metrics.total_stories}</p>
                  </div>
                  <div className="metric-card">
                    <h4>Completed</h4>
                    <p className="metric-value">{metrics.completed_stories}</p>
                  </div>
                  <div className="metric-card">
                    <h4>In Progress</h4>
                    <p className="metric-value">{metrics.in_progress_stories}</p>
                  </div>
                </div>
              ) : (
                <p>No metrics available</p>
              )}
            </section>
          </div>

          <div className="tab-settings">
            <section className="settings-section">
              <h2>Project Settings</h2>
              {projectLoading ? (
                <p>Loading settings...</p>
              ) : project ? (
                <div className="settings-grid">
                  <div className="setting-item">
                    <label>Project Name</label>
                    <p>{project.name}</p>
                  </div>
                  <div className="setting-item">
                    <label>Status</label>
                    <p>{project.status}</p>
                  </div>
                  <div className="setting-item">
                    <label>Workflow Type</label>
                    <p>{project.workflow_type || 'N/A'}</p>
                  </div>
                  <div className="setting-item">
                    <label>Created At</label>
                    <p>{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <p>Project not found</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
