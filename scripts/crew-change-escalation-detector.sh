#!/bin/bash
# Crew Code-Change Escalation Detector
# Monitors git commits on main branch during active missions
# Triggers immediate Riker + Picard escalation + end-to-end deployment

set -e

REPO_DIR="${1:-.}"
MISSION_STATE_FILE="${REPO_DIR}/.claude/mission-state.json"
LAST_COMMIT_FILE="${REPO_DIR}/.claude/last-checked-commit"

cd "$REPO_DIR"

# Check if there's an active mission (canary, staging, production)
if [ ! -f "$MISSION_STATE_FILE" ]; then
  exit 0  # No active mission, normal hourly cadence continues
fi

MISSION_STATUS=$(jq -r '.status' "$MISSION_STATE_FILE" 2>/dev/null || echo "")
if [ "$MISSION_STATUS" != "active" ]; then
  exit 0  # Mission not active
fi

# Get current HEAD commit
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null)
if [ -z "$CURRENT_COMMIT" ]; then
  exit 1  # Not a git repo
fi

# Get last commit we checked
LAST_COMMIT=""
if [ -f "$LAST_COMMIT_FILE" ]; then
  LAST_COMMIT=$(cat "$LAST_COMMIT_FILE")
fi

# No change since last check
if [ "$CURRENT_COMMIT" = "$LAST_COMMIT" ]; then
  exit 0
fi

# NEW COMMIT DETECTED — Trigger escalation
echo "=== CODE CHANGE DETECTED ==="
echo "Previous: ${LAST_COMMIT:0:7}"
echo "Current:  ${CURRENT_COMMIT:0:7}"
echo ""

# Get commit details
COMMIT_MSG=$(git log -1 --pretty=%B "$CURRENT_COMMIT")
COMMIT_AUTHOR=$(git log -1 --pretty=%an "$CURRENT_COMMIT")
COMMIT_FILES=$(git diff-tree --no-commit-id --name-only -r "$CURRENT_COMMIT" | head -20)

echo "Author: $COMMIT_AUTHOR"
echo "Message: $COMMIT_MSG"
echo "Files changed:"
echo "$COMMIT_FILES" | sed 's/^/  /'
echo ""

# Trigger crew escalation via MCP
echo "Triggering crew code-change escalation..."

# Call crew mission pipeline with code-change context
# This would be invoked via the story-agent MCP server
cat > "$REPO_DIR/.claude/code-change-context.json" << JSON
{
  "trigger": "code-change",
  "commit": "$CURRENT_COMMIT",
  "previous_commit": "$LAST_COMMIT",
  "author": "$COMMIT_AUTHOR",
  "message": "$COMMIT_MSG",
  "files": $(echo "$COMMIT_FILES" | jq -R . | jq -s .)
}
JSON

# Update last-checked commit
echo "$CURRENT_COMMIT" > "$LAST_COMMIT_FILE"

echo "✓ Escalation context stored to .claude/code-change-context.json"
echo "✓ Riker + Picard will execute immediate assessment"
