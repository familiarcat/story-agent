/**
 * Developer Story Workspace - Individual story view for developers
 *
 * Shows:
 * - Story details and acceptance criteria
 * - Real-time crew execution progress
 * - Developer-focused crew advisor
 * - PR integration and CI/CD status
 * - Git branch management
 * - Test coverage and code quality
 */

'use client';

import React, { useEffect, useState } from 'react';
import { DeveloperAdvisor } from './DeveloperAdvisor';
import { HierarchyTree } from './HierarchyTree';
import { WorkflowStatus } from './WorkflowStatus';
import type { CrewExecutionState, HierarchyNode, ActionIntent } from '@story-agent/shared';
import { buildClientScopeHeaders, readClientScopeState } from '@/lib/client-scope-store';

/**
 * Route a selection-tree action from the DEVELOPER persona — the full code lifecycle. Reads open in
 * place; lifecycle actions (plan / agent / branch / link-pr / prepare) hand off to the crew chat for
 * the named story (the autonomous loop, WorfGate-gated). Same shared <HierarchyTree>, dev routing.
 */
function handleDeveloperAction(node: HierarchyNode, intent: ActionIntent) {
  if (intent === 'open' && node.url) { window.open(node.url, '_blank'); return; }
  if (node.ref) window.location.href = `/story/${encodeURIComponent(node.ref)}?action=${intent}`;
  else if (node.url) window.open(node.url, '_blank');
}

interface DeveloperStoryProps {
  storyId: string;
  storyRef: string;
  projectId: string;
}

interface StoryDetails {
  id: string;
  ref: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  points: number;
  status: string;
  assignee: string;
  dueDate: string;
  repository: string;
  branchName: string;
  prNumber?: number;
  cicdStatus: 'pending' | 'running' | 'passed' | 'failed';
  testCoverage: number;
}

export function DeveloperStoryWorkspace({
  storyId,
  storyRef,
  projectId,
}: DeveloperStoryProps) {
  const [story, setStory] = useState<StoryDetails | null>(null);
  const [crewState, setCrewState] = useState<CrewExecutionState | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'execution' | 'code' | 'advisor' | 'hierarchy'>('overview');
  const [isConnected, setIsConnected] = useState(false);

  // Fetch story details
  useEffect(() => {
    const fetchStory = async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}`);
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setStory(data.story);

        const selectedScope = readClientScopeState();
        const selectedClientId = selectedScope.clientId;
        if (!selectedClientId) {
          return;
        }

        // Controlled fields are loaded only after explicit client scope is present.
        const controlledRes = await fetch(`/api/stories/${storyId}?includeControlled=true`, {
          headers: buildClientScopeHeaders({ purpose: 'ui_story_detail', includeControlled: true }),
        });

        if (!controlledRes.ok) {
          return;
        }

        const controlledData = await controlledRes.json();
        setStory(controlledData.story);
      } catch (err) {
        console.error('Error fetching story:', err);
      }
    };

    fetchStory();
  }, [storyId]);

  // WebSocket for crew execution state
  useEffect(() => {
    const wsUrl = 'ws://localhost:8000';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', storyRef }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state:initial' || message.type === 'state:updated') {
        setCrewState(message.payload);
      }
    };

    ws.onerror = () => setIsConnected(false);
    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [storyRef]);

  if (!story) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading story...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 'var(--content-gap)',
        padding: 'var(--space-6)',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Main Content Area */}
      <div
        style={{
          gridColumn: 'span 3',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon="📋"
            label="Story Details"
          />
          <TabButton
            active={activeTab === 'execution'}
            onClick={() => setActiveTab('execution')}
            icon="🚀"
            label="Crew Execution"
          />
          <TabButton
            active={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
            icon="💻"
            label="Code & CI/CD"
          />
          <TabButton
            active={activeTab === 'advisor'}
            onClick={() => setActiveTab('advisor')}
            icon="🤖"
            label="Crew Guidance"
          />
          <TabButton
            active={activeTab === 'hierarchy'}
            onClick={() => setActiveTab('hierarchy')}
            icon="🗂️"
            label="Hierarchy"
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)' }}>
          {activeTab === 'overview' && <StoryOverviewTab story={story} />}
          {activeTab === 'execution' && crewState && (
            <CrewExecutionTab state={crewState} storyRef={storyRef} />
          )}
          {activeTab === 'code' && <CodeAndCITab story={story} />}
          {activeTab === 'advisor' && (
            <div className="stack">
              <DeveloperAdvisor storyRef={storyRef} isConnected={isConnected} />
            </div>
          )}
          {activeTab === 'hierarchy' && (
            <HierarchyTree persona="developer" onAction={handleDeveloperAction} focusStoryRef={storyRef} title="Story tunnel — this story in context" />
          )}
        </div>
      </div>

      {/* Right Sidebar: Quick Info & Actions */}
      <div className="stack">
        {/* Story Info Card */}
        <div className="card stack" style={{ padding: 'var(--space-4)', marginBottom: 0, gap: 'var(--space-3)' }}>
          <div>
            <div className="meta">Story Reference</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent4)' }}>{story.ref}</div>
          </div>

          <div>
            <div className="meta">Story Points</div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent3)' }}>{story.points}</div>
          </div>

          <div>
            <div className="meta">Due Date</div>
            <div style={{ fontWeight: 600 }}>{story.dueDate}</div>
          </div>

          <div>
            <div className="meta">Status</div>
            <span className="badge" style={{ marginTop: 'var(--space-1)' }}>
              {story.status}
            </span>
          </div>
        </div>

        {/* Crew Execution Summary */}
        {crewState && (
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 0 }}>
            <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>👥 Crew Status</h3>
            <div className="stack" style={{ gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                <span>Progress</span>
                <span style={{ fontWeight: 600 }}>
                  {crewState.crewExecutions.filter(e => e.status === 'complete').length} / {crewState.crewExecutions.length}
                </span>
              </div>
              <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-2)' }}>
                <div
                  style={{
                    background: 'var(--ok)',
                    height: 'var(--space-2)',
                    borderRadius: '9999px',
                    width: `${(crewState.crewExecutions.filter(e => e.status === 'complete').length / crewState.crewExecutions.length) * 100}%`,
                  }}
                />
              </div>
              {/* Reusable crew-feedback primitive (shared with the dashboard + mirrored in vscode). */}
              <div style={{ marginTop: 'var(--space-2)' }}>
                <WorkflowStatus
                  variant="line"
                  label="Run"
                  status={{
                    costUSD: crewState.totalCostUsd,
                    toolCount: crewState.crewExecutions.length,
                    stalled: (crewState.blockers?.length ?? 0) > 0,
                  }}
                />
              </div>
            </div>

            <div
              className="stack"
              style={{ marginTop: 'var(--space-4)', gap: 'var(--space-2)', maxHeight: '10rem', overflowY: 'auto' }}
            >
              {crewState.crewExecutions.slice(0, 6).map(member => (
                <div key={member.crewId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                  <div
                    style={{
                      width: 'var(--space-2)',
                      height: 'var(--space-2)',
                      borderRadius: '9999px',
                      backgroundColor:
                        member.status === 'complete'
                          ? 'var(--ok)'
                          : member.status === 'executing'
                            ? 'var(--warn)'
                            : 'var(--border)',
                    }}
                  />
                  <span style={{ flex: 1 }}>{member.crewName}</span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {member.status === 'complete' ? '✓' : member.status === 'executing' ? '…' : '◯'}
                  </span>
                </div>
              ))}
            </div>

            {crewState.blockers && crewState.blockers.length > 0 && (
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-2)',
                  background: 'color-mix(in srgb, var(--danger) 15%, var(--surface))',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--danger)',
                }}
              >
                <strong>🛑 Blockers:</strong>
                <ul style={{ marginTop: 'var(--space-1)', display: 'grid', gap: 'var(--space-1)', listStyle: 'none' }}>
                  {crewState.blockers.map((blocker, idx) => (
                    <li key={idx}>• {blocker}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="card stack" style={{ padding: 'var(--space-4)', marginBottom: 0, gap: 'var(--space-2)' }}>
          <button className="btn btn-primary" style={{ width: '100%' }}>
            → Create/Update Branch
          </button>
          <button className="btn" style={{ width: '100%', background: 'var(--ok)', color: 'var(--on-accent)' }}>
            ✓ Mark as In Review
          </button>
          <button className="btn" style={{ width: '100%', background: 'var(--accent3)', color: 'var(--on-accent)' }}>
            📊 View Metrics
          </button>
        </div>

        {/* Connection Status */}
        <div style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
          {isConnected ? (
            <span style={{ color: 'var(--ok)' }}>✓ Crew Connected</span>
          ) : (
            <span style={{ color: 'var(--danger)' }}>✗ Crew Offline</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: 'var(--space-3) var(--space-4)',
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font)',
        cursor: 'pointer',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent1)' : '2px solid transparent',
        color: active ? 'var(--accent1)' : 'var(--text-dim)',
        background: active ? 'var(--surface-2)' : 'transparent',
        transition: 'color 0.15s ease, background 0.15s ease',
      }}
    >
      <span style={{ marginRight: 'var(--space-2)' }}>{icon}</span>
      {label}
    </button>
  );
}

function StoryOverviewTab({ story }: { story: StoryDetails }) {
  return (
    <div className="stack" style={{ gap: 'var(--space-6)' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)' }}>{story.title}</h1>
        <p style={{ color: 'var(--text-dim)' }}>{story.description}</p>
      </div>

      {/* Acceptance Criteria */}
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>✅ Acceptance Criteria</h2>
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {story.acceptanceCriteria.map((criterion, idx) => (
            <label
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                style={{ marginTop: 'var(--space-1)' }}
                defaultChecked={false}
              />
              <span style={{ flex: 1 }}>{criterion}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Story Metadata */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 'var(--space-4)',
          padding: 'var(--space-4)',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div>
          <div className="meta">Assignee</div>
          <div style={{ fontWeight: 600 }}>{story.assignee}</div>
        </div>
        <div>
          <div className="meta">Points</div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>{story.points}</div>
        </div>
        <div>
          <div className="meta">Repository</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 'var(--text-sm)' }}>{story.repository}</div>
        </div>
        <div>
          <div className="meta">Branch</div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 'var(--text-sm)' }}>{story.branchName}</div>
        </div>
      </div>
    </div>
  );
}

function CrewExecutionTab({
  state,
  storyRef,
}: {
  state: CrewExecutionState;
  storyRef: string;
}) {
  return (
    <div className="stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard label="Phase" value={state.phase} />
        <StatCard label="Status" value={state.status} />
        <StatCard label="Cost" value={`$${state.totalCostUsd.toFixed(2)}`} />
      </div>

      <div>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Crew Members</h3>
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          {state.crewExecutions.map(member => (
            <CrewMemberExecutionCard key={member.crewId} member={member} />
          ))}
        </div>
      </div>

      {state.nextStep && (
        <div
          style={{
            padding: 'var(--space-4)',
            background: 'color-mix(in srgb, var(--accent4) 15%, var(--surface))',
            border: '1px solid var(--accent4)',
            borderRadius: 'var(--radius)',
          }}
        >
          <h4 style={{ fontWeight: 600, color: 'var(--accent4)', marginBottom: 'var(--space-2)' }}>📍 Next Steps</h4>
          <p style={{ fontSize: 'var(--text-sm)' }}>{state.nextStep}</p>
        </div>
      )}
    </div>
  );
}

function CrewMemberExecutionCard({ member }: { member: unknown }) {
  const statusEmoji = {
    pending: '⏳',
    executing: '🔄',
    complete: '✅',
    error: '❌',
  };

  return (
    <div className="card" style={{ padding: 'var(--space-3)', marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontWeight: 600 }}>{statusEmoji[(member as Record<string, unknown>).status as keyof typeof statusEmoji]} {String((member as Record<string, unknown>).crewName)}</span>
        {(member as Record<string, unknown>).confidence ? <span className="meta">{String((member as Record<string, unknown>).confidence)}% confident</span> : null}
      </div>

      {(member as Record<string, unknown>).findings ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', marginBottom: 'var(--space-2)' }}>{String((member as Record<string, unknown>).findings)}</p>
      ) : null}

      {(member as Record<string, unknown>).recommendations && ((member as Record<string, unknown>).recommendations as Array<unknown>).length > 0 ? (
        <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', display: 'grid', gap: 'var(--space-1)' }}>
          <strong style={{ display: 'block' }}>Recommendations:</strong>
          <ul style={{ display: 'grid', gap: 'var(--space-1)', marginLeft: 'var(--space-3)', listStyle: 'none' }}>
            {((member as Record<string, unknown>).recommendations as Array<unknown>).map((rec, idx) => (
              <li key={idx}>→ {String(rec)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {(member as Record<string, unknown>).isVeto ? (
        <div
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2)',
            background: 'color-mix(in srgb, var(--danger) 22%, var(--surface))',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--danger)',
          }}
        >
          🛑 SECURITY VETO
        </div>
      ) : null}
    </div>
  );
}

function CodeAndCITab({ story }: { story: StoryDetails }) {
  return (
    <div className="stack" style={{ gap: 'var(--space-6)' }}>
      {/* CI/CD Status */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 0 }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>🔄 CI/CD Pipeline</h3>

        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: 'var(--space-3)',
                height: 'var(--space-3)',
                borderRadius: '9999px',
                background:
                  story.cicdStatus === 'passed'
                    ? 'var(--ok)'
                    : story.cicdStatus === 'failed'
                      ? 'var(--danger)'
                      : story.cicdStatus === 'running'
                        ? 'var(--warn)'
                        : 'var(--border)',
              }}
            />
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{story.cicdStatus}</span>
          </div>

          <div>
            <div className="meta" style={{ marginBottom: 'var(--space-1)' }}>Build Progress</div>
            <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-2)' }}>
              <div
                style={{
                  height: 'var(--space-2)',
                  borderRadius: '9999px',
                  background: story.cicdStatus === 'passed' ? 'var(--ok)' : 'var(--accent4)',
                  width:
                    story.cicdStatus === 'passed'
                      ? '100%'
                      : story.cicdStatus === 'running'
                        ? '60%'
                        : '0%',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test Coverage */}
      <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 0 }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>✅ Test Coverage</h3>

        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{story.testCoverage}% Coverage</span>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: story.testCoverage >= 80 ? 'var(--ok)' : 'var(--warn)',
              }}
            >
              {story.testCoverage >= 80 ? '✓ Acceptable' : '⚠️ Below Target'}
            </span>
          </div>

          <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-3)' }}>
            <div
              style={{
                height: 'var(--space-3)',
                borderRadius: '9999px',
                background: story.testCoverage >= 80 ? 'var(--ok)' : 'var(--warn)',
                width: `${story.testCoverage}%`,
              }}
            />
          </div>

          <div className="meta" style={{ marginTop: 'var(--space-2)' }}>
            Target: 80% | Current: {story.testCoverage}%
          </div>
        </div>
      </div>

      {/* PR Status */}
      {story.prNumber && (
        <div
          className="card"
          style={{
            padding: 'var(--space-4)',
            marginBottom: 0,
            borderColor: 'var(--ok)',
            background: 'color-mix(in srgb, var(--ok) 10%, var(--surface))',
          }}
        >
          <h3 style={{ marginBottom: 'var(--space-3)' }}>🔗 Pull Request</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="meta">PR #{story.prNumber}</div>
              <div style={{ fontWeight: 600 }}>Ready for Review</div>
            </div>
            <button className="btn btn-primary">
              View on GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)', textAlign: 'center' }}>
      <div className="meta" style={{ marginBottom: 'var(--space-1)' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{value}</div>
    </div>
  );
}
