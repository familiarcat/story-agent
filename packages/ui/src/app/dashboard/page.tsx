import { listStories } from '@/lib/db';
import type { StoryRecord } from '@story-agent/shared';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: StoryRecord['status'] }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function PhaseBadge({ phase }: { phase: 1 | 2 }) {
  return (
    <span style={{ fontSize: '0.75rem', color: phase === 2 ? '#9d174d' : '#1d4ed8', fontWeight: 600 }}>
      Phase {phase}
    </span>
  );
}

const DEMO_STORIES: StoryRecord[] = [
  {
    storyId: 'STORY-001',
    storyTitle: 'Implement user authentication',
    storyUrl: 'https://aha.io/stories/STORY-001',
    repoFullName: 'example/repo-auth',
    branch: 'STORY-001',
    prNumber: 42,
    prUrl: 'https://github.com/example/repo-auth/pull/42',
    phase: 1,
    status: 'pr_open',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    storyId: 'STORY-002',
    storyTitle: 'Add dashboard widgets',
    storyUrl: 'https://aha.io/stories/STORY-002',
    repoFullName: 'example/repo-ui',
    branch: 'STORY-002',
    prNumber: 38,
    prUrl: 'https://github.com/example/repo-ui/pull/38',
    phase: 2,
    status: 'pr_revision',
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    storyId: 'STORY-003',
    storyTitle: 'Migrate to PostgreSQL',
    storyUrl: 'https://aha.io/stories/STORY-003',
    repoFullName: 'example/backend',
    branch: 'STORY-003',
    prNumber: null,
    prUrl: null,
    phase: 1,
    status: 'implementing',
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

export default async function Dashboard() {
  let stories: StoryRecord[] = [];
  let isDemo = false;
  
  try {
    stories = await listStories();
  } catch (error) {
    // If database is unavailable, use demo data
    console.warn('Database unavailable, using demo data:', error);
    stories = DEMO_STORIES;
    isDemo = true;
  }
  const byStatus = (s: StoryRecord['status']) => stories.filter(x => x.status === s).length;

  return (
    <div>
      {isDemo && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#92400e',
          fontSize: '0.875rem',
        }}>
          ℹ️ <strong>Demo Mode:</strong> Supabase credentials not configured. Showing sample data. Set SUPABASE_URL and SUPABASE_KEY to connect to real database.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Story Dashboard</h1>
        <a href="/story/new" className="btn btn-primary">+ New Story</a>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['pending', 'implementing', 'pr_open', 'pr_revision', 'pr_approved', 'merged', 'blocked'] as const).map(s => (
          <div key={s} className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: 0, minWidth: 110, textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{byStatus(s)}</div>
            <StatusBadge status={s} />
          </div>
        ))}
      </div>

      {stories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280', padding: '3rem' }}>
          No stories tracked yet. <a href="/story/new">Add a story to get started.</a>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
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
              {stories.map(s => (
                <tr key={s.storyId}>
                  <td>
                    <a href={s.storyUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                      {s.storyId}
                    </a>
                  </td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.storyTitle}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.repoFullName}</td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{s.branch}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><PhaseBadge phase={s.phase} /></td>
                  <td>
                    {s.prUrl
                      ? <a href={s.prUrl} target="_blank" rel="noreferrer">#{s.prNumber}</a>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    {new Date(s.updatedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/story/${s.storyId}`} style={{ fontSize: '0.85rem' }}>View →</Link>
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
