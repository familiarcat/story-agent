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

export default async function Dashboard() {
  const stories = await listStories();
  const byStatus = (s: StoryRecord['status']) => stories.filter(x => x.status === s).length;

  return (
    <div>
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
