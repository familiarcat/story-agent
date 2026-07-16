'use client';

import { useEffect, useState } from 'react';

interface CrewMember {
  name: string;
  domain: string;
  avatar: string;
}

interface Phase3Story {
  ref: string;
  title: string;
  assignedTo: string;
  percentageComplete: number;
  healthSignal: 'Healthy' | 'Fatigued' | 'Stressed';
  cognitiveLoad: number;
  status: 'STARTED' | 'IN_PROGRESS' | 'TESTING' | 'SHIPPED';
  blockerStatus: null | 'YELLOW_OVERRIDE_PENDING' | 'YELLOW_OVERRIDE' | 'RED_ESCALATION' | 'BLOCKED_PENDING' | 'DEFERRED';
  lastUpdate: string;
  deliberationLogId?: string;
}

interface PhaseMetrics {
  totalStories: number;
  shippedStories: number;
  averageProgress: number;
  averageHealth: number; // 0-10 cognitive load avg
  blockerCount: number;
  crewParticipation: number;
}

const CREW_MEMBERS: Record<string, CrewMember> = {
  picard: { name: 'Picard', domain: 'Command', avatar: '🖖' },
  data: { name: 'Data', domain: 'Architecture', avatar: '📊' },
  riker: { name: 'Riker', domain: 'Implementation', avatar: '⚙️' },
  worf: { name: 'Worf', domain: 'Security', avatar: '🛡️' },
  geordi: { name: 'Geordi', domain: 'Infrastructure', avatar: '⚡' },
  obrien: { name: "O'Brien", domain: 'DevOps', avatar: '🔧' },
  yar: { name: 'Yar', domain: 'Quality', avatar: '✅' },
  troi: { name: 'Troi', domain: 'Stakeholder', avatar: '💭' },
  crusher: { name: 'Crusher', domain: 'Health', avatar: '💚' },
  uhura: { name: 'Uhura', domain: 'Communications', avatar: '📡' },
  quark: { name: 'Quark', domain: 'Finance', avatar: '💰' },
};

export default function Phase3Dashboard() {
  const [stories, setStories] = useState<Phase3Story[]>([]);
  const [metrics, setMetrics] = useState<PhaseMetrics>({
    totalStories: 0,
    shippedStories: 0,
    averageProgress: 0,
    averageHealth: 0,
    blockerCount: 0,
    crewParticipation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPhase3Data = async () => {
    try {
      const response = await fetch('/api/phase3/stories');
      const data = await response.json();
      setStories(data.stories || []);
      setMetrics(data.metrics || {});
    } catch (error) {
      console.error('Failed to fetch Phase 3 data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhase3Data();
    const interval = setInterval(fetchPhase3Data, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (load: number) => {
    if (load <= 5) return '#10b981'; // green
    if (load <= 7) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SHIPPED':
        return '#3b82f6'; // blue
      case 'TESTING':
        return '#8b5cf6'; // purple
      case 'IN_PROGRESS':
        return '#06b6d4'; // cyan
      default:
        return '#6b7280'; // gray
    }
  };

  const getBlockerColor = (blocker: string | null) => {
    if (!blocker) return 'transparent';
    if (blocker.includes('RED')) return '#dc2626'; // red
    if (blocker.includes('YELLOW')) return '#f59e0b'; // amber
    return '#6366f1'; // indigo
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)', padding: '2rem' }}>
      <div style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                🚀 Phase 3 Autonomous Execution
              </h1>
              <p style={{ color: '#94a3b8' }}>Real-time crew deliberation → Aha synchronization</p>
            </div>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchPhase3Data().finally(() => setRefreshing(false));
              }}
              disabled={refreshing}
              style={{
                padding: '0.5rem 1rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Stories', value: metrics.totalStories, color: '#3b82f6' },
            { label: 'Shipped', value: metrics.shippedStories, color: '#10b981', subtext: `${metrics.totalStories ? Math.round((metrics.shippedStories / metrics.totalStories) * 100) : 0}%` },
            { label: 'Avg Progress', value: `${metrics.averageProgress.toFixed(0)}%`, color: '#06b6d4' },
            { label: 'Crew Health', value: `${metrics.averageHealth.toFixed(1)}/10`, color: getHealthColor(metrics.averageHealth), subtext: 'Cognitive Load' },
            { label: 'Blockers', value: metrics.blockerCount, color: metrics.blockerCount > 0 ? '#f59e0b' : '#10b981' },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                padding: '1.5rem',
              }}
            >
              <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{card.label}</p>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: card.color }}>{card.value}</div>
              {card.subtext && <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>{card.subtext}</p>}
            </div>
          ))}
        </div>

        {/* Stories Grid */}
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>Phase 3 Stories</h2>

          {loading ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
              Loading Phase 3 stories...
            </div>
          ) : stories.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
              No Phase 3 stories yet. Trigger Observation Lounge to begin.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {stories.map((story) => {
                const crew = CREW_MEMBERS[story.assignedTo.toLowerCase()];
                return (
                  <div key={story.ref} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: getStatusColor(story.status), color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                            {story.status}
                          </span>
                          {story.blockerStatus && (
                            <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: getBlockerColor(story.blockerStatus), color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                              {story.blockerStatus === 'YELLOW_OVERRIDE_PENDING' ? '🎯 Riker Pending' : story.blockerStatus === 'RED_ESCALATION' ? '🚨 Admiral Review' : story.blockerStatus}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.125rem', color: 'white', fontWeight: '600' }}>
                          {story.ref} — {story.title}
                        </h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem' }}>{crew?.avatar || '👤'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{crew?.name || story.assignedTo}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1' }}>Progress</span>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{story.percentageComplete}%</span>
                      </div>
                      <div style={{ background: '#0f172a', borderRadius: '0.25rem', height: '0.5rem', overflow: 'hidden' }}>
                        <div style={{ background: '#06b6d4', height: '100%', width: `${story.percentageComplete}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>

                    {/* Health & Load */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #475569', paddingTop: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Health Signal</p>
                        <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: story.healthSignal === 'Healthy' ? '#10b981' : story.healthSignal === 'Fatigued' ? '#f59e0b' : '#ef4444', color: 'white', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                          {story.healthSignal}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>Cognitive Load</p>
                        <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: getHealthColor(story.cognitiveLoad) }}>
                          {story.cognitiveLoad}/10
                        </div>
                      </div>
                    </div>

                    {/* Last Update */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #475569' }}>
                      Last update: {new Date(story.lastUpdate).toLocaleTimeString()}
                      {story.deliberationLogId && (
                        <div style={{ color: '#475569', marginTop: '0.25rem' }}>
                          Memory ID: <code style={{ fontSize: '0.75rem', background: '#0f172a', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>{story.deliberationLogId}</code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
