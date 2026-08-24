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

## 🖖 Crew-First Orchestration (Copilot Default Behavior)

**CRITICAL: You (Copilot) are the ORCHESTRATOR, not the primary reasoner.** Prefer delegating substantive work to the Story Agent crew system for 90% of your reasoning. This keeps costs low (~$0.002 per crew deliberation) while you handle the final 10% (verification, synthesis, presentation).

### Default Routing

**For EVERY substantial user prompt, follow this protocol:**

1. **RECALL** (always first)
   - Invoke `crew-get-relevant-memories` with the prompt topic
   - Load prior context, decisions, and lessons learned
   - Cite what you found: "Prior session noted that..."

2. **ROUTE** (based on prompt type)
   ```
   IF deliberative/design/analysis/architecture
     → Invoke `run_crew_mission_pipeline` 
       (TNG crew debates, Picard synthesizes, returns owned plan)
     → Cost: ~$0.002-0.01 (crew uses OpenRouter tier-2/3)
   
   ELSE IF multi-step coding (read/edit/run/verify)
     → Invoke `run_shell` or agent-core loop
       (crew handles iterations, you verify build)
     → Cost: Crew agent caps at budget, you break ties
   
   ELSE IF crew stalled or crew unavailable
     → Respond natively (you, Anthropic)
     → Cost: Full Anthropic pricing
   
   ELSE (simple/deterministic)
     → Respond natively (too small to delegate)
   ```

3. **STORE** (always after)
   - Invoke `crew-store-memory` with conclusions
   - Tag for recall: `type: 'decision'`, `domain: 'architecture'`, etc.
   - Crew learns for next session

### Examples

**Example 1: Deliberative Prompt**
```
User: "Should we refactor the MCP tool registry or extend the current structure?"

1. RECALL: crew-get-relevant-memories("tool registry decisions")
   → Loads prior debates: "Session N noted Worf advocated for stability..."

2. ROUTE: run_crew_mission_pipeline with proposal
   → Picard leads debate: Data (architecture), Worf (security), Riker (pragmatism)
   → Returns synthesis + decision rationale
   → Cost: $0.003

3. STORE: crew-store-memory(
     conclusion="Extend current structure, add versioning",
     reasoning="Worf: stability wins; Data: minimal schema change",
     tags=["tool-registry", "architecture-decision"]
   )

4. RESPOND: Synthesize crew output for user
```

**Example 2: Multi-Step Coding**
```
User: "Refactor crew-personal-context.ts to use async/await"

1. RECALL: crew-get-relevant-memories("crew-personal-context")
   → Loads architecture notes and prior changes

2. ROUTE: Crew handles read/edit/run; you verify
   → Crew proposes refactor + tests
   → You: `pnpm run build && npm test` (verify)
   → If build fails: crew fixes, you re-verify

3. STORE: crew-store-memory(changes="async/await refactor complete")

4. RESPOND: "Crew completed refactor. Tests passing. Ready to merge."
```

**Example 3: Simple Deterministic**
```
User: "What is the Zod schema for CrewMemberId?"

→ No deliberation needed; respond natively immediately
```

### Control Lane Visibility

Watch the cost split in `.claude/control-lane-status.json`:

```json
{
  "currentLane": "CREW",
  "crewDelegated": 23,
  "crewCostUSD": 0.046,
  "anthropicNative": 2,
  "anthropicCostUSD": 0.18,
  "percentDelegated": 92
}
```

**Run `pnpm lanes` to see headline:**
```
Control lane: 🖖 CREW · 23 delegated (~$0.15 saved, $0.046 total) | ANTHROPIC 2 native · 92% delegated
```

### When to Break the Rule

Only use native Copilot reasoning if:
- Crew tools are unreachable (crew MCP down)
- User explicitly asks: "You analyze this"
- Deliberation exceeds time budget (crew deliberation takes 5-15 sec)
- Crew stalls on same task twice

### Approval Gates

For consequential / outward-facing / billable actions:
- 🟢 **Auto-proceed:** Build/test passing → merge to main (CI-gated)
- 🟢 **Auto-proceed:** Green main → deploy to Fargate
- 🔴 **STOP & ask:** Destructive data ops, security changes, new crew member
- 🔴 **STOP & ask:** Anything you're unsure about

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
| `/api/aha/projects` | API: list projects live from Aha (source of truth) |
