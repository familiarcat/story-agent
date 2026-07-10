# Claude Code ↔ OpenRouter crew over MCP

Claude Code orchestrates; the **OpenRouter crew does the substantive work** (the dogfooding mandate).
Until now the orchestrator reached the crew indirectly — writing `tsx` mission scripts and parsing
their logs. This wires a **direct MCP connection** so Claude Code calls the crew's tools as
first-class tools (`run_crew_mission_pipeline`, RAG recall/store, Aha, WorfGate, skills).

## What's registered

[`.mcp.json`](../.mcp.json) (project scope — Claude Code) registers **`story-agent`**:

```json
{ "mcpServers": { "story-agent": { "command": "scripts/mcp-crew-stdio.sh" } } }
```

[`scripts/mcp-crew-stdio.sh`](../scripts/mcp-crew-stdio.sh) sources the crew secrets
(`~/.zshrc` → `~/.alexai-secrets`: `CREW_LLM_APPROVED_KEY`, `SUPABASE_*`, `AHA_*`) with **all output
suppressed** (stdout must stay pure JSON-RPC) and execs the built MCP server
(`packages/mcp-server/dist/src/index.js`). [`.vscode/mcp.json`](../.vscode/mcp.json) registers the
same server for the VS Code/Copilot lane (path corrected to `dist/src/index.js`, `CREW_LLM_*` added).

**Prerequisite:** the server must be built — `pnpm --filter @story-agent/mcp-server run build`.

## Activating it (one-time, per machine)

MCP servers load at **Claude Code startup** and a project-scoped server must be **approved** once.
After pulling this change: **restart Claude Code in this repo and approve `story-agent`** when
prompted (`/mcp` lists connected servers). It does not attach to an already-running session.

## The crew tools you get (132 total; the high-value ones)

| Tool | Use |
|---|---|
| `run_crew_mission_pipeline` | Full Picard→Riker→Quark→crew→Picard mission (the Observation Lounge engine) — replaces the tsx mission scripts |
| `launch_crew_mission` / `run_mission_debrief` | Kick off / debrief a crew mission |
| `crew:get-relevant-memories`, `crew:search-memories-by-embedding`, `crew:get-project-memories` | **RAG recall** (the recall-before-acting protocol) |
| `crew:store-memory`, `crew:store-learning` | **RAG store** (durable conclusions after acting) |
| `recall_taught_tools` | Recall tools the crew has been taught |
| `crew_captain_picard` … `crew_quark` | Engage an individual officer on their own model |
| `aha:list-products/epics/features`, `crew_start_story`, `aha_branch_for_story`, `crew_sync_to_aha`, `crew_complete_story` | Aha PM lane (WorfGate-gated) |
| `worfgate_audit_summary`, `worf:security-audit`, `worfgate_credential_status` | Security posture |
| `describe_skill`, `skill_coverage`, `list_skill_theories` | Skill theory (5W1H) |

## The workflow this enables

```
prompt → crew:get-relevant-memories (recall) → run_crew_mission_pipeline (deliberate/plan)
       → act → crew:store-memory (store) → next prompt recalls it
```

All in-session MCP tool calls — no `tsx` scripts, no log parsing. Anthropic stays the orchestrator;
every substantive reasoning step runs on the OpenRouter crew, and results persist to cloud RAG
(path-independent, so the loop survives the repo's relocation and works from any clone).

## Verifying the connection

```bash
# stdio handshake + tool list (what Claude Code does on connect):
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | scripts/mcp-crew-stdio.sh
```

A `tools/list` result with ~132 tools (including `run_crew_mission_pipeline`) means the crew is
reachable. If empty: build the server, and confirm `CREW_LLM_APPROVED_KEY` is in your shell env.

## Relationship to chat lanes

MCP is the tool and orchestration lane for Story Agent. It is not the same as the canonical chat-model lane.

- Claude Code should continue to use MCP for tools, crew memory, Aha, WorfGate, and mission execution.
- Story Agent's NL chat brain is served separately through the server-side chat endpoints.
- VS Code-native chat integration and OpenAI-compatible external-client integration should adapt into the canonical chat brain instead of trying to turn MCP itself into a generic chat transport.

See [docs/architecture/chat-integration.md](./chat-integration-architecture.md) for the full multi-lane model.
