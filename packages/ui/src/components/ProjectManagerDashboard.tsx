/**
 * Project Manager Dashboard - Unified view of sprint, roadmap, and crew
 * 
 * Shows:
 * - Current sprint with Kanban board
 * - Velocity tracking and burndown
 * - Roadmap view (upcoming sprints)
 * - Crew status and workload
 * - Budget and timeline tracking
 * - Risks and decisions pending
 */

'use client';

import React, { useState } from 'react';
import { SprintBoard } from './SprintBoard';
import { ProjectManagerAdvisor } from './ProjectManagerAdvisor';
import { HierarchyTree } from './HierarchyTree';
import type { HierarchyNode, ActionIntent } from '@story-agent/shared';

interface PMDashboardProps {
  projectId: string;
}

type DashboardView = 'sprint' | 'portfolio' | 'roadmap' | 'crew' | 'budget' | 'risks';

/**
 * Route a selection-tree action from the MANAGEMENT persona. Reads open in place; approval-style
 * writes (start-story / complete) navigate to the gated story workspace where WorfGate confirms —
 * a manager initiates, the gate enforces. (Shared <HierarchyTree>, persona-differentiated routing.)
 */
function handleManagementAction(node: HierarchyNode, intent: ActionIntent) {
  if (intent === 'open' && node.url) { window.open(node.url, '_blank'); return; }
  if (node.ref) window.location.href = `/story/${encodeURIComponent(node.ref)}?action=${intent}`;
  else if (node.url) window.open(node.url, '_blank');
}

export function ProjectManagerDashboard({ projectId }: PMDashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>('sprint');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Project Manager Dashboard</h1>
          <p className="text-gray-600 mt-1">Sprint execution, roadmap, and crew management</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded font-medium"
          >
            <option value="all">All Developers</option>
            <option value="dev1">Alice</option>
            <option value="dev2">Bob</option>
            <option value="dev3">Carol</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600">
            Settings
          </button>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex gap-2 border-b border-gray-200">
        <ViewTab
          active={activeView === 'sprint'}
          onClick={() => setActiveView('sprint')}
          icon="🏃"
          label="Sprint Board"
        />
        <ViewTab
          active={activeView === 'portfolio'}
          onClick={() => setActiveView('portfolio')}
          icon="🗂️"
          label="Portfolio"
        />
        <ViewTab
          active={activeView === 'roadmap'}
          onClick={() => setActiveView('roadmap')}
          icon="🗺️"
          label="Roadmap"
        />
        <ViewTab
          active={activeView === 'crew'}
          onClick={() => setActiveView('crew')}
          icon="👥"
          label="Crew Status"
        />
        <ViewTab
          active={activeView === 'budget'}
          onClick={() => setActiveView('budget')}
          icon="💰"
          label="Budget & Cost"
        />
        <ViewTab
          active={activeView === 'risks'}
          onClick={() => setActiveView('risks')}
          icon="⚠️"
          label="Risks & Decisions"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Left: Main view */}
        <div className="col-span-3">
          {activeView === 'sprint' && <SprintBoard projectId={projectId} />}
          {activeView === 'portfolio' && (
            <HierarchyTree persona="management" onAction={handleManagementAction} title="Portfolio — select a project / story" />
          )}
          {activeView === 'roadmap' && <RoadmapView projectId={projectId} />}
          {activeView === 'crew' && <CrewStatusView projectId={projectId} />}
          {activeView === 'budget' && <BudgetView projectId={projectId} />}
          {activeView === 'risks' && <RisksView projectId={projectId} />}
        </div>

        {/* Right: PM Advisor */}
        <div className="col-span-1">
          <div className="sticky top-6">
            <ProjectManagerAdvisor projectId={projectId} isConnected={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewTab({
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
      className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );
}

function RoadmapView({ projectId }: { projectId: string }) {
  const sprints = [
    { name: 'Sprint 1', status: 'complete', progress: 100 },
    { name: 'Sprint 2', status: 'complete', progress: 100 },
    { name: 'Sprint 3 (Current)', status: 'in_progress', progress: 65 },
    { name: 'Sprint 4', status: 'planned', progress: 0 },
    { name: 'Sprint 5', status: 'planned', progress: 0 },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">🗺️ Product Roadmap</h2>

      <div className="space-y-3">
        {sprints.map((sprint, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 ${
              sprint.status === 'complete'
                ? 'bg-green-50 border-green-200'
                : sprint.status === 'in_progress'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{sprint.name}</h3>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  sprint.status === 'complete'
                    ? 'bg-green-200 text-green-800'
                    : sprint.status === 'in_progress'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-800'
                }`}
              >
                {sprint.status}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  sprint.status === 'complete'
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${sprint.progress}%` }}
              />
            </div>

            <div className="text-xs text-gray-600 mt-1">{sprint.progress}% complete</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrewStatusView({ projectId }: { projectId: string }) {
  const crewMembers = [
    { id: 'captain', name: 'Picard', role: 'Captain', status: 'idle', activeStories: 0 },
    { id: 'architect', name: 'Data', role: 'Architect', status: 'executing', activeStories: 2 },
    { id: 'developer', name: 'Riker', role: 'Developer', status: 'executing', activeStories: 3 },
    { id: 'infrastructure', name: 'Geordi', role: 'Infrastructure', status: 'idle', activeStories: 0 },
    { id: 'devops', name: 'O\'Brien', role: 'DevOps', status: 'executing', activeStories: 1 },
    { id: 'security', name: 'Worf', role: 'Security', status: 'executing', activeStories: 2 },
    { id: 'qa', name: 'Yar', role: 'QA', status: 'executing', activeStories: 2 },
    { id: 'analyst', name: 'Troi', role: 'Analyst', status: 'idle', activeStories: 0 },
    { id: 'health', name: 'Crusher', role: 'Health', status: 'idle', activeStories: 0 },
    { id: 'communications', name: 'Uhura', role: 'Communications', status: 'idle', activeStories: 0 },
    { id: 'finance', name: 'Quark', role: 'Finance', status: 'idle', activeStories: 0 },
  ];

  const executing = crewMembers.filter(c => c.status === 'executing').length;
  const idle = crewMembers.filter(c => c.status === 'idle').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">👥 Crew Status & Workload</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Crew" value={crewMembers.length} />
          <StatCard label="Executing" value={executing} highlight="yellow" />
          <StatCard label="Idle" value={idle} highlight="blue" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {crewMembers.map(member => (
          <div key={member.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{member.name}</h4>
              <span
                className={`w-2 h-2 rounded-full ${
                  member.status === 'executing' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              />
            </div>

            <div className="text-sm text-gray-600 mb-2">{member.role}</div>

            <div className="text-xs">
              <span className="text-gray-600">Active: </span>
              <span className="font-medium">{member.activeStories} stories</span>
            </div>

            {member.status === 'executing' && (
              <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                Currently working
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BudgetView({ projectId }: { projectId: string }) {
  const budget = {
    allocated: 10000,
    spent: 7450,
    remaining: 2550,
    llmCost: 4200,
    infrastructureCost: 2100,
    toolsCost: 1150,
  };

  const percentage = (budget.spent / budget.allocated) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">💰 Budget & Cost Tracking</h2>

        {/* Overall Budget */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Allocated</div>
              <div className="text-2xl font-bold text-blue-600">${budget.allocated.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Spent</div>
              <div className="text-2xl font-bold text-orange-600">${budget.spent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className="text-2xl font-bold text-green-600">${budget.remaining.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium">Budget Usage</span>
              <span className={`font-bold ${percentage > 80 ? 'text-red-600' : percentage > 60 ? 'text-orange-600' : 'text-green-600'}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Cost Breakdown</h3>

          <div className="space-y-4">
            <CostItem
              label="LLM Usage"
              amount={budget.llmCost}
              percentage={(budget.llmCost / budget.spent) * 100}
              color="blue"
            />
            <CostItem
              label="Infrastructure"
              amount={budget.infrastructureCost}
              percentage={(budget.infrastructureCost / budget.spent) * 100}
              color="green"
            />
            <CostItem
              label="Tools & Services"
              amount={budget.toolsCost}
              percentage={(budget.toolsCost / budget.spent) * 100}
              color="purple"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CostItem({
  label,
  amount,
  percentage,
  color,
}: {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-sm font-bold">${amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function RisksView({ projectId }: { projectId: string }) {
  const risks = [
    {
      id: 1,
      title: 'Timeline Risk: 2 stories behind schedule',
      priority: 'high',
      impact: 'May miss sprint goal',
      action: 'Review resource allocation',
    },
    {
      id: 2,
      title: 'Budget trending 115% of limit',
      priority: 'high',
      impact: 'Cost overrun of ~$1,150',
      action: 'Optimize crew assignments',
    },
    {
      id: 3,
      title: 'Security issue in STORY-456',
      priority: 'critical',
      impact: 'Cannot merge PR',
      action: 'Address SQL injection risk',
    },
    {
      id: 4,
      title: 'Stakeholder alignment unclear',
      priority: 'medium',
      impact: 'Scope creep possible',
      action: 'Schedule alignment meeting',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">⚠️ Risks & Decisions Pending</h2>
      </div>

      <div className="space-y-3">
        {risks.map(risk => (
          <div
            key={risk.id}
            className={`border rounded-lg p-4 ${
              risk.priority === 'critical'
                ? 'bg-red-50 border-red-300'
                : risk.priority === 'high'
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-yellow-50 border-yellow-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">{risk.title}</h4>
              <span
                className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                  risk.priority === 'critical'
                    ? 'bg-red-200 text-red-800'
                    : risk.priority === 'high'
                      ? 'bg-orange-200 text-orange-800'
                      : 'bg-yellow-200 text-yellow-800'
                }`}
              >
                {risk.priority}
              </span>
            </div>

            <p className="text-sm mb-2">{risk.impact}</p>

            <div className="flex items-center justify-between pt-2 border-t border-current border-opacity-20">
              <span className="text-xs font-medium">→ {risk.action}</span>
              <button className="text-xs px-3 py-1 bg-white rounded hover:bg-gray-100 font-medium">
                Review
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Crew Decisions Pending */}
      <div className="mt-6 bg-blue-50 border border-blue-300 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">⚖️ Crew Decisions Awaiting Approval</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Crew recommends: Approve STORY-123 PR (Data: 92% confident)</span>
            <button className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 font-medium">
              ✓ Approve
            </button>
          </div>
          <div className="flex justify-between">
            <span>Crew recommends: Accelerate timeline by 2 days (Picard consensus)</span>
            <button className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 font-medium">
              ✓ Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: string;
}) {
  const highlightClasses = {
    yellow: 'bg-yellow-100 text-yellow-900',
    blue: 'bg-blue-100 text-blue-900',
  };

  return (
    <div className={`p-4 rounded-lg text-center ${highlight ? highlightClasses[highlight as keyof typeof highlightClasses] : 'bg-gray-100'}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-1">{label}</div>
    </div>
  );
}
