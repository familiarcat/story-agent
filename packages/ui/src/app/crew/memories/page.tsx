'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

const MEMORY_TYPE_COLORS = {
  insight: 'bg-blue-100 border-blue-300',
  lesson_learned: 'bg-yellow-100 border-yellow-300',
  decision_note: 'bg-purple-100 border-purple-300',
  reminder: 'bg-red-100 border-red-300',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900">👥 Crew Personal Memories</h1>
          <p className="text-slate-600 mt-2">Track individual crew member learning across projects</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
              {/* Crew Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  🧑‍⚖️ Select Crew Member
                </label>
                <select
                  value={selectedCrew}
                  onChange={(e) => setSelectedCrew(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                >
                  {CREW_MEMBERS.map(crew => (
                    <option key={crew} value={crew}>{crew.charAt(0).toUpperCase() + crew.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Project Filter */}
              {projectsList.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    🎯 Filter by Project
                  </label>
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => setSelectedProject(e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
                  >
                    <option value="">All Projects</option>
                    {projectsList.map(project => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Memory Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  📝 Memory Type
                </label>
                <select
                  value={memoryType}
                  onChange={(e) => setMemoryType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
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
                <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-3">📊 Statistics</h3>
                  {stats.map((stat, idx) => (
                    <div key={idx} className="text-xs text-slate-600 mb-2">
                      <div>{stat.memory_by_type}: {stat.total_memories}</div>
                      <div className="text-slate-500">{stat.projects_count} projects</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={useSemanticSearch ? 'Ask a question...' : 'Search keywords...'}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  🔍 Search
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useSemanticSearch}
                  onChange={(e) => setUseSemanticSearch(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-slate-700">
                  🧠 Use semantic search (AI-powered understanding)
                </span>
              </label>
            </div>

            {/* Memories List */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                  <div className="text-slate-500">Loading memories...</div>
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                  <div className="text-slate-500 text-lg">
                    No memories found for {selectedCrew}
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        fetchMemories();
                      }}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredMemories.map(memory => (
                  <div
                    key={memory.id}
                    className={`bg-white rounded-lg shadow-sm border-2 p-6 ${MEMORY_TYPE_COLORS[memory.memory_type]}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {MEMORY_TYPE_ICONS[memory.memory_type]}
                        </span>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{memory.title}</h3>
                          <div className="text-sm text-slate-600">
                            {memory.memory_type.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <p className="text-slate-700 mb-4 whitespace-pre-wrap">{memory.content}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {memory.tags && memory.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="text-xs text-slate-500 flex gap-4">
                      {memory.project_id && (
                        <div>📦 Project: {memory.project_id}</div>
                      )}
                      {memory.task_id && (
                        <div>🎯 Task: {memory.task_id}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            {filteredMemories.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
                <h3 className="font-semibold text-slate-900 mb-2">📈 Summary</h3>
                <p className="text-slate-600">
                  Showing {filteredMemories.length} memories
                  {selectedProject && ` from project ${selectedProject}`}
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
            )}
          </div>
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
