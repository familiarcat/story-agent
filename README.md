# Story Agent

Agentic two-phase story delivery system.  
Point at an Aha story → branch gets created → code gets implemented → PR opens → review comments tracked → revisions pushed → PR merged.

## Architecture

```
story-agent/
├── docs/
│   ├── knowledge/      Long-form generated docs (architecture, UI, roadmap, summaries)
│   ├── phases/         Phase-by-phase execution reading path
│   └── vector/         Vector indexing metadata and ingestion notes
├── packages/
│   ├── mcp-server/     MCP stdio server — tools for Aha, GitHub, delivery state
│   ├── ui/             Next.js 15 dashboard — story tracker + PR comment viewer
│   └── shared/         Shared TypeScript types + Supabase DB access
├── supabase/           SQL migration for story-agent tables + RLS policies
├── specs/              Canonical API schema
├── contracts/agents/   Agent role contract schemas and versioned contracts
├── planning/           Sprint backlog import artifacts
├── .vscode/mcp.json    Registers MCP server with VS Code Copilot
└── .env                API credentials (copy from .env.example)
```

## Prerequisites

- Node.js 22+ and pnpm 9+ (pinned in [`.tool-versions`](.tool-versions) / [`.nvmrc`](.nvmrc);
  `package.json` declares `engines` + `packageManager` so `corepack enable` selects the right pnpm).
- Supabase project (URL + service key for server-side access)
- Aha API key (Settings → Security → API key)
- GitHub Personal Access Token (repo + pull_request scopes)

> **Cross-platform (macOS / Linux / Windows):** the repo is self-contained and clones cleanly on any
> OS — line endings are normalized to LF via [`.gitattributes`](.gitattributes), all config comes from
> `.env` (no machine-specific paths), and the toolchain is pinned. On Windows use WSL2 or Git Bash so
> the `*.sh` ops scripts run; the app itself (build / test / dev / `tsx` scripts) is pure Node and
> runs natively. **Do not place the clone in a cloud-synced folder** (iCloud/OneDrive/Dropbox) — it
> corrupts `.git`; see [docs/setup/git-push-resilience.md](docs/setup/git-push-resilience.md).

## Setup

```bash
git clone <repo-url> story-agent   # clone into a NON-cloud-synced path (e.g. ~/Developer)
cd story-agent
corepack enable                    # use the pinned pnpm (or: npm i -g pnpm@9)
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, AHA_DOMAIN, AHA_API_KEY, GITHUB_TOKEN, GITHUB_DEFAULT_ORG

pnpm install
pnpm build          # build shared + mcp-server + ui
```

## Running

```bash
# MCP server only (used by VS Code Copilot via .vscode/mcp.json)
pnpm mcp

# Next.js dashboard only
pnpm ui

# Both together
pnpm dev
```

Dashboard: http://localhost:3000

## MCP Tools (available to Copilot)

| Tool | Purpose |
|---|---|
| `get_story` | Fetch Aha story by LADV-#### |
| `list_stories` | List stories for a project |
| `list_aha_projects` | List available Aha projects |
| `resolve_repository` | Detect base branch (dev → main) |
| `create_story_branch` | Create branch + record story in DB |
| `open_pull_request` | Open PR against base branch |
| `deliver_mission_output` | Commit mission output files and open a PR |
| `sync_pr_comments` | Pull latest comments from GitHub |
| `get_story_status` | Full story state + open comments |
| `update_story_status` | Update phase and status |
| `list_active_stories` | All tracked stories |
| `post_pr_comment` | Post a comment on the PR |

## UI/API Endpoints

- `GET /api/aha/projects` - list Aha projects
- `GET /api/aha/stories?projectId=...` - list Aha stories for a project
- `GET /api/aha/story?referenceNum=LADV-####` - fetch one Aha story
- `POST /api/chat/stream` - SSE/JSONL chat-compatible stream adapter (cs-p3-material-investigation-ui integration)
- `POST /api/stories/import` - import an Aha story into tracker state
- `GET /api/stories` - list tracked stories with open comment counts
- `GET /api/aha/projects` - list projects live from Aha (source of truth)

## Integration Artifacts

- `specs/openapi.v1.yaml`
- `contracts/agents/role-contracts.schema.json`
- `contracts/agents/contracts.v1.json`
- `planning/sprints-1-3-jira-import.csv`

## Documentation Navigation

- `START_HERE.md` - root pointer to the docs hub
- `docs/phases/PHASED_EXECUTION.md` - phased execution path
- `docs/knowledge/START_HERE.md` - role-based deep-dive guide

## Two-Phase Workflow

```
get_story(LADV-2627)
  └─► create_story_branch(LADV-2627, client-int/product-profile-ui)
        └─► [agent implements changes locally, commits, pushes]
              └─► open_pull_request(LADV-2627, title, body)
                    └─► sync_pr_comments(LADV-2627)   ← repeat on each review round
                          └─► [agent addresses comments, pushes, posts response]
                                └─► update_story_status(LADV-2627, merged)
```

## Extending

- Add more MCP tools in `packages/mcp-server/src/tools/`
- Add more dashboard pages in `packages/ui/src/app/`
- See `packages/shared/src/index.ts` for the data model
- Prompt templates live in `/Users/brady.georgen.ext/Documents/workspace/prompts/`
