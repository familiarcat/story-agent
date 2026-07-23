#!/usr/bin/env bash
# scripts/worfgate-grant-cc-permissions.sh
#
# WorfGate-GOVERNED grant of Claude Code harness permissions — OPERATOR-RUN ONLY.
#
# WHY THIS IS A SEPARATE, HUMAN-RUN SCRIPT:
#   WorfGate (packages/shared/src/worfgate-credentials.ts) brokers APPLICATION/crew
#   credentials — it has no reach into the Claude Code (Anthropic) harness. The harness
#   deliberately blocks the AGENT from editing .claude/settings.json to grant its own
#   permissions (anti self-escalation). The legitimate path is: WorfGate defines + audits
#   the policy, and a HUMAN applies it. You running this script IS that human authorization.
#
# It adds the CI-gated auto-merge + auto-deploy allow-rules (per the CLAUDE.md
# "Autonomy envelope"), idempotently, and writes a WorfGate audit record.
#
# Usage:  scripts/worfgate-grant-cc-permissions.sh          # apply the grant
#         scripts/worfgate-grant-cc-permissions.sh --dry-run # show the diff only
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SETTINGS="$REPO_ROOT/.claude/settings.json"
AUDIT="$REPO_ROOT/.claude/worfgate-audit.jsonl"
DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

command -v jq >/dev/null || { echo "jq is required"; exit 1; }
[[ -f "$SETTINGS" ]] || { echo "{}" > "$SETTINGS"; }

# The governed rule-set (minimal scope — only what the autonomy envelope needs).
RULES='["Bash(gh pr merge:*)","Bash(gh workflow run:*)","Bash(gh run watch:*)","Bash(gh run view:*)","Bash(gh run list:*)"]'

NEXT="$(jq --argjson rules "$RULES" '
  .permissions = (.permissions // {}) |
  .permissions.allow = (((.permissions.allow // []) + $rules) | unique)
' "$SETTINGS")"

echo "── WorfGate grant preview (permissions.allow) ─────────────────"
echo "$NEXT" | jq '.permissions.allow'

if $DRY_RUN; then
  echo "(dry-run — no changes written)"
  exit 0
fi

# Apply (atomic write) + audit.
TMP="$(mktemp)"
printf '%s\n' "$NEXT" > "$TMP"
mv "$TMP" "$SETTINGS"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"ts":"%s","officer":"worf","action":"grant-cc-permissions","actor":"%s","rules":%s}\n' \
  "$TS" "${USER:-operator}" "$RULES" >> "$AUDIT"

echo ""
echo "✓ Granted Claude Code permissions (audited → .claude/worfgate-audit.jsonl)"
echo "  Reload with /permissions (or restart Claude Code) so the harness picks them up."
