#!/usr/bin/env zsh
# src/main.zsh
# Orchestrator for @crew/validate-system
# 
# Loads component modules and provides the public API for filesystem validation.

set -euo pipefail

# ============================================================================
# Module Discovery
# ============================================================================

# Determine the root directory of @crew/validate-system
# This script may be sourced from anywhere; we need to find our own directory.
if [[ -z "${CREW_VALIDATE_SYSTEM_ROOT:-}" ]]; then
  # Try to find ourselves via $0 or fallback to relative path
  if [[ -n "${ZSH_SCRIPT:-}" ]]; then
    CREW_VALIDATE_SYSTEM_ROOT="$(dirname "$(realpath "$ZSH_SCRIPT")")/.."
  elif [[ -n "${BASH_SOURCE[0]:-}" ]]; then
    CREW_VALIDATE_SYSTEM_ROOT="$(dirname "$(realpath "${BASH_SOURCE[0]}")/.."
  else
    # Last resort: relative to this file
    CREW_VALIDATE_SYSTEM_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  fi
fi

export CREW_VALIDATE_SYSTEM_ROOT

# ============================================================================
# Load Components
# ============================================================================

# shellcheck source=./validate_path.zsh
source "${CREW_VALIDATE_SYSTEM_ROOT}/src/validate_path.zsh"

# Future: load modular components as they are added
# source "${CREW_VALIDATE_SYSTEM_ROOT}/src/components/normalize.zsh"
# source "${CREW_VALIDATE_SYSTEM_ROOT}/src/components/whitelist.zsh"
# source "${CREW_VALIDATE_SYSTEM_ROOT}/src/components/symlink.zsh"
# source "${CREW_VALIDATE_SYSTEM_ROOT}/src/components/errors.zsh"

# ============================================================================
# Public API
# ============================================================================

# Export the main validation function for use by MCP tools and crew.
export -f validate_path
export -f validate_path_or_die

# Version and metadata
VALIDATE_SYSTEM_VERSION="1.0.0"
VALIDATE_SYSTEM_ENABLED="${VALIDATE_SYSTEM_ENABLED:-1}"

export VALIDATE_SYSTEM_VERSION VALIDATE_SYSTEM_ENABLED

# ============================================================================
# Initialization Hook (optional)
# ============================================================================

# If this is being sourced for the first time, log initialization.
if [[ "${VALIDATE_SYSTEM_INITIALIZED:-0}" == "0" ]]; then
  if [[ "${VALIDATE_SYSTEM_DEBUG:-0}" == "1" ]]; then
    echo "[validate-system] initialized version=$VALIDATE_SYSTEM_VERSION root=$CREW_VALIDATE_SYSTEM_ROOT" >&2
  fi
  VALIDATE_SYSTEM_INITIALIZED=1
  export VALIDATE_SYSTEM_INITIALIZED
fi

# Return success to indicate the module loaded
return 0 2>/dev/null || true
