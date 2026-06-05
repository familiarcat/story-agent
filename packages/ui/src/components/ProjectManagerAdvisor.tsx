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
      <div className="p-4 text-gray-500 text-sm">
        Loading project crew guidance...
      </div>
    );
  }

  const insightCount = insights.length;
  const decisionCount = decisions.filter(d => !d.approved).length;

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-4 py-3 font-medium text-sm ${
            activeTab === 'insights'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Insights ({insightCount})
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`flex-1 px-4 py-3 font-medium text-sm ${
            activeTab === 'decisions'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚖️ Crew Decisions ({decisionCount})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
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
    return <p className="text-gray-500 text-sm">No active insights at this time.</p>;
  }

  // Group by priority
  const byCritical = insights.filter(i => i.priority === 'critical');
  const byHigh = insights.filter(i => i.priority === 'high');
  const byMedium = insights.filter(i => i.priority === 'medium');

  return (
    <div className="space-y-4">
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
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <div className="space-y-2">
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

  const colorClasses: Record<string, string> = {
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  };

  return (
    <div
      className={`border rounded p-3 cursor-pointer transition-all ${colorClasses[color]}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h5 className="font-semibold text-sm">{insight.title}</h5>
          <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
        </div>
        <div className="text-right text-xs flex-shrink-0 ml-2">
          <div className="text-gray-500">{insight.crewMember}</div>
          <div className="font-medium">{insight.confidence}%</div>
        </div>
      </div>

      {isExpanded && insight.actionItems && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <p className="text-xs font-semibold">Recommended Actions:</p>
          <ul className="space-y-1">
            {insight.actionItems.map((action, idx) => (
              <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" />
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
    return <p className="text-gray-500 text-sm">No pending decisions.</p>;
  }

  return (
    <div className="space-y-2">
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
    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{authorityIcons[decision.authority]}</span>
          <div>
            <h5 className="font-semibold text-sm">
              {decision.type.replace(/_/g, ' ')}
            </h5>
            <p className="text-xs text-gray-600">From: {decision.crewMember}</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded bg-white border">
          {decision.authority}
        </span>
      </div>

      <p className="text-sm text-gray-700 mb-3">{decision.reasoning}</p>

      <div className="flex gap-2">
        <button
          onClick={() => {
            // Call API to approve
            fetch(`/api/crew/decisions/${decision.id}/approve`, {
              method: 'POST',
            });
          }}
          className="flex-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded font-medium hover:bg-green-600"
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
          className="flex-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded font-medium hover:bg-red-600"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}
