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
    <div className="stack" style={{ gap: 'var(--content-gap)', padding: 'var(--space-6)' }}>
      {/* Header */}
      <div className="cluster" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Project Manager Dashboard</h1>
          <p className="meta" style={{ marginTop: 'var(--space-1)' }}>Sprint execution, roadmap, and crew management</p>
        </div>
        <div className="cluster" style={{ gap: 'var(--space-2)' }}>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Developers</option>
            <option value="dev1">Alice</option>
            <option value="dev2">Bob</option>
            <option value="dev3">Carol</option>
          </select>
          <button className="btn btn-primary">
            Settings
          </button>
        </div>
      </div>

      {/* View Selector */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--content-gap)' }}>
        {/* Left: Main view */}
        <div style={{ gridColumn: 'span 3' }}>
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
        <div style={{ gridColumn: 'span 1' }}>
          <div style={{ position: 'sticky', top: 'var(--space-6)' }}>
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
      style={{
        padding: 'var(--space-3) var(--space-4)',
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font)',
        cursor: 'pointer',
        border: 'none',
        background: 'transparent',
        borderBottom: active ? '2px solid var(--accent1)' : '2px solid transparent',
        color: active ? 'var(--accent1)' : 'var(--text-dim)',
        transition: 'color 0.15s ease, border-color 0.15s ease',
      }}
    >
      <span style={{ marginRight: 'var(--space-2)' }}>{icon}</span>
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
    <div className="stack">
      <h2 style={{ fontSize: 'var(--text-xl)' }}>🗺️ Product Roadmap</h2>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        {sprints.map((sprint, idx) => {
          const tone =
            sprint.status === 'complete'
              ? 'var(--ok)'
              : sprint.status === 'in_progress'
                ? 'var(--accent4)'
                : 'var(--border)';
          return (
            <div
              key={idx}
              className="card"
              style={{
                padding: 'var(--space-4)',
                marginBottom: 0,
                borderColor: tone,
                background:
                  sprint.status === 'planned'
                    ? 'var(--surface)'
                    : `color-mix(in srgb, ${tone} 10%, var(--surface))`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 0 }}>{sprint.name}</h3>
                <span
                  className="badge"
                  style={
                    sprint.status === 'planned'
                      ? undefined
                      : { background: `color-mix(in srgb, ${tone} 22%, var(--surface))`, color: tone }
                  }
                >
                  {sprint.status}
                </span>
              </div>

              <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-2)' }}>
                <div
                  style={{
                    height: 'var(--space-2)',
                    borderRadius: '9999px',
                    background: sprint.status === 'complete' ? 'var(--ok)' : 'var(--accent4)',
                    width: `${sprint.progress}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div className="meta" style={{ marginTop: 'var(--space-1)' }}>{sprint.progress}% complete</div>
            </div>
          );
        })}
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
    <div className="stack">
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>👥 Crew Status & Workload</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <StatCard label="Total Crew" value={crewMembers.length} />
          <StatCard label="Executing" value={executing} highlight="yellow" />
          <StatCard label="Idle" value={idle} highlight="blue" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
        {crewMembers.map(member => (
          <div key={member.id} className="card" style={{ padding: 'var(--space-3)', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <h4 style={{ fontWeight: 600 }}>{member.name}</h4>
              <span
                style={{
                  width: 'var(--space-2)',
                  height: 'var(--space-2)',
                  borderRadius: '9999px',
                  background: member.status === 'executing' ? 'var(--warn)' : 'var(--ok)',
                }}
              />
            </div>

            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-dim)', marginBottom: 'var(--space-2)' }}>{member.role}</div>

            <div style={{ fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-dim)' }}>Active: </span>
              <span style={{ fontWeight: 600 }}>{member.activeStories} stories</span>
            </div>

            {member.status === 'executing' && (
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--warn)',
                  background: 'color-mix(in srgb, var(--warn) 15%, var(--surface))',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius)',
                }}
              >
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
  const usageTone = percentage > 80 ? 'var(--danger)' : percentage > 60 ? 'var(--warn)' : 'var(--ok)';

  return (
    <div className="stack" style={{ gap: 'var(--space-6)' }}>
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>💰 Budget & Cost Tracking</h2>

        {/* Overall Budget */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div>
              <div className="meta">Allocated</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--accent4)' }}>${budget.allocated.toLocaleString()}</div>
            </div>
            <div>
              <div className="meta">Spent</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--warn)' }}>${budget.spent.toLocaleString()}</div>
            </div>
            <div>
              <div className="meta">Remaining</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ok)' }}>${budget.remaining.toLocaleString()}</div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontWeight: 600 }}>Budget Usage</span>
              <span style={{ fontWeight: 700, color: usageTone }}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-3)' }}>
              <div
                style={{
                  height: 'var(--space-3)',
                  borderRadius: '9999px',
                  background: usageTone,
                  width: `${percentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Cost Breakdown</h3>

          <div className="stack">
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
  const colorTokens: Record<string, string> = {
    blue: 'var(--accent4)',
    green: 'var(--ok)',
    purple: 'var(--accent3)',
  };
  const tone = colorTokens[color] ?? 'var(--accent1)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{label}</span>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>${amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
      </div>
      <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '9999px', height: 'var(--space-2)' }}>
        <div
          style={{
            height: 'var(--space-2)',
            borderRadius: '9999px',
            background: `color-mix(in srgb, ${tone} 45%, var(--surface))`,
            width: `${percentage}%`,
          }}
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
    <div className="stack">
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)' }}>⚠️ Risks & Decisions Pending</h2>
      </div>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        {risks.map(risk => {
          const tone =
            risk.priority === 'critical'
              ? 'var(--danger)'
              : risk.priority === 'high'
                ? 'var(--warn)'
                : 'var(--accent2)';
          return (
            <div
              key={risk.id}
              className="card"
              style={{
                padding: 'var(--space-4)',
                marginBottom: 0,
                borderColor: tone,
                background: `color-mix(in srgb, ${tone} 10%, var(--surface))`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <h4 style={{ fontWeight: 600 }}>{risk.title}</h4>
                <span
                  className="badge"
                  style={{
                    background: `color-mix(in srgb, ${tone} 22%, var(--surface))`,
                    color: tone,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  {risk.priority}
                </span>
              </div>

              <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{risk.impact}</p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>→ {risk.action}</span>
                <button className="btn btn-secondary" style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)' }}>
                  Review
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crew Decisions Pending */}
      <div
        className="card"
        style={{
          marginTop: 'var(--space-6)',
          marginBottom: 0,
          padding: 'var(--space-4)',
          borderColor: 'var(--accent4)',
          background: 'color-mix(in srgb, var(--accent4) 10%, var(--surface))',
        }}
      >
        <h3 style={{ color: 'var(--accent4)', marginBottom: 'var(--space-3)' }}>⚖️ Crew Decisions Awaiting Approval</h3>
        <div className="stack" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <span>Crew recommends: Approve STORY-123 PR (Data: 92% confident)</span>
            <button
              className="btn"
              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', background: 'var(--ok)', color: 'var(--on-accent)' }}
            >
              ✓ Approve
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
            <span>Crew recommends: Accelerate timeline by 2 days (Picard consensus)</span>
            <button
              className="btn"
              style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-3)', background: 'var(--ok)', color: 'var(--on-accent)' }}
            >
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
  const highlightTokens: Record<string, string> = {
    yellow: 'var(--warn)',
    blue: 'var(--accent4)',
  };
  const tone = highlight ? highlightTokens[highlight] : undefined;

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius)',
        textAlign: 'center',
        background: tone ? `color-mix(in srgb, ${tone} 18%, var(--surface))` : 'var(--surface-2)',
        color: tone ?? 'var(--text)',
      }}
    >
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{value}</div>
      <div className="meta" style={{ marginTop: 'var(--space-1)', color: 'inherit' }}>{label}</div>
    </div>
  );
}
