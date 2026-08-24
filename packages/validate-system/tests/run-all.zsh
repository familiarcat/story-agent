#!/usr/bin/env zsh
# tests/run-all.zsh
# Master test runner for @crew/validate-system
# 
# Executes all test suites and reports aggregate results.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 @crew/validate-system — Full Test Suite"
echo ""

TOTAL_PASS=0
TOTAL_FAIL=0

run_test_file() {
  local test_file="$1"
  local test_name="$(basename "$test_file" .zsh)"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if zsh "$test_file"; then
    ((++TOTAL_PASS))
  else
    ((++TOTAL_FAIL))
  fi
  
  echo ""
}

# Run each test suite
for test in "$SCRIPT_DIR"/*.zsh; do
  # Skip this script itself
  if [[ "$(basename "$test")" == "run-all.zsh" ]]; then
    continue
  fi
  
  run_test_file "$test"
done

echo ""
echo "════════════════════════════════════════════════"
echo "📊 FINAL RESULTS"
echo "════════════════════════════════════════════════"
echo "Test suites passed: $TOTAL_PASS"
echo "Test suites failed: $TOTAL_FAIL"
echo "════════════════════════════════════════════════"

if [[ $TOTAL_FAIL -eq 0 ]]; then
  echo "✅ All test suites passed!"
  exit 0
else
  echo "❌ Some test suites failed"
  exit 1
fi
