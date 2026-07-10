# 🚀 Start Here — Story Agent Navigation

Welcome! This guide helps you navigate the story-agent monorepo and understand the key systems.

## 📍 Quick Navigation

### New to the Project?
1. Read [README.md](README.md) for project overview
2. Review [docs/setup/QUICK_START_AUTOMATION.md](docs/setup/QUICK_START_AUTOMATION.md) for environment setup
3. Check [docs/meta/documentation-guide.md](docs/meta/documentation-guide.md) to understand the RAG system

### Setting Up Development Environment?
→ [docs/setup/QUICK_START_AUTOMATION.md](docs/setup/QUICK_START_AUTOMATION.md)

### Working with Multiple Clients?
→ [docs/architecture/monorepo.md](docs/architecture/monorepo.md)

### Understanding Crew Personal Memories?
→ [docs/knowledge/crew-memory-guide.md](docs/knowledge/crew-memory-guide.md)

### Understanding Crew System?
→ [docs/crew/CREW_MEMORIES_GUIDE.md](docs/crew/CREW_MEMORIES_GUIDE.md)

### Learning Domain-Driven Design?
→ [docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md)

### Understanding Migration Automation?
→ [docs/automation/MIGRATION_AUTOMATION.md](docs/automation/MIGRATION_AUTOMATION.md)

### Running Tests?
→ [docs/testing/TESTING.md](docs/testing/TESTING.md)

---

## 📚 Documentation Organization

All documentation is organized in the `docs/` directory by category:

```
docs/
├── setup/              # Getting started, environment configuration
├── crew/               # Crew member guides and architecture
├── domain-driven/      # Domain-driven design system
├── automation/         # Migration & automation tools
├── testing/            # Testing and QA
├── DOCUMENTATION_GUIDE.md      # Guide to RAG system
├── docs/architecture/monorepo.md  # Multi-client guide
├── CREW_PERSONAL_MEMORIES_GUIDE.md        # Personal memory system
└── AUTONOMOUS_CREW_MISSION_TEST.md        # Example mission scenario
```

### Categories at a Glance

| Category | Purpose | Best For |
|----------|---------|----------|
| **setup/** | Getting started, credentials, prerequisites | New developers, DevOps |
| **crew/** | Crew baseline, architecture, integrity | Task assigners, architects |
| **domain-driven/** | Domain ownership, task routing, expertise | Task planners, coordinators |
| **automation/** | Migration tools, client onboarding, monitoring | Operations, DevOps |
| **testing/** | Test coverage, QA procedures, validation | QA engineers, testers |
| **docs/architecture/monorepo.md** | Multi-client project isolation | Project managers, architects |
| **CREW_PERSONAL_MEMORIES_GUIDE.md** | Individual crew member learning storage | All crew members |

---

## 🎯 By Role

### I'm a Developer

1. **First time setup**: Run `npm run db:auto-migrate` (2 min setup)
2. **Understand domains**: Read [docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md)
3. **Search documentation**: Use `npm run docs:ingest` to load docs into RAG
4. **Run tests**: See [docs/testing/TESTING.md](docs/testing/TESTING.md)

### I'm Managing a Client Project

1. **View projects**: Run `npm run project:list`
2. **Learn multi-client architecture**: Read [docs/architecture/monorepo.md](docs/architecture/monorepo.md)
3. **Understand crew assignments**: Run `npm run project:crew <project-id>`
4. **Create new project**: Copy from `projects/template-project/`
5. **Configure environment**: Edit `.env` with project credentials

### I'm Setting Up for a Client

1. **Client onboarding**: Run `npm run client:onboard` (3 min setup)
2. **Verify setup**: Run `npm run db:health-check`
3. **Check docs**: All documentation available in `docs/` directory

### I'm a Crew Member

1. **Understand your domains**: Check [docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md)
2. **Review baseline memories**: Read [docs/crew/CREW_MEMORIES_GUIDE.md](docs/crew/CREW_MEMORIES_GUIDE.md)
3. **Store personal memories**: Read [docs/knowledge/crew-memory-guide.md](docs/knowledge/crew-memory-guide.md)
4. **Search for docs during tasks**: Use RAG system (built-in to MCP tools)

### I'm Operating Systems

1. **Health monitoring**: Run `npm run db:health-check`
2. **View migrations**: Check [docs/automation/MIGRATION_AUTOMATION.md](docs/automation/MIGRATION_AUTOMATION.md)
3. **Ingest documentation**: Run `npm run docs:ingest`

---

## 🔧 Key npm Scripts

### Database & Automation
```bash
npm run db:auto-migrate        # Setup database (2 min)
npm run db:health-check        # Check health
npm run client:onboard         # Onboard new client (3 min)
```

### Project Management (Multi-Client)
```bash
npm run project:list           # List all projects
npm run project:select         # Select active project
npm run project:info           # Show current project
npm run project:crew           # Show crew assignments
```

### Documentation RAG
```bash
npm run docs:ingest            # Ingest docs into Supabase
npm run docs:ingest:dry        # Preview without writing
npm run docs:ingest:fresh      # Clear and re-ingest all
```

### Crew Management
```bash
npm run crew:seed-memories     # Load crew baseline knowledge
npm run crew:check             # Verify crew system health
```

### Development
```bash
npm run dev                    # Start MCP server + UI
npm run build                  # Build all packages
npm run typecheck              # TypeScript type checking
npm run test                   # Run all tests
```

---

## 📖 Key Documentation Files

**Root level** (overview):
- [README.md](README.md) — Project overview
- [COPILOT_SESSION_PROMPT.md](COPILOT_SESSION_PROMPT.md) — Agent customization

**Setup guides**:
- [docs/setup/QUICK_START_AUTOMATION.md](docs/setup/QUICK_START_AUTOMATION.md) — 2-minute quick start
- [docs/setup/SUPABASE_SETUP.md](docs/setup/SUPABASE_SETUP.md) — Database configuration

**Multi-client architecture**:
- [docs/architecture/monorepo.md](docs/architecture/monorepo.md) — Multi-project structure
- [projects/client-pctms/README.md](projects/client-pctms/README.md) — Example project setup

**Crew personal memories**:
- [docs/knowledge/crew-memory-guide.md](docs/knowledge/crew-memory-guide.md) — Individual learning storage

**Crew system**:
- [docs/crew/CREW_MEMORIES_GUIDE.md](docs/crew/CREW_MEMORIES_GUIDE.md) — Baseline knowledge
- [docs/crew/CREW_STARSHIP_ARCHITECTURE.md](docs/crew/CREW_STARSHIP_ARCHITECTURE.md) — System design

**Domain-driven design**:
- [docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md) — Complete guide
- [docs/domain-driven/DOMAIN_DRIVEN_CREW_COORDINATION_SUMMARY.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_COORDINATION_SUMMARY.md) — Summary

**Automation**:
- [docs/automation/MIGRATION_AUTOMATION.md](docs/automation/MIGRATION_AUTOMATION.md) — Migration tools
- [docs/automation/DELIVERY_SUMMARY_AUTOMATION.md](docs/automation/DELIVERY_SUMMARY_AUTOMATION.md) — What was delivered

**Testing & Mission Examples**:
- [docs/testing/autonomous-crew-mission-test.md](docs/testing/autonomous-crew-mission-test.md) — Complete mission example
- [docs/testing/TESTING.md](docs/testing/TESTING.md) — Test procedures

**Documentation system**:
- [docs/meta/documentation-guide.md](docs/meta/documentation-guide.md) — How to use RAG & docs

---

## 🚀 Quick Start Paths

### Path 1: Just Want to Get It Running (5 min)
```bash
source ~/.zshrc                 # Load credentials
npm run db:auto-migrate         # Setup database
npm run docs:ingest             # Load documentation
npm run dev                      # Start development
```

### Path 2: Onboarding a New Client (10 min)
```bash
source ~/.zshrc                 # Load credentials
npm run client:onboard          # Interactive setup
npm run db:health-check         # Verify
npm run docs:ingest             # Load documentation
```

### Path 3: Full System Understanding (1-2 hours)
1. Read [README.md](README.md) (10 min)
2. Read [docs/setup/QUICK_START_AUTOMATION.md](docs/setup/QUICK_START_AUTOMATION.md) (5 min)
3. Understand domains: [docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md) (20 min)
4. Study crew system: [docs/crew/CREW_STARSHIP_ARCHITECTURE.md](docs/crew/CREW_STARSHIP_ARCHITECTURE.md) (20 min)
5. Review migrations: [docs/automation/MIGRATION_AUTOMATION.md](docs/automation/MIGRATION_AUTOMATION.md) (15 min)
6. Explore code: Run `npm run dev` and browse packages/ (30 min)

---

## 🆘 Troubleshooting

**Environment issues?** → [docs/setup/MISSING_CREDENTIALS.md](docs/setup/MISSING_CREDENTIALS.md)

**Database problems?** → Run `npm run db:health-check`

**Documentation not found?** → Run `npm run docs:ingest`

**Crew system issues?** → Check [docs/crew/CREW_INTEGRITY_TOOLS_REFERENCE.md](docs/crew/CREW_INTEGRITY_TOOLS_REFERENCE.md)

---

## 📊 Project Structure

```
story-agent/                           # Root monorepo
├── README.md                          # Main project overview
├── START_HERE.md                      # This file
├── COPILOT_SESSION_PROMPT.md          # Agent customization
├── .github/
│   └── CODEOWNERS                     # GitHub access control
├── docs/                              # All documentation
│   ├── setup/                         # Getting started guides
│   ├── crew/                          # Crew documentation
│   ├── domain-driven/                 # Domain-driven design
│   ├── automation/                    # Automation tools
│   ├── testing/                       # Testing guides
│   ├── DOCUMENTATION_GUIDE.md         # RAG system guide
│   ├── docs/architecture/monorepo.md  # Multi-client
│   ├── CREW_PERSONAL_MEMORIES_GUIDE.md        # Personal memories
│   └── AUTONOMOUS_CREW_MISSION_TEST.md        # Example mission
├── packages/
│   ├── mcp-server/                    # MCP server (crew interface)
│   ├── ui/                            # Next.js dashboard
│   ├── shared/                        # Shared TypeScript types & crew utilities
│   └── vscode-extension/              # VS Code extension
├── projects/                          # Multi-client projects
│   ├── client-pctms/                   # Client Pharmaceutical project
│   │   ├── .env.example               # Configuration template
│   │   ├── README.md                  # Project setup
│   │   └── supabase/                  # Project-specific migrations
│   ├── template-project/              # Template for new projects
│   └── ...                            # Other client projects
├── scripts/                           # Automation & tooling scripts
├── supabase/                          # Shared database migrations
└── package.json                       # Root workspace config
```

---

## ✨ What You Can Do Now

✅ **Setup in 2 minutes** — Run `npm run db:auto-migrate`

✅ **Manage multiple client projects** — Use `npm run project:list` and `npm run project:select`

✅ **Store crew personal memories** — Track individual learning across projects

✅ **Retrieve crew expertise** — Access accumulated knowledge from past projects

✅ **Ingest documentation** — Run `npm run docs:ingest`

✅ **Understand domains** — Read domain-driven guide

✅ **Execute crew missions** — With expert-driven task routing

✅ **Search documentation** — RAG system provides context

✅ **Monitor health** — Run `npm run db:health-check`

---

## 🎯 Next Steps

**Choose your next action:**

- 👨‍💻 [Setup development environment](docs/setup/QUICK_START_AUTOMATION.md)
- 🌍 [Setup multi-client projects](docs/architecture/monorepo.md)
- 🧠 [Learn crew personal memories](docs/knowledge/crew-memory-guide.md)
- 📊 [Understand automation tools](docs/automation/MIGRATION_AUTOMATION.md)
- 🎯 [Learn domain-driven design](docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md)
- 👥 [Review crew system](docs/crew/CREW_MEMORIES_GUIDE.md)
- 📖 [Explore all documentation](docs/meta/documentation-guide.md)

---

**Welcome to story-agent! Happy coding! 🚀**
