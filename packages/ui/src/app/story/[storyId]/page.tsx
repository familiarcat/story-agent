import { getStory, getCommentsForStory, getRevisionCycles } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  buildClientAccessContext,
  evaluateControlledDataAccess,
  inferClientIdFromStory,
} from '@story-agent/shared';

export const dynamic = 'force-dynamic';

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { storyId } = await params;
  const query = await searchParams;
  const selectedClientId = typeof query.clientId === 'string' ? query.clientId : null;
  const selectedRole = typeof query.clientRole === 'string' ? query.clientRole : null;

  // Client isolation: scope the lookup to the requesting client (firm root by default).
  const record = await getStory(decodeURIComponent(storyId), selectedClientId ?? 'familiarcat');
  if (!record) notFound();
  const includeControlled = query.includeControlled === '1';

  const decision = evaluateControlledDataAccess({
    context: buildClientAccessContext({
      selectedClientId,
      clientRole: selectedRole,
      purpose: 'ui_story_detail',
      includeControlled,
    }),
    requestedClientId: inferClientIdFromStory(record),
  });

  const controlledVisible = decision.allowed;
  const loadControlledHref = `/story/${encodeURIComponent(record.storyId)}?clientId=${encodeURIComponent(
    inferClientIdFromStory(record) ?? ''
  )}&clientRole=client_delivery&includeControlled=1`;

  const comments = await getCommentsForStory(record.storyId);
  const cycles = await getRevisionCycles(record.storyId);
  const openComments = comments.filter(c => c.state === 'SUBMITTED');

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>← Dashboard</Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{record.storyId}: {record.storyTitle}</h1>
        <span className={`badge badge-${record.status}`}>{record.status.replace('_', ' ')}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>Phase {record.phase}</span>
      </div>

      {!controlledVisible && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--warn)', background: 'var(--surface-2)' }}>
          <strong style={{ color: 'var(--warn)' }}>Controlled data is in advisory mode.</strong>
          <div style={{ color: 'var(--warn)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Select a matching client scope and role before loading regulated fields.
            {' '}
            <a href={loadControlledHref}>Load controlled context</a>
          </div>
        </div>
      )}

      {/* Story metadata */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
        <div>
          <strong>Aha Story</strong>
          <br />
          {controlledVisible ? (
            <a href={record.storyUrl} target="_blank" rel="noreferrer">{record.storyUrl}</a>
          ) : (
            <span style={{ color: 'var(--text-dim)' }}>[restricted until controlled access is authorized]</span>
          )}
        </div>
        <div><strong>Repository</strong><br />{controlledVisible ? record.repoFullName : '[restricted]'}</div>
        <div><strong>Branch</strong><br />{controlledVisible ? <><code>{record.branch}</code> from <code>{record.baseBranch}</code></> : <span style={{ color: 'var(--text-dim)' }}>[restricted]</span>}</div>
        <div><strong>Pull Request</strong><br />
          {controlledVisible && record.prUrl
            ? <a href={record.prUrl} target="_blank" rel="noreferrer">PR #{record.prNumber} ({record.prStatus})</a>
            : <span style={{ color: 'var(--text-dim)' }}>Not yet opened</span>
          }
        </div>
        {controlledVisible && record.notes && <div style={{ gridColumn: '1/-1' }}><strong>Notes</strong><br />{record.notes}</div>}
      </div>

      {/* PR Comments */}
      <h2 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.1rem', fontWeight: 600 }}>
        PR Comments {openComments.length > 0 && <span className="badge badge-pr_revision" style={{ marginLeft: '0.5rem' }}>{openComments.length} open</span>}
      </h2>
      {comments.length === 0 ? (
        <div className="card" style={{ color: 'var(--text-dim)' }}>No comments synced yet.</div>
      ) : comments.map(c => (
        <div key={c.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--text)' }}>@{c.author}</strong>
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
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
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
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: 4 }}>
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
