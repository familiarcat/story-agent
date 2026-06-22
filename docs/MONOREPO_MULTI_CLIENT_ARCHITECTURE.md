# Multi-Client Monorepo Architecture

This document describes how the story-agent monorepo supports multiple client projects with shared crew infrastructure, domain expertise, and personal memories.

## 🏗️ Architecture Overview

The monorepo is organized around **shared crew infrastructure** with **isolated client projects**:

```
story-agent (monorepo)
├── packages/                    # Shared libraries (all projects use these)
│   ├── shared/                  # Crew functions, db, types, domain registry
│   ├── mcp-server/              # MCP server (crew interface)
│   ├── ui/                       # Dashboard UI (crew/client interface)
│   └── vscode-extension/        # VS Code extension
├── docs/                        # Shared documentation (crew + system)
├── scripts/                     # Shared utilities & tools
├── supabase/                    # Shared database schema & migrations
├── projects/                    # Client-specific projects (NEW)
│   ├── client-pctms/            # Client Pharmaceutical project
│   │   ├── .env                # Project credentials (not in git)
│   │   ├── .env.example        # Template for .env
│   │   ├── supabase/           # Project-specific migrations
│   │   ├── docs/               # Project-specific documentation
│   │   └── src/                # Project-specific code
│   ├── pharma-trials/          # Another client project
│   └── template-project/       # Template for creating new projects
├── .github/CODEOWNERS          # GitHub access control per project
└── pnpm-workspace.yaml         # Multi-project workspace config
```

## 📊 Why Monorepo?

**Single Source of Truth for Crew Infrastructure**:
- Domain expertise (domain-registry.ts)
- Crew baseline memories (shared across projects)
- Database schema patterns
- Migration automation
- Documentation system

**Crew Learning Compounds**:
- Worf learns security patterns on Project A
- Those patterns automatically available on Project B
- Geordi's performance optimization lessons carry forward
- All crew members benefit from collective learning

**Data Isolation via Supabase RLS**:
- Each project has org_id (e.g., 'client', 'pharma')
- Row-level security enforces isolation
- Multiple projects in same database, completely isolated
- No code duplication needed

## 🚀 Project Structure

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

## 🔐 Access Control System

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

Each project has `org_id` column for tenant isolation:

```sql
-- Patient data scoped to organization
SELECT * FROM sa_patients 
WHERE org_id = 'client' AND user_org_id = auth.jwt()->>'org_id';
```

Crew members authenticate with org_id:
```
Token: { crew_id: 'worf', org_id: 'client', ... }
```

All queries automatically filtered by org_id via RLS.

### Environment Variables

Each project has `.env` file (NOT in git):

```bash
# projects/client-pctms/.env
PROJECT_ID=client-pctms
SUPABASE_URL=https://...client...
SUPABASE_KEY=...client...
CLIENT_NAME="Client Pharmaceutical Systems"
PRIMARY_CREW="picard,data,riker,geordi,obrien,worf"
```

Developers copy `.env.example` → `.env` and fill in project credentials.

## 👥 Crew Member Personal Memories

Each crew member stores personal memories in Supabase:

### What are Personal Memories?

Individual insights, lessons learned, and decision notes that crew members capture during task execution:

- **Insights**: "This RLS pattern works better than..."
- **Lessons Learned**: "We learned X on Client project"
- **Decision Notes**: "We chose Y because..."
- **Reminders**: "Remember to check Z when..."

### Personal Memory Storage

Table: `sa_crew_personal_memory`

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

### Accessing Personal Memories

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
// Returns: Worf's past learnings for new project
```

### Memory Types

| Type | Purpose | Example |
|------|---------|---------|
| **insight** | Discovery or realization | "Clustering helps with join performance" |
| **lesson_learned** | Lessons from past mistakes | "We learned RLS needs this pattern" |
| **decision_note** | Rationale for decisions | "We chose Y because of constraint X" |
| **reminder** | Procedural reminders | "Always check org_id on new tables" |

### Searching Personal Memories

**Text Search**:
```typescript
const memories = await searchCrewPersonalMemories(
  'worf',
  'RLS policy design',
  10  // limit
);
```

**Semantic Search**:
```typescript
const embedding = toEmbedding('How should I handle tenant isolation?');
const memories = await searchCrewPersonalMemoriesByEmbedding(
  'worf',
  embedding,
  10,
  0.7  // similarity threshold
);
```

**By Project**:
```typescript
const client_memories = await getCrewMemoriesByProject('geordi', 'client-pctms', 20);
```

## 🎯 Project Management

### List All Projects

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

### Select Active Project

```bash
npm run project:select client-pctms
```

Stores selection in `.project-state.json` (not in git).

### View Project Info

```bash
npm run project:info
```

Shows current project configuration and crew assignments.

### View Crew Assignments

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

## 🔄 Workflow: Adding a New Client Project

### Step 1: Copy Template

```bash
cp -r projects/template-project projects/acme-corp-ehr
```

### Step 2: Configure Project

Edit `projects/acme-corp-ehr/.env`:
```bash
PROJECT_ID=acme-corp-ehr
PROJECT_NAME="ACME Corp - Electronic Health Records"
CLIENT_NAME="ACME Corporation"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-key-here"
PRIMARY_CREW="picard,data,worf,crusher"
```

### Step 3: Create Project-Specific Migrations

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

### Step 5: Select and Use Project

```bash
npm run project:select acme-corp-ehr
npm run project:info
npm run db:auto-migrate  # Runs ACME-specific migrations
```

## 📚 Shared vs. Project-Specific

### Shared (All Projects Use)

- `packages/shared/` — Crew functions, domain registry, db client
- `packages/mcp-server/` — MCP server, crew coordination
- `docs/` — Crew documentation, best practices
- `supabase/20260607_*.sql` — Shared schema (crew memories, docs, etc.)

### Project-Specific

- `projects/*/` — Project folders
- `projects/*/.env` — Project credentials
- `projects/*/supabase/migrations/` — Project schema
- `projects/*/docs/` — Project documentation

## 🎓 Crew Learning Flow

1. **Crew executes Task on Project A**
   - Worf designs RLS policy for 'client' org_id
   - Documents learning in personal memory

2. **Personal Memory Stored**
   ```
   crew_id: 'worf'
   memory_type: 'lesson_learned'
   content: "RLS pattern: org_id as first column in composite key..."
   project_id: 'client-pctms'
   tags: ['rls', 'multi-tenant', 'security']
   ```

3. **New Project B Starts**
   - Crew assigned to new client
   - Riker queries: "Show me Worf's RLS learnings"
   - Retrieves: Worf's insights from Project A
   - Applies: Same patterns to Project B

4. **Institutional Knowledge Grows**
   - Every project adds crew learnings
   - Baseline memories accumulate
   - Future projects execute faster

## 🔍 Data Isolation Verification

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

## 📝 Best Practices

### For Crew Members

1. **Store Personal Memories After Each Task**
   ```typescript
   await storeCrewPersonalMemory({
     crew_id: 'worf',
     memory_type: 'lesson_learned',
     title: 'RLS Design Pattern',
     content: 'What I learned...',
     project_id: 'client-pctms',
     tags: ['security', 'rls'],
   });
   ```

2. **Reference Past Learnings on New Projects**
   ```typescript
   const past_learnings = await getCrewMemoriesByProject('worf', projectId);
   // Apply past patterns to new project
   ```

3. **Use Semantic Search for Related Insights**
   ```typescript
   const embedding = toEmbedding('How do I handle tenant isolation?');
   const similar = await searchCrewPersonalMemoriesByEmbedding('worf', embedding);
   ```

### For Developers

1. **Keep Credentials in .env (never in git)**
   - Copy `.env.example` → `.env`
   - Fill in project-specific credentials
   - Add `.env` to `.gitignore`

2. **Project selection is persistent**
   - Run `npm run project:select <project>`
   - All subsequent commands use that project
   - Selection saved in `.project-state.json`

3. **Use shared packages for crew functions**
   ```typescript
   import { routeTaskToCrew } from '@story-agent/shared';
   // Works across all projects
   ```

### For Architects

1. **Shared schema in `supabase/`**
   - Domain registry, crew memories, documentation
   - Applied to all projects

2. **Project-specific schema in `projects/*/supabase/`**
   - Client-specific tables and policies
   - RLS policies with org_id

3. **Use .github/CODEOWNERS for governance**
   - Automatic PR reviews for project changes

## 🚀 Ready to Scale

This architecture enables:
- ✅ Multiple client projects in single monorepo
- ✅ Shared crew infrastructure across projects
- ✅ Personal memories per crew member
- ✅ Crew learning compounds across projects
- ✅ Complete data isolation via Supabase RLS
- ✅ Codified access control (GitHub + Supabase)
- ✅ Easy onboarding of new projects
- ✅ Institutional knowledge preserved

The crew system becomes stronger with each project as learnings accumulate in personal memories! 🎯

---

For detailed examples, see [AUTONOMOUS_CREW_MISSION_TEST.md](AUTONOMOUS_CREW_MISSION_TEST.md).
