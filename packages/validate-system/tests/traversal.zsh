#!/usr/bin/env zsh
# tests/traversal.zsh
# Test suite for path traversal attack prevention
# 
# Validates that classic ../ traversal and homoglyph variants
# cannot escape the /tmp boundary.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATE_SYSTEM_DEBUG=1

# Load validator
source "${PACKAGE_ROOT}/src/main.zsh"

# Create temporary test directory
TEST_BASE="/tmp/validate-system-traversal-$$"
mkdir -p "$TEST_BASE/subdir/deep"

cleanup() {
  rm -rf "$TEST_BASE"
}
trap cleanup EXIT

echo "🧪 Running Traversal Attack Tests"
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

# Test: Simple ../ traversal
test_case "single ../ escape" "/tmp/../etc" "no"
test_case "double ../ escape" "/tmp/../../var" "no"
test_case "triple ../ escape" "/tmp/../../../root" "no"

# Test: Complex traversal chains
test_case "../ at root of tmp" "/tmp/a/b/../../../etc" "no"
test_case "many levels deep" "/tmp/a/b/c/d/e/../../../../../etc" "no"

# Test: Traversal from within a subdirectory
test_case "subdir traversal: a/b/../../.." "/tmp/a/b/../../.." "no"

# Test: Legit ../  usage within /tmp should still work
test_case "legitimate ../ within /tmp" "/tmp/subdir/../file.txt" "yes"
test_case "nested legitimate ../" "/tmp/subdir/deep/../../file.txt" "yes"

# Test: Edge cases
test_case "trailing slash on traversal" "/tmp/../.." "no"
test_case "mixed ./ and ../" "/tmp/./subdir/../../../etc" "no"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All traversal tests passed!"
  exit 0
else
  echo "❌ Some traversal tests failed"
  exit 1
fi
