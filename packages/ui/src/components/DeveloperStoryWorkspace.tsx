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
import type { CrewExecutionState } from '@story-agent/shared';
import { buildClientScopeHeaders, readClientScopeState } from '@/lib/client-scope-store';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'execution' | 'code' | 'advisor'>('overview');
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
    return <div className="p-8 text-center text-gray-500">Loading story...</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-6 p-6 h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className="col-span-3 flex flex-col overflow-hidden bg-white rounded-lg border border-gray-200">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex">
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <StoryOverviewTab story={story} />}
          {activeTab === 'execution' && crewState && (
            <CrewExecutionTab state={crewState} storyRef={storyRef} />
          )}
          {activeTab === 'code' && <CodeAndCITab story={story} />}
          {activeTab === 'advisor' && (
            <div className="space-y-4">
              <DeveloperAdvisor storyRef={storyRef} isConnected={isConnected} />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: Quick Info & Actions */}
      <div className="space-y-4 flex flex-col">
        {/* Story Info Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <div className="text-xs text-gray-600">Story Reference</div>
            <div className="text-lg font-bold text-blue-600">{story.ref}</div>
          </div>

          <div>
            <div className="text-xs text-gray-600">Story Points</div>
            <div className="text-2xl font-bold text-purple-600">{story.points}</div>
          </div>

          <div>
            <div className="text-xs text-gray-600">Due Date</div>
            <div className="font-medium">{story.dueDate}</div>
          </div>

          <div>
            <div className="text-xs text-gray-600">Status</div>
            <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded font-medium">
              {story.status}
            </span>
          </div>
        </div>

        {/* Crew Execution Summary */}
        {crewState && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">👥 Crew Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span className="font-medium">
                  {crewState.crewExecutions.filter(e => e.status === 'complete').length} / {crewState.crewExecutions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(crewState.crewExecutions.filter(e => e.status === 'complete').length / crewState.crewExecutions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {crewState.crewExecutions.slice(0, 6).map(member => (
                <div key={member.crewId} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        member.status === 'complete'
                          ? '#10b981'
                          : member.status === 'executing'
                            ? '#f59e0b'
                            : '#d1d5db',
                    }}
                  />
                  <span className="flex-1">{member.crewName}</span>
                  <span className="text-gray-500">
                    {member.status === 'complete' ? '✓' : member.status === 'executing' ? '…' : '◯'}
                  </span>
                </div>
              ))}
            </div>

            {crewState.blockers && crewState.blockers.length > 0 && (
              <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>🛑 Blockers:</strong>
                <ul className="mt-1 space-y-1">
                  {crewState.blockers.map((blocker, idx) => (
                    <li key={idx}>• {blocker}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          <button className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600">
            → Create/Update Branch
          </button>
          <button className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600">
            ✓ Mark as In Review
          </button>
          <button className="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600">
            📊 View Metrics
          </button>
        </div>

        {/* Connection Status */}
        <div className="text-xs text-center">
          {isConnected ? (
            <span className="text-green-600">✓ Crew Connected</span>
          ) : (
            <span className="text-red-600">✗ Crew Offline</span>
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
      className={`flex-1 px-4 py-3 font-medium text-sm border-b-2 transition ${
        active
          ? 'border-blue-500 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

function StoryOverviewTab({ story }: { story: StoryDetails }) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold mb-2">{story.title}</h1>
        <p className="text-gray-600">{story.description}</p>
      </div>

      {/* Acceptance Criteria */}
      <div>
        <h2 className="font-semibold text-lg mb-3">✅ Acceptance Criteria</h2>
        <div className="space-y-2">
          {story.acceptanceCriteria.map((criterion, idx) => (
            <label key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                defaultChecked={false}
              />
              <span className="flex-1">{criterion}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Story Metadata */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-xs text-gray-600">Assignee</div>
          <div className="font-medium">{story.assignee}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Points</div>
          <div className="font-medium text-lg">{story.points}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Repository</div>
          <div className="font-mono text-sm">{story.repository}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Branch</div>
          <div className="font-mono text-sm">{story.branchName}</div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Phase" value={state.phase} />
        <StatCard label="Status" value={state.status} />
        <StatCard label="Cost" value={`$${state.totalCostUsd.toFixed(2)}`} />
      </div>

      <div>
        <h3 className="font-semibold mb-3">Crew Members</h3>
        <div className="space-y-3">
          {state.crewExecutions.map(member => (
            <CrewMemberExecutionCard key={member.crewId} member={member} />
          ))}
        </div>
      </div>

      {state.nextStep && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-900 mb-2">📍 Next Steps</h4>
          <p className="text-sm text-blue-800">{state.nextStep}</p>
        </div>
      )}
    </div>
  );
}

function CrewMemberExecutionCard({ member }: { member: any }) {
  const statusEmoji = {
    pending: '⏳',
    executing: '🔄',
    complete: '✅',
    error: '❌',
  };

  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{statusEmoji[member.status as keyof typeof statusEmoji]} {member.crewName}</span>
        {member.confidence && <span className="text-xs text-gray-600">{member.confidence}% confident</span>}
      </div>

      {member.findings && (
        <p className="text-sm text-gray-700 mb-2">{member.findings}</p>
      )}

      {member.recommendations && member.recommendations.length > 0 && (
        <div className="text-xs space-y-1 mt-2">
          <strong className="block">Recommendations:</strong>
          <ul className="space-y-1 ml-3">
            {member.recommendations.map((rec: string, idx: number) => (
              <li key={idx}>→ {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {member.isVeto && (
        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs font-medium text-red-700">
          🛑 SECURITY VETO
        </div>
      )}
    </div>
  );
}

function CodeAndCITab({ story }: { story: StoryDetails }) {
  return (
    <div className="space-y-6">
      {/* CI/CD Status */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-4">🔄 CI/CD Pipeline</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                story.cicdStatus === 'passed'
                  ? 'bg-green-500'
                  : story.cicdStatus === 'failed'
                    ? 'bg-red-500'
                    : story.cicdStatus === 'running'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
              }`}
            />
            <span className="font-medium capitalize">{story.cicdStatus}</span>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Build Progress</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  story.cicdStatus === 'passed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{
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
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-4">✅ Test Coverage</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{story.testCoverage}% Coverage</span>
            <span className={`text-sm font-medium ${story.testCoverage >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
              {story.testCoverage >= 80 ? '✓ Acceptable' : '⚠️ Below Target'}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${story.testCoverage >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${story.testCoverage}%` }}
            />
          </div>

          <div className="text-xs text-gray-600 mt-2">
            Target: 80% | Current: {story.testCoverage}%
          </div>
        </div>
      </div>

      {/* PR Status */}
      {story.prNumber && (
        <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
          <h3 className="font-semibold mb-3">🔗 Pull Request</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">PR #{story.prNumber}</div>
              <div className="font-medium">Ready for Review</div>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600">
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
    <div className="bg-gray-50 rounded p-3 text-center">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
