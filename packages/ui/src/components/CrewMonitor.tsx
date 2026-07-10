/**
 * CrewMonitor - Display all 11 crew members with current assignments
 */

'use client';

import { useEffect, useState, type CSSProperties } from 'react';
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

  const getStatusColor = (status: CrewMemberWithStats['status']): CSSProperties => {
    switch (status) {
      case 'idle':
        return { background: 'var(--surface-2)', borderColor: 'var(--border)' };
      case 'executing':
        return {
          background: 'color-mix(in srgb, var(--accent4) 15%, var(--surface))',
          borderColor: 'var(--accent4)',
        };
      case 'error':
        return {
          background: 'color-mix(in srgb, var(--danger) 15%, var(--surface))',
          borderColor: 'var(--danger)',
        };
      default:
        return { background: 'var(--surface-2)', borderColor: 'var(--border)' };
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
    <div className="card">
      <h2>Crew Status</h2>

      {isLoading ? (
        <div className="meta">Loading crew statistics...</div>
      ) : (
        <div
          className="stack"
          style={{ gap: 'var(--space-2)', maxHeight: '24rem', overflowY: 'auto' }}
        >
          {crew.map(member => (
            <div
              key={member.id}
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                transition: 'all 0.15s ease',
                ...getStatusColor(member.status),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xl)' }}>{getStatusEmoji(member.status)}</span>
                    <div>
                      <p style={{ fontWeight: 600 }}>{member.name}</p>
                      <p className="meta">{member.specialty}</p>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 'var(--text-xs)' }}>
                  <div style={{ color: 'var(--text-dim)' }}>Authority: {member.decisionWeight}</div>
                  <div className="meta">{member.model}</div>
                </div>
              </div>

              {member.currentAssignments && member.currentAssignments.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <p className="meta" style={{ marginBottom: 'var(--space-1)' }}>Assigned:</p>
                  <div className="cluster" style={{ gap: 'var(--space-1)' }}>
                    {member.currentAssignments.map(storyRef => (
                      <span key={storyRef} className="tag">
                        {storyRef}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {member.totalExecutionsToday !== undefined && (
                <div className="meta" style={{ marginTop: 'var(--space-1)' }}>
                  💼 {member.totalExecutionsToday} executions | 💰 $
                  {(member.costToday || 0).toFixed(4)} today
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <p className="meta" style={{ marginBottom: 'var(--space-2)' }}>Authority Weights:</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-dim)',
          }}
        >
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
