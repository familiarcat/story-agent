#!/usr/bin/env zsh
# Configure project MCP to use LOCAL Story Agent MCP over stdio.
#
# What this script does:
# 1) Updates .mcp.json "story-agent" server from hosted HTTP -> local stdio
# 2) Preserves all other MCP server entries (aha, figma, etc.)
# 3) Keeps project MCP servers pre-enabled in .claude/settings.local.json

set -euo pipefail
emulate -L zsh

ROOT="${0:A:h}/.."
cd "$ROOT"
ROOT="$(pwd)"

MCP_JSON="$ROOT/.mcp.json"
CLAUDE_SETTINGS="$ROOT/.claude/settings.local.json"

if [[ ! -f "$MCP_JSON" ]]; then
  echo "✗ Missing .mcp.json in repo root"
  exit 1
fi

echo "▶ 1/3 Updating story-agent MCP entry to local stdio"
python3 - "$MCP_JSON" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text())
servers = data.setdefault("mcpServers", {})

servers["story-agent"] = {
    "command": "scripts/mcp-crew-stdio.sh",
    "comment": (
        "OpenRouter crew over stdio — run_crew_mission_pipeline, crew memory recall/store, "
        "Aha, WorfGate, skills. The wrapper sources crew secrets. "
        "Lets Claude Code call the crew directly instead of tsx mission scripts. "
        "See docs/setup/claude-code-mcp.md."
    ),
}

path.write_text(json.dumps(data, indent=2) + "\n")
PY
echo "  ✓ story-agent -> scripts/mcp-crew-stdio.sh"

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
echo "  - Build MCP server if needed: pnpm --filter @story-agent/mcp-server run build"
echo "  - Restart Claude Code in this repo, then run: /mcp"
echo ""
echo "Done. Local stdio MCP is now the project default for story-agent."
