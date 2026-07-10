#!/usr/bin/env zsh
# Configure project MCP to default to the HOSTED Story Agent MCP endpoint.
#
# What this script does:
# 1) Updates .mcp.json "story-agent" server from local stdio -> hosted HTTP
# 2) Preserves all other MCP server entries (aha, figma, etc.)
# 3) Injects WorfGate-required HTTP headers (Authorization + user-session-id)
# 4) Ensures .claude/settings.local.json pre-enables project MCP servers
#
# Environment overrides:
#   STORY_AGENT_MCP_URL          Hosted MCP URL (default from deployment runbook)
#   STORY_AGENT_MCP_BEARER_ENV   Env var name holding bearer token (default: STORY_AGENT_MCP_BEARER)
#   STORY_AGENT_MCP_SESSION_ID   Optional explicit session id
#   STORY_AGENT_MCP_CLIENT_ID    Optional client id header (default: familiarcat)

set -euo pipefail
emulate -L zsh

source "$HOME/.zshenv" >/dev/null 2>&1 || true
source "$HOME/.zshrc" >/dev/null 2>&1 || true

ROOT="${0:A:h}/.."
cd "$ROOT"
ROOT="$(pwd)"

MCP_JSON="$ROOT/.mcp.json"
CLAUDE_SETTINGS="$ROOT/.claude/settings.local.json"

MCP_URL="${STORY_AGENT_MCP_URL:-http://story-agent-alb-651393427.us-east-2.elb.amazonaws.com/mcp}"
BEARER_ENV_NAME="${STORY_AGENT_MCP_BEARER_ENV:-STORY_AGENT_MCP_BEARER}"
CLIENT_ID="${STORY_AGENT_MCP_CLIENT_ID:-familiarcat}"

if [[ -z "${STORY_AGENT_MCP_SESSION_ID:-}" ]]; then
  export STORY_AGENT_MCP_SESSION_ID="claude-hosted-$(hostname)-$(date +%Y%m%d)"
fi

if [[ ! -f "$MCP_JSON" ]]; then
  echo "✗ Missing .mcp.json in repo root"
  exit 1
fi

echo "▶ 1/3 Updating story-agent MCP entry to hosted HTTP"
python3 - "$MCP_JSON" "$MCP_URL" "$BEARER_ENV_NAME" "$CLIENT_ID" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
url = sys.argv[2]
bearer_env = sys.argv[3]
client_id = sys.argv[4]

data = json.loads(path.read_text())
servers = data.setdefault("mcpServers", {})

servers["story-agent"] = {
    "type": "http",
    "url": url,
    "headers": {
        "Authorization": f"Bearer ${{{bearer_env}}}",
        "user-session-id": "${STORY_AGENT_MCP_SESSION_ID}",
        "x-client-id": client_id,
    },
    "comment": (
        "Hosted Story Agent MCP over HTTP. WorfGate security headers are required: "
        "Bearer token + user-session-id. x-client-id scopes policy resolution."
    ),
}

path.write_text(json.dumps(data, indent=2) + "\n")
PY
echo "  ✓ story-agent -> $MCP_URL"

echo "▶ 2/3 Pre-enabling project MCP servers for Claude Code"
mkdir -p "$ROOT/.claude"
python3 - "$CLAUDE_SETTINGS" "$MCP_JSON" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
mcp_path = Path(sys.argv[2])
cfg = json.loads(path.read_text()) if path.exists() else {}

mcp_cfg = json.loads(mcp_path.read_text())
want = sorted(mcp_cfg.get("mcpServers", {}).keys())

cur = cfg.get("enabledMcpjsonServers", [])
cfg["enabledMcpjsonServers"] = sorted(set(cur) | set(want))

path.write_text(json.dumps(cfg, indent=2) + "\n")
print("  ✓ enabledMcpjsonServers =", cfg["enabledMcpjsonServers"])
PY

if ! grep -q '^\.claude/settings\.local\.json$' .gitignore 2>/dev/null; then
  echo ".claude/settings.local.json" >> .gitignore
fi

echo "▶ 3/4 Syncing VS Code MCP config from .mcp.json"
node "$ROOT/scripts/sync-vscode-mcp.mjs"

echo "▶ 4/4 Verification hints"
echo "  - Ensure ${BEARER_ENV_NAME} is exported in ~/.alexai-secrets (sourced by ~/.zshenv)"
echo "  - STORY_AGENT_MCP_SESSION_ID=${STORY_AGENT_MCP_SESSION_ID}"
echo "  - Restart Claude Code in this repo, then run: /mcp"
echo ""
echo "Done. Hosted MCP is now the project default for story-agent."
