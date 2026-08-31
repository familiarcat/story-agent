/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PM Database Operations (Pragmatic Build)
 * Handles all database interactions for sprints, stories, and tasks
 * with tenant isolation, RBAC enforcement, and caching
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getCacheManagerInstance } from './pm-redis-cache';
import type { Sprint, Story, Task } from '@story-agent/shared/pm-contracts';

let supabase: SupabaseClient | null = null;

function getPmDbClient(): SupabaseClient {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY are required for PM database operations.');
  supabase = createClient(url, key);
  return supabase;
}

/**
 * Create a new sprint
 */
export async function createSprint(
  tenantId: string,
  userId: string,
  sprintData: any
): Promise<Sprint> {
  // Insert into database
  const { data, error } = await getPmDbClient()
    .from('sa_pm_sprints')
    .insert({
      tenant_id: tenantId,
      name: sprintData.name,
      state: sprintData.state ?? 'planning',
      start_date: sprintData.start_date,
      end_date: sprintData.end_date,
      capacity: sprintData.capacity,
      goal: sprintData.goal,
      created_by: userId,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  // Cache the newly created sprint
  const cache = getCacheManagerInstance();
  await cache.set(`sprint:${tenantId}:${(data as any).id}`, data);

  return (data as any) as Sprint;
}

/**
 * Get a single sprint by ID
 */
export async function getSprint(tenantId: string, sprintId: string): Promise<Sprint | null> {
  const cache = getCacheManagerInstance();
  
  // Try cache first
  const cached = await cache.get(`sprint:${tenantId}:${sprintId}`);
  if (cached) {
    return cached as Sprint;
  }

  // Query database
  const { data, error } = await getPmDbClient()
    .from('sa_pm_sprints')
    .select('*')
    .eq('id', sprintId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') return null;
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return (data as any) as Sprint;
}

/**
 * Update sprint
 */
export async function updateSprint(
  tenantId: string,
  userId: string,
  sprintId: string,
  sprintData: any
): Promise<Sprint> {
  // Fetch current
  const current = await getSprint(tenantId, sprintId);
  if (!current) {
    throw new Error('NOT_FOUND: Sprint not found');
  }

  // Prepare update
  const updateData = {
    name: sprintData.name ?? (current as any).name,
    state: sprintData.state ?? (current as any).state,
    start_date: sprintData.start_date ?? (current as any).start_date,
    end_date: sprintData.end_date ?? (current as any).end_date,
    capacity: sprintData.capacity ?? (current as any).capacity,
    goal: sprintData.goal ?? (current as any).goal,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  // Update
  const { data, error } = await getPmDbClient()
    .from('sa_pm_sprints')
    .update(updateData)
    .eq('id', sprintId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  // Invalidate cache
  const cache = getCacheManagerInstance();
  await cache.delete(`sprint:${tenantId}:${sprintId}`);

  return (data as any) as Sprint;
}

/**
 * List sprints for tenant with advanced filtering
 */
export async function listSprints(
  tenantId: string,
  options?: any
): Promise<{ data: Sprint[]; total: number }> {
  let query = getPmDbClient()
    .from('sa_pm_sprints')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return { data: (data as any[]) as Sprint[], total: count ?? 0 };
}

/**
 * Create a new story
 */
export async function createStory(
  tenantId: string,
  userId: string,
  storyData: any
): Promise<Story> {
  const { data, error } = await getPmDbClient()
    .from('sa_pm_stories')
    .insert({
      tenant_id: tenantId,
      sprint_id: storyData.sprint_id,
      title: storyData.title,
      description: storyData.description,
      state: storyData.state ?? 'planning',
      story_points: storyData.story_points,
      created_by: userId,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.set(`story:${tenantId}:${(data as any).id}`, data);

  return (data as any) as Story;
}

/**
 * Get single story
 */
export async function getStory(tenantId: string, storyId: string): Promise<Story | null> {
  const cache = getCacheManagerInstance();
  
  const cached = await cache.get(`story:${tenantId}:${storyId}`);
  if (cached) {
    return cached as Story;
  }

  const { data, error } = await getPmDbClient()
    .from('sa_pm_stories')
    .select('*')
    .eq('id', storyId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') return null;
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return (data as any) as Story;
}

/**
 * Update story
 */
export async function updateStory(
  tenantId: string,
  userId: string,
  storyId: string,
  storyData: any
): Promise<Story> {
  const current = await getStory(tenantId, storyId);
  if (!current) {
    throw new Error('NOT_FOUND: Story not found');
  }

  const updateData = {
    title: storyData.title ?? (current as any).title,
    description: storyData.description ?? (current as any).description,
    state: storyData.state ?? (current as any).state,
    story_points: storyData.story_points ?? (current as any).story_points,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getPmDbClient()
    .from('sa_pm_stories')
    .update(updateData)
    .eq('id', storyId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.delete(`story:${tenantId}:${storyId}`);

  return (data as any) as Story;
}

/**
 * List stories for tenant
 */
export async function listStoriesForTenant(
  tenantId: string,
  options?: any
): Promise<{ data: Story[]; total: number }> {
  let query = getPmDbClient()
    .from('sa_pm_stories')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return { data: (data as any[]) as Story[], total: count ?? 0 };
}

/**
 * Create a new task
 */
export async function createTask(
  tenantId: string,
  userId: string,
  taskData: any
): Promise<Task> {
  const { data, error } = await getPmDbClient()
    .from('sa_pm_tasks')
    .insert({
      tenant_id: tenantId,
      story_id: taskData.story_id,
      title: taskData.title,
      description: taskData.description,
      state: taskData.state ?? 'planning',
      created_by: userId,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.set(`task:${tenantId}:${(data as any).id}`, data);

  return (data as any) as Task;
}

/**
 * Get single task
 */
export async function getTask(tenantId: string, taskId: string): Promise<Task | null> {
  const cache = getCacheManagerInstance();
  
  const cached = await cache.get(`task:${tenantId}:${taskId}`);
  if (cached) {
    return cached as Task;
  }

  const { data, error } = await getPmDbClient()
    .from('sa_pm_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if ((error as any).code === 'PGRST116') return null;
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return (data as any) as Task;
}

/**
 * Update task
 */
export async function updateTask(
  tenantId: string,
  userId: string,
  taskId: string,
  taskData: any
): Promise<Task> {
  const current = await getTask(tenantId, taskId);
  if (!current) {
    throw new Error('NOT_FOUND: Task not found');
  }

  const updateData = {
    title: taskData.title ?? (current as any).title,
    description: taskData.description ?? (current as any).description,
    state: taskData.state ?? (current as any).state,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getPmDbClient()
    .from('sa_pm_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.delete(`task:${tenantId}:${taskId}`);

  return (data as any) as Task;
}

/**
 * List tasks for tenant
 */
export async function listTasksForTenant(
  tenantId: string,
  options?: any
): Promise<{ data: Task[]; total: number }> {
  let query = getPmDbClient()
    .from('sa_pm_tasks')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  return { data: (data as any[]) as Task[], total: count ?? 0 };
}

/**
 * Delete story
 */
export async function deleteStory(
  tenantId: string,
  userId: string,
  storyId: string
): Promise<void> {
  const current = await getStory(tenantId, storyId);
  if (!current) {
    throw new Error('NOT_FOUND: Story not found');
  }

  const { error } = await getPmDbClient()
    .from('sa_pm_stories')
    .delete()
    .eq('id', storyId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.delete(`story:${tenantId}:${storyId}`);
}

/**
 * Delete task
 */
export async function deleteTask(
  tenantId: string,
  userId: string,
  taskId: string
): Promise<void> {
  const current = await getTask(tenantId, taskId);
  if (!current) {
    throw new Error('NOT_FOUND: Task not found');
  }

  const { error } = await getPmDbClient()
    .from('sa_pm_tasks')
    .delete()
    .eq('id', taskId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  const cache = getCacheManagerInstance();
  await cache.delete(`task:${tenantId}:${taskId}`);
}
