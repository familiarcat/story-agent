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
│   │   ├── PROMPT_ENGINEERING.md          # Full system documentation
│   │   └── src/index.ts                   # MCP server entry point
│   ├── ui/                      # Next.js 15 dashboard
│   │   ├── src/app/
│   │   │   ├── dashboard/       # Story tracker view
│   │   │   ├── story/[storyId]/ # Individual story detail
│   │   │   ├── observation-lounge/ # Crew debate viewer
│   │   │   ├── sprint/          # ⭐ Sprint planning view
│   │   │   └── api/
│   │   │       ├── aha/         # Aha proxy routes (projects, stories, sprints)
│   │   │       ├── crew/        # ⭐ Crew decisions + insights routes
│   │   │       ├── events/      # ⭐ SSE real-time event stream
│   │   │       ├── stories/     # Story import & listing
│   │   │       └── projects/    # Project listing
│   │   └── src/lib/
│   │       ├── crew.ts          # 11-member crew definitions
│   │       ├── aha.ts           # Aha API client
│   │       ├── agile.ts         # Story/sprint utilities
│   │       └── db.ts            # Supabase client (UI side)
│   ├── shared/                  # Shared TypeScript types
│   │   └── src/
│   │       ├── index.ts         # CrewRole, CrewAuthority, interfaces
│   │       ├── db.ts            # Supabase client + observation memory helpers
│   │       └── db-docs.ts       # ⭐ Doc vector retrieval helpers
│   └── vscode-extension/        # VS Code extension with chat support
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

## Build Structure

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
OPENROUTER_API_KEY=
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

✅ **Knowledge & Docs System (Added)**
- `docs/` hierarchy: `knowledge/`, `phases/`, `vector/`
- 17 docs indexed in `doc_corpus_manifest.jsonl` (incl. crew architecture)
- `db-docs.ts`: 4 vector retrieval functions with phase/tag/semantic filtering
- 4 doc MCP tools: `get_doc_guidance`, `get_role_guidance`, `search_docs`, `list_doc_phases`
- `docs/phases/PHASED_EXECUTION.md`: guided Phase 0-4 reading path

✅ **Realtime & Streaming (Added)**
- `crew-autonomy-manager.ts`: autonomous mission lifecycle management
- `crew-state-broadcaster.ts`: real-time state event streaming
- `crew-communication.ts`: inter-crew messaging protocol
- `websocket-server.ts`: WebSocket server for live UI updates
- `/api/events/` SSE endpoint for real-time crew state in UI

✅ **Agile Provider Abstraction (Added)**
- `providers/` directory with `AhaProvider`, `JiraProvider`, `StubProviders`
- Provider factory in `index.ts` (switches on env var)
- All story tools use `getAgileProvider()` rather than direct Aha calls

✅ **Sprint Planning (Added)**
- `/sprint/` UI route for sprint tracking
- `/api/aha/sprints/` and `/api/aha/sprint-stories/` API routes
- `/api/crew/decisions` and `/api/crew/insights` for crew analytics

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
