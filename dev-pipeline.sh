#!/usr/bin/env bash

#############################################################################
# Story Agent Monorepo — Unified Development & Hot-Reload Pipeline
#
# Orchestrates end-to-end development workflow:
#  • Code changes → Shared package rebuild
#  • Shared changes → MCP server rebuild (+ hot-reload if enabled)
#  • Shared/MCP changes → UI rebuild (+ hot-reload if enabled)
#  • Shared/MCP changes → VSCode extension rebuild (+ hot-reload if enabled)
#
# Usage:
#   ./dev-pipeline.sh              # Start full dev stack with hot-reload
#   ./dev-pipeline.sh --build-only # Build once, no watch
#   ./dev-pipeline.sh --ui-only    # Dashboard only
#   ./dev-pipeline.sh --ext-only   # VSCode extension only
#   ./dev-pipeline.sh --hot-mcp    # Enable MCP hot-reload (requires manual restart)
#############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"
STORY_AGENT_AGENT_PORT="${STORY_AGENT_AGENT_PORT:-3103}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_ONLY=false
UI_ONLY=false
EXT_ONLY=false
HOT_MCP=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --build-only) BUILD_ONLY=true; shift ;;
    --ui-only) UI_ONLY=true; shift ;;
    --ext-only) EXT_ONLY=true; shift ;;
    --hot-mcp) HOT_MCP=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

#############################################################################
# Logging Functions
#############################################################################

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
  echo -e "${RED}✗${NC} $*"
}

log_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$*${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

#############################################################################
# Utility Functions
#############################################################################

check_pnpm() {
  if ! command -v pnpm &> /dev/null; then
    log_error "pnpm not found. Install with: npm install -g pnpm"
    exit 1
  fi
  log_success "pnpm found: $(pnpm --version)"
}

check_node() {
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    exit 1
  fi
  log_success "Node.js found: $(node --version)"
}

check_redis() {
  if ! command -v redis-cli &> /dev/null; then
    log_warn "redis-cli not found. Redis operations may not work."
    return 1
  fi
  if redis-cli -u "${REDIS_URL:-redis://127.0.0.1:6379}" PING &> /dev/null; then
    log_success "Redis is running"
    return 0
  else
    log_warn "Redis not reachable at ${REDIS_URL:-redis://127.0.0.1:6379}"
    return 1
  fi
}

#############################################################################
# Build Functions
#############################################################################

build_shared() {
  log_header "Building @story-agent/shared"
  cd "$PROJECT_ROOT/packages/shared"
  pnpm run build
  log_success "Shared package built"
}

build_mcp() {
  log_header "Building @story-agent/mcp-server"
  cd "$PROJECT_ROOT/packages/mcp-server"
  pnpm run build
  log_success "MCP server built"
}

build_ui() {
  log_header "Building @story-agent/ui"
  cd "$PROJECT_ROOT/packages/ui"
  pnpm run build
  log_success "UI built"
}

build_vscode() {
  log_header "Building story-agent-vscode"
  cd "$PROJECT_ROOT/packages/vscode-extension"
  pnpm run build
  log_success "VSCode extension built"
}

build_all() {
  build_shared
  build_mcp
  build_ui
  build_vscode
}

#############################################################################
# Hot-Reload Development Functions
#############################################################################

dev_mcp() {
  log_header "Starting MCP Server (Dev Mode)"
  export STORY_AGENT_AGENT_PORT="$STORY_AGENT_AGENT_PORT"
  cd "$PROJECT_ROOT/packages/mcp-server"

  if [ "$HOT_MCP" = true ]; then
    log_info "MCP hot-reload enabled (watch mode)"
    pnpm run dev
  else
    log_info "MCP starting in standard mode"
    log_warn "For hot-reload, use: ./dev-pipeline.sh --hot-mcp"
    pnpm run start
  fi
}

dev_ui() {
  log_header "Starting UI Dashboard (Hot-Reload)"
  cd "$PROJECT_ROOT/packages/ui"
  log_info "Dashboard will auto-reload on file changes (next.js HMR)"
  pnpm run dev
}

dev_vscode() {
  log_header "Starting VSCode Extension (Watch Mode)"
  cd "$PROJECT_ROOT/packages/vscode-extension"
  log_info "Extension will rebuild on file changes"
  log_info "Open VS Code and press F5 to start debugging"
  pnpm run watch
}

#############################################################################
# Pipeline: Full Development Stack
#############################################################################

pipeline_full() {
  log_header "STORY AGENT — Full Development Pipeline"
  log_info "Services starting:"
  log_info "  • MCP Server:        http://localhost:$STORY_AGENT_AGENT_PORT"
  log_info "  • Dashboard:         http://localhost:3000"
  log_info "  • VSCode Extension:  Ready for F5 debug"
  echo ""

  check_pnpm
  check_node
  check_redis

  # Build initial state
  if [ "$BUILD_ONLY" != true ]; then
    log_header "Initial Build"
    build_all
  fi

  # Start services in parallel
  log_header "Starting Services"

  if [ "$UI_ONLY" = true ]; then
    dev_ui
  elif [ "$EXT_ONLY" = true ]; then
    dev_vscode
  else
    # Full stack: MCP + UI + VSCode (MCP in background, UI in foreground)
    (
      export STORY_AGENT_AGENT_PORT="$STORY_AGENT_AGENT_PORT"
      cd "$PROJECT_ROOT"
      pnpm dev
    ) &

    MCP_PID=$!
    log_success "MCP Server started (PID: $MCP_PID)"

    # Wait a moment for MCP to start
    sleep 3

    # Start VSCode extension watcher in parallel
    (dev_vscode) &

    VSCODE_PID=$!
    log_success "VSCode Extension watcher started (PID: $VSCODE_PID)"

    # Keep process alive and show status
    wait
  fi
}

#############################################################################
# Pipeline: Build Only
#############################################################################

pipeline_build_only() {
  log_header "STORY AGENT — Build Only (No Watch)"

  check_pnpm
  check_node

  build_all
  log_success "All packages built successfully"
  log_info "To start development, run: ./dev-pipeline.sh"
}

#############################################################################
# Deployment
#############################################################################

deploy_docker() {
  log_header "Building Docker Images"

  if ! command -v docker &> /dev/null; then
    log_error "Docker not found. Install Docker to deploy."
    return 1
  fi

  log_info "Building MCP server image..."
  docker build -t story-agent-mcp:latest -f docker/Dockerfile.mcp .

  log_info "Building UI image..."
  docker build -t story-agent-ui:latest -f docker/Dockerfile.ui .

  log_success "Docker images built"
  log_info "To deploy: docker-compose up"
}

deploy_local() {
  log_header "Local Deployment"

  build_all

  log_success "All packages built"
  log_info "Starting services..."

  cd "$PROJECT_ROOT"
  pnpm start
}

#############################################################################
# Health Checks
#############################################################################

health_check() {
  log_header "Health Check"

  # Check MCP
  if curl -s "http://localhost:$STORY_AGENT_AGENT_PORT/health" &> /dev/null; then
    log_success "MCP Server healthy"
  else
    log_warn "MCP Server not responding"
  fi

  # Check UI
  if curl -s "http://localhost:3000" &> /dev/null; then
    log_success "Dashboard healthy"
  else
    log_warn "Dashboard not responding"
  fi

  # Check Redis
  check_redis || true

  # Check Node processes
  log_info "Active Node processes:"
  pgrep -f "node|pnpm" | while read -r pid; do
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    echo "  PID $pid: $cmd"
  done
}

#############################################################################
# Main Entry Point
#############################################################################

main() {
  if [ "$BUILD_ONLY" = true ]; then
    pipeline_build_only
  elif [ "$UI_ONLY" = true ] || [ "$EXT_ONLY" = true ]; then
    pipeline_full
  else
    pipeline_full
  fi
}

# Trap signals for cleanup
trap 'log_info "Pipeline stopped"; exit 0' SIGINT SIGTERM

main "$@"
