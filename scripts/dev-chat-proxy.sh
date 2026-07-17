#!/usr/bin/env bash

# VSCode WebSocket chat proxy startup script with auto-restart and monitoring.
#
# This script starts the chat-proxy service with the following features:
# - Auto-restart on crashes (exponential backoff, max 3 retries)
# - Connection metrics logging (every 30s)
# - Error tracking and log aggregation
# - Graceful shutdown on SIGINT/SIGTERM
#
# Usage:
#   ./scripts/dev-chat-proxy.sh [--no-restart] [--verbose]
#
# Environment variables:
#   STORY_AGENT_CHAT_PROXY_PORT    Port for proxy (default: 3105)
#   STORY_AGENT_CHAT_PROXY_LOG     Log file path (default: .claude/chat-proxy.log)
#   NODE_ENV                        Set to 'development' (default)

set -euo pipefail

# Configuration
PROXY_PORT="${STORY_AGENT_CHAT_PROXY_PORT:-3105}"
LOG_FILE="${STORY_AGENT_CHAT_PROXY_LOG:-.claude/chat-proxy.log}"
ENABLE_RESTART="${STORY_AGENT_CHAT_PROXY_RESTART:-true}"
VERBOSE="${VERBOSE:-false}"
MAX_RESTART_ATTEMPTS=3
RESTART_BACKOFF_SEC=2

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Trap signals for graceful shutdown
cleanup() {
  local exit_code=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chat proxy shutting down (exit code: $exit_code)" | tee -a "$LOG_FILE"

  # Kill any child processes
  if [[ -n "${PROXY_PID:-}" ]] && kill -0 "$PROXY_PID" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sending SIGTERM to proxy (PID: $PROXY_PID)" | tee -a "$LOG_FILE"
    kill -TERM "$PROXY_PID" 2>/dev/null || true

    # Wait for graceful shutdown (max 5s)
    for _ in {1..50}; do
      if ! kill -0 "$PROXY_PID" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done

    # Force kill if still running
    if kill -0 "$PROXY_PID" 2>/dev/null; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Force killing proxy (PID: $PROXY_PID)" | tee -a "$LOG_FILE"
      kill -9 "$PROXY_PID" 2>/dev/null || true
    fi
  fi

  exit "$exit_code"
}

trap cleanup EXIT INT TERM

# Function to check if proxy is ready
check_proxy_health() {
  local max_wait_sec=30
  local waited=0

  while [[ $waited -lt $max_wait_sec ]]; do
    if nc -z localhost "$PROXY_PORT" 2>/dev/null; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chat proxy health check PASSED (port $PROXY_PORT reachable)" | tee -a "$LOG_FILE"
      return 0
    fi
    sleep 1
    ((waited++))
  done

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Chat proxy health check FAILED (port $PROXY_PORT unreachable after ${max_wait_sec}s)" | tee -a "$LOG_FILE"
  return 1
}

# Function to start proxy with monitoring
start_proxy() {
  local attempt=$1

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting chat proxy (attempt $attempt/$MAX_RESTART_ATTEMPTS)..." | tee -a "$LOG_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Port: $PROXY_PORT | Log: $LOG_FILE | Node version: $(node --version)" | tee -a "$LOG_FILE"

  # Build the start command
  local cmd="node --watch dist/src/agent-core/chat-proxy-server.js"

  # Execute with environment and logging
  if [[ "$VERBOSE" == "true" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Command: NODE_ENV=development $cmd" | tee -a "$LOG_FILE"
  fi

  NODE_ENV=development \
  STORY_AGENT_CHAT_PROXY_PORT="$PROXY_PORT" \
  $cmd >> "$LOG_FILE" 2>&1 &

  PROXY_PID=$!
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chat proxy started (PID: $PROXY_PID)" | tee -a "$LOG_FILE"

  # Wait for startup and health check
  sleep 2
  if ! check_proxy_health; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Health check failed" | tee -a "$LOG_FILE"
    return 1
  fi

  return 0
}

# Function to monitor metrics
monitor_metrics() {
  local interval=30

  while [[ -n "${PROXY_PID:-}" ]] && kill -0 "$PROXY_PID" 2>/dev/null; do
    sleep "$interval"

    # Try to get metrics from proxy (requires metrics endpoint or log parsing)
    if [[ "$VERBOSE" == "true" ]]; then
      local active_connections=$(curl -s "http://localhost:$PROXY_PORT/metrics" 2>/dev/null | grep -o '"activeConnections":[0-9]*' | cut -d: -f2 || echo "?")
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Metrics: Active connections=$active_connections" | tee -a "$LOG_FILE"
    fi
  done
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-restart)
      ENABLE_RESTART="false"
      shift
      ;;
    --verbose)
      VERBOSE="true"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Main loop with restart logic
attempt=1
while [[ $attempt -le $MAX_RESTART_ATTEMPTS ]]; do
  if start_proxy "$attempt"; then
    # Monitor proxy in background
    monitor_metrics &
    local monitor_pid=$!

    # Wait for proxy to exit
    wait "$PROXY_PID" 2>/dev/null || true
    local exit_code=$?

    # Kill monitor process
    kill "$monitor_pid" 2>/dev/null || true

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chat proxy exited with code $exit_code" | tee -a "$LOG_FILE"

    if [[ "$ENABLE_RESTART" != "true" ]]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Auto-restart disabled, exiting" | tee -a "$LOG_FILE"
      exit "$exit_code"
    fi

    # Calculate backoff with exponential growth
    local backoff_sec=$((RESTART_BACKOFF_SEC * (2 ** (attempt - 1))))

    if [[ $attempt -lt $MAX_RESTART_ATTEMPTS ]]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restarting in ${backoff_sec}s (attempt $((attempt + 1))/$MAX_RESTART_ATTEMPTS)..." | tee -a "$LOG_FILE"
      sleep "$backoff_sec"
    fi
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Failed to start proxy (attempt $attempt/$MAX_RESTART_ATTEMPTS)" | tee -a "$LOG_FILE"

    if [[ $attempt -lt $MAX_RESTART_ATTEMPTS ]]; then
      local backoff_sec=$((RESTART_BACKOFF_SEC * (2 ** (attempt - 1))))
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retrying in ${backoff_sec}s..." | tee -a "$LOG_FILE"
      sleep "$backoff_sec"
    fi
  fi

  ((attempt++))
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Chat proxy failed after $MAX_RESTART_ATTEMPTS attempts, giving up" | tee -a "$LOG_FILE"
exit 1
