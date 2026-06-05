# Story Agent — Copilot Instructions

## Project Purpose
This is the story-agent monorepo. It contains:
- `packages/mcp-server` — MCP server with tools for Aha story ingestion, GitHub branch/PR management, and local SQLite state tracking
- `packages/ui` — Next.js 15 dashboard for tracking stories, PRs, and revision cycles
- `packages/shared` — TypeScript types shared between both packages

## MCP SDK Reference
- SDK: `@modelcontextprotocol/sdk` v1.x (stable)
- Docs: https://ts.sdk.modelcontextprotocol.io/
- Transport: stdio only (never write to stdout in MCP server — only stderr)
- Tool registration: `server.tool(name, description, zodSchema, handler)`

## Key Conventions
- MCP server uses ESM (`"type": "module"` in package.json)
- All tools use Zod v3 for input validation
- Database is **Supabase** (shared with ai-enterprise-os, same project) — all tables prefixed `sa_`
- DB client lives in `@story-agent/shared/db` — both MCP server and UI import from there
- `SUPABASE_URL` and `SUPABASE_KEY` env vars required (same values as ai-enterprise-os)
- GitHub API calls use `GITHUB_TOKEN` env var
- Aha API calls use `AHA_DOMAIN` + `AHA_API_KEY` env vars
- Branch naming: always use the Aha reference number (e.g. `STORY-123`) as the branch name
- Base branch resolution: prefer `dev`, fall back to repo default
- **All DB functions are async** — always `await` calls to `upsertStory`, `getStory`, `listStories`, etc.

## Two-Phase Workflow
See `/Users/brady.georgen.ext/Documents/workspace/prompts/` for the prompt templates:
- Phase 1: `story-execution-master-template.md` — implement and open PR
- Phase 2: `pr-revision-template.md` — process review comments and push revisions

## MCP Tool Catalog
| Tool | Phase | Description |
|---|---|---|
| `get_story` | 1 | Fetch Aha story by reference number |
| `list_stories` | 1 | List Aha stories for a project |
| `resolve_repository` | 1 | Resolve repo, detect dev/main base branch |
| `create_story_branch` | 1 | Create feature branch + store story in Supabase |
| `open_pull_request` | 1 | Open PR, record in Supabase |
| `deliver_mission_output` | 1 | **Integration:** called by ai-enterprise-os after factory mission — commits scaffolded files + opens PR |
| `update_aha_story_status` | 1+2 | Update Aha story workflow status by name (e.g. "In Progress", "Complete") |
| `link_aha_story_to_pr` | 1 | Post a comment on Aha story linking the GitHub PR for traceability |
| `prepare_story_for_execution` | 1 | **Observation Lounge** — fetch Aha story and populate execution brief for human review before Phase 1 |
| `sync_pr_comments` | 2 | Fetch PR comments, store in Supabase |
| `get_story_status` | 1+2 | Full story status from Supabase |
| `update_story_status` | 1+2 | Update story phase/status |
| `list_active_stories` | 1+2 | All tracked stories |
| `post_pr_comment` | 2 | Post comment on PR |

## Next.js UI Routes
| Route | Description |
|---|---|
| `/dashboard` | Story list with status summary |
| `/observation-lounge` | Fetch Aha story → populate execution brief → human review before Phase 1 |
| `/story/new` | Import Aha story into tracker (select project → story → import) |
| `/story/[storyId]` | Story detail, PR comments, revision cycles |
| `/api/aha/observation-lounge` | API: populate execution brief from Aha story |
| `/api/aha/projects` | API: list Aha projects |
| `/api/aha/stories` | API: list Aha stories for a project |
| `/api/aha/story` | API: fetch one Aha story |
| `/api/stories` | API: list tracked stories with open comment counts |
| `/api/stories/import` | API: import Aha story into Supabase tracker state |
| `/api/projects` | API: list tracked project records |
