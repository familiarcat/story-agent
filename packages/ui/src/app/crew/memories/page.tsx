'use client';

import { useState, useEffect, Suspense } from 'react';
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
                  style={{ borderLeft: `3px solid ${MEMORY_TYPE_COLORS[memory.memory_type]}` }}
                >
                  <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div className="cluster">
                      <span style={{ fontSize: 'var(--text-2xl)' }}>
                        {MEMORY_TYPE_ICONS[memory.memory_type]}
                      </span>
                      <div>
                        <h3>{memory.title}</h3>
                        <div className="meta">
                          {memory.memory_type.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="meta" style={{ textAlign: 'right' }}>
                      {new Date(memory.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--space-3)' }}>{memory.content}</p>

                  <div className="cluster" style={{ marginBottom: 'var(--space-3)' }}>
                    {memory.tags && memory.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="cluster">
                    {memory.project_id && (
                      <div className="meta">📦 Project: {memory.project_id}</div>
                    )}
                    {memory.task_id && (
                      <div className="meta">🎯 Task: {memory.task_id}</div>
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
