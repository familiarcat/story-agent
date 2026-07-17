#!/bin/bash
# dev-sync-server.sh — Start the WebSocket Sync Server for local development
#
# Usage:
#   ./scripts/dev-sync-server.sh
#
# Environment:
#   STORY_AGENT_SYNC_PORT   Override port (default: 3106)
#   NODE_ENV                development (default) or production

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

# Defaults
PORT="${STORY_AGENT_SYNC_PORT:-3106}"
NODE_ENV="${NODE_ENV:-development}"

echo "[dev-sync-server] Starting WebSocket Sync Server"
echo "[dev-sync-server] Port: $PORT"
echo "[dev-sync-server] Environment: $NODE_ENV"
echo "[dev-sync-server] PID file: .claude/sync-server.pid"

# Build if needed
if [ ! -d "$PROJECT_ROOT/packages/mcp-server/dist" ]; then
  echo "[dev-sync-server] Building..."
  cd "$PROJECT_ROOT"
  pnpm --filter @story-agent/mcp-server run build
fi

# Save PID for hot-reload process management
echo $$ > "$PROJECT_ROOT/.claude/sync-server.pid"

# Start the server
cd "$PROJECT_ROOT"
export STORY_AGENT_SYNC_PORT="$PORT"
export NODE_ENV="$NODE_ENV"

npx tsx packages/mcp-server/src/agent-core/sync-server.ts
