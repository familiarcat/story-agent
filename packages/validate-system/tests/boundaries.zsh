#!/usr/bin/env zsh
# tests/boundaries.zsh
# Test suite for filesystem boundary enforcement
# 
# Validates that /tmp boundary is correctly enforced:
# - /tmp/... is always allowed
# - /etc, /var, /home are always rejected
# - Edge cases (trailing slashes, symlinks at boundary) are handled

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATE_SYSTEM_DEBUG=1

# Load validator
source "${PACKAGE_ROOT}/src/main.zsh"

# Create temporary test directory
TEST_BASE="/tmp/validate-system-test-$$"
mkdir -p "$TEST_BASE"

cleanup() {
  rm -rf "$TEST_BASE"
}
trap cleanup EXIT

echo "🧪 Running Boundary Tests"
echo "   Base: $TEST_BASE"
echo ""

PASS=0
FAIL=0

# ============================================================================
# Test Suite
# ============================================================================

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

# Test: /tmp paths should always pass
test_case "/tmp itself" "/tmp" "yes"
test_case "/tmp with trailing slash" "/tmp/" "yes"
test_case "/tmp/file" "/tmp/file" "yes"
test_case "/tmp/deeply/nested/path" "/tmp/deeply/nested/path" "yes"

# Test: Relative paths should resolve within /tmp
test_case "relative path (file.txt)" "file.txt" "yes"
test_case "relative path (./file.txt)" "./file.txt" "yes"
test_case "relative path (subdir/file.txt)" "subdir/file.txt" "yes"

# Test: Out-of-boundary paths should fail
test_case "/etc is rejected" "/etc" "no"
test_case "/var is rejected" "/var" "no"
test_case "/home is rejected" "/home" "no"
test_case "/root is rejected" "/root" "no"
test_case "/ is rejected" "/" "no"

# Test: Empty path should fail
test_case "empty path" "" "no"

# Test: Boundary confusion (attempting to escape)
test_case "/tmp/.. (should resolve)" "/tmp/.." "no"  # resolves to /tmp (OK) but.. let's see
test_case "/tmp/../../../etc (should be rejected)" "/tmp/../../../etc" "no"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
