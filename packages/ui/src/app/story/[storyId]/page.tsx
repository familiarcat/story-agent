import { getStory, getCommentsForStory, getRevisionCycles } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const record = await getStory(decodeURIComponent(storyId));
  if (!record) notFound();

  const comments = await getCommentsForStory(record.storyId);
  const cycles = await getRevisionCycles(record.storyId);
  const openComments = comments.filter(c => c.state === 'SUBMITTED');

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: '#6b7280', fontSize: '0.9rem' }}>← Dashboard</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{record.storyId}: {record.storyTitle}</h1>
        <span className={`badge badge-${record.status}`}>{record.status.replace('_', ' ')}</span>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: 'auto' }}>Phase {record.phase}</span>
      </div>

      {/* Story metadata */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
        <div><strong>Aha Story</strong><br /><a href={record.storyUrl} target="_blank" rel="noreferrer">{record.storyUrl}</a></div>
        <div><strong>Repository</strong><br />{record.repoFullName}</div>
        <div><strong>Branch</strong><br /><code>{record.branch}</code> from <code>{record.baseBranch}</code></div>
        <div><strong>Pull Request</strong><br />
          {record.prUrl
            ? <a href={record.prUrl} target="_blank" rel="noreferrer">PR #{record.prNumber} ({record.prStatus})</a>
            : <span style={{ color: '#9ca3af' }}>Not yet opened</span>
          }
        </div>
        {record.notes && <div style={{ gridColumn: '1/-1' }}><strong>Notes</strong><br />{record.notes}</div>}
      </div>

      {/* PR Comments */}
      <h2 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>
        PR Comments {openComments.length > 0 && <span className="badge badge-pr_revision" style={{ marginLeft: '0.5rem' }}>{openComments.length} open</span>}
      </h2>
      {comments.length === 0 ? (
        <div className="card" style={{ color: '#6b7280' }}>No comments synced yet.</div>
      ) : comments.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
            <strong style={{ color: '#111827' }}>@{c.author}</strong>
            {c.path && <code style={{ fontSize: '0.8rem' }}>{c.path}{c.line ? `:${c.line}` : ''}</code>}
            <a href={c.url} target="_blank" rel="noreferrer">View on GitHub ↗</a>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{c.body}</div>
        </div>
      ))}

      {/* Revision Cycles */}
      {cycles.length > 0 && (
        <>
          <h2 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>Revision Cycles</h2>
          {cycles.map(cycle => (
            <div key={cycle.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Cycle #{cycle.cycleNumber}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                {cycle.commitSha && <><code>{cycle.commitSha.slice(0, 7)}</code> · </>}
                {cycle.completedAt ? new Date(cycle.completedAt).toLocaleString() : 'In progress'}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Comments addressed:</strong> {cycle.commentsAddressed.join(', ') || '—'}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Files changed:</strong> {cycle.filesChanged.join(', ') || '—'}
              </div>
              {cycle.testEvidence && (
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', background: '#f9fafb', padding: '0.5rem', borderRadius: 4 }}>
                  {cycle.testEvidence}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Actions */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
        <a href={`/story/${record.storyId}`} className="btn btn-secondary">Refresh</a>
        {record.prUrl && (
          <a href={record.prUrl} target="_blank" rel="noreferrer" className="btn btn-primary">Open PR ↗</a>
        )}
      </div>
    </div>
  );
}
