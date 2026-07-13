import { listStories } from '@/lib/db';
import { getProjectHierarchy, listAhaProjects } from '@/lib/aha';
import type { StoryRecord } from '@story-agent/shared';
import { systemBucketFromStoryStatus, systemBucketFromWorkflowStatus } from '@story-agent/shared/system-status';
import Link from 'next/link';
import { ProjectStatusPanel, type ProjectStatusRow } from '@/components/ProjectStatusPanel';
import { RealtimeOpsPanel } from '@/components/RealtimeOpsPanel';
import { LcarsHierarchyText } from '@/components/Lcars';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const dynamic = 'force-dynamic';

type HierarchicalStoryRecord = StoryRecord & {
  clientId?: string | null;
  clientName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  sprintId?: string | null;
  sprintName?: string | null;
};

type DashboardMode = 'delivery' | 'stakeholder';

type DashboardSearchParams = {
  view?: string | string[];
  client?: string | string[];
  sprint?: string | string[];
  status?: string | string[];
  acceptance?: string | string[];
};

type SystemStatusBucket = 'queued' | 'active' | 'blocked' | 'done';

function localBucketFromStatus(value: string | null | undefined): SystemStatusBucket {
  const v = (value ?? '').toLowerCase();
  if (v.includes('block') || v.includes('fail')) return 'blocked';
  if (v.includes('merge') || v.includes('done') || v.includes('complete') || v.includes('approved')) return 'done';
  if (v.includes('implement') || v.includes('progress') || v.includes('revision') || v.includes('open')) return 'active';
  return 'queued';
}

const storyBucketFromStatus: (status: StoryRecord['status']) => SystemStatusBucket =
  typeof (systemBucketFromStoryStatus as unknown) === 'function'
    ? (status: StoryRecord['status']) => systemBucketFromStoryStatus(status) as SystemStatusBucket
    : (status: StoryRecord['status']) => localBucketFromStatus(String(status));

const workflowBucketFromStatus: (status: string | null | undefined) => SystemStatusBucket =
  typeof (systemBucketFromWorkflowStatus as unknown) === 'function'
    ? (status: string | null | undefined) => systemBucketFromWorkflowStatus(status) as SystemStatusBucket
    : (status: string | null | undefined) => localBucketFromStatus(status);

function StatusBadge({ status }: { status: StoryRecord['status'] }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function PhaseBadge({ phase }: { phase: 1 | 2 }) {
  return (
    <span style={{ fontSize: '0.75rem', color: phase === 2 ? 'var(--danger)' : 'var(--accent1)', fontWeight: 600 }}>
      Phase {phase}
    </span>
  );
}

const DEMO_STORIES: HierarchicalStoryRecord[] = [
  {
    id: 'demo-story-1',
    storyId: 'STORY-001',
    storyTitle: 'Implement user authentication',
    storyUrl: 'https://aha.io/stories/STORY-001',
    repoFullName: 'example/repo-auth',
    branch: 'STORY-001',
    baseBranch: 'main',
    prNumber: 42,
    prUrl: 'https://github.com/example/repo-auth/pull/42',
    prStatus: 'open',
    phase: 1,
    status: 'pr_open',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    notes: null,
    acceptanceCriteria: 'Demo acceptance criteria.',
    clientId: 'client-demo-client',
    clientName: 'Client',
    projectId: 'project-trial-intake',
    projectName: 'Trial Intake Automation',
    sprintId: 'sprint-24',
    sprintName: 'Sprint 24',
  },
  {
    id: 'demo-story-2',
    storyId: 'STORY-002',
    storyTitle: 'Add dashboard widgets',
    storyUrl: 'https://aha.io/stories/STORY-002',
    repoFullName: 'example/repo-ui',
    branch: 'STORY-002',
    baseBranch: 'main',
    prNumber: 38,
    prUrl: 'https://github.com/example/repo-ui/pull/38',
    prStatus: 'changes_requested',
    phase: 2,
    status: 'pr_revision',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    notes: null,
    acceptanceCriteria: 'Demo acceptance criteria.',
    clientId: 'client-demo-client',
    clientName: 'Client',
    projectId: 'project-trial-intake',
    projectName: 'Trial Intake Automation',
    sprintId: 'sprint-24',
    sprintName: 'Sprint 24',
  },
  {
    id: 'demo-story-3',
    storyId: 'STORY-003',
    storyTitle: 'Migrate to PostgreSQL',
    storyUrl: 'https://aha.io/stories/STORY-003',
    repoFullName: 'example/backend',
    branch: 'STORY-003',
    baseBranch: 'dev',
    prNumber: null,
    prUrl: null,
    prStatus: null,
    phase: 1,
    status: 'implementing',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
    notes: null,
    acceptanceCriteria: 'Demo acceptance criteria.',
    clientId: 'client-demo-acme',
    clientName: 'Acme BioSystems',
    projectId: 'project-lab-ops',
    projectName: 'Lab Ops Platform',
    sprintId: 'sprint-12',
    sprintName: 'Sprint 12',
  },
];

const CLIENT_SECURITY_PROFILES: Record<string, {
  complianceMode: string;
  llmRoute: string;
  dataPlane: string;
  notes: string;
}> = {
  Client: {
    complianceMode: 'regulated',
    llmRoute: 'approved internal endpoint required',
    dataPlane: 'live Supabase fallback recommended',
    notes: 'Corporate proxy and outbound controls require explicit provider compatibility.',
  },
  'Acme BioSystems': {
    complianceMode: 'standard',
    llmRoute: 'OpenAI-compatible endpoint',
    dataPlane: 'shared cloud Supabase',
    notes: 'Standard multi-tenant deployment with lighter outbound restrictions.',
  },
};

type HierarchyNode = {
  clientName: string;
  projectName: string;
  sprintName: string;
  storyCount: number;
  blockedCount: number;
  activeCount: number;
  doneCount: number;
  ahaProjectId?: string;
  ahaReleaseId?: string;
};

function deriveHierarchy(stories: HierarchicalStoryRecord[]): HierarchyNode[] {
  const groups = new Map<string, HierarchyNode>();

  for (const story of stories) {
    const clientName = story.clientName ?? inferClientName(story.repoFullName);
    const projectName = story.projectName ?? inferProjectName(story.repoFullName);
    const sprintName = story.sprintName ?? 'Unscheduled';
    const key = `${clientName}::${projectName}::${sprintName}`;
    const current = groups.get(key) ?? {
      clientName,
      projectName,
      sprintName,
      storyCount: 0,
      blockedCount: 0,
      activeCount: 0,
      doneCount: 0,
    };

    current.storyCount += 1;
    const bucket = storyBucketFromStatus(story.status);
    if (bucket === 'blocked') current.blockedCount += 1;
    if (bucket === 'active') current.activeCount += 1;
    if (bucket === 'done') current.doneCount += 1;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.projectName.localeCompare(b.projectName));
}

async function deriveHierarchyFromAha(): Promise<HierarchyNode[]> {
  const projects = await listAhaProjects();
  const hierarchies = await Promise.all(
    projects.map(async (project) => ({
      project,
      hierarchy: await getProjectHierarchy(project.id),
    }))
  );

  return hierarchies.map(({ project, hierarchy }) => {
    let storyCount = 0;
    let activeCount = 0;
    let blockedCount = 0;
    let doneCount = 0;

    for (const rel of hierarchy.releases) {
      for (const stories of Object.values(rel.storiesByStatus)) {
        storyCount += stories.length;
        for (const story of stories) {
          const bucket = workflowBucketFromStatus(story.workflowStatus);
          if (bucket === 'active') activeCount += 1;
          if (bucket === 'blocked') blockedCount += 1;
          if (bucket === 'done') doneCount += 1;
        }
      }
    }

    for (const story of hierarchy.unreleasedStories) {
      storyCount += 1;
      const bucket = workflowBucketFromStatus(story.workflowStatus);
      if (bucket === 'active') activeCount += 1;
      if (bucket === 'blocked') blockedCount += 1;
      if (bucket === 'done') doneCount += 1;
    }

    return {
      clientName: 'Aha',
      projectName: project.name,
      sprintName: hierarchy.releases[0]?.release.name ?? 'Unscheduled',
      storyCount,
      blockedCount,
      activeCount,
      doneCount,
      ahaProjectId: project.id,
      ahaReleaseId: hierarchy.releases[0]?.release.id,
    };
  });
}

function inferClientName(repoFullName?: string | null): string {
  const [owner] = (repoFullName ?? '').split('/');
  return owner ? owner.replace(/[-_]/g, ' ') : 'Unassigned Client';
}

function inferProjectName(repoFullName?: string | null): string {
  const [, repo] = (repoFullName ?? '').split('/');
  return repo ? repo.replace(/[-_]/g, ' ') : 'Unassigned Project';
}

function inferClientId(story: HierarchicalStoryRecord): string {
  if (story.clientId) return story.clientId.toLowerCase();
  const [owner] = (story.repoFullName ?? '').split('/');
  return (owner ?? 'unassigned-client').toLowerCase();
}

function getFirstParam(param?: string | string[]): string {
  return Array.isArray(param) ? (param[0] ?? '') : (param ?? '');
}

function acceptanceScore(story: HierarchicalStoryRecord): 'strong' | 'partial' | 'missing' {
  const acceptance = (story.acceptanceCriteria ?? '').trim();
  if (acceptance.length > 80) return 'strong';
  if (acceptance.length > 0) return 'partial';
  return 'missing';
}

function dashboardHref(params: {
  view?: DashboardMode;
  client?: string;
  sprint?: string;
  status?: StoryRecord['status'] | 'all';
  acceptance?: 'all' | 'strong' | 'partial' | 'missing';
}): string {
  const qp = new URLSearchParams();
  if (params.view && params.view !== 'delivery') qp.set('view', params.view);
  if (params.client && params.client !== 'all') qp.set('client', params.client);
  if (params.sprint && params.sprint !== 'all') qp.set('sprint', params.sprint);
  if (params.status && params.status !== 'all') qp.set('status', params.status);
  if (params.acceptance && params.acceptance !== 'all') qp.set('acceptance', params.acceptance);
  const q = qp.toString();
  return q ? `/dashboard?${q}` : '/dashboard';
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const ahaDomain = process.env.AHA_DOMAIN ?? '';
  const ahaBase = ahaDomain ? `https://${ahaDomain}` : '';
  let stories: HierarchicalStoryRecord[] = [];
  let isDemo = false;
  
  try {
    stories = await listStories() as HierarchicalStoryRecord[];
  } catch (error) {
    // If database is unavailable, use demo data
    console.warn('Database unavailable, using demo data:', error);
    stories = DEMO_STORIES;
    isDemo = true;
  }

  const mode: DashboardMode = getFirstParam(resolvedSearchParams.view) === 'stakeholder' ? 'stakeholder' : 'delivery';
  const selectedClient = getFirstParam(resolvedSearchParams.client) || 'all';
  const selectedSprint = getFirstParam(resolvedSearchParams.sprint) || 'all';
  const selectedStatus = (getFirstParam(resolvedSearchParams.status) || 'all') as StoryRecord['status'] | 'all';
  const selectedAcceptance = (getFirstParam(resolvedSearchParams.acceptance) || 'all') as 'all' | 'strong' | 'partial' | 'missing';

  const filteredStories = stories.filter((story) => {
    const clientName = story.clientName ?? inferClientName(story.repoFullName);
    const sprintName = story.sprintName ?? 'Unscheduled';
    if (selectedClient !== 'all' && selectedClient !== clientName) return false;
    if (selectedSprint !== 'all' && selectedSprint !== sprintName) return false;
    if (selectedStatus !== 'all' && selectedStatus !== story.status) return false;
    if (selectedAcceptance !== 'all' && selectedAcceptance !== acceptanceScore(story)) return false;
    return true;
  });

  const tableStories = mode === 'stakeholder' ? filteredStories : stories;
  const byStatus = (s: StoryRecord['status']) => tableStories.filter((x) => x.status === s).length;

  const clientOptions = Array.from(new Set(stories.map((s) => s.clientName ?? inferClientName(s.repoFullName)))).sort((a, b) => a.localeCompare(b));
  const sprintOptions = Array.from(new Set(stories.map((s) => s.sprintName ?? 'Unscheduled'))).sort((a, b) => a.localeCompare(b));
  let hierarchy = deriveHierarchy(stories);

  // Unification step: when Aha is reachable, use the same hierarchy projection path as the VS Code extension.
  try {
    const ahaHierarchy = await deriveHierarchyFromAha();
    if (ahaHierarchy.length > 0) hierarchy = ahaHierarchy;
  } catch {
    // Keep local tracker fallback if Aha is unavailable in the current environment.
  }

  // Figma→token pilot, now LIVE: derive the token-driven ProjectStatusPanel from the same hierarchy.
  const statusRows: ProjectStatusRow[] = hierarchy.map((node, i) => ({
    id: `${node.clientName}-${node.projectName}-${i}`,
    name: `${node.clientName} · ${node.projectName}`,
    status: node.blockedCount > 0 ? 'blocked' : node.activeCount > 0 ? 'implementing' : 'merged',
    progress: node.storyCount ? Math.round((100 * node.doneCount) / node.storyCount) : 0,
  }));

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]} />
      {isDemo && (
        <div style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--warn)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: 'var(--warn)',
          fontSize: '0.875rem',
        }}>
          ℹ️ <strong>Demo Mode:</strong> Showing client-aware sample data. Configure Supabase and client security metadata to connect live client → project → sprint → story tracking.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Delivery Command</h1>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
            Client → Project → Sprint → Story visibility with security-aware delivery context.
          </p>
        </div>
        <a href="/story/new" className="btn btn-primary">+ New Story</a>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>View Mode</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Switch between execution and stakeholder evaluation workflows.</div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link
              href={dashboardHref({ view: 'delivery' })}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: mode === 'delivery' ? 'var(--ok)' : 'var(--text-dim)',
              }}
            >
              Delivery Mode
            </Link>
            <Link
              href={dashboardHref({ view: 'stakeholder', client: selectedClient, sprint: selectedSprint, status: selectedStatus, acceptance: selectedAcceptance })}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: mode === 'stakeholder' ? 'var(--ok)' : 'var(--text-dim)',
              }}
            >
              Stakeholder Mode
            </Link>
          </div>
        </div>

        <form action="/dashboard" method="get" style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }}>
          {mode === 'stakeholder' && <input type="hidden" name="view" value="stakeholder" />}
          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Client
            <select name="client" defaultValue={selectedClient} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="all">All clients</option>
              {clientOptions.map((client) => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Sprint
            <select name="sprint" defaultValue={selectedSprint} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="all">All sprints</option>
              {sprintOptions.map((sprint) => (
                <option key={sprint} value={sprint}>{sprint}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Delivery Status
            <select name="status" defaultValue={selectedStatus} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="all">All statuses</option>
              {(['pending', 'implementing', 'pr_open', 'pr_revision', 'pr_approved', 'merged', 'blocked'] as const).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Acceptance
            <select name="acceptance" defaultValue={selectedAcceptance} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.4rem', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="all">All</option>
              <option value="strong">Strong</option>
              <option value="partial">Partial</option>
              <option value="missing">Missing</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 0.8rem' }}>Apply</button>
            <Link href={dashboardHref({ view: mode })} style={{ fontSize: '0.82rem', fontWeight: 600 }}>Reset</Link>
          </div>
        </form>
      </div>

      <RealtimeOpsPanel />

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '2rem' }}>
        {hierarchy.map(node => {
          const security = CLIENT_SECURITY_PROFILES[node.clientName] ?? {
            complianceMode: 'standard',
            llmRoute: 'default provider routing',
            dataPlane: 'standard persistence path',
            notes: 'Client-specific controls not yet configured.',
          };

          return (
            <div key={`${node.clientName}-${node.projectName}-${node.sprintName}`} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                <LcarsHierarchyText
                  parent={node.clientName}
                  parentColor="var(--warn)"
                  childColor="var(--text-dim)"
                >
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{node.projectName}</div>
                    <div style={{ fontSize: '0.9rem' }}>{node.sprintName}</div>
                  </div>
                </LcarsHierarchyText>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent1)' }}>
                  {security.complianceMode}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.88rem' }}>
                <span><strong>{node.storyCount}</strong> stories</span>
                <span><strong>{node.activeCount}</strong> active</span>
                <span><strong>{node.blockedCount}</strong> blocked</span>
              </div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                Sprint completion: <strong style={{ color: 'var(--text)' }}>{node.storyCount ? Math.round((100 * node.doneCount) / node.storyCount) : 0}%</strong>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'grid', gap: '0.4rem', fontSize: '0.84rem', color: 'var(--text)' }}>
                <LcarsHierarchyText parent="LLM Route" level={1} parentColor="var(--text)" childColor="var(--text-dim)">{security.llmRoute}</LcarsHierarchyText>
                <LcarsHierarchyText parent="Data Plane" level={1} parentColor="var(--text)" childColor="var(--text-dim)">{security.dataPlane}</LcarsHierarchyText>
                <LcarsHierarchyText parent="Security Notes" level={1} parentColor="var(--text)" childColor="var(--text-dim)">{security.notes}</LcarsHierarchyText>
              </div>
              <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                <Link href="/observation-lounge" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Stakeholder Review</Link>
                {node.ahaProjectId && ahaBase && (
                  <a
                    href={`${ahaBase}/products/${encodeURIComponent(node.ahaProjectId)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Open Aha Project
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Figma→token pilot component, live on the dashboard (token-driven; no hardcoded color). */}
      {statusRows.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <ProjectStatusPanel title="Project Status" rows={statusRows} live={!isDemo} />
        </div>
      )}

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['pending', 'implementing', 'pr_open', 'pr_revision', 'pr_approved', 'merged', 'blocked'] as const).map(s => (
          <div key={s} className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: 0, minWidth: 110, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{byStatus(s)}</div>
            <StatusBadge status={s} />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem' }}>Stakeholder Story Evaluation</h2>
        <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Use this view during sprint reviews to assess Agile story readiness from delivery status, acceptance criteria, and Aha traceability.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Story</th>
                <th>Sprint</th>
                <th>Delivery</th>
                <th>Acceptance</th>
                <th>Aha</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredStories.slice(0, 20).map((s, i) => {
                const score = acceptanceScore(s);
                return (
                  <tr key={`stakeholder-${s.id ?? s.storyId ?? i}`}>
                    <td style={{ fontWeight: 600 }}>{s.storyId}</td>
                    <td>{s.sprintName ?? 'Unscheduled'}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <span style={{ color: score === 'strong' ? 'var(--ok)' : score === 'partial' ? 'var(--warn)' : 'var(--danger)', fontWeight: 600 }}>
                        {score}
                      </span>
                    </td>
                    <td>
                      {s.storyUrl ? (
                        <a href={s.storyUrl} target="_blank" rel="noreferrer">Open</a>
                      ) : (
                        <span style={{ color: 'var(--border)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/story/${s.storyId}?clientId=${encodeURIComponent(inferClientId(s))}`}>Inspect</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStories.length === 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            No stories match the current stakeholder filters.
          </div>
        )}
      </div>

      {tableStories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem' }}>
          <p style={{ marginBottom: '0.75rem' }}>
            {mode === 'stakeholder'
              ? 'No stories matched the stakeholder filters. Adjust filters to evaluate additional stories.'
              : 'No stories tracked locally yet. Aha is the source of truth — projects and stories live there until imported.'}
          </p>
          <a href="/story/new" className="btn btn-primary">Import a story from Aha →</a>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Project</th>
                <th>Sprint</th>
                <th>Story ID</th>
                <th>Title</th>
                <th>Repository</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Phase</th>
                <th>PR</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tableStories.map((s, i) => (
                // Unique key: DB id (UUID, always present) → Aha storyId → row index. storyId can be
                // null on DB rows, which made the key non-unique/undefined (React key warning).
                <tr key={s.id ?? s.storyId ?? `story-${i}`}>
                  <td style={{ fontWeight: 600 }}>{s.clientName ?? inferClientName(s.repoFullName)}</td>
                  <td>{s.projectName ?? inferProjectName(s.repoFullName)}</td>
                  <td>{s.sprintName ?? 'Unscheduled'}</td>
                  <td>
                    <a href={s.storyUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                      {s.storyId}
                    </a>
                  </td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.storyTitle}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{s.repoFullName}</td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{s.branch}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><PhaseBadge phase={s.phase} /></td>
                  <td>
                    {s.prUrl
                      ? <a href={s.prUrl} target="_blank" rel="noreferrer">#{s.prNumber}</a>
                      : <span style={{ color: 'var(--border)' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/story/${s.storyId}?clientId=${encodeURIComponent(inferClientId(s))}`} style={{ fontSize: '0.85rem' }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
