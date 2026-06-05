/**
 * CrewMonitor - Display all 11 crew members with current assignments
 */

'use client';

import { useEffect, useState } from 'react';
import type { CrewAgentProfile } from '@story-agent/shared';

interface CrewMemberWithStats extends CrewAgentProfile {
  currentAssignments?: string[]; // story refs currently assigned
  totalExecutionsToday?: number;
  costToday?: number;
  status: 'idle' | 'executing' | 'error';
}

const DEFAULT_CREW: CrewAgentProfile[] = [
  {
    id: 'captain',
    name: 'Picard',
    role: 'captain',
    specialty: 'Strategic Decomposition',
    responsibilities: ['Strategic decisions', 'Story decomposition', 'Execution approval'],
    decisionWeight: 1.5,
    model: 'claude-3-opus',
    authority: 'executive',
  },
  {
    id: 'architect',
    name: 'Data',
    role: 'architect',
    specialty: 'Technical Validation',
    responsibilities: ['Architecture review', 'Technical feasibility', 'Design validation'],
    decisionWeight: 1.3,
    model: 'claude-3.5-sonnet',
    authority: 'architectural',
  },
  {
    id: 'developer',
    name: 'Riker',
    role: 'developer',
    specialty: 'Implementation Tactics',
    responsibilities: ['Implementation planning', 'Code structure', 'Development tactics'],
    decisionWeight: 1.2,
    model: 'claude-3.5-sonnet',
    authority: 'tactical',
  },
  {
    id: 'infrastructure',
    name: 'Geordi',
    role: 'infrastructure',
    specialty: 'DevOps & Scaling',
    responsibilities: ['Infrastructure planning', 'Scalability analysis', 'DevOps decisions'],
    decisionWeight: 1.2,
    model: 'claude-3.5-sonnet',
    authority: 'infrastructure',
  },
  {
    id: 'devops',
    name: "O'Brien",
    role: 'devops',
    specialty: 'Build & CI/CD',
    responsibilities: ['Build optimization', 'CI/CD strategy', 'Deployment planning'],
    decisionWeight: 1.0,
    model: 'gpt-4o-mini',
    authority: 'operational',
  },
  {
    id: 'security',
    name: 'Worf',
    role: 'security',
    specialty: 'Security & Veto Authority',
    responsibilities: ['Security review', 'Threat assessment', 'Veto authority'],
    decisionWeight: 1.4,
    model: 'gpt-4o-mini',
    authority: 'security_veto',
  },
  {
    id: 'qa',
    name: 'Yar',
    role: 'qa',
    specialty: 'Test Strategy',
    responsibilities: ['Test planning', 'QA strategy', 'Test coverage'],
    decisionWeight: 1.1,
    model: 'gemini-flash',
    authority: 'quality',
  },
  {
    id: 'analyst',
    name: 'Troi',
    role: 'analyst',
    specialty: 'Stakeholder Alignment',
    responsibilities: ['Stakeholder analysis', 'Requirements clarity', 'Alignment'],
    decisionWeight: 0.9,
    model: 'claude-3-haiku',
    authority: 'stakeholder',
  },
  {
    id: 'health',
    name: 'Crusher',
    role: 'health',
    specialty: 'Code Health',
    responsibilities: ['Code quality', 'Health metrics', 'Observability'],
    decisionWeight: 1.1,
    model: 'claude-3.5-sonnet',
    authority: 'observability',
  },
  {
    id: 'communications',
    name: 'Uhura',
    role: 'communications',
    specialty: 'Requirement Clarity',
    responsibilities: ['Communication clarity', 'Requirement validation'],
    decisionWeight: 1.0,
    model: 'gemini-1.5-pro',
    authority: 'communications',
  },
  {
    id: 'finance',
    name: 'Quark',
    role: 'finance',
    specialty: 'Cost & Resources',
    responsibilities: ['Cost optimization', 'Resource allocation', 'Budget'],
    decisionWeight: 0.8,
    model: 'gpt-4o-mini',
    authority: 'financial',
  },
];

export function CrewMonitor() {
  const [crew, setCrew] = useState<CrewMemberWithStats[]>(DEFAULT_CREW.map(c => ({
    ...c,
    status: 'idle',
    currentAssignments: [],
    totalExecutionsToday: 0,
    costToday: 0,
  })));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCrewStats() {
      try {
        // TODO: Fetch from MCP crew analytics tools
        // const response = await fetch('/api/crew/statistics');
        // const stats = await response.json();
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching crew stats:', err);
        setIsLoading(false);
      }
    }

    fetchCrewStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchCrewStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: CrewMemberWithStats['status']): string => {
    switch (status) {
      case 'idle':
        return 'bg-gray-50 border-gray-200';
      case 'executing':
        return 'bg-blue-50 border-blue-200 animate-pulse';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusEmoji = (status: CrewMemberWithStats['status']): string => {
    switch (status) {
      case 'idle':
        return '😴';
      case 'executing':
        return '🔄';
      case 'error':
        return '⚠️';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">Crew Status</h2>

      {isLoading ? (
        <div className="text-gray-500">Loading crew statistics...</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {crew.map(member => (
            <div
              key={member.id}
              className={`p-3 rounded border transition-all ${getStatusColor(member.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getStatusEmoji(member.status)}</span>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.specialty}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-gray-600">Authority: {member.decisionWeight}</div>
                  <div className="text-gray-500">{member.model}</div>
                </div>
              </div>

              {member.currentAssignments && member.currentAssignments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                  <p className="text-xs font-medium text-gray-600 mb-1">Assigned:</p>
                  <div className="flex flex-wrap gap-1">
                    {member.currentAssignments.map(storyRef => (
                      <span
                        key={storyRef}
                        className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                      >
                        {storyRef}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {member.totalExecutionsToday !== undefined && (
                <div className="mt-1 text-xs text-gray-500">
                  💼 {member.totalExecutionsToday} executions | 💰 $
                  {(member.costToday || 0).toFixed(4)} today
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 font-medium mb-2">Authority Weights:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <strong>Executive:</strong> Picard (1.5)
          </div>
          <div>
            <strong>Security Veto:</strong> Worf (1.4)
          </div>
          <div>
            <strong>Architectural:</strong> Data (1.3)
          </div>
          <div>
            <strong>Tactical:</strong> Riker (1.2)
          </div>
        </div>
      </div>
    </div>
  );
}
