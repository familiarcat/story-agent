#!/usr/bin/env zsh
# tests/symlink.zsh
# Test suite for symlink escape prevention
# 
# Validates that symlink chains cannot be used to escape the /tmp boundary,
# even through indirect references.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATE_SYSTEM_DEBUG=1

# Load validator
source "${PACKAGE_ROOT}/src/main.zsh"

# Create temporary test directories
TEST_BASE="/tmp/validate-system-symlink-$$"
mkdir -p "$TEST_BASE/safe"
mkdir -p "$TEST_BASE/chain"

cleanup() {
  rm -rf "$TEST_BASE"
}
trap cleanup EXIT

echo "🧪 Running Symlink Escape Tests"
echo "   Base: $TEST_BASE"
echo ""

PASS=0
FAIL=0

test_case() {
  local name="$1"
  local path="$2"
  local should_pass="$3"
  
  echo -n "  test: $name ... "
  
  if validate_path "$path" >/dev/null 2>&1; then
    if [[ "$should_pass" == "yes" ]]; then
      echo "✅ PASS"
      ((++PASS))
    else
      echo "❌ FAIL (expected rejection, got approval)"
      ((++FAIL))
    fi
  else
    if [[ "$should_pass" == "no" ]]; then
      echo "✅ PASS (correctly rejected)"
      ((++PASS))
    else
      echo "❌ FAIL (expected approval, got rejection)"
      ((++FAIL))
    fi
  fi
}

# Set up test symlinks

# 1. Valid symlink (within /tmp)
ln -sf "$TEST_BASE/safe/target" "$TEST_BASE/safe/link" 2>/dev/null || true

# 2. Symlink pointing outside /tmp (if we can create it)
ln -sf "/etc/passwd" "$TEST_BASE/escape_attempt" 2>/dev/null || true

# 3. Chain of symlinks, all within /tmp
ln -sf "$TEST_BASE/chain/level2" "$TEST_BASE/chain/level1" 2>/dev/null || true
ln -sf "$TEST_BASE/safe" "$TEST_BASE/chain/level2" 2>/dev/null || true

# Test: Valid symlinks within /tmp
test_case "symlink within /tmp (exists)" "$TEST_BASE/safe/link" "yes"
test_case "symlink within /tmp (no target)" "$TEST_BASE/safe" "yes"

# Test: Symlinks attempting to escape
test_case "symlink to /etc/passwd" "$TEST_BASE/escape_attempt" "no"

# Test: Chain of symlinks
test_case "symlink chain within /tmp" "$TEST_BASE/chain/level1" "yes"

# Test: Relative symlinks
# Create a relative symlink from /tmp to /etc
(cd "$TEST_BASE" && ln -sf "../../../../etc/hostname" "rel_escape" 2>/dev/null || true)
test_case "relative symlink escape (../../../../etc)" "$TEST_BASE/rel_escape" "no"

# Test: Deep symlink chains (loop detection)
ln -sf "$TEST_BASE/chain/level1" "$TEST_BASE/chain/loop" 2>/dev/null || true
test_case "potential symlink loop" "$TEST_BASE/chain/loop" "yes"  # should detect depth limit

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All symlink escape tests passed!"
  exit 0
else
  echo "❌ Some symlink escape tests failed"
  exit 1
fi
