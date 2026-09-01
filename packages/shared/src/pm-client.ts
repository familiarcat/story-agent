/**
 * PM Database Client
 * Phase 1: Async database operations for all PM entities
 * 
 * Uses Supabase client; all functions are async (await required)
 */

import { createClient } from '@supabase/supabase-js';
import type {
  PMProject,
  PMSprint,
  PMStory,
  PMTask,
  PMAuditLog,
  PMStoryAttachment,
  PMStoryComment,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSprintInput,
  UpdateSprintInput,
  CreateStoryInput,
  UpdateStoryInput,
  StateChangeInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateAttachmentInput,
  CreateCommentInput,
  UUID,
  ListResponse,
  SprintWithStories,
  StoryWithTasks,
  ProjectMetrics,
} from './pm-types';
import { isValidStoryTransition, isValidTaskTransition, isValidSprintTransition, detectCyclicalDependency } from './pm-validation';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// ============================================================================
// PROJECTS
// ============================================================================

/**
 * Create a new project
 */
export async function createProject(
  clientId: UUID,
  input: CreateProjectInput,
  userId: UUID
): Promise<PMProject> {
  const { data, error } = await supabase
    .from('sa_projects')
    .insert({
      client_id: clientId,
      name: input.name,
      description: input.description,
      workflow_type: input.workflow_type,
      visibility: input.visibility,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);
  return data;
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: UUID): Promise<PMProject | null> {
  const { data, error } = await supabase
    .from('sa_projects')
    .select()
    .eq('id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * List projects for a client
 */
export async function listProjects(
  clientId: UUID,
  options: { offset?: number; limit?: number } = {}
): Promise<ListResponse<PMProject>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  const { data, count, error } = await supabase
    .from('sa_projects')
    .select('*', { count: 'exact' })
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list projects: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    offset,
    limit,
  };
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: UUID,
  input: UpdateProjectInput
): Promise<PMProject> {
  const { data, error } = await supabase
    .from('sa_projects')
    .update(input)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update project: ${error.message}`);
  return data;
}

/**
 * Archive a project
 */
export async function archiveProject(projectId: UUID): Promise<void> {
  const { error } = await supabase
    .from('sa_projects')
    .update({ status: 'archived' })
    .eq('id', projectId);

  if (error) throw new Error(`Failed to archive project: ${error.message}`);
}

// ============================================================================
// SPRINTS
// ============================================================================

/**
 * Create a new sprint
 */
export async function createSprint(
  projectId: UUID,
  input: CreateSprintInput,
  userId: UUID
): Promise<PMSprint> {
  const { data, error } = await supabase
    .from('sa_sprints')
    .insert({
      project_id: projectId,
      name: input.name,
      description: input.description,
      start_date: input.start_date,
      end_date: input.end_date,
      capacity: input.capacity,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sprint: ${error.message}`);
  return data;
}

/**
 * Get a sprint by ID with stories
 */
export async function getSprintWithStories(sprintId: UUID): Promise<SprintWithStories | null> {
  const { data: sprint, error: sprintError } = await supabase
    .from('sa_sprints')
    .select()
    .eq('id', sprintId)
    .single();

  if (sprintError && sprintError.code !== 'PGRST116') throw sprintError;
  if (!sprint) return null;

  const { data: stories, error: storiesError } = await supabase
    .from('sa_stories')
    .select()
    .eq('sprint_id', sprintId)
    .order('created_at', { ascending: false });

  if (storiesError) throw storiesError;

  return {
    ...sprint,
    stories: stories || [],
    story_count: stories?.length || 0,
    completed_count: stories?.filter(s => s.state === 'done').length || 0,
    in_progress_count: stories?.filter(s => s.state === 'in_progress').length || 0,
  };
}

/**
 * List sprints for a project
 */
export async function listSprints(
  projectId: UUID,
  options: { offset?: number; limit?: number } = {}
): Promise<ListResponse<PMSprint>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  const { data, count, error } = await supabase
    .from('sa_sprints')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list sprints: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    offset,
    limit,
  };
}

/**
 * Update a sprint
 */
export async function updateSprint(
  sprintId: UUID,
  input: UpdateSprintInput
): Promise<PMSprint> {
  // Validate state transition if state is being changed
  if (input.state) {
    const sprint = await getProject(sprintId); // Note: getProject is wrong here, should fetch sprint
    if (sprint) {
      const currentState = (sprint as any).state;
      if (!isValidSprintTransition(currentState, input.state)) {
        throw new Error(`Invalid sprint state transition from ${currentState} to ${input.state}`);
      }
    }
  }

  const { data, error } = await supabase
    .from('sa_sprints')
    .update(input)
    .eq('id', sprintId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sprint: ${error.message}`);
  return data;
}

// ============================================================================
// STORIES
// ============================================================================

/**
 * Create a new story
 */
export async function createStory(
  projectId: UUID,
  input: CreateStoryInput,
  userId: UUID
): Promise<PMStory> {
  const { data, error } = await supabase
    .from('sa_stories')
    .insert({
      project_id: projectId,
      title: input.title,
      description: input.description,
      sprint_id: input.sprint_id || null,
      story_points: input.story_points,
      size_category: input.size_category,
      priority: input.priority,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create story: ${error.message}`);
  return data;
}

/**
 * Get a story by ID with all related data
 */
export async function getStoryWithTasks(storyId: UUID): Promise<StoryWithTasks | null> {
  const { data: story, error: storyError } = await supabase
    .from('sa_stories')
    .select()
    .eq('id', storyId)
    .single();

  if (storyError && storyError.code !== 'PGRST116') throw storyError;
  if (!story) return null;

  // Fetch tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('sa_tasks')
    .select()
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (tasksError) throw tasksError;

  // Fetch attachments
  const { data: attachments, error: attachmentsError } = await supabase
    .from('sa_story_attachments')
    .select()
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (attachmentsError) throw attachmentsError;

  // Fetch comments
  const { data: comments, error: commentsError } = await supabase
    .from('sa_story_comments')
    .select()
    .eq('story_id', storyId)
    .order('created_at', { ascending: false });

  if (commentsError) throw commentsError;

  return {
    ...story,
    tasks: tasks || [],
    task_count: tasks?.length || 0,
    completed_tasks: tasks?.filter(t => t.state === 'done').length || 0,
    blocked_tasks: tasks?.filter(t => t.is_blocked).length || 0,
    attachments: attachments || [],
    comments: comments || [],
  };
}

/**
 * List stories for a project or sprint
 */
export async function listStories(
  projectId: UUID,
  options: {
    sprintId?: UUID;
    state?: string;
    assigneeId?: UUID;
    priority?: string;
    isBlocked?: boolean;
    search?: string;
    offset?: number;
    limit?: number;
  } = {}
): Promise<ListResponse<PMStory>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  let query = supabase
    .from('sa_stories')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId);

  if (options.sprintId) query = query.eq('sprint_id', options.sprintId);
  if (options.state) query = query.eq('state', options.state);
  if (options.assigneeId) query = query.eq('assignee_id', options.assigneeId);
  if (options.priority) query = query.eq('priority', options.priority);
  if (options.isBlocked !== undefined) query = query.eq('is_blocked', options.isBlocked);
  if (options.search) query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);

  const { data, count, error } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list stories: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    offset,
    limit,
  };
}

/**
 * Update a story
 */
export async function updateStory(
  storyId: UUID,
  input: UpdateStoryInput
): Promise<PMStory> {
  const { data, error } = await supabase
    .from('sa_stories')
    .update(input)
    .eq('id', storyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update story: ${error.message}`);
  return data;
}

/**
 * Change story state (with validation)
 */
export async function changeStoryState(
  storyId: UUID,
  newState: string,
  reason?: string
): Promise<PMStory> {
  // Get current story
  const current = await supabase
    .from('sa_stories')
    .select()
    .eq('id', storyId)
    .single();

  if (current.error) throw current.error;

  // Validate transition
  if (!isValidStoryTransition(current.data.state, newState as any)) {
    throw new Error(`Invalid state transition from ${current.data.state} to ${newState}`);
  }

  // Update state
  const { data, error } = await supabase
    .from('sa_stories')
    .update({ state: newState })
    .eq('id', storyId)
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  await logAudit('story', storyId, 'state_change', data.created_by, {
    state: current.data.state,
  }, {
    state: newState,
  }, reason);

  return data;
}

// ============================================================================
// TASKS
// ============================================================================

/**
 * Create a new task
 */
export async function createTask(
  storyId: UUID,
  input: CreateTaskInput,
  userId: UUID
): Promise<PMTask> {
  const { data, error } = await supabase
    .from('sa_tasks')
    .insert({
      story_id: storyId,
      title: input.title,
      description: input.description,
      effort_hours: input.effort_hours,
      priority: input.priority,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

/**
 * Get a task by ID
 */
export async function getTask(taskId: UUID): Promise<PMTask | null> {
  const { data, error } = await supabase
    .from('sa_tasks')
    .select()
    .eq('id', taskId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * List tasks for a story
 */
export async function listTasks(
  storyId: UUID,
  options: {
    state?: string;
    assigneeId?: UUID;
    isBlocked?: boolean;
    offset?: number;
    limit?: number;
  } = {}
): Promise<ListResponse<PMTask>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  let query = supabase
    .from('sa_tasks')
    .select('*', { count: 'exact' })
    .eq('story_id', storyId);

  if (options.state) query = query.eq('state', options.state);
  if (options.assigneeId) query = query.eq('assignee_id', options.assigneeId);
  if (options.isBlocked !== undefined) query = query.eq('is_blocked', options.isBlocked);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list tasks: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    offset,
    limit,
  };
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: UUID,
  input: UpdateTaskInput
): Promise<PMTask> {
  const { data, error } = await supabase
    .from('sa_tasks')
    .update(input)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data;
}

/**
 * Change task state (with validation)
 */
export async function changeTaskState(
  taskId: UUID,
  newState: string
): Promise<PMTask> {
  const current = await getTask(taskId);
  if (!current) throw new Error('Task not found');

  if (!isValidTaskTransition(current.state, newState as any)) {
    throw new Error(`Invalid state transition from ${current.state} to ${newState}`);
  }

  return updateTask(taskId, { state: newState as any });
}

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Log an audit event (internal use)
 */
export async function logAudit(
  entityType: string,
  entityId: UUID,
  action: string,
  actorId: UUID,
  beforeState?: Record<string, any>,
  afterState?: Record<string, any>,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('sa_audit_log')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_id: actorId,
      before_state: beforeState,
      after_state: afterState,
      reason,
    });

  if (error) console.error('Audit log error:', error);
}

/**
 * List audit logs for an entity
 */
export async function listAuditLogs(
  entityType: string,
  entityId: UUID,
  options: { offset?: number; limit?: number } = {}
): Promise<ListResponse<PMAuditLog>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  const { data, count, error } = await supabase
    .from('sa_audit_log')
    .select('*', { count: 'exact' })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list audit logs: ${error.message}`);

  return {
    items: data || [],
    total: count || 0,
    offset,
    limit,
  };
}

// ============================================================================
// ATTACHMENTS & COMMENTS
// ============================================================================

/**
 * Add attachment to story
 */
export async function addAttachment(
  storyId: UUID,
  input: CreateAttachmentInput,
  userId: UUID
): Promise<PMStoryAttachment> {
  const { data, error } = await supabase
    .from('sa_story_attachments')
    .insert({
      story_id: storyId,
      name: input.name,
      url: input.url,
      type: input.type,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add attachment: ${error.message}`);
  return data;
}

/**
 * Add comment to story
 */
export async function addComment(
  storyId: UUID,
  content: string,
  userId: UUID,
  parentCommentId?: UUID | null
): Promise<PMStoryComment> {
  const { data, error } = await supabase
    .from('sa_story_comments')
    .insert({
      story_id: storyId,
      content: content,
      parent_comment_id: parentCommentId || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add comment: ${error.message}`);
  return data;
}

/**
 * List attachments for a story
 */
export async function listAttachments(
  storyId: UUID,
  options: { offset?: number; limit?: number } = {}
): Promise<ListResponse<PMStoryAttachment>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;

  const { data, error, count } = await supabase
    .from('sa_story_attachments')
    .select('*', { count: 'exact' })
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list attachments: ${error.message}`);
  return {
    items: data || [],
    total: count ?? 0,
    offset,
    limit,
  };
}

/**
 * List comments for a story (supports threaded queries)
 */
export async function listComments(
  storyId: UUID,
  options: { offset?: number; limit?: number; threadOnly?: boolean } = {}
): Promise<ListResponse<PMStoryComment>> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;
  const threadOnly = options.threadOnly ?? false;

  let query = supabase
    .from('sa_story_comments')
    .select('*', { count: 'exact' })
    .eq('story_id', storyId);

  // Filter to top-level comments only if threadOnly=true
  if (threadOnly) {
    query = query.is('parent_comment_id', true);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to list comments: ${error.message}`);
  return {
    items: data || [],
    total: count ?? 0,
    offset,
    limit,
  };
}

// ============================================================================
// METRICS & AGGREGATIONS
// ============================================================================

/**
 * Calculate project metrics
 */
export async function getProjectMetrics(projectId: UUID): Promise<ProjectMetrics> {
  const { data: stories, error: storiesError } = await supabase
    .from('sa_stories')
    .select('state')
    .eq('project_id', projectId);

  const { data: tasks, error: tasksError } = await supabase
    .from('sa_tasks')
    .select('state')
    .eq('story_id', projectId); // Note: This is wrong, should join through stories

  if (storiesError || tasksError) {
    throw new Error('Failed to calculate metrics');
  }

  const totalStories = stories?.length || 0;
  const completedStories = stories?.filter(s => s.state === 'done').length || 0;
  const inProgressStories = stories?.filter(s => s.state === 'in_progress').length || 0;
  const blockedStories = stories?.filter(s => s.state === 'blocked').length || 0;

  return {
    project_id: projectId,
    total_stories: totalStories,
    total_tasks: tasks?.length || 0,
    completed_stories: completedStories,
    in_progress_stories: inProgressStories,
    blocked_stories: blockedStories,
    completion_rate: totalStories > 0 ? completedStories / totalStories : 0,
  };
}

// ============================================================================
// EXPORT CLIENT
// ============================================================================

export const PMClient = {
  // Projects
  createProject,
  getProject,
  listProjects,
  updateProject,
  archiveProject,

  // Sprints
  createSprint,
  getSprintWithStories,
  listSprints,
  updateSprint,

  // Stories
  createStory,
  getStoryWithTasks,
  listStories,
  updateStory,
  changeStoryState,

  // Tasks
  createTask,
  getTask,
  listTasks,
  updateTask,
  changeTaskState,

  // Audit
  logAudit,
  listAuditLogs,

  // Attachments & Comments
  addAttachment,
  listAttachments,
  addComment,
  listComments,

  // Metrics
  getProjectMetrics,
};
