import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import type {
  StoryRecord,
  PRComment,
  RevisionCycle,
  ProjectRecord,
  ObservationMemoryRecord,
  ObservationDebateResult,
  CrewMissionPlan,
} from './index.js';

let _client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment.');
  _client = createClient(url, key);
  return _client;
}

function throwOnError<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result.data as T;
}

const EMBEDDING_DIMENSION = 64;

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function toEmbedding(text: string, dimension = EMBEDDING_DIMENSION): number[] {
  const vector: number[] = [];
  for (let i = 0; i < dimension; i++) {
    const digest = createHash('sha256').update(`${i}:${text}`).digest();
    // Normalize byte [0,255] to [-1,1]
    vector.push((digest[0] / 127.5) - 1);
  }
  return vector;
}

function toPgVector(vector: number[]): string {
  return `[${vector.map(v => Number(v.toFixed(6))).join(',')}]`;
}

function parseVector(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(v => Number(v)).filter(v => Number.isFinite(v));
  }
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
  return trimmed.slice(1, -1).split(',').map(part => Number(part.trim())).filter(v => Number.isFinite(v));
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function mapObservationMemory(row: Record<string, unknown>): ObservationMemoryRecord {
  return {
    id: row.id as string,
    storyId: row.story_id as string,
    source: row.source as ObservationMemoryRecord['source'],
    transcriptHash: row.transcript_hash as string,
    transcriptText: row.transcript_text as string,
    transcript: row.transcript as ObservationDebateResult,
    missionReference: row.mission_ref as string | null,
    tags: (row.tags as string[] | null) ?? [],
    embedding: parseVector(row.memory_embedding),
    createdAt: row.created_at as string,
  };
}

// ── Stories ──────────────────────────────────────────────────────────────────

export async function upsertStory(
  story: Omit<StoryRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): Promise<void> {
  const now = new Date().toISOString();
  throwOnError(await db().from('sa_stories').upsert({
    id:             story.id,
    story_id:       story.storyId,
    story_title:    story.storyTitle,
    story_url:      story.storyUrl,
    repo_full_name: story.repoFullName,
    branch:         story.branch,
    base_branch:    story.baseBranch,
    status:         story.status,
    pr_number:      story.prNumber,
    pr_url:         story.prUrl,
    pr_status:      story.prStatus,
    phase:          story.phase,
    created_at:     story.createdAt ?? now,
    updated_at:     now,
    notes:          story.notes,
  }, { onConflict: 'story_id' }));
}

export async function getStory(storyId: string): Promise<StoryRecord | null> {
  const { data } = await db().from('sa_stories').select('*').eq('story_id', storyId).single();
  return data ? mapStory(data) : null;
}

export async function listStories(): Promise<StoryRecord[]> {
  const rows = throwOnError(await db().from('sa_stories').select('*').order('updated_at', { ascending: false }));
  return (rows ?? []).map(mapStory);
}

function mapStory(row: Record<string, unknown>): StoryRecord {
  return {
    id:           row.id as string,
    storyId:      row.story_id as string,
    storyTitle:   row.story_title as string,
    storyUrl:     row.story_url as string,
    repoFullName: row.repo_full_name as string,
    branch:       row.branch as string,
    baseBranch:   row.base_branch as string,
    status:       row.status as StoryRecord['status'],
    prNumber:     row.pr_number as number | null,
    prUrl:        row.pr_url as string | null,
    prStatus:     row.pr_status as StoryRecord['prStatus'],
    phase:        row.phase as 1 | 2,
    createdAt:    row.created_at as string,
    updatedAt:    row.updated_at as string,
    notes:        row.notes as string | null,
  };
}

// ── PR Comments ──────────────────────────────────────────────────────────────

export async function upsertPRComments(comments: PRComment[]): Promise<void> {
  if (comments.length === 0) return;
  throwOnError(await db().from('sa_pr_comments').upsert(
    comments.map(c => ({
      id:         c.id,
      story_id:   c.storyId,
      pr_number:  c.prNumber,
      author:     c.author,
      body:       c.body,
      path:       c.path,
      line:       c.line,
      state:      c.state,
      created_at: c.createdAt,
      url:        c.url,
    })),
    { onConflict: 'id' }
  ));
}

export async function getCommentsForStory(storyId: string): Promise<PRComment[]> {
  const rows = throwOnError(
    await db().from('sa_pr_comments').select('*').eq('story_id', storyId).order('created_at', { ascending: true })
  );
  return (rows ?? []).map(r => ({
    id:        r.id as string,
    storyId:   r.story_id as string,
    prNumber:  r.pr_number as number,
    author:    r.author as string,
    body:      r.body as string,
    path:      r.path as string | null,
    line:      r.line as number | null,
    state:     r.state as PRComment['state'],
    createdAt: r.created_at as string,
    url:       r.url as string,
  }));
}

// ── Revision Cycles ──────────────────────────────────────────────────────────

export async function createRevisionCycle(cycle: Omit<RevisionCycle, 'createdAt'>): Promise<void> {
  throwOnError(await db().from('sa_revision_cycles').insert({
    id:                   cycle.id,
    story_id:             cycle.storyId,
    cycle_number:         cycle.cycleNumber,
    comments_addressed:   cycle.commentsAddressed,
    files_changed:        cycle.filesChanged,
    test_evidence:        cycle.testEvidence,
    commit_sha:           cycle.commitSha,
    completed_at:         cycle.completedAt,
    created_at:           new Date().toISOString(),
  }));
}

export async function getRevisionCycles(storyId: string): Promise<RevisionCycle[]> {
  const rows = throwOnError(
    await db().from('sa_revision_cycles').select('*').eq('story_id', storyId).order('cycle_number', { ascending: true })
  );
  return (rows ?? []).map(r => ({
    id:                 r.id as string,
    storyId:            r.story_id as string,
    cycleNumber:        r.cycle_number as number,
    commentsAddressed:  r.comments_addressed as string[],
    filesChanged:       r.files_changed as string[],
    testEvidence:       r.test_evidence as string,
    commitSha:          r.commit_sha as string | null,
    completedAt:        r.completed_at as string | null,
    createdAt:          r.created_at as string,
  }));
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function upsertProject(project: ProjectRecord): Promise<void> {
  throwOnError(await db().from('sa_projects').upsert({
    id:              project.id,
    name:            project.name,
    repo_full_name:  project.repoFullName,
    aha_project_id:  project.ahaProjectId,
    created_at:      project.createdAt ?? new Date().toISOString(),
  }, { onConflict: 'repo_full_name' }));
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const rows = throwOnError(await db().from('sa_projects').select('*').order('name', { ascending: true }));
  return (rows ?? []).map(r => ({
    id:            r.id as string,
    name:          r.name as string,
    repoFullName:  r.repo_full_name as string,
    ahaProjectId:  r.aha_project_id as string | null,
    createdAt:     r.created_at as string,
  }));
}

// ── Observation Lounge Memory (Vector Store) ────────────────────────────────

export async function storeObservationMemory(input: {
  storyId: string;
  source: ObservationMemoryRecord['source'];
  transcript: ObservationDebateResult;
  missionPlan?: CrewMissionPlan;
  missionReference?: string;
  tags?: string[];
}): Promise<ObservationMemoryRecord> {
  const transcriptText = JSON.stringify(input.transcript);
  const transcriptHash = hashText(`${input.storyId}:${transcriptText}`);
  const embedding = toEmbedding(transcriptText);

  const payload = {
    id: randomUUID(),
    story_id: input.storyId,
    source: input.source,
    transcript_hash: transcriptHash,
    transcript_text: transcriptText,
    transcript: input.transcript,
    mission_ref: input.missionReference ?? input.missionPlan?.story.referenceNum ?? null,
    tags: input.tags ?? [],
    memory_embedding: toPgVector(embedding),
    created_at: new Date().toISOString(),
  };

  const rows = throwOnError(await db().from('sa_observation_memories').upsert(payload, {
    onConflict: 'transcript_hash',
  }).select('*').limit(1));

  const row = Array.isArray(rows) ? rows[0] : rows;
  return mapObservationMemory((row as Record<string, unknown>) ?? payload);
}

export async function getRecentObservationMemories(limit = 8, storyId?: string): Promise<ObservationMemoryRecord[]> {
  let query = db().from('sa_observation_memories').select('*').order('created_at', { ascending: false }).limit(limit);
  if (storyId) {
    query = query.eq('story_id', storyId);
  }
  const rows = throwOnError(await query);
  return (rows ?? []).map(row => mapObservationMemory(row as Record<string, unknown>));
}

export async function getRelevantObservationMemories(input: {
  queryText: string;
  storyId?: string;
  limit?: number;
  candidatePool?: number;
}): Promise<ObservationMemoryRecord[]> {
  const { queryText, storyId, limit = 5, candidatePool = 40 } = input;
  const candidates = await getRecentObservationMemories(candidatePool, storyId);
  const queryEmbedding = toEmbedding(queryText);

  return candidates
    .map(memory => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding),
    }))
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit);
}
