'use client';

import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface CrewMemory {
  id: number;
  crew_id: string;
  memory_type: 'insight' | 'lesson_learned' | 'decision_note' | 'reminder';
  title: string;
  content: string;
  project_id?: string;
  task_id?: string;
  tags: string[];
  created_at: string;
}

interface MemoryStats {
  total_memories: number;
  memory_by_type: string;
  projects_count: number;
  most_recent_memory: string;
}

const CREW_MEMBERS = [
  'picard', 'data', 'riker', 'geordi', 'obrien', 'worf',
  'troi', 'crusher', 'uhura', 'quark', 'yar'
];

// memory_type → theme accent token (Data's ruling: colors come from tokens, never hex)
const MEMORY_TYPE_COLORS = {
  insight: 'var(--accent4)',
  lesson_learned: 'var(--warn)',
  decision_note: 'var(--accent3)',
  reminder: 'var(--danger)',
};

const MEMORY_TYPE_ICONS = {
  insight: '💡',
  lesson_learned: '📚',
  decision_note: '📋',
  reminder: '⏰',
};

const MEMORY_TYPE_LABELS = {
  insight: 'Insight',
  lesson_learned: 'Lesson Learned',
  decision_note: 'Decision Note',
  reminder: 'Reminder',
};

function renderStructuredMemoryContent(content: string, tone: string) {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];
  let prevWasNumbered = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? '';
    const line = raw.trim();

    if (!line) {
      prevWasNumbered = false;
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      prevWasNumbered = true;
      nodes.push(
        <div
          key={`line-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.55rem 1fr',
            gap: '0.5rem',
            padding: '0.24rem 0.5rem',
            borderRadius: '0.45rem',
            background: 'color-mix(in srgb, var(--surface) 55%, var(--surface-2))',
            marginLeft: '0.25rem',
            marginBottom: '0.18rem',
          }}
        >
          <span style={{ color: tone, fontWeight: 800, fontSize: '0.85rem' }}>{numbered[1]}.</span>
          <span style={{ lineHeight: 1.45 }}>{numbered[2]}</span>
        </div>
      );
      continue;
    }

    if (/:$/.test(line) && line.length < 60) {
      prevWasNumbered = false;
      nodes.push(
        <div
          key={`line-${i}`}
          style={{
            marginTop: i === 0 ? 0 : '0.55rem',
            marginBottom: '0.22rem',
            color: tone,
            fontWeight: 750,
            fontSize: '0.92rem',
            letterSpacing: '0.01em',
          }}
        >
          {line}
        </div>
      );
      continue;
    }

    nodes.push(
      <p
        key={`line-${i}`}
        style={{
          margin: 0,
          marginLeft: prevWasNumbered ? '2.3rem' : 0,
          color: prevWasNumbered ? 'var(--text-dim)' : 'var(--text)',
          fontSize: prevWasNumbered ? '0.88rem' : '0.96rem',
          lineHeight: 1.52,
        }}
      >
        {line}
      </p>
    );
  }

  return nodes.length ? nodes : <p style={{ margin: 0 }}>{content}</p>;
}

function CrewMemoriesContent() {
  const searchParams = useSearchParams();
  const [selectedCrew, setSelectedCrew] = useState(searchParams.get('crew') || 'worf');
  const [selectedProject, setSelectedProject] = useState<string | null>(searchParams.get('project') || null);
  const [memories, setMemories] = useState<CrewMemory[]>([]);
  const [stats, setStats] = useState<MemoryStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [memoryType, setMemoryType] = useState<string>('all');
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  // Fetch memories when crew or project changes
  useEffect(() => {
    fetchMemories();
  }, [selectedCrew, selectedProject]);

  // Fetch memory statistics
  useEffect(() => {
    fetchStats();
  }, [selectedCrew]);

  async function fetchMemories() {
    setLoading(true);
    try {
      if (selectedProject) {
        const response = await fetch(
          `/api/crew/memories/project?crew=${selectedCrew}&project=${selectedProject}`
        );
        const data = await response.json();
        setMemories(data.memories || []);
      } else {
        const response = await fetch(`/api/crew/memories?crew=${selectedCrew}`);
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Error fetching memories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch(`/api/crew/memories/stats?crew=${selectedCrew}`);
      const data = await response.json();
      setStats(data.stats || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      fetchMemories();
      return;
    }

    setLoading(true);
    try {
      const endpoint = useSemanticSearch
        ? `/api/crew/memories/search-semantic?crew=${selectedCrew}&query=${encodeURIComponent(searchQuery)}`
        : `/api/crew/memories/search?crew=${selectedCrew}&query=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(endpoint);
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error('Error searching memories:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMemories = memoryType === 'all'
    ? memories
    : memories.filter(m => m.memory_type === memoryType);

  const projectsList = [...new Set(memories.map(m => m.project_id).filter(Boolean))] as string[];

  return (
    <div className="page">
      {/* Header */}
      <div className="section">
        <Breadcrumbs crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Crew Memories' }]} />
        <h1>👥 Crew Personal Memories</h1>
        <p className="lead">Track individual crew member learning across projects</p>
      </div>

      <div className="page-grid">
        {/* Sidebar */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-4)' }}>
          <div className="stack">
            {/* Crew Selection */}
            <div className="field">
              <label>🧑‍⚖️ Select Crew Member</label>
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                style={{ width: '100%' }}
              >
                {CREW_MEMBERS.map(crew => (
                  <option key={crew} value={crew}>{crew.charAt(0).toUpperCase() + crew.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Project Filter */}
            {projectsList.length > 0 && (
              <div className="field">
                <label>🎯 Filter by Project</label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  style={{ width: '100%' }}
                >
                  <option value="">All Projects</option>
                  {projectsList.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Memory Type Filter */}
            <div className="field">
              <label>📝 Memory Type</label>
              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="all">All Types</option>
                <option value="insight">💡 Insight</option>
                <option value="lesson_learned">📚 Lesson Learned</option>
                <option value="decision_note">📋 Decision Note</option>
                <option value="reminder">⏰ Reminder</option>
              </select>
            </div>

            {/* Statistics */}
            {stats.length > 0 && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 'var(--space-3)' }}>
                <h3>📊 Statistics</h3>
                {stats.map((stat, idx) => (
                  <div key={idx} className="meta" style={{ marginBottom: 'var(--space-2)' }}>
                    <div>{stat.memory_by_type}: {stat.total_memories}</div>
                    <div>{stat.projects_count} projects</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="stack">
          {/* Search Bar */}
          <div className="card">
            <div className="cluster" style={{ marginBottom: 'var(--space-3)' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={useSemanticSearch ? 'Ask a question...' : 'Search keywords...'}
                style={{ flex: 1 }}
              />
              <button onClick={handleSearch} className="btn btn-primary">
                🔍 Search
              </button>
            </div>

            <label className="cluster">
              <input
                type="checkbox"
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
                className="checkbox"
              />
              <span>
                🧠 Use semantic search (AI-powered understanding)
              </span>
            </label>
          </div>

          {/* Memories List */}
          <div className="stack">
            {loading ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <div>Loading memories...</div>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <div style={{ fontSize: 'var(--text-lg)' }}>
                  No memories found for {selectedCrew}
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      fetchMemories();
                    }}
                    className="btn btn-secondary"
                    style={{ marginTop: 'var(--space-4)' }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredMemories.map(memory => (
                <div
                  key={memory.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${MEMORY_TYPE_COLORS[memory.memory_type]}`,
                    background: `linear-gradient(120deg, color-mix(in srgb, ${MEMORY_TYPE_COLORS[memory.memory_type]} 11%, var(--surface)) 0%, var(--surface) 34%)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${MEMORY_TYPE_COLORS[memory.memory_type]} 22%, transparent)`,
                  }}
                >
                  <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)', gap: '0.6rem' }}>
                    <div className="cluster" style={{ alignItems: 'flex-start', gap: '0.7rem' }}>
                      <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                        {MEMORY_TYPE_ICONS[memory.memory_type]}
                      </span>
                      <div>
                        <h3 style={{ marginBottom: '0.15rem', fontSize: '1.22rem', letterSpacing: '0.005em' }}>{memory.title}</h3>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.17rem 0.52rem',
                            borderRadius: '999px',
                            background: `color-mix(in srgb, ${MEMORY_TYPE_COLORS[memory.memory_type]} 20%, var(--surface))`,
                            color: MEMORY_TYPE_COLORS[memory.memory_type],
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            fontWeight: 720,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {MEMORY_TYPE_LABELS[memory.memory_type]}
                        </div>
                      </div>
                    </div>
                    <div className="meta" style={{ textAlign: 'right', fontSize: '0.77rem' }}>
                      {new Date(memory.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 'var(--space-3)',
                      padding: '0.72rem 0.76rem',
                      borderRadius: '0.6rem',
                      border: `1px solid color-mix(in srgb, ${MEMORY_TYPE_COLORS[memory.memory_type]} 20%, var(--border))`,
                      background: 'color-mix(in srgb, var(--surface-2) 60%, var(--surface))',
                      display: 'grid',
                      gap: '0.25rem',
                    }}
                  >
                    {renderStructuredMemoryContent(memory.content, MEMORY_TYPE_COLORS[memory.memory_type])}
                  </div>

                  <div className="cluster" style={{ marginBottom: 'var(--space-3)' }}>
                    {memory.tags && memory.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="cluster">
                    {memory.project_id && (
                      <div className="meta" style={{ fontSize: '0.74rem' }}>📦 Project: {memory.project_id}</div>
                    )}
                    {memory.task_id && (
                      <div className="meta" style={{ fontSize: '0.74rem' }}>🎯 Task: {memory.task_id}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary */}
          {filteredMemories.length > 0 && (
            <div className="card">
              <h3>📈 Summary</h3>
              <p className="meta">
                Showing {filteredMemories.length} memories
                {selectedProject && ` from project ${selectedProject}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary during prerender (Next 15).
export default function CrewMemoriesPage() {
  return (
    <Suspense fallback={null}>
      <CrewMemoriesContent />
    </Suspense>
  );
}
