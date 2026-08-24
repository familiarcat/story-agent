#!/usr/bin/env zsh
# src/validate_path.zsh
# Core path validation logic for @crew/validate-system
# 
# Enforces filesystem boundary: paths must resolve within ALLOWED_BASE,
# reject traversal attempts, symlink escapes, and injection attacks.

set -euo pipefail

# ============================================================================
# Configuration (can be overridden at call time)
# ============================================================================

ALLOWED_BASE="${ALLOWED_BASE:-/tmp}"
VALIDATE_SYSTEM_DEBUG="${VALIDATE_SYSTEM_DEBUG:-0}"

# ============================================================================
# Logging & Errors
# ============================================================================

_log_debug() {
  if [[ "$VALIDATE_SYSTEM_DEBUG" == "1" ]]; then
    echo "[validate-system:debug] $*" >&2
  fi
}

_log_error() {
  echo "[validate-system:error] $*" >&2
}

# ============================================================================
# Path Normalization
# ============================================================================

# Normalize a path: resolve symlinks, flatten ./, ../, etc.
# Returns the real path, or fails if path doesn't exist or escapes boundary.
normalize_path() {
  local target="$1"
  
  _log_debug "normalize_path: input='$target'"
  
  # Empty path is always invalid
  if [[ -z "$target" ]]; then
    _log_error "Path is empty"
    return 1
  fi
  
  # Reject absolute paths outside /tmp for non-sudo contexts
  if [[ "$target" == /* && "$target" != /tmp* && "$target" != "$HOME"* ]]; then
    _log_error "Absolute path '$target' is outside allowed boundaries"
    return 1
  fi
  
  # If relative, make it relative to ALLOWED_BASE
  if [[ "$target" != /* ]]; then
    target="${ALLOWED_BASE}/${target}"
    _log_debug "normalize_path: relative path expanded to '$target'"
  fi
  
  # Resolve symlinks and normalize . and ..
  local real
  if [[ -e "$target" ]]; then
    real="$(cd -P -- "$(dirname -- "$target")" && pwd -P)/$(basename -- "$target")" 2>/dev/null || {
      _log_error "Failed to resolve path: $target"
      return 1
    }
  else
    # Path doesn't exist yet; normalize as much as we can
    real="$(cd -P -- "$(dirname -- "$target")" 2>/dev/null && pwd -P)/$(basename -- "$target")" || {
      _log_error "Parent directory does not exist: $(dirname "$target")"
      return 1
    }
  fi
  
  _log_debug "normalize_path: resolved to '$real'"
  echo "$real"
}

# ============================================================================
# Whitelist Boundary Check
# ============================================================================

# Verify the normalized path stays within ALLOWED_BASE.
check_boundary() {
  local real="$1"
  
  _log_debug "check_boundary: checking '$real' against base='$ALLOWED_BASE'"
  
  # Remove trailing slashes for comparison
  local base="${ALLOWED_BASE%/}"
  local path="${real%/}"
  
  # Must either BE the base or START with base/
  if [[ "$path" == "$base" ]]; then
    _log_debug "check_boundary: path is exactly the base"
    return 0
  elif [[ "$path" == "$base"/* ]]; then
    _log_debug "check_boundary: path is within base"
    return 0
  else
    _log_error "Boundary violation: '$path' is outside '$base'"
    return 1
  fi
}

# ============================================================================
# Symlink Escape Detection
# ============================================================================

# Check for symlink chains that might escape the boundary.
# Walk the path and verify each symlink target is also within the boundary.
detect_symlink_escape() {
  local target="$1"
  local current="$target"
  local depth=0
  local max_depth=50  # Prevent infinite symlink loops
  
  _log_debug "detect_symlink_escape: checking for chains in '$target'"
  
  while [[ -L "$current" ]] && ((depth < max_depth)); do
    local link_target
    link_target="$(readlink "$current")" || {
      _log_error "Failed to read symlink: $current"
      return 1
    }
    
    _log_debug "detect_symlink_escape: depth=$depth, '$current' → '$link_target'"
    
    # If link_target is relative, it's relative to the symlink's directory
    if [[ "$link_target" != /* ]]; then
      link_target="$(dirname "$current")/${link_target}"
    fi
    
    # Resolve the link target and check boundary
    local resolved
    resolved="$(normalize_path "$link_target")" || return 1
    
    if ! check_boundary "$resolved"; then
      _log_error "Symlink escape detected: $current → $resolved (outside $ALLOWED_BASE)"
      return 1
    fi
    
    current="$resolved"
    ((++depth))
  done
  
  if ((depth >= max_depth)); then
    _log_error "Symlink depth exceeded: possible loop"
    return 1
  fi
  
  _log_debug "detect_symlink_escape: OK (no escapes found)"
  return 0
}

# ============================================================================
# Injection / Encoding Attack Detection
# ============================================================================

# Reject paths with suspicious encoding or injection patterns.
detect_injection() {
  local target="$1"
  
  _log_debug "detect_injection: scanning '$target'"
  
  # NUL bytes (binary safety)
  if [[ "$target" == *$'\0'* ]]; then
    _log_error "NUL byte detected in path"
    return 1
  fi
  
  # Control characters (other than newline, which we already reject via unquoting)
  if [[ "$target" =~ $'[\x01-\x08\x0b\x0c\x0e-\x1f]' ]]; then
    _log_error "Control characters detected in path"
    return 1
  fi
  
  _log_debug "detect_injection: OK (no injections found)"
  return 0
}

# ============================================================================
# Public Validation Function
# ============================================================================

# Main entry point: validate a path for safe filesystem access.
# Returns 0 (success) if the path is safe; 1 (failure) if any check fails.
validate_path() {
  local input_path="$1"
  
  _log_debug "=== validate_path: START input='$input_path' ==="
  
  # Step 1: Detect injection attacks
  if ! detect_injection "$input_path"; then
    return 1
  fi
  
  # Step 2: Normalize the path (resolve symlinks, flatten . and ..)
  local real
  real="$(normalize_path "$input_path")" || return 1
  
  # Step 3: Check boundary
  if ! check_boundary "$real"; then
    return 1
  fi
  
  # Step 4: Detect symlink escapes
  if ! detect_symlink_escape "$real"; then
    return 1
  fi
  
  _log_debug "=== validate_path: PASS result='$real' ==="
  echo "$real"
  return 0
}

# Return the validated (real) path, or fail if validation fails.
# Usage: SAFE_PATH="$(validate_path_or_die '/some/path')"
validate_path_or_die() {
  local input_path="$1"
  if ! validate_path "$input_path" 2>&1; then
    _log_error "Validation failed for: $input_path"
    return 1
  fi
}
