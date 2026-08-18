zsh
#!/usr/bin/env zsh
set -euo pipefail

# Configuration
EXTENSION_DIR="${HOME}/.vscode/extensions"
TEST_FILE="${EXTENSION_DIR}/storyagent_access_test.tmp"
LOG_FILE="${EXTENSION_DIR}/access_updates.log"

# Clear previous log
: > "$LOG_FILE"

# 1. Read Access Check
if [[ -r "$EXTENSION_DIR" ]]; then
  echo "✅ Read access confirmed for $EXTENSION_DIR" | tee -a "$LOG_FILE"
else
  echo "❌ Read access failed for $EXTENSION_DIR" | tee -a "$LOG_FILE"
  exit 1
fi

# 2. Write Access Check
if touch "$TEST_FILE" 2>/dev/null; then
  echo "✅ Write access confirmed ($TEST_FILE created)" | tee -a "$LOG_FILE"
  rm -f "$TEST_FILE"
  echo "🗑️ Test file removed" | tee -a "$LOG_FILE"
else
  echo "❌ Write access failed (cannot create $TEST_FILE)" | tee -a "$LOG_FILE"
  exit 1
fi

# 3. Final confirmation
echo "\n📝 Access update results logged to: $LOG_FILE"
cat "$LOG_FILE"
echo "\n✅ All access checks completed successfully."