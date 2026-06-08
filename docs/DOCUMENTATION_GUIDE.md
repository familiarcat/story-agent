# Documentation Organization & RAG System

This guide explains how documentation is organized and how crew members can access it during task execution.

## 📚 Documentation Structure

All documentation is organized in the `docs/` directory by category:

```
docs/
├── setup/                  # Getting started & configuration
│   ├── QUICK_START_AUTOMATION.md
│   ├── SUPABASE_SETUP.md
│   └── MISSING_CREDENTIALS.md
├── crew/                   # Crew member guides & architecture
│   ├── CREW_MEMORIES_GUIDE.md
│   ├── CREW_INTEGRITY_SYSTEM.md
│   ├── CREW_INTEGRITY_TOOLS_REFERENCE.md
│   ├── CREW_MEMORY_RECOVERY_GUIDE.md
│   ├── CREW_STARSHIP_ARCHITECTURE.md
│   └── OBSERVATION_LOUNGE_2026-06-07.md
├── domain-driven/          # Domain-driven design system
│   ├── DOMAIN_DRIVEN_CREW_GUIDE.md
│   └── DOMAIN_DRIVEN_CREW_COORDINATION_SUMMARY.md
├── automation/             # Automation & migration tools
│   ├── MIGRATION_AUTOMATION.md
│   ├── MIGRATION_AUTOMATION_SUMMARY.md
│   └── DELIVERY_SUMMARY_AUTOMATION.md
└── testing/                # Testing & QA
    └── TESTING.md
```

### Root-Level Files

Files that remain in the root of the monorepo:

- **README.md** — Project overview & main entry point
- **START_HERE.md** — Quick navigation guide for new users
- **COPILOT_SESSION_PROMPT.md** — Agent customization instructions

## 🚀 Documentation RAG System

The **RAG (Retrieval Augmented Generation)** system makes all documentation searchable and accessible to crew members during task execution.

### How It Works

1. **Ingestion**: Documentation files are read from `docs/` and stored in Supabase
2. **Chunking**: Large documents are split into semantic chunks for optimal search
3. **Indexing**: Chunks are indexed by text and optional semantic embeddings
4. **Search**: Crew members query the documentation using text or semantic search
5. **Context**: Relevant documentation is provided to crew during task execution

### Using Documentation RAG

#### For Crew Members Executing Tasks

```typescript
import { searchDocumentation } from '@story-agent/shared';

// Search for relevant documentation
const results = await searchDocumentation('RLS policy design', 'security', 5);

// Results include:
// - Document title and source path
// - Relevant chunk of content
// - Category and tags
// - Similarity score
```

#### For Task Planning

```typescript
import { getDocumentationByCategory } from '@story-agent/shared';

// Get all setup guides
const setupDocs = await getDocumentationByCategory('setup');

// Get documentation metadata
import { getDocumentationCategories } from '@story-agent/shared';
const categories = await getDocumentationCategories();
```

### npm Scripts for Documentation Management

**Ingest documentation into RAG system:**
```bash
npm run docs:ingest           # Ingest/update all documentation
npm run docs:ingest:dry       # Preview without writing
npm run docs:ingest:fresh     # Clear and re-ingest all docs
```

## 📖 Documentation Categories

### Setup (docs/setup/)
- Getting started guides
- Environment configuration
- Credential management
- Prerequisites and dependencies

**Audience**: New developers, DevOps engineers, client teams

### Crew (docs/crew/)
- Crew member baseline memories
- Crew integrity system
- Crew architecture and design
- Tool references
- Observation lounge protocols

**Audience**: Crew members, task assigners, system architects

### Domain-Driven (docs/domain-driven/)
- Domain definitions and ownership
- Crew expertise mapping
- Task routing guidelines
- Collaboration protocols

**Audience**: Task planners, domain architects, crew coordinators

### Automation (docs/automation/)
- Migration automation guides
- Client onboarding procedures
- Health monitoring
- Performance optimization

**Audience**: DevOps engineers, operations teams, infrastructure specialists

### Testing (docs/testing/)
- Test coverage guidelines
- Quality assurance procedures
- Smoke testing protocols
- Validation frameworks

**Audience**: QA engineers, testing specialists, crew members

## 🔍 Searching Documentation

### Text-Based Search

Search by keywords, phrases, or tags:

```typescript
// Search for "client isolation" in all categories
const results = await searchDocumentation('client isolation');

// Search within a specific category
const setupDocs = await searchDocumentation('credentials', 'setup');

// Get first 20 results
const allResults = await searchDocumentation('security', null, 20);
```

### Semantic Search (with embeddings)

Find documentation based on meaning:

```typescript
import { searchDocumentationByEmbedding } from '@story-agent/shared';
import { toEmbedding } from '@story-agent/shared';

const query = 'How do I implement tenant isolation?';
const embedding = toEmbedding(query);
const results = await searchDocumentationByEmbedding(embedding, 'security');
```

## 📋 Adding New Documentation

### To Add a New Document

1. Create markdown file in appropriate `docs/` subfolder
2. Add title as H1 heading at top
3. (Optional) Add tags comment for better searchability:
   ```markdown
   <!-- tags: tag1, tag2, tag3 -->
   # Document Title
   ```
4. Run ingestion:
   ```bash
   npm run docs:ingest
   ```

### Example New Document

```markdown
<!-- tags: performance, optimization, caching -->
# Caching Strategy for High-Traffic Endpoints

## Overview
This document describes our caching strategy...

## Implementation
...
```

### To Create New Category

1. Create new subdirectory in `docs/`
2. Update `CATEGORY_MAP` in `scripts/ingest-docs-to-rag.mjs`
3. Add category description
4. Run: `npm run docs:ingest:fresh` to re-index

## 🗄️ Supabase Schema

Documentation is stored in `sa_documentation` table:

| Column | Type | Purpose |
|--------|------|---------|
| id | BIGINT | Unique identifier |
| title | TEXT | Document title |
| category | TEXT | Category (setup, crew, etc.) |
| source_path | TEXT | Path in docs/ (e.g., docs/setup/QUICK_START.md) |
| chunk_index | INT | Chunk number (0 = first, for multi-chunk docs) |
| chunk_content | TEXT | The actual searchable content |
| tags | TEXT[] | Searchable tags |
| embedding | VECTOR | Semantic embedding for similarity search |
| is_searchable | BOOLEAN | Whether document is available for search |
| ingested_at | TIMESTAMP | When document was ingested |

### Indexes

- **Category index**: Fast filtering by category
- **Tag index**: Fast tag-based search
- **Text search**: Title and content keywords
- **Vector index**: Semantic similarity search

## 🔄 Documentation Updates

### Re-ingesting Documentation

When you update existing documentation:

1. **Automatic detection**: Changed files are detected by content hash
2. **Incremental update**: Only changed documents are re-ingested
3. **No downtime**: Existing documentation remains searchable

```bash
# Just re-ingest (skips unchanged)
npm run docs:ingest

# Force re-ingest all (useful for structure changes)
npm run docs:ingest:fresh
```

## 📊 Monitoring Documentation

### Check Documentation Status

```typescript
import { getDocumentationCategories } from '@story-agent/shared';

const categories = await getDocumentationCategories();
// Returns: category name, document count, last updated time

for (const cat of categories) {
  console.log(`${cat.category}: ${cat.count} docs (updated ${cat.last_updated})`);
}
```

## 🎯 Integration with Task Execution

When a crew member is assigned a task:

1. **Task domains identified** (via domain registry)
2. **Relevant docs retrieved** by searching documentation
3. **Context provided** to crew member along with task
4. **Updated** as crew executes and learns

Example workflow:

```typescript
// 1. Task assigned
const task = {
  title: 'Implement RLS policies',
  domains: ['security:rls', 'tenancy:isolation'],
};

// 2. Get relevant documentation
const docs = await searchDocumentation('RLS policies', 'security', 5);

// 3. Provide to crew member
const briefing = {
  task,
  relevantDocs: docs,
  assignedCrew: ['Worf', 'Data'],
};

// 4. Crew executes with documentation context
```

## ✨ Best Practices

### For Documentation Authors

- ✅ Use clear H1 title at top
- ✅ Add tags comment for better discoverability
- ✅ Include code examples when relevant
- ✅ Keep chunks under 2000 characters
- ✅ Update documentation when processes change
- ✅ Link to related documentation

### For Crew Members

- ✅ Search for relevant documentation before starting task
- ✅ Use domain-specific documentation
- ✅ Report documentation gaps or errors
- ✅ Update documentation with learnings
- ✅ Reference documentation in decisions

### For System Maintainers

- ✅ Monitor documentation ingestion regularly
- ✅ Keep documentation up-to-date with code changes
- ✅ Organize documentation by task domains
- ✅ Use consistent file naming
- ✅ Validate documentation with tests

## 🚀 Getting Started

1. **Browse documentation**:
   ```bash
   ls -la docs/
   ```

2. **Understand your area**:
   ```bash
   # For setup
   cat docs/setup/QUICK_START_AUTOMATION.md
   
   # For crew coordination
   cat docs/crew/CREW_MEMORIES_GUIDE.md
   ```

3. **Ingest documentation** (one-time):
   ```bash
   npm run docs:ingest
   ```

4. **Use in your code**:
   ```typescript
   import { searchDocumentation } from '@story-agent/shared';
   const docs = await searchDocumentation('your query');
   ```

## 📚 Related Documentation

- [QUICK_START_AUTOMATION.md](./setup/QUICK_START_AUTOMATION.md) — Getting started
- [DOMAIN_DRIVEN_CREW_GUIDE.md](./domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md) — Domain routing
- [CREW_MEMORIES_GUIDE.md](./crew/CREW_MEMORIES_GUIDE.md) — Crew baseline knowledge
- [MIGRATION_AUTOMATION.md](./automation/MIGRATION_AUTOMATION.md) — Database automation

---

**All crew documentation is now searchable and accessible during task execution! 🚀**
