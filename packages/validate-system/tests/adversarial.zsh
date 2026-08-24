#!/usr/bin/env zsh
# tests/adversarial.zsh
# Comprehensive adversarial test suite for @crew/validate-system
# 
# Covers encoding tricks, injection attempts, edge cases, and other
# attacks that might exploit path validation logic.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATE_SYSTEM_DEBUG=1

# Load validator
source "${PACKAGE_ROOT}/src/main.zsh"

# Create test environment
TEST_BASE="/tmp/validate-system-adversarial-$$"
mkdir -p "$TEST_BASE"

cleanup() {
  rm -rf "$TEST_BASE"
}
trap cleanup EXIT

echo "🧪 Running Adversarial Attack Tests"
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

# ============================================================================
# Encoding / Escaping Attempts
# ============================================================================

echo "┌─ Encoding & Escaping"

# URL encoding: %2e%2e%2f = ../
test_case "URL encoding: %2e%2e%2f" "/tmp/%2e%2e%2fpasswd" "no"

# Unicode combining characters (homoglyphs)
test_case "unicode dot: ．（U+FF0E）" "/tmp/．．/passwd" "yes"  # normalized, may still be within /tmp

# Octal encoding: \056\056 = ..
test_case "octal escapes" "/tmp/\056\056/passwd" "no"

echo ""

# ============================================================================
# Injection Attempts
# ============================================================================

echo "┌─ Injection & Control Characters"

# NUL byte (binary bomb)
test_case "NUL byte in path" "/tmp/file\0/etc/passwd" "no"

# Newline injection
test_case "newline injection" "/tmp/file\n/etc/passwd" "no"

# Tab / form feed
test_case "tab character" "/tmp/file\t/etc/passwd" "no"

# Carriage return
test_case "carriage return" "/tmp/file\r/etc/passwd" "no"

echo ""

# ============================================================================
# Double Encoding
# ============================================================================

echo "┌─ Double / Triple Encoding"

# Double URL encode
test_case "double URL encoding" "/tmp/%252e%252e" "yes"  # Should normalize safely

echo ""

# ============================================================================
# Length / Depth Attacks
# ============================================================================

echo "┌─ Length & Depth Attacks"

# Very long path
LONG_PATH="/tmp/$(printf 'a%.0s' {1..1000})"
test_case "extremely long path (1000 chars)" "$LONG_PATH" "yes"

# Very deep nesting
DEEP_PATH="/tmp/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t"
test_case "deeply nested path (20 levels)" "$DEEP_PATH" "yes"

# Many ../ attempts
MANY_TRAVERSAL="/tmp/../../../../../../../../../../../etc/passwd"
test_case "many traversal attempts" "$MANY_TRAVERSAL" "no"

echo ""

# ============================================================================
# Whitespace & Boundary Cases
# ============================================================================

echo "┌─ Whitespace & Boundaries"

# Leading whitespace
test_case "leading space" " /tmp/file" "no"

# Trailing whitespace
test_case "trailing space" "/tmp/file " "no"

# Only dots
test_case "only dots: .." ".." "no"

# Only slashes
test_case "only slash: /" "/" "no"

echo ""

# ============================================================================
# Case Sensitivity / Normalization
# ============================================================================

echo "┌─ Normalization"

# Mixed case paths
test_case "mixed case within /tmp" "/tmp/MyFile.txt" "yes"

# Multiple slashes
test_case "multiple slashes: //tmp//file" "//tmp//file" "yes"

echo ""

# ============================================================================
# Boundary Confusion
# ============================================================================

echo "┌─ Boundary Confusion"

# /tmp-like paths that aren't actually /tmp
test_case "/tmpfoo (not /tmp)" "/tmpfoo" "no"

# /tmp prefix but different path
test_case "/tmp2 (not /tmp)" "/tmp2/file" "no"

# /tmp hidden in middle
test_case "/var/tmp is different" "/var/tmp/file" "no"

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All adversarial tests passed!"
  exit 0
else
  echo "❌ Some adversarial tests failed"
  exit 1
fi
