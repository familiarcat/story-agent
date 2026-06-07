# Story Agent - Copilot Session Prompt

Use this prompt in a new Copilot chat session to provide complete context about the Story Agent project.

---

## Context: Story Agent Project Overview

I'm working on **Story Agent**, an agentic system for autonomous story delivery from Aha (product management) through to GitHub PR merge. Please understand the following about our architecture, implementation, and goals.

### Project Status: ACTIVE DEVELOPMENT ✅

The Story Agent has achieved **production-ready status** with ongoing active development:
- ✅ 11-member autonomous crew system with Star Trek personas
- ✅ Enterprise-grade prompt engineering framework
- ✅ Complete archival and auditing system for all LLM calls
- ✅ Cost-optimized model selection per crew member
- ✅ Full TypeScript build passing all checks
- ✅ Phased knowledge corpus (`docs/`) with vector indexing and semantic retrieval
- ✅ Doc retrieval MCP tools (`get_doc_guidance`, `get_role_guidance`, `search_docs`, `list_doc_phases`)
- ✅ WebSocket server for real-time crew state broadcasting
- ✅ Real-time crew state management (`crew-autonomy-manager.ts`, `crew-state-broadcaster.ts`)
- ✅ Agile provider abstraction (Aha, Jira, Stub via `providers/` directory)
- ✅ Sprint planning UI (`/sprint/` route)
- ✅ **3-layer testing infrastructure** (108 tests: unit + integration with mocks + CI/CD ready)
- ✅ **Aha project structure inspection** (roadmap & hierarchy endpoints)
- ✅ **VSCode extension tree view** (project structure in IDE sidebar)

**Git Repository:** `/Users/brady.georgen.ext/Documents/workspace/story-agent`

---

## System Architecture

### High-Level Flow

```
Aha Story → GitHub Branch Creation → LLM-Driven Implementation 
  → Code Generation → PR Creation → Comment Tracking → Revision Loop 
  → PR Merge → Delivery Completion
```

### Project Structure

```
story-agent/
├── packages/
│   ├── mcp-server/              # MCP server with tools & crew agents
│   │   ├── src/lib/
│   │   │   ├── crew.ts                    # 11-member crew roster
│   │   │   ├── crew-agents.ts             # All 11 agent implementations
│   │   │   ├── crew-coordinator.ts        # Orchestration & parallel execution
│   │   │   ├── crew-autonomy-manager.ts   # ⭐ Autonomous mission lifecycle
│   │   │   ├── crew-state-broadcaster.ts  # ⭐ Real-time state streaming
│   │   │   ├── crew-communication.ts      # Inter-crew messaging
│   │   │   ├── prompt-templates.ts        # Centralized 11 system prompts
│   │   │   ├── prompt-engine.ts           # Unified LLM call orchestrator
│   │   │   ├── prompt-archiver.ts         # Archive + cost tracking
│   │   │   ├── websocket-server.ts        # ⭐ WS server for real-time UI
│   │   │   ├── aha.ts                     # Aha API client (story CRUD + roadmap + hierarchy)
│   │   │   └── github.ts                  # GitHub API wrapper
│   │   ├── src/providers/               # ⭐ Agile provider abstraction
│   │   │   ├── AhaProvider.ts             # Aha! REST API client
│   │   │   ├── JiraProvider.ts            # Jira REST API client
│   │   │   ├── StubProviders.ts           # Test stubs
│   │   │   └── index.ts                   # Provider factory
│   │   ├── src/tools/
│   │   │   ├── crew-member-tools.ts       # MCP tools for 11 agents
│   │   │   ├── crew-memory-tools.ts       # 5 prompt analytics MCP tools
│   │   │   ├── doc-tools.ts               # ⭐ Doc retrieval implementations
│   │   │   ├── doc-tools-register.ts      # ⭐ Doc tools MCP registration
│   │   │   ├── story-tools.ts             # Story CRUD tools
│   │   │   ├── repo-tools.ts              # Repo access tools
│   │   │   └── delivery-tools.ts          # Delivery state tools
│   │   ├── test/
│   │   │   ├── setup.ts                   # ⭐ Mock utilities (Supabase, approved LLM, fetch)
│   │   │   └── *.integration.test.ts      # ⭐ Integration tests (9 suites, 58 tests)
│   │   ├── vitest.config.ts               # ⭐ Vitest config with RUN_MODE filtering
│   │   ├── PROMPT_ENGINEERING.md          # Full system documentation
│   │   └── src/index.ts                   # MCP server entry point
│   ├── ui/                      # Next.js 15 dashboard
│   │   ├── src/app/
│   │   │   ├── dashboard/       # Story tracker view
│   │   │   ├── story/[storyId]/ # Individual story detail
│   │   │   ├── observation-lounge/ # Crew debate viewer
│   │   │   ├── sprint/          # ⭐ Sprint planning view
│   │   │   └── api/
│   │   │       ├── aha/
│   │   │       │   ├── projects/route.ts       # List Aha projects
│   │   │       │   ├── stories/route.ts        # List stories for project
│   │   │       │   ├── story/route.ts          # Get single story
│   │   │       │   ├── sprints/route.ts        # List sprints
│   │   │       │   ├── sprint-stories/route.ts # Stories in sprint
│   │   │       │   ├── roadmap/route.ts        # ⭐ Complete roadmap (releases + stories)
│   │   │       │   ├── hierarchy/route.ts      # ⭐ Full hierarchy with stats
│   │   │       │   └── observation-lounge/route.ts # Fetch story for execution brief
│   │   │       ├── crew/        # Crew decisions + insights routes
│   │   │       ├── events/      # SSE real-time event stream
│   │   │       ├── stories/     # Story import & listing
│   │   │       └── projects/    # Project listing
│   │   ├── test/
│   │   │   └── setup.ts                   # ⭐ Mock utilities for UI tests
│   │   ├── src/lib/
│   │   │   ├── crew.ts          # 11-member crew definitions
│   │   │   ├── aha.ts           # Aha API client (mirrors MCP server)
│   │   │   ├── agile.ts         # Story/sprint utilities
│   │   │   └── db.ts            # Supabase client (UI side)
│   │   └── vitest.config.ts     # ⭐ Vitest config for UI tests
│   ├── shared/                  # Shared TypeScript types
│   │   ├── test/
│   │   │   ├── setup.ts                   # ⭐ Mock utilities (Supabase, approved LLM, fetch)
│   │   │   └── db.integration.test.ts     # ⭐ Integration tests (8 tests)
│   │   └── src/
│   │       ├── index.ts         # CrewRole, CrewAuthority, interfaces
│   │       ├── db.ts            # Supabase client + observation memory helpers
│   │       └── db-docs.ts       # ⭐ Doc vector retrieval helpers
│   └── vscode-extension/        # VS Code extension with chat support
│       ├── src/
│       │   ├── aha.ts           # Aha API client (project, sprint, story types)
│       │   ├── extension.ts      # Extension activation + command registration
│       │   ├── participant.ts    # Chat participant
│       │   ├── sidebar.ts        # Sidebar provider
│       │   ├── providers/
│       │   │   └── AhaProjectStructureProvider.ts  # ⭐ Tree view for project hierarchy
│       │   └── panels/
│       │       └── StoryExecutionPanel.ts          # WebView for crew execution
│       ├── tsconfig.json         # TypeScript config (moduleResolution: node)
│       └── package.json          # Extension manifest + commands + tree view config
├── docs/                        # ⭐ Phased knowledge corpus
│   ├── knowledge/               # Long-form documentation (16 docs)
│   │   └── AUTONOMOUS_CREW_ARCHITECTURE.md  # Crew system reference
│   ├── phases/
│   │   └── PHASED_EXECUTION.md  # Guided reading path (Phase 0-4)
│   └── vector/
│       └── doc_corpus_manifest.jsonl  # Docs to index into vector store
├── supabase/
│   ├── migration.sql                  # Core tables (stories, memories)
│   ├── 20260605_crew_memory_vectors.sql   # sa_observation_memories
│   ├── 20260605_crew_state_table.sql      # ⭐ sa_crew_execution_state
│   └── 20260605_docs_knowledge_vectors.sql # ⭐ sa_docs_knowledge_vectors
├── contracts/agents/            # Agent role contracts (JSON schema)
├── .vscode/mcp.json             # VS Code Copilot MCP server registration
├── TESTING.md                   # ⭐ Complete testing guide (unit + integration + CI/CD)
├── README.md                    # Project overview
├── pnpm-workspace.yaml          # Monorepo configuration
└── pnpm-lock.yaml               # Lock file
```

**Key Symbol:** ⭐ = Added/notable since initial implementation

---

## The 11-Member Autonomous Crew

Each crew member has:
- **Specialized expertise** and decision authority
- **Assigned LLM model** (cost-optimized)
- **Engineered system prompt** stored in templates registry
- **Individual MCP tools** for independent invocation
- **Parallel execution** capability with authority hierarchy

### Crew Roster

| Role | Name | Specialty | Model | Authority | Weight |
|------|------|-----------|-------|-----------|--------|
| **Executive** | Picard | Strategic decomposition | claude-3-opus | Executive decision | 1.5 |
| **Architecture** | Data | Technical validation | claude-3.5-sonnet | Architectural | 1.3 |
| **Development** | Riker | Implementation tactics | claude-3.5-sonnet | Tactical | 1.2 |
| **Infrastructure** | Geordi | DevOps & scaling | claude-3.5-sonnet | Infrastructure | 1.2 |
| **DevOps** | O'Brien | Build & CI/CD | gpt-4o-mini | Operations | 1.0 |
| **Security** | Worf | Veto authority | gpt-4o-mini | **Security_veto** (1.4) | Can block decisions |
| **QA** | Yar | Test strategy | gemini-flash | Quality | 1.1 |
| **Analysis** | Troi | Stakeholder alignment | claude-3-haiku | Stakeholder | 0.9 |
| **Health** | Crusher | Code health | claude-3.5-sonnet | Code quality | 1.1 |
| **Communications** | Uhura | Requirement clarity | gemini-1.5-pro | Requirements | 1.0 |
| **Finance** | Quark | Cost & resources | gpt-4o-mini | Resource allocation | 0.8 |

---

## Prompt Engineering System (NEW)

### Three-Layer Architecture

```
Application Layer
  ↓ Uses
Prompt Engine Layer
  ↓ Queries
Archival & Storage Layer
```

### What's New: No Inline Prompts

**Before:** Each crew agent had inline system prompts scattered in code  
**After:** 
- All 11 system prompts stored in centralized registry (`prompt-templates.ts`)
- Unified orchestrator handles all LLM calls (`prompt-engine.ts`)
- Every call automatically archived with metadata (`prompt-archiver.ts`)
- 5 MCP tools expose archive for auditing (`crew-memory-tools.ts`)

### Core Components

#### 1. Prompt Templates Registry (`prompt-templates.ts`)
- **11 PromptTemplate objects** (one per crew member)
- Each template includes:
  - Engineered system prompt (identity, expertise, authority, constraints)
  - User prompt template with `{{variable}}` placeholders
  - Model, temperature, max_tokens, semantic guidelines
  - Expected output format, required variables validation

#### 2. Prompt Engine (`prompt-engine.ts`)
- **executePromptEngineCall(crewId, variables, storyRef, tags)**
  - Load template → validate variables → substitute → call LLM
  - Parse structured response (FINDINGS, RECOMMENDATIONS, CONFIDENCE)
  - Calculate token cost → **archive usage record** → return results

#### 3. Prompt Archiver (`prompt-archiver.ts`)
- **Every LLM call recorded:**
  - Crew member, template ID, model, story reference
  - System prompt used (full text)
  - User prompt used (full text, after substitution)
  - LLM response
  - Token counts, cost in USD, execution time
  - Any errors or security vetoes
- **Statistics aggregation** by crew, model, story
- **Export for compliance** and audit trails

#### 4. Enhanced Memory Tools (`crew-memory-tools.ts`)
- **5 new MCP tools for prompt analytics:**
  1. `crew_prompt_statistics` - Global metrics
  2. `crew_prompt_history` - Recent 20 calls
  3. `crew_member_prompt_history` - Per-crew audit trail
  4. `crew_story_prompt_audit` - Story's all LLM calls
  5. `crew_efficiency_analysis` - Cost metrics per member

### Automatic Archival

**Every LLM call is logged:**
```
[PROMPT_ARCHIVE] picard | picard_strategic_command | STORY-123 | $0.0042 | 1240ms
```

**Archive Record Includes:**
- Execution ID, timestamp, duration
- Crew ID, template ID, model used
- Full system prompt (for compliance)
- Full user prompt (templated then substituted)
- LLM response text
- Parsed findings/recommendations/confidence
- Token counts: prompt_tokens, completion_tokens, total_tokens
- Cost calculation: tokens × model pricing
- Story reference for audit trail
- Tags for categorization
- Error status or security veto flag

### Use Cases

1. **Auditing:** Query `crew_story_prompt_audit` tool to see every LLM call for a story
2. **Cost Tracking:** Use `crew_efficiency_analysis` to track spending per crew member
3. **Compliance:** Export archive via `crew_prompt_statistics` for regulatory review
4. **Debugging:** Retrieve full prompt context for any LLM response
5. **Optimization:** Analyze token efficiency per model

---

## Three-Layer Testing Infrastructure (NEW) ✅

A complete test suite ensuring reliable cross-platform execution from development through CI/CD.

### Layer 1: Unit Tests (50 tests, < 5 seconds)
- Pure logic testing with no external dependencies
- Test files: `**/*.test.ts` (run via `RUN_MODE=unit`)
- Examples: Variable substitution, type validation, formatting
- Environment: `TEST_ENV=unit` disables all mocks

### Layer 2: Integration Tests with Mocks (58 tests, < 15 seconds)
- Fast local development with full API mocking
- Test files: `**/*.integration.test.ts` (run via `RUN_MODE=integration`)
- Mocked services: Supabase, approved LLM, Aha API, GitHub API
- Environment: `TEST_ENV=local` activates in-memory mocks
- Mock infrastructure:
  - `createMockSupabaseClient()` - In-memory query builder
  - `createMockApprovedLlmClient()` - Deterministic crew responses
  - `createMockFetch()` - URL-based route mocking for all APIs
- Covers: Database operations, API integration, error handling

### Layer 3: CI/CD Integration Tests (Same 58 tests with real services)
- Real service calls in CI/CD pipeline
- Environment: `TEST_ENV=integration` (default)
- Services required: Supabase, Bayer-approved LLM provider, Aha API, GitHub
- Configuration: All via environment variables
- Usage: `pnpm run test:ci` in GitHub Actions

### Test Commands

```bash
# Run unit tests only (< 5 seconds)
npm run test:unit

# Run integration tests with mocks (< 15 seconds, instant feedback)
npm run test:integration

# Run all tests (108 total)
npm run test

# Run tests for CI/CD (real services)
npm run test:ci
```

### Mock Setup (packages/*/test/setup.ts)

Each package has its own `test/setup.ts`:
- Shared mocks (Supabase, approved LLM, fetch)
- Package-specific test fixtures
- 180+ lines for comprehensive coverage
- Reusable across all test suites

### Test Statistics

- **Total Tests:** 108 (50 unit + 58 integration)
- **Test Files:** 3 packages × 3+ suites each
- **Coverage:** Database, APIs, providers, prompt engine, docs
- **Time:** < 15 seconds with mocks, variable with real services
- **CI/CD Ready:** All tests pass with `TEST_ENV=integration`

### Testing Documentation

See [TESTING.md](./TESTING.md) for:
- Complete testing guide (250+ lines)
- Setup instructions
- Mock patterns and best practices
- Running tests locally vs CI/CD
- Troubleshooting

---

## Aha Project Structure Inspection (NEW) ✅

Complete project roadmap and hierarchy visibility from Aha product management.

### What's New: Roadmap & Hierarchy Endpoints

**In MCP Server (packages/mcp-server/src/lib/aha.ts):**
- `getProjectRoadmap(projectId)` - All releases + unreleased stories
- `getProjectHierarchy(projectId)` - Complete structure with statistics

**In Next.js UI (packages/ui/src/lib/aha.ts):**
- `getProjectRoadmap(projectId)` - Mirrors MCP server
- `getProjectHierarchy(projectId)` - Mirrors MCP server

**In VSCode Extension (packages/vscode-extension/src/aha.ts):**
- `listAhaProjects()` - Fetch all Aha projects (NEW)
- `getProjectHierarchy(projectId)` - Complete hierarchy (NEW)

### New API Routes (Next.js UI)

```
GET /api/aha/roadmap?projectId=X
  Returns: { project, releases with stories, unreleasedStories }

GET /api/aha/hierarchy?projectId=X
  Returns: { project, stats, releases with storiesByStatus, unreleasedStories, statusesUsed }
```

### VSCode Extension: Aha Project Structure Tree View ⭐

A complete project hierarchy visualization in the IDE sidebar:

**Features:**
- **Explorer Sidebar:** "Aha Project Structure" view
- **Expandable Tree:**
  - Projects (icon: $(project))
  - Releases/Sprints with progress % (icon: $(rocket))
  - Stories grouped by workflow status (In Progress, Done, etc.)
  - Backlog/unreleased items (icon: $(inbox))
  - Individual stories (icon: $(list-ordered))

**Interaction:**
- Click story to open in Aha browser
- Expand release to see all stories
- Expand status group to see individual items
- Command palette: `story-agent.refreshProjectStructure`

**Implementation:**
- Component: `AhaProjectStructureProvider` (350+ lines)
- Lazy-loads data on expansion
- Tree item types: ProjectTreeItem, ReleaseTreeItem, StatusGroupTreeItem, StoryTreeItem, BacklogGroupTreeItem
- Commands: refreshProjectStructure, openAhaProject, openAhaSprint, openAhaStory

### Data Structure: Project Hierarchy Response

```typescript
{
  project: { id, name, referencePrefix, url }
  stats: { 
    totalStories, 
    totalStoryPoints, 
    completedStories, 
    completedStoryPoints, 
    percentComplete 
  }
  releases: [{
    id, name, startDate, endDate, url,
    totalStoryPoints, doneStoryPoints, remainingStoryPoints,
    featureCount, doneCount,
    storiesByStatus: {
      "In Progress": [{referenceNum, name, storyPoints, url}],
      "Done": [...],
      ...
    }
  }]
  unreleasedStories: [{referenceNum, name, description, url}]
  statusesUsed: ["In Progress", "Done", ...]
}
```

### Capabilities

✅ **Inspect Complete Project Structure**
- Single API call returns everything
- All releases with story assignments
- Every story visible by release and status
- Backlog items clearly marked

✅ **Visual Progress Tracking**
- Story point totals per release
- % complete calculations
- Story counts by status
- At-a-glance project health

✅ **Direct Navigation**
- Open projects in Aha
- Open sprints in Aha
- Open stories in Aha
- One-click from IDE to browser

✅ **Multiple Access Points**
- Next.js Dashboard: Full hierarchy display (future)
- VSCode Extension: Tree view in sidebar (current)
- API Routes: Programmatic access (current)
- MCP Server: Available to crew agents (current)

---

### Monorepo (pnpm workspaces)

```
pnpm install               # Install all packages
pnpm build                 # Build all packages
pnpm run check             # TypeScript typecheck all packages
pnpm run test              # Run all tests
```

### Per-Package Commands

```bash
# MCP Server
pnpm --filter @story-agent/mcp-server build
pnpm --filter @story-agent/mcp-server start

# UI (Next.js)
pnpm --filter @story-agent/ui build
pnpm --filter @story-agent/ui start -- -p 3000

# TypeScript check
pnpm run check

# Watch mode
pnpm run dev
```

### Environment Setup

```bash
cp .env.example .env
# Fill in:
SUPABASE_URL=
SUPABASE_KEY=
AHA_DOMAIN=
AHA_API_KEY=
GITHUB_TOKEN=
GITHUB_DEFAULT_ORG=
CREW_LLM_PROVIDER=approved
CREW_LLM_APPROVED_URL=
CREW_LLM_APPROVED_KEY=
```

---

## Key Files Reference

### Must Read (In Order)

1. **[README.md](./README.md)** - Project overview & setup
2. **[docs/phases/PHASED_EXECUTION.md](./docs/phases/PHASED_EXECUTION.md)** - Guided reading path through all docs (Phase 0-4)
3. **[packages/mcp-server/PROMPT_ENGINEERING.md](./packages/mcp-server/PROMPT_ENGINEERING.md)** - Complete prompt engineering system guide
4. **[packages/mcp-server/src/lib/prompt-templates.ts](./packages/mcp-server/src/lib/prompt-templates.ts)** - All 11 engineered system prompts
5. **[packages/mcp-server/src/lib/prompt-engine.ts](./packages/mcp-server/src/lib/prompt-engine.ts)** - Prompt orchestration engine

### Core Implementation

- **[packages/mcp-server/src/lib/crew.ts](./packages/mcp-server/src/lib/crew.ts)** - 11-member crew roster
- **[packages/mcp-server/src/lib/crew-agents.ts](./packages/mcp-server/src/lib/crew-agents.ts)** - All 11 agent functions (using prompt engine)
- **[packages/mcp-server/src/lib/crew-coordinator.ts](./packages/mcp-server/src/lib/crew-coordinator.ts)** - Parallel orchestration
- **[packages/mcp-server/src/tools/crew-memory-tools.ts](./packages/mcp-server/src/tools/crew-memory-tools.ts)** - 5 prompt analytics MCP tools
- **[packages/mcp-server/src/tools/doc-tools.ts](./packages/mcp-server/src/tools/doc-tools.ts)** - Doc retrieval tool implementations
- **[packages/mcp-server/src/providers/index.ts](./packages/mcp-server/src/providers/index.ts)** - Agile provider factory (Aha, Jira, Stub)
- **[packages/shared/src/db-docs.ts](./packages/shared/src/db-docs.ts)** - Vector-based doc retrieval helpers
- **[packages/shared/src/index.ts](./packages/shared/src/index.ts)** - Shared types (CrewRole, CrewAuthority, etc.)

### Documentation

- **[docs/knowledge/AUTONOMOUS_CREW_ARCHITECTURE.md](./docs/knowledge/AUTONOMOUS_CREW_ARCHITECTURE.md)** - Accurate crew system reference (all 11 members)
- **[docs/phases/PHASED_EXECUTION.md](./docs/phases/PHASED_EXECUTION.md)** - Phased learning path with role-based fast paths
- **[docs/vector/doc_corpus_manifest.jsonl](./docs/vector/doc_corpus_manifest.jsonl)** - Docs indexed in vector store
- **[packages/mcp-server/PROMPT_ENGINEERING.md](./packages/mcp-server/PROMPT_ENGINEERING.md)** - Comprehensive prompt guide
- **[README.md](./README.md)** - Setup & architecture overview
- **[contracts/agents/contracts.v1.json](./contracts/agents/contracts.v1.json)** - Agent role contracts (JSON schema)

---

## Goals & Intentions

### Primary Goal
Fully autonomous story delivery: From Aha story description → complete, tested, merged code on main branch.

### Supporting Goals

1. **Parallel Crew Execution**
   - All 11 agents execute simultaneously (~10-15 seconds)
   - Each provides specialized expertise to same story
   - Final decision made by Picard (executive authority)
   - Worf can veto if security issues detected

2. **Proper Prompt Engineering**
   - No inline prompts scattered in code
   - Centralized registry of engineered system prompts
   - Template-based user prompts with variable substitution
   - Consistent behavior across all agents

3. **Complete Auditability**
   - Every LLM call archived with full metadata
   - System prompt always accessible for inspection
   - Cost tracking per agent and per model
   - Compliance-ready export functionality

4. **Cost Optimization**
   - Claude 3 Opus for executive decisions (most expensive, used sparingly)
   - Claude 3.5 Sonnet for core architecture/development
   - GPT-4o-mini for operations and security
   - Gemini models for QA and communications
   - Claude 3 Haiku for stakeholder analysis (cheapest)

5. **Authority Hierarchy**
   - Picard: Final decision authority (weight 1.5)
   - Worf: Security veto (can block unsafe decisions)
   - Core team: Architectural & tactical consensus
   - Specialists: Advisory input

6. **Debate & Consensus**
   - Three-round debate: Mission Brief → Implementation Challenge → Consensus
   - All findings synthesized into single recommendation
   - Conflicts resolved by authority weights
   - Veto authority respected (security-first)

---

## Current Status Summary

✅ **Core System**
- All 11 crew members defined with models and authorities
- All 11 agent functions implemented using prompt engine
- Prompt templates registered centrally
- Prompt engine functional with archival on every call
- 5 prompt analytics MCP tools registered

✅ **Knowledge & Docs System**
- `docs/` hierarchy: `knowledge/`, `phases/`, `vector/`
- 17 docs indexed in `doc_corpus_manifest.jsonl` (incl. crew architecture)
- `db-docs.ts`: 4 vector retrieval functions with phase/tag/semantic filtering
- 4 doc MCP tools: `get_doc_guidance`, `get_role_guidance`, `search_docs`, `list_doc_phases`
- `docs/phases/PHASED_EXECUTION.md`: guided Phase 0-4 reading path

✅ **Realtime & Streaming**
- `crew-autonomy-manager.ts`: autonomous mission lifecycle management
- `crew-state-broadcaster.ts`: real-time state event streaming
- `crew-communication.ts`: inter-crew messaging protocol
- `websocket-server.ts`: WebSocket server for live UI updates
- `/api/events/` SSE endpoint for real-time crew state in UI

✅ **Agile Provider Abstraction**
- `providers/` directory with `AhaProvider`, `JiraProvider`, `StubProviders`
- Provider factory in `index.ts` (switches on env var)
- All story tools use `getAgileProvider()` rather than direct Aha calls

✅ **Sprint Planning**
- `/sprint/` UI route for sprint tracking
- `/api/aha/sprints/` and `/api/aha/sprint-stories/` API routes
- `/api/crew/decisions` and `/api/crew/insights` for crew analytics

✅ **THREE-LAYER TESTING INFRASTRUCTURE (NEW)**
- 108 tests passing: 50 unit + 58 integration with mocks
- Vitest 4.1.8 with ESM module support
- RUN_MODE environment variable for dynamic test filtering
- Mock infrastructure for Supabase, approved LLM, Aha API, GitHub API
- `packages/shared/test/setup.ts` (180+ lines of mocks)
- `packages/mcp-server/test/setup.ts` (140+ lines)
- Integration test suites: db.integration.test.ts, prompt-engine.integration.test.ts, providers.integration.test.ts
- npm scripts: `test:unit`, `test:integration`, `test:ci`, `test`
- TESTING.md documentation (250+ lines)

✅ **AHA PROJECT STRUCTURE INSPECTION (NEW)**
- `getProjectRoadmap(projectId)` in MCP server and UI
- `getProjectHierarchy(projectId)` in MCP server and UI with complete statistics
- `/api/aha/roadmap?projectId=X` endpoint
- `/api/aha/hierarchy?projectId=X` endpoint
- Returns complete project structure: releases, stories by status, backlog, progress %
- Available to crew agents for architectural analysis

✅ **VSCODE EXTENSION PROJECT STRUCTURE TREE VIEW (NEW)**
- `AhaProjectStructureProvider` (350+ lines) - complete tree data provider
- Explorer sidebar: "Aha Project Structure" view
- Hierarchical display: Projects → Releases → Status Groups → Stories
- One-click navigation to open projects/sprints/stories in Aha
- Commands: refreshProjectStructure, openAhaProject, openAhaSprint, openAhaStory
- Lazy-loaded hierarchy on expansion
- Story point progress % for releases
- Backlog section for unreleased items

⚠️ **Known Pre-existing Build Warnings**
- `crew-autonomy-manager.ts`: Timer type compatibility (Node.js version)
- `crew-state-broadcaster.ts`: AsyncIterator return type
- `websocket-server.ts`: missing `@types/ws`, Set `.some()` usage
- These are pre-existing and do not affect MCP server functionality

---

## How to Use This Context

1. **For new features:** Check `packages/mcp-server/PROMPT_ENGINEERING.md` for archival & cost tracking capabilities
2. **For crew modifications:** Update `packages/mcp-server/src/lib/crew.ts` and `packages/mcp-server/src/lib/crew-agents.ts`
3. **For prompt updates:** Edit templates in `packages/mcp-server/src/lib/prompt-templates.ts` (no code changes needed)
4. **For testing:** Run `pnpm test` locally with mocks before pushing. See [TESTING.md](./TESTING.md) for setup
5. **For Aha integration:** Use `getProjectHierarchy(projectId)` to get complete roadmap data (MCP server, UI, or extension)
6. **For VSCode extension:** Access project structure via sidebar tree view or programmatically via `/api/aha/hierarchy` endpoint
4. **For auditing:** Use MCP tools: `crew_story_prompt_audit`, `crew_efficiency_analysis`
5. **For doc retrieval:** Use MCP tools: `get_doc_guidance`, `get_role_guidance`, `search_docs`
6. **For adding new providers:** Add to `packages/mcp-server/src/providers/` following `AhaProvider.ts` pattern
7. **For deployment:** Run `pnpm --filter @story-agent/shared build && pnpm --filter @story-agent/mcp-server build` to validate

---

## Quick Commands

```bash
# Development setup
cd /Users/brady.georgen.ext/Documents/workspace/story-agent
pnpm install
cp .env.example .env        # Edit with your API keys

# Build & validate
pnpm run check              # TypeScript check
pnpm build                  # Build all packages

# Local development
pnpm run dev                # Watch mode for all packages

# Run individual services
pnpm mcp                    # Start MCP server only
pnpm ui                     # Start Next.js dashboard

# Git operations
git log --oneline           # View commit history
git status                  # Check status
git add .                   # Stage changes
git commit -m "message"     # Create commit
```

---

## Next Steps (Optional)

If you need to work on the system:

1. **Test a specific crew member:** Use individual MCP tool (e.g., `crew_member_picard`)
2. **Verify archival:** Query `crew_prompt_history` to see recent calls
3. **Check costs:** Use `crew_efficiency_analysis` tool
4. **Add new crew member:** Follow pattern in `crew.ts` and `prompt-templates.ts`
5. **Update system prompt:** Edit template in `prompt-templates.ts` and restart server

---

**Ready to assist with Story Agent development. What would you like to work on?**
