# Multi-Client Monorepo Architecture

This document describes how the story-agent monorepo supports multiple client projects with shared
crew infrastructure, domain expertise, and personal memories — evolving the system from a
single-project setup into a multi-client platform with autonomous crew learning and complete data
isolation.

## Architecture Overview

The monorepo is organized around **shared crew infrastructure** with **isolated client projects**:

```
story-agent (monorepo)
├── packages/                    # Shared libraries (all projects use these)
│   ├── shared/                  # Crew functions, db, types, domain registry
│   ├── mcp-server/              # MCP server (crew interface)
│   ├── ui/                      # Dashboard UI (crew/client interface)
│   └── vscode-extension/        # VS Code extension
├── docs/                        # Shared documentation (crew + system)
├── scripts/                     # Shared utilities & tools
├── supabase/                    # Shared database schema & migrations
├── projects/                    # Client-specific projects
│   ├── client-pctms/            # Client Pharmaceutical project
│   │   ├── .env                 # Project credentials (not in git)
│   │   ├── .env.example         # Template for .env
│   │   ├── supabase/            # Project-specific migrations
│   │   ├── docs/                # Project-specific documentation
│   │   └── src/                 # Project-specific code
│   ├── pharma-trials/           # Another client project
│   └── template-project/        # Template for creating new projects
├── .github/CODEOWNERS           # GitHub access control per project
└── pnpm-workspace.yaml          # Multi-project workspace config
```

## Why Monorepo?

**Single source of truth for crew infrastructure**:
- Domain expertise (domain-registry.ts)
- Crew baseline memories (shared across projects)
- Database schema patterns
- Migration automation
- Documentation system (RAG)

**Crew learning compounds**:
- Worf learns security patterns on Project A
- Those patterns are automatically available on Project B
- Geordi's performance optimization lessons carry forward
- All crew members benefit from collective learning

**Data isolation via Supabase RLS**:
- Each project has an org_id (e.g., 'client', 'pharma')
- Row-level security enforces isolation
- Multiple projects in the same database, completely isolated
- No code duplication needed

## Project Structure

Each project in `projects/` has:

```
projects/client-pctms/
├── .env                        # Project credentials (NOT in git)
├── .env.example                # Template for developers
├── package.json                # Project-specific dependencies
├── supabase/                   # Project-specific migrations
│   ├── migrations/             # RLS policies, initial schema
│   └── seed/                   # Project-specific seed data
├── docs/                       # Project-specific documentation
├── src/                        # Project-specific code (if needed)
└── README.md                   # Project overview
```

## Access Control System

### GitHub CODEOWNERS

File: `.github/CODEOWNERS`

```
# Global ownership
*                               @familiarcat

# Project-specific ownership
projects/client-pctms/**         @familiarcat
projects/pharma-trials/**       @familiarcat
```

When a PR modifies `projects/client-pctms/`, GitHub automatically requests review from code owners.

### Supabase RLS (Row-Level Security)

Each project has an `org_id` column for tenant isolation:

```sql
-- Patient data scoped to organization
SELECT * FROM sa_patients
WHERE org_id = 'client' AND user_org_id = auth.jwt()->>'org_id';
```

Crew members authenticate with org_id:
```
Token: { crew_id: 'worf', org_id: 'client', ... }
```

All queries are automatically filtered by org_id via RLS.

### Environment Variables

Each project has a `.env` file (NOT in git). Developers copy `.env.example` → `.env` and fill in
project credentials:

```bash
# projects/client-pctms/.env
PROJECT_ID=client-pctms
PROJECT_NAME="Client Pharmaceutical - PCTMS"
CLIENT_NAME="Client Pharmaceutical Systems"
SUPABASE_URL=https://...client...
SUPABASE_KEY=...client...
PRIMARY_CREW="picard,data,riker,geordi,obrien,worf"
SECONDARY_CREW="troi,crusher,uhura"
ADVISORY_CREW="quark,yar"
COMPLIANCE_MODE="phi"
```

## Domain-Driven Crew Coordination

The domain registry maps 24+ system domains to the 11 crew members with expertise levels
(primary, secondary, tertiary), so task routing automatically identifies the best crew:

```typescript
DOMAIN_REGISTRY = {
  'security:rls': {
    name: 'Row-Level Security',
    owners: [
      { crewId: 'worf', expertise: 'primary', reason: 'Security expert' },
      { crewId: 'data', expertise: 'secondary', reason: 'Schema design' }
    ],
    relatedDomains: ['database:schema', 'database:migration']
  },
  // ... 23 more domains
}
```

Domains cover database (schema, migration, performance), deployment (CI/CD, strategy), security
(RLS, authentication, audit), monitoring (health, alerts), performance (indexing, caching), and
more.

Task routing in practice:

```typescript
// MCP server receives task
const task = {
  description: 'Design RLS policies for multi-tenant data isolation',
  domains: ['security:rls', 'database:schema'],
  project_id: 'acme-corp'
};

// Automatically route to crew
const crew = await routeTaskToCrew(task);
// Result: { primary: ['worf', 'data'], secondary: ['geordi'] }
```

`routeTaskToCrew` and the domain registry live in `packages/shared` and work across all projects.

## Crew Member Personal Memories

Each crew member stores personal memories in Supabase — individual insights, lessons learned,
decision notes, and reminders captured during task execution. Full usage guide (MCP tools, UI
dashboard, API routes, library functions, best practices):
[../knowledge/crew-memory-guide.md](../knowledge/crew-memory-guide.md).

### Storage

Table: `sa_crew_personal_memory` (migration `supabase/20260607_crew_personal_memory.sql`; 12
columns + vector embedding, 8 indexes, RLS policies for multi-tenant isolation, updated_at
trigger):

```
Columns:
- crew_id: 'picard', 'data', 'worf', etc.
- memory_type: 'insight' | 'lesson_learned' | 'decision_note' | 'reminder'
- title: Short summary
- content: Full memory text
- project_id: Which project (optional)
- task_id: Which task (optional)
- tags: Searchable tags
- is_private: Private to crew member only
- embedding: Semantic search vector
```

SQL functions:

```
- store_crew_personal_memory()
- get_crew_personal_memory()
- search_crew_personal_memory()
- search_crew_personal_memory_by_embedding()
- get_crew_memories_by_project()
- get_crew_memory_stats()
```

### Access from code

```typescript
import {
  storeCrewPersonalMemory,
  getCrewPersonalMemories,
  searchCrewPersonalMemories,
  getCrewMemoriesByProject
} from '@story-agent/shared';

// Worf stores a security insight
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'RLS Policy Pattern for Multi-Tenant Isolation',
  content: 'Discovered that adding org_id as first column...',
  project_id: 'client-pctms',
  tags: ['rls', 'security', 'multi-tenant'],
  relates_to_crew: ['data'],
});

// Later, another project retrieves Worf's RLS insights
const worfInsights = await getCrewMemoriesByProject('worf', 'pharma-trials');
```

Search by text (`searchCrewPersonalMemories`), by meaning
(`searchCrewPersonalMemoriesByEmbedding` with a `toEmbedding()` vector and similarity threshold),
or by project (`getCrewMemoriesByProject`).

## Project Management

### List all projects

```bash
npm run project:list
```

Output:
```
📊 Available Projects:

  client-pctms
    Name: Client Pharmaceutical - Patient-Centric Trial Management System
    Client: Client Pharmaceutical Systems
    Tier: gold-standard

  pharma-trials
    Name: Multi-Site Pharmaceutical Trials
    Client: Pharmagen Inc.
    Tier: standard
```

### Select active project

```bash
npm run project:select client-pctms
```

Stores the selection in `.project-state.json` (not in git); all subsequent commands use that
project.

### View project info

```bash
npm run project:info
```

Shows current project configuration and crew assignments.

### View crew assignments

```bash
npm run project:crew client-pctms
```

Shows which crew members are assigned to each project:
```
👥 Crew Assignments for client-pctms:

  🔴 Primary Crew (Full Authority):
    • picard — Captain & Strategic Command
    • data — Architecture & Systems
    • worf — Security & Defense

  🟡 Secondary Crew (Supporting):
    • geordi — Performance & Monitoring
    • crusher — Testing & Diagnostics

  🟢 Advisory Crew (Consultation):
    • quark — Finance & Optimization
```

The project CLI is implemented in `scripts/project-management.mjs`.

## Workflow: Adding a New Client Project

### Step 1: Copy template

```bash
cp -r projects/template-project projects/acme-corp-ehr
```

### Step 2: Configure project

Edit `projects/acme-corp-ehr/.env`:
```bash
PROJECT_ID=acme-corp-ehr
PROJECT_NAME="ACME Corp - Electronic Health Records"
CLIENT_NAME="ACME Corporation"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-key-here"
PRIMARY_CREW="picard,data,worf,crusher"
```

### Step 3: Create project-specific migrations

Create `projects/acme-corp-ehr/supabase/migrations/001_initial_schema.sql`:
```sql
-- ACME-specific schema
CREATE TABLE sa_patients (
  id UUID PRIMARY KEY,
  org_id TEXT DEFAULT 'acme',
  name TEXT,
  ...
);
```

### Step 4: Update GitHub CODEOWNERS

Add to `.github/CODEOWNERS`:
```
projects/acme-corp-ehr/**     @acme-team
```

### Step 5: Select and use project

```bash
npm run project:select acme-corp-ehr
npm run project:info
npm run db:auto-migrate  # Runs ACME-specific migrations
npm run db:health-check  # Verify
```

## Shared vs. Project-Specific

### Shared (all projects use)

- `packages/shared/` — crew functions, domain registry, task routing, db client, documentation RAG
- `packages/mcp-server/` — MCP server, crew coordination (powered by shared crew utilities)
- `docs/` — crew documentation, best practices
- `supabase/20260607_*.sql` — shared schema (crew memories, docs, etc.)

### Project-specific

- `projects/*/` — project folders
- `projects/*/.env` — project credentials
- `projects/*/supabase/migrations/` — project schema
- `projects/*/docs/` — project documentation

## Crew Learning Flow

1. **Crew executes task on Project A**
   - Worf designs RLS policy for the 'client' org_id
   - Documents learning in personal memory

2. **Personal memory stored**
   ```
   crew_id: 'worf'
   memory_type: 'lesson_learned'
   content: "RLS pattern: org_id as first column in composite key..."
   project_id: 'client-pctms'
   tags: ['rls', 'multi-tenant', 'security']
   ```

3. **New Project B starts**
   - Crew assigned to new client (task routing picks the same experts)
   - Riker queries: "Show me Worf's RLS learnings"
   - Retrieves Worf's insights from Project A
   - Applies the same patterns to Project B — no re-learning needed

4. **Institutional knowledge grows**
   - Every project adds crew learnings
   - Baseline memories accumulate
   - Future projects execute faster

## Data Isolation Verification

Verify each project is properly isolated:

```bash
# Connect to Client database
SUPABASE_KEY=client-key node -e "
  import { searchDocumentation } from '@story-agent/shared';
  const docs = await searchDocumentation('test');
  // Only sees Client data (org_id = 'client')
"

# Connect to Pharma database
SUPABASE_KEY=pharma-key node -e "
  import { searchDocumentation } from '@story-agent/shared';
  const docs = await searchDocumentation('test');
  // Only sees Pharma data (org_id = 'pharma')
  // NO visibility to Client data
"
```

## Best Practices

### For crew members

1. **Store personal memories after each task** (`storeCrewPersonalMemory` with `crew_id`,
   `memory_type`, `title`, `content`, `project_id`, `tags`).
2. **Reference past learnings on new projects** (`getCrewMemoriesByProject`).
3. **Use semantic search for related insights** (`searchCrewPersonalMemoriesByEmbedding` with a
   `toEmbedding()` question).

### For developers

1. **Keep credentials in `.env` (never in git)** — copy `.env.example` → `.env`, fill in
   project-specific credentials, ensure `.env` is gitignored.
2. **Project selection is persistent** — `npm run project:select <project>`; saved in
   `.project-state.json`.
3. **Use shared packages for crew functions** — e.g. `routeTaskToCrew` from
   `@story-agent/shared` works across all projects.

### For architects

1. **Shared schema in `supabase/`** — domain registry, crew memories, documentation; applied to
   all projects.
2. **Project-specific schema in `projects/*/supabase/`** — client-specific tables and RLS
   policies with org_id.
3. **Use `.github/CODEOWNERS` for governance** — automatic PR reviews for project changes.

## What This Architecture Enables

- Multiple concurrent client projects in a single monorepo with complete data isolation via RLS
- Shared crew infrastructure and domain-driven task routing across projects
- Personal memories per crew member; crew learning compounds across projects
- Codified access control (GitHub CODEOWNERS + Supabase RLS)
- Fast onboarding of new projects (template + project CLI instead of manual setup)
- Institutional knowledge preserved and growing with each project
