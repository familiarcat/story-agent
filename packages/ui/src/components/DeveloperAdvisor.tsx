/**
 * Developer Advisor - Real-time crew guidance for developers in VS Code
 *
 * Shows:
 * - Architecture recommendations (Data)
 * - Implementation guidance (Riker)
 * - Security checks (Worf)
 * - Code quality suggestions (Crusher)
 * - QA test strategies (Yar)
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { CrewInsight } from '@/lib/crew-autonomy';

interface DeveloperAdvisorProps {
  storyRef: string;
  isConnected: boolean;
}

const insightIcons: Record<string, string> = {
  architecture_recommendation: '🏗️',
  code_quality_warning: '✨',
  security_issue: '🔒',
  test_strategy: '✅',
  health_improvement: '⚕️',
  requirement_clarification: '❓',
};

const insightColors: Record<string, string> = {
  low: 'bg-blue-50 border-blue-200',
  medium: 'bg-yellow-50 border-yellow-200',
  high: 'bg-orange-50 border-orange-200',
  critical: 'bg-red-50 border-red-200',
};

export function DeveloperAdvisor({ storyRef, isConnected }: DeveloperAdvisorProps) {
  const [insights, setInsights] = useState<CrewInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch(
          `/api/crew/insights?storyRef=${storyRef}&role=developer`
        );
        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        }
      } catch (err) {
        console.error('Error fetching developer insights:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      fetchInsights();

      // Poll every 5 seconds
      const interval = setInterval(fetchInsights, 5000);
      return () => clearInterval(interval);
    }
  }, [storyRef, isConnected]);

  if (isLoading) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Loading crew guidance...
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        {isConnected ? 'No crew guidance at this time' : 'Crew offline'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <DeveloperInsightCard key={insight.id} insight={insight} />
      ))}
    </div>
  );
}

function DeveloperInsightCard({ insight }: { insight: CrewInsight }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-all ${insightColors[insight.priority]}`}
    >
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-start gap-2">
        <span className="text-lg">{insightIcons[insight.type] || '💡'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{insight.title}</h4>
          <p className="text-xs text-gray-600 line-clamp-1">
            {insight.description}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-xs text-gray-500">{insight.crewMember}</span>
          <div className="text-xs font-medium">{insight.confidence}% confident</div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-2">
          <p className="text-sm">{insight.description}</p>

          {insight.actionItems && insight.actionItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Action Items:</p>
              <ul className="space-y-1">
                {insight.actionItems.map((item, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.autonomousAction && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs">
              <strong>Crew can autonomously:</strong> {insight.autonomousAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
