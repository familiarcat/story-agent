#!/usr/bin/env zsh
# One-command setup for the Claude Code ↔ OpenRouter crew MCP connection (docs/claude-code-mcp.md).
#   1. build the MCP server   2. verify the stdio handshake lists run_crew_mission_pipeline
#   3. PRE-APPROVE the project MCP servers (so they load WITHOUT a manual prompt on restart)
#   4. print the activation step.
# Idempotent + safe (merges settings, never clobbers). Run from the repo root.
set -e
emulate -L zsh
source "$HOME/.zshrc" >/dev/null 2>&1 || true
ROOT="${0:A:h}/.."
cd "$ROOT"
ROOT="$(pwd)"

echo "▶ 1/4  Building the MCP server…"
pnpm --filter @story-agent/mcp-server run build >/dev/null
[[ -f packages/mcp-server/dist/src/index.js ]] || { echo "✗ build did not produce dist/src/index.js"; exit 1; }
echo "  ✓ built"

echo "▶ 2/4  Verifying the crew MCP handshake (initialize + tools/list)…"
TOOLS=$(printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"setup","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | (./scripts/mcp-crew-stdio.sh 2>/dev/null & SRV=$!; sleep 12; kill $SRV 2>/dev/null) \
  | python3 -c "import sys,json
n=0;has=False
for ln in sys.stdin:
    ln=ln.strip()
    if not ln.startswith('{'): continue
    try: m=json.loads(ln)
    except: continue
    if m.get('id')==2 and 'result' in m:
        ts=[t['name'] for t in m['result'].get('tools',[])]; n=len(ts); has='run_crew_mission_pipeline' in ts
print(f'{n} {has}')")
COUNT=${TOOLS%% *}; HAS=${TOOLS##* }
if [[ "$HAS" != "True" ]]; then echo "  ✗ handshake failed (got '$TOOLS') — is CREW_LLM_APPROVED_KEY in your env?"; exit 1; fi
echo "  ✓ $COUNT tools, run_crew_mission_pipeline present"

echo "▶ 3/4  Pre-approving project MCP servers (enabledMcpjsonServers)…"
mkdir -p .claude
python3 - "$ROOT/.claude/settings.local.json" "$ROOT/.mcp.json" <<'PY'
import json,sys,os
p=sys.argv[1]
mcp_p=sys.argv[2]
cfg=json.load(open(p)) if os.path.exists(p) else {}
mcp_cfg=json.load(open(mcp_p))
want=sorted(mcp_cfg.get("mcpServers",{}).keys())
cur=cfg.get("enabledMcpjsonServers",[])
cfg["enabledMcpjsonServers"]=sorted(set(cur)|set(want))
json.dump(cfg,open(p,"w"),indent=2)
print("  ✓ enabledMcpjsonServers =", cfg["enabledMcpjsonServers"])
PY
grep -q "^\.claude/settings\.local\.json$" .gitignore 2>/dev/null || echo ".claude/settings.local.json" >> .gitignore

echo "▶ 4/4  Done. Activate it:"
echo "    A fresh Claude Code session (new VS Code window at this repo) will auto-load + auto-approve"
echo "    'story-agent'. Open it with:  code -n \"$ROOT\""
echo "    Then verify in the new session:  /mcp   (story-agent → connected)"
