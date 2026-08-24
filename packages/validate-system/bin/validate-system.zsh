#!/usr/bin/env zsh
# bin/validate-system.zsh
# CLI entry point for @crew/validate-system
# 
# Usage: validate-system <path> [--base <allowed-base>] [--debug]
#        validate-system --help

set -euo pipefail

# Find the package root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"

# Load the main module
source "${PACKAGE_ROOT}/src/main.zsh"

# ============================================================================
# CLI Interface
# ============================================================================

show_help() {
  cat << 'EOF'
validate-system — Filesystem security boundary enforcement

USAGE:
  validate-system <path> [OPTIONS]

POSITIONAL ARGUMENTS:
  <path>                  Path to validate (required)

OPTIONS:
  --base <dir>           Set ALLOWED_BASE (default: /tmp)
  --debug                Enable debug logging
  --help, -h             Show this help and exit

EXAMPLES:
  # Validate /tmp/user-data
  validate-system /tmp/user-data

  # Validate with custom base directory
  validate-system /data/file.txt --base /data

  # Enable debug output
  validate-system /tmp/test --debug

SECURITY POLICY:
  • Paths must resolve within ALLOWED_BASE
  • Traversal (../) and symlink escapes are rejected
  • NUL bytes and control characters trigger failure

RETURN CODES:
  0     Path is valid and safe
  1     Validation failed (see stderr for details)

For more information, see: packages/validate-system/README.md
EOF
}

# ============================================================================
# Argument Parsing
# ============================================================================

main() {
  local target_path=""
  local allowed_base="$ALLOWED_BASE"
  local debug=0

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        show_help
        return 0
        ;;
      --debug)
        debug=1
        shift
        ;;
      --base)
        if [[ -z "${2:-}" ]]; then
          echo "Error: --base requires an argument" >&2
          return 1
        fi
        allowed_base="$2"
        shift 2
        ;;
      --*)
        echo "Error: Unknown option: $1" >&2
        return 1
        ;;
      *)
        if [[ -z "$target_path" ]]; then
          target_path="$1"
          shift
        else
          echo "Error: Too many positional arguments" >&2
          return 1
        fi
        ;;
    esac
  done

  # Require a target path
  if [[ -z "$target_path" ]]; then
    echo "Error: <path> is required" >&2
    show_help
    return 1
  fi

  # Set environment variables for validation
  export ALLOWED_BASE="$allowed_base"
  export VALIDATE_SYSTEM_DEBUG="$debug"

  # Run validation
  if validate_path "$target_path"; then
    return 0
  else
    return 1
  fi
}

main "$@"
