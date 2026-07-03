#!/usr/bin/env zsh
# Claude Code ↔ OpenRouter crew — MCP stdio bridge.
#
# Lets Claude Code (or any MCP client) call the crew's tools DIRECTLY — run_crew_mission_pipeline,
# crew memory recall/store, Aha, WorfGate, skills — instead of shelling out to tsx mission scripts.
# Registered as the "story-agent" server in .mcp.json (project scope).
#
# Secrets loading (SINGLE SOURCE = ~/.alexai-secrets, via ~/.zshenv) — so this non-interactive crew
# lane resolves the SAME credentials as every other lane (the Bash tool, agent-core). ~/.zshrc is a
# transitional fallback only, removable once `scripts/consolidate-secrets.sh --apply` has migrated any
# secrets still living in ~/.zshrc into ~/.alexai-secrets. All output suppressed — stdout MUST stay
# pure JSON-RPC, so sourcing is redirected to /dev/null and only `node` inherits stdout.
emulate -L zsh
source "$HOME/.zshenv" >/dev/null 2>&1 || true   # → ~/.alexai-secrets (the single source of truth)
source "$HOME/.zshrc"  >/dev/null 2>&1 || true   # transitional fallback (pre-consolidation)

DIR="${0:A:h}"
ENTRY="$DIR/../packages/mcp-server/dist/src/index.js"
if [[ ! -f "$ENTRY" ]]; then
  print -u2 "mcp-crew-stdio: build missing — run: pnpm --filter @story-agent/mcp-server run build"
  exit 1
fi
exec node "$ENTRY"
