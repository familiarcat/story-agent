#!/usr/bin/env zsh
# Claude Code ↔ OpenRouter crew — MCP stdio bridge.
#
# Lets Claude Code (or any MCP client) call the crew's tools DIRECTLY — run_crew_mission_pipeline,
# crew memory recall/store, Aha, WorfGate, skills — instead of shelling out to tsx mission scripts.
# Registered as the "story-agent" server in .mcp.json (project scope).
#
# It sources the crew secrets (~/.zshrc → ~/.alexai-secrets: CREW_LLM_APPROVED_KEY, SUPABASE_*, AHA_*)
# with ALL output suppressed, then execs the built MCP server. stdout MUST stay pure JSON-RPC, so the
# `source` is redirected to /dev/null and only `node` inherits stdout.
emulate -L zsh
source "$HOME/.zshrc" >/dev/null 2>&1 || true

DIR="${0:A:h}"
ENTRY="$DIR/../packages/mcp-server/dist/src/index.js"
if [[ ! -f "$ENTRY" ]]; then
  print -u2 "mcp-crew-stdio: build missing — run: pnpm --filter @story-agent/mcp-server run build"
  exit 1
fi
exec node "$ENTRY"
