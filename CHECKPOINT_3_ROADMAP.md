# CHECKPOINT 3: UI Integration Layer

**Objective**: Build the React component layer for the Phase 1 PM engine  
**Timeline**: 3-4 days  
**Crew Leads**: Geordi (scaffolding), Troi (UX alignment)  
**Status**: 🔵 READY TO START

---

## Overview

CHECKPOINT 3 transforms the 14 PM API endpoints into a functional user-facing dashboard. The focus is component architecture, state management (React hooks), and responsive UI patterns.

**Entry Criteria** (from Checkpoint 2):
- ✅ 14 PM API endpoints (functional, tested)
- ✅ Full Supabase schema deployed (8 tables, RLS)
- ✅ Type-safe PMClient (25+ async functions)
- ✅ Monorepo clean build

**Exit Criteria** (for Checkpoint 3):
- ✅ 5+ core React components (ProjectList, SprintBoard, StoryDetail, TaskKanban, CommentThread)
- ✅ Page-level integrations (/projects, /projects/[id], /stories, /stories/[id])
- ✅ Pagination UI (data table with offset/limit controls)
- ✅ Responsive layout (desktop + tablet support)
- ✅ Error boundary + loading states
- ✅ Manual integration testing (UI ↔ API ↔ DB)

---

## Deliverables

### 1. Component Library

#### ProjectList Component
**File**: `packages/ui/app/components/pm/ProjectList.tsx`  
**Responsibility**: Display paginated list of projects with actions

```typescript
export interface ProjectListProps {
  clientId: UUID;
  onSelectProject?: (project: PMProject) => void;
}

export function ProjectList({ clientId, onSelectProject }: ProjectListProps) {
  // Hooks:
  //   - useProjectList(clientId): fetch/pagination/filter state
  //   - useMutation(createProject): add new project
  //   - useCallback: select/delete handlers
  
  // Render:
  //   - DataTable: columns (name, created, status, actions)
  //   - Pagination controls (prev/next, page indicator)
  //   - "Create New" button
  //   - Error banner (if API fails)
  //   - Loading skeleton (while fetching)
}
```

**API Integration**:
- GET `/api/pm/projects?offset=X&limit=Y` (list)
- POST `/api/pm/projects` (create)
- PUT `/api/pm/projects/[id]` (update)
- DELETE `/api/pm/projects/[id]` (archive)

**Features**:
- Sort by name/created date
- Filter by status (active/archived)
- Inline edit project name
- Archive with confirmation

---

#### SprintBoard Component
**File**: `packages/ui/app/components/pm/SprintBoard.tsx`  
**Responsibility**: Display sprint board with sprint selector and story/task kanban

```typescript
export interface SprintBoardProps {
  projectId: UUID;
  activeSprint?: UUID;
  onSelectSprint?: (sprintId: UUID) => void;
}

export function SprintBoard({ projectId, activeSprint, onSelectSprint }: SprintBoardProps) {
  // Hooks:
  //   - useSprints(projectId): fetch all sprints for project
  //   - useSprintDetail(activeSprint): fetch sprint with stories
  //   - useMutation(updateStoryState): drag-drop state changes
  
  // Render:
  //   - Sprint selector (dropdown or tabs)
  //   - Story kanban: columns (draft → ready → in_progress → review → complete)
  //   - Story cards: title, priority, assignee, blocked badge
  //   - Drag-drop support (update story.state via PUT /api/pm/stories/[id])
  //   - "Add Story" button → modal
  //   - Sprint stats (total points, completed, blocked count)
}
```

**API Integration**:
- GET `/api/pm/sprints?project_id=X` (list sprints)
- GET `/api/pm/sprints/[id]` (sprint detail with stories)
- PUT `/api/pm/stories/[id]` (change state via DnD)

**Features**:
- Kanban columns for story states
- Drag-drop to change state (validates transition)
- Story card inline edit (title, points, priority)
- Bulk operations (select + state change)

---

#### StoryDetail Component
**File**: `packages/ui/app/components/pm/StoryDetail.tsx`  
**Responsibility**: Full story view with tasks, attachments, comments

```typescript
export interface StoryDetailProps {
  storyId: UUID;
  onClose?: () => void;
}

export function StoryDetail({ storyId, onClose }: StoryDetailProps) {
  // Hooks:
  //   - useStoryWithTasks(storyId): fetch story + tasks + attachments + comments
  //   - useMutation(updateStory): save story edits
  //   - useMutation(addComment): post new comment
  //   - useTaskList(storyId): tasks sub-section
  
  // Render:
  //   - Header: story title, priority, state badge, blocked flag
  //   - Editable fields: description, size_category, story_points
  //   - Tasks section: TaskList sub-component
  //   - Attachments section: FileUpload + AttachmentList
  //   - Comments section: CommentThread sub-component
  //   - Audit trail link (GET /api/pm/audit-log?entity_id=X&entity_type=story)
  //   - State change button (transition options)
}
```

**API Integration**:
- GET `/api/pm/stories/[id]` (story + tasks + comments)
- PUT `/api/pm/stories/[id]` (update or state change)
- GET `/api/pm/attachments?story_id=X` (attachments)
- POST `/api/pm/attachments` (add attachment)
- GET `/api/pm/comments?story_id=X` (comments)
- POST `/api/pm/comments` (add comment)
- GET `/api/pm/audit-log?entity_id=X&entity_type=story` (history)

**Features**:
- Editable description (rich text or markdown)
- Task sub-list with add/edit/delete
- Nested comment threads (parent_comment_id)
- Attachment upload preview
- Audit trail viewer (timestamp, user, change diff)

---

#### TaskKanban Component
**File**: `packages/ui/app/components/pm/TaskKanban.tsx`  
**Responsibility**: Task-level kanban board (for a story)

```typescript
export interface TaskKanbanProps {
  storyId: UUID;
}

export function TaskKanban({ storyId }: TaskKanbanProps) {
  // Hooks:
  //   - useTaskList(storyId): fetch tasks for story
  //   - useMutation(updateTaskState): drag-drop state changes
  
  // Render:
  //   - Kanban columns: todo → in_progress → done
  //   - Task cards: title, effort, priority, assignee
  //   - Drag-drop to change state
  //   - "Add Task" button
}
```

**API Integration**:
- GET `/api/pm/tasks?story_id=X` (list tasks)
- PUT `/api/pm/tasks/[id]` (change state)
- POST `/api/pm/tasks` (create)

**Features**:
- Effort points per task
- Progress bars (story completion: X/Y tasks done)
- Blocked indicator

---

#### CommentThread Component
**File**: `packages/ui/app/components/pm/CommentThread.tsx`  
**Responsibility**: Render hierarchical comment threads

```typescript
export interface CommentThreadProps {
  storyId: UUID;
  comments: PMStoryComment[];
  onAddComment: (content: string, parentId?: UUID) => Promise<void>;
}

export function CommentThread({ storyId, comments, onAddComment }: CommentThreadProps) {
  // Hooks:
  //   - useState: expanded threads, reply-to selection
  
  // Render:
  //   - Comments sorted by created_at
  //   - Nested replies under parent_comment_id
  //   - "Reply" button on each comment
  //   - Comment form (textarea + submit)
  //   - Author + timestamp
}
```

**Features**:
- Hierarchical threading (parent_comment_id)
- Collapse/expand threads
- Inline reply (doesn't require modal)
- Edit/delete own comments (future)

---

### 2. Pages

#### `/projects` (Project Dashboard)
**File**: `packages/ui/app/projects/page.tsx`

```typescript
export default function ProjectsPage() {
  // Render: ProjectList component + page layout
  // - Header: "Projects" title, "New Project" button
  // - ProjectList with create/edit/delete flows
  // - Empty state (no projects yet)
}
```

**Features**:
- List all projects
- Create new project (form modal)
- Edit project (inline or modal)
- Archive project (with confirmation)

---

#### `/projects/[id]` (Project Detail)
**File**: `packages/ui/app/projects/[id]/page.tsx`

```typescript
export default function ProjectDetailPage({ params }: { params: Promise<{id: string}> }) {
  // Render: SprintBoard + ProjectMetrics
  // - Tabs: Sprints, Settings, Members
  // - Active sprint kanban
  // - Project metrics (completion %, velocity chart)
}
```

**Features**:
- Sprint selector
- Kanban board view
- Project settings
- Metrics dashboard

---

#### `/stories` (Story Feed)
**File**: `packages/ui/app/stories/page.tsx`

```typescript
export default function StoriesPage() {
  // Render: Filterable story list
  // - Filter by sprint, state, priority, assignee
  // - Pagination
  // - Bulk actions
}
```

---

#### `/stories/[id]` (Story Detail Modal/Page)
**File**: `packages/ui/app/stories/[id]/page.tsx`

```typescript
export default function StoryDetailPage({ params }: { params: Promise<{id: string}> }) {
  // Render: StoryDetail component
  // - Full story view with tasks/comments/attachments
  // - Modal overlay or full page
}
```

---

### 3. Hooks (React Hooks for API Integration)

#### useProjectList Hook
**File**: `packages/ui/app/hooks/pm/useProjectList.ts`

```typescript
export function useProjectList(clientId: UUID, {offset = 0, limit = 20} = {}) {
  const [projects, setProjects] = useState<PMProject[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetch = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pm/projects?offset=${off}&limit=${limit}`);
      const data = await res.json();
      setProjects(data.data.items);
      setTotal(data.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [limit]);
  
  useEffect(() => { fetch(offset); }, [offset, fetch]);
  
  return { projects, total, offset, limit, loading, error, refetch: fetch };
}
```

**Similar hooks**:
- `useSprintList(projectId)`
- `useStoryList(sprintId?, filters?)`
- `useStoryWithTasks(storyId)`
- `useTaskList(storyId)`
- `useComments(storyId)`
- `useAttachments(storyId)`
- `useProjectMetrics(projectId)`
- `useAuditLog(entityId, entityType)`

---

### 4. Styling & Layout

**Design System**:
- Use Next.js built-in CSS modules or Tailwind (if added to UI package)
- Responsive: mobile-first (320px→desktop)
- Color scheme: light mode (add dark mode in Phase 2)
- Typography: Next.js system fonts (Helvetica → Inter in future)

**Key Layouts**:
- Sidebar navigation (projects, sprints, stories)
- Main content area (kanban, table, detail view)
- Modal overlays (create/edit forms)
- Toast notifications (save success, error)

---

## Implementation Approach

### Phase 3A: Scaffold (1 day)
1. Create component directory structure
2. Define prop interfaces (PMComponent.tsx)
3. Create empty components with JSDoc
4. Create hook stubs (useProjectList, etc)
5. Create page layouts

**Verification**:
- All files created, zero build errors
- All imports resolvable
- All components render without data

### Phase 3B: Integrate APIs (1.5 days)
1. Implement hooks (fetch logic, error handling)
2. Integrate hooks into components
3. Wire up pagination, filtering, mutations
4. Add loading/error states

**Verification**:
- Manual testing: each component fetches from API
- Browser dev tools: network tab shows correct requests
- Database: verify data persists across requests

### Phase 3C: Polish (1 day)
1. Fix responsive layout issues
2. Add validation feedback
3. Improve error messages
4. Add loading skeletons
5. Test edge cases (empty state, network errors)

**Verification**:
- Responsive testing (Chrome DevTools device emulation)
- Error scenarios (simulate API failures)
- Accessibility (keyboard navigation, screen readers)

---

## Success Criteria

✅ **Component Architecture**:
- [ ] 5+ core components created (ProjectList, SprintBoard, StoryDetail, TaskKanban, CommentThread)
- [ ] All components accept typed props (TSX strict mode)
- [ ] All components have JSDoc comments
- [ ] Props match API response shapes (no manual mapping)

✅ **Hook Layer**:
- [ ] 8+ custom hooks (useProjectList, useSprintList, useStoryWithTasks, etc)
- [ ] All hooks handle loading/error states
- [ ] All hooks abstract API calls (no direct fetch in components)

✅ **Page Integration**:
- [ ] 4+ pages created (/projects, /projects/[id], /stories, /stories/[id])
- [ ] All pages render components
- [ ] All pages handle dynamic routing (Next.js 15 Promise pattern)

✅ **Manual Testing**:
- [ ] Create project via UI → verify in Supabase
- [ ] Create sprint → verify in API
- [ ] Create story → verify state machine validation
- [ ] Comment on story → verify thread nesting
- [ ] Pagination works (next/prev buttons, item counts)
- [ ] Filters work (sprint, state, priority, assignee)
- [ ] Error handling (simulate API down, show toast)

✅ **Build Status**:
- [ ] `pnpm build` passes (0 TS errors)
- [ ] No console warnings in dev mode
- [ ] All imports resolve

---

## Crew Assignments

| Role | Task | Owner |
|---|---|---|
| **Geordi** | Component scaffolding, hook creation, responsive layout | `geordi-scaffold-lcars-component` |
| **Troi** | UX alignment, user feedback flows, accessibility | `troi-assess-stakeholder-impact` |
| **Data** | Type safety, validation logic, error handling | `data-review-architecture` |
| **Riker** | Execution plan, integration sequencing | `riker-plan-execution` |
| **Picard** | Quality review, go/no-go decision | (final synthesis) |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| API mismatch (component expects different shape) | Use PMTypes from shared, auto-generate types from Supabase |
| Performance (too many re-renders) | Use React.memo, useCallback, useMemo strategically |
| Missing error boundaries | Add ErrorBoundary wrapper for each major section |
| Responsive issues | Test on multiple breakpoints, use CSS Grid/Flexbox |
| Stale cache | Invalidate cache after mutations (useSWR with mutate) |

---

## Acceptance Checklist

- [ ] All 5 components built and tested
- [ ] All 4 pages route correctly
- [ ] Create/read/update/delete flows work end-to-end
- [ ] Pagination tested (offset/limit, page indicators)
- [ ] Filtering tested (sprint, state, priority)
- [ ] Error states handled (API down, validation errors)
- [ ] Loading states shown (skeleton, spinner)
- [ ] Responsive layout verified (mobile, tablet, desktop)
- [ ] Build clean (0 errors, 0 warnings)
- [ ] All changes committed to git
- [ ] Demo video or screenshots recorded

---

## Git Commit Plan

```
✅ CHECKPOINT 3A: Component scaffolding (ProjectList, SprintBoard, StoryDetail, TaskKanban, CommentThread)
✅ CHECKPOINT 3B: Hook integration (useProjectList, useStoryWithTasks, useComments, etc)
✅ CHECKPOINT 3C: Page layout integration (/projects, /projects/[id], /stories, /stories/[id])
✅ CHECKPOINT 3 MILESTONE: UI integration layer complete (14 endpoints → React components)
```

---

## Next: CHECKPOINT 4

**Security Audit & RLS Validation**
- Verify row-level security policies
- Test multi-client isolation
- Audit access control enforcement
- Compliance review

---

**Status**: 🔵 Ready to start  
**Crew Standby**: Geordi, Troi, Data, Riker  
**Entry Date**: (when Checkpoint 2 approved)  
**Target Exit**: 3-4 days  
**Go/No-Go**: ✅ **GO** (awaiting approval)
