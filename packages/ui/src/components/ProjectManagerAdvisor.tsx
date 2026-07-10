/**
 * Project Manager Advisor - Real-time crew guidance for project managers
 *
 * Shows:
 * - Strategic recommendations (Picard)
 * - Timeline risks (Captain)
 * - Budget concerns (Quark)
 * - Stakeholder alignment (Troi)
 * - Communication needs (Uhura)
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { CrewInsight, CrewDecision } from '@/lib/crew-autonomy';

interface ProjectManagerAdvisorProps {
  projectId?: string;
  isConnected: boolean;
}

export function ProjectManagerAdvisor({
  projectId,
  isConnected,
}: ProjectManagerAdvisorProps) {
  const [insights, setInsights] = useState<CrewInsight[]>([]);
  const [decisions, setDecisions] = useState<CrewDecision[]>([]);
  const [activeTab, setActiveTab] = useState<'insights' | 'decisions'>('insights');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insightsRes, decisionsRes] = await Promise.all([
          fetch(
            `/api/crew/insights?${projectId ? `projectId=${projectId}` : ''}&role=project_manager`
          ),
          fetch(
            `/api/crew/decisions?${projectId ? `projectId=${projectId}` : ''}&status=pending`
          ),
        ]);

        if (insightsRes.ok) {
          const data = await insightsRes.json();
          setInsights(data.insights || []);
        }

        if (decisionsRes.ok) {
          const data = await decisionsRes.json();
          setDecisions(data.decisions || []);
        }
      } catch (err) {
        console.error('Error fetching PM data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [projectId, isConnected]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
        Loading project crew guidance...
      </div>
    );
  }

  const insightCount = insights.length;
  const decisionCount = decisions.filter(d => !d.approved).length;

  return (
    <div className="card" style={{ padding: 0, marginBottom: 0 }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'insights' ? '2px solid var(--accent1)' : '2px solid transparent',
            color: activeTab === 'insights' ? 'var(--accent1)' : 'var(--text-dim)',
          }}
        >
          📊 Insights ({insightCount})
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'decisions' ? '2px solid var(--accent1)' : '2px solid transparent',
            color: activeTab === 'decisions' ? 'var(--accent1)' : 'var(--text-dim)',
          }}
        >
          ⚖️ Crew Decisions ({decisionCount})
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--space-4)' }}>
        {activeTab === 'insights' ? (
          <ProjectManagerInsights insights={insights} />
        ) : (
          <CrewDecisions decisions={decisions} />
        )}
      </div>
    </div>
  );
}

function ProjectManagerInsights({ insights }: { insights: CrewInsight[] }) {
  if (insights.length === 0) {
    return <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>No active insights at this time.</p>;
  }

  // Group by priority
  const byCritical = insights.filter(i => i.priority === 'critical');
  const byHigh = insights.filter(i => i.priority === 'high');
  const byMedium = insights.filter(i => i.priority === 'medium');

  return (
    <div className="stack">
      {byCritical.length > 0 && (
        <InsightGroup
          title="🔴 Critical"
          insights={byCritical}
          color="red"
        />
      )}
      {byHigh.length > 0 && (
        <InsightGroup title="🟠 High" insights={byHigh} color="orange" />
      )}
      {byMedium.length > 0 && (
        <InsightGroup
          title="🟡 Medium"
          insights={byMedium}
          color="yellow"
        />
      )}
    </div>
  );
}

function InsightGroup({
  title,
  insights,
  color,
}: {
  title: string;
  insights: CrewInsight[];
  color: string;
}) {
  return (
    <div>
      <h4 style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{title}</h4>
      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        {insights.map(insight => (
          <PMInsightCard key={insight.id} insight={insight} color={color} />
        ))}
      </div>
    </div>
  );
}

function PMInsightCard({
  insight,
  color,
}: {
  insight: CrewInsight;
  color: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colorTokens: Record<string, string> = {
    red: 'var(--danger)',
    orange: 'var(--warn)',
    yellow: 'var(--accent2)',
  };
  const tone = colorTokens[color] ?? 'var(--accent4)';

  return (
    <div
      style={{
        border: `1px solid ${tone}`,
        borderRadius: 'var(--radius)',
        padding: 'var(--space-3)',
        cursor: 'pointer',
        background: `color-mix(in srgb, ${tone} 10%, var(--surface))`,
        transition: 'background 0.15s ease',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h5 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{insight.title}</h5>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)', marginTop: 'var(--space-1)' }}>{insight.description}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)', flexShrink: 0, marginLeft: 'var(--space-2)' }}>
          <div style={{ color: 'var(--text-dim)' }}>{insight.crewMember}</div>
          <div style={{ fontWeight: 600 }}>{insight.confidence}%</div>
        </div>
      </div>

      {isExpanded && insight.actionItems && (
        <div
          className="stack"
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border)',
            gap: 'var(--space-2)',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Recommended Actions:</p>
          <ul style={{ display: 'grid', gap: 'var(--space-1)', listStyle: 'none' }}>
            {insight.actionItems.map((action, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                }}
              >
                <input type="checkbox" style={{ marginTop: '2px' }} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CrewDecisions({ decisions }: { decisions: CrewDecision[] }) {
  if (decisions.length === 0) {
    return <p style={{ color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>No pending decisions.</p>;
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      {decisions.map(decision => (
        <CrewDecisionCard key={decision.id} decision={decision} />
      ))}
    </div>
  );
}

function CrewDecisionCard({ decision }: { decision: CrewDecision }) {
  const authorityIcons: Record<string, string> = {
    individual: '👤',
    consensus: '👥',
    veto: '🛑',
  };

  return (
    <div
      style={{
        border: '1px solid var(--accent4)',
        borderRadius: 'var(--radius)',
        padding: 'var(--space-3)',
        background: 'color-mix(in srgb, var(--accent4) 10%, var(--surface))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-lg)' }}>{authorityIcons[decision.authority]}</span>
          <div>
            <h5 style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              {decision.type.replace(/_/g, ' ')}
            </h5>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-dim)' }}>From: {decision.crewMember}</p>
          </div>
        </div>
        <span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {decision.authority}
        </span>
      </div>

      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{decision.reasoning}</p>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          onClick={() => {
            // Call API to approve
            fetch(`/api/crew/decisions/${decision.id}/approve`, {
              method: 'POST',
            });
          }}
          className="btn"
          style={{ flex: 1, background: 'var(--ok)', color: 'var(--on-accent)', fontSize: 'var(--text-sm)' }}
        >
          ✓ Approve
        </button>
        <button
          onClick={() => {
            // Call API to reject
            fetch(`/api/crew/decisions/${decision.id}/reject`, {
              method: 'POST',
            });
          }}
          className="btn"
          style={{ flex: 1, background: 'var(--danger)', color: 'var(--on-accent)', fontSize: 'var(--text-sm)' }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
