#!/bin/bash
# scripts/rollback_dogfood.sh
# Rollback script: Toggle OpenRouter crew routing on/off for Section 31 dogfood
#
# Usage:
#   scripts/rollback_dogfood.sh [--direction=disable|enable] [--dry-run] [--log-file=<PATH>]
#
# SLA: <5 minutes end-to-end (settings toggle + extension reload)
# Owner: O'Brien

set -o pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

DIRECTION="${DIRECTION:-disable}"  # disable = use Copilot, enable = use crew
DRY_RUN=false
LOG_FILE="${HOME}/.story-agent/rollback-audit.log"
VSCODE_SETTINGS_PATH=""
RELOAD_SIGNAL_FILE="${HOME}/.story-agent/reload.signal"
BACKUP_KEEP_COUNT=5

# Detect OS and set settings path
if [[ "$OSTYPE" == "darwin"* ]]; then
    VSCODE_SETTINGS_PATH="${HOME}/Library/Application Support/Code/User/settings.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    VSCODE_SETTINGS_PATH="${HOME}/.config/Code/User/settings.json"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    VSCODE_SETTINGS_PATH="${APPDATA}/Code/User/settings.json"
else
    VSCODE_SETTINGS_PATH="${HOME}/.config/Code/User/settings.json"
fi

# Allow env override
VSCODE_SETTINGS_PATH="${VSCODE_SETTINGS_PATH_OVERRIDE:-$VSCODE_SETTINGS_PATH}"

# ============================================================================
# FUNCTIONS
# ============================================================================

log_action() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local user=$(whoami)
    local status="$1"
    local direction="$2"
    local old_value="$3"
    local new_value="$4"
    local elapsed_ms="$5"

    local log_entry="[$timestamp] ROLLBACK user=$user direction=$direction old_value=$old_value new_value=$new_value status=$status elapsed_ms=$elapsed_ms file=$VSCODE_SETTINGS_PATH"

    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"

    # Append to audit log
    echo "$log_entry" >> "$LOG_FILE"

    # Print to stdout
    if [ "$status" = "OK" ]; then
        echo "$log_entry"
    else
        echo "$log_entry" >&2
    fi
}

ensure_directory() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        if [ $? -ne 0 ]; then
            echo "ERROR: Could not create directory: $dir" >&2
            exit 2
        fi
    fi
}

validate_settings_file() {
    local file="$1"

    # If file doesn't exist, create default
    if [ ! -f "$file" ]; then
        echo "[$(date -u +%H:%M:%SZ)] Creating settings.json (not found)..."
        ensure_directory "$(dirname "$file")"
        echo '{"storyAgent.hijack.enabled":false}' > "$file"
        if [ $? -ne 0 ]; then
            echo "ERROR: Could not create settings file: $file" >&2
            return 1
        fi
        return 0
    fi

    # Validate JSON
    if ! jq empty "$file" 2>/dev/null; then
        echo "ERROR: settings.json contains invalid JSON: $file" >&2
        return 1
    fi

    return 0
}

read_hijack_value() {
    local file="$1"
    # Use if/then/else to properly handle false (don't treat it as falsy)
    jq -r 'if .["storyAgent.hijack.enabled"] != null then .["storyAgent.hijack.enabled"] else true end' "$file" 2>/dev/null || echo "true"
}

create_backup() {
    local file="$1"
    local backup_file="${file}.backup.$(date +%s)"

    cp "$file" "$backup_file"
    if [ $? -ne 0 ]; then
        echo "ERROR: Could not create backup: $backup_file" >&2
        return 1
    fi

    echo "$backup_file"
    return 0
}

cleanup_old_backups() {
    local file="$1"
    local backup_dir="$(dirname "$file")"

    # Find all backup files, sort by timestamp (newest first), keep only the first N
    local backup_files=($(ls -t "${file}.backup."* 2>/dev/null))

    if [ ${#backup_files[@]} -gt $BACKUP_KEEP_COUNT ]; then
        for ((i = $BACKUP_KEEP_COUNT; i < ${#backup_files[@]}; i++)); do
            rm -f "${backup_files[$i]}"
        done
    fi
}

toggle_hijack() {
    local file="$1"
    local direction="$2"
    local old_value="$3"
    local new_value

    # Determine new value
    if [ "$direction" = "disable" ]; then
        new_value="false"
    else
        new_value="true"
    fi

    # If already in desired state, skip
    if [ "$old_value" = "$new_value" ]; then
        echo "[$(date -u +%H:%M:%SZ)] Already in desired state (hijack.enabled=$new_value). Skipping toggle."
        return 0
    fi

    # Use jq to toggle the value safely
    local tmp_file="${file}.tmp.$$"
    jq ".\"storyAgent.hijack.enabled\" = $new_value" "$file" > "$tmp_file"
    if [ $? -ne 0 ]; then
        echo "ERROR: jq failed to process settings.json" >&2
        rm -f "$tmp_file"
        return 1
    fi

    mv "$tmp_file" "$file"
    if [ $? -ne 0 ]; then
        echo "ERROR: Could not move temporary file to settings.json" >&2
        rm -f "$tmp_file"
        return 1
    fi

    echo "$new_value"
    return 0
}

signal_reload() {
    local signal_file="$1"

    ensure_directory "$(dirname "$signal_file")"

    # Write timestamp to signal file
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$signal_file"
    if [ $? -ne 0 ]; then
        echo "WARNING: Could not write reload signal file: $signal_file" >&2
        return 1
    fi

    return 0
}

verify_toggle() {
    local file="$1"
    local expected_value="$2"

    # Small delay to ensure file I/O is complete
    sleep 0.1

    local actual_value=$(read_hijack_value "$file")

    if [ "$actual_value" = "$expected_value" ]; then
        return 0
    else
        echo "ERROR: Verification failed. Expected hijack.enabled=$expected_value but got $actual_value" >&2
        return 1
    fi
}

print_usage() {
    cat <<EOF
Usage: scripts/rollback_dogfood.sh [OPTIONS]

Options:
  --direction=disable   Disable crew routing, use Copilot (default)
  --direction=enable    Enable crew routing, use OpenRouter
  --dry-run             Show what would happen without making changes
  --log-file=<PATH>     Custom log file path (default: ~/.story-agent/rollback-audit.log)
  --help                Show this help message

Examples:
  # Disable crew routing (rollback to Copilot)
  scripts/rollback_dogfood.sh

  # Re-enable crew routing
  scripts/rollback_dogfood.sh --direction=enable

  # Test without making changes
  scripts/rollback_dogfood.sh --dry-run

EOF
}

# ============================================================================
# MAIN
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --direction=*)
            DIRECTION="${1#*=}"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --log-file=*)
            LOG_FILE="${1#*=}"
            ;;
        --help|-h)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            print_usage
            exit 1
            ;;
    esac
    shift
done

# Validate direction
if [ "$DIRECTION" != "disable" ] && [ "$DIRECTION" != "enable" ]; then
    echo "ERROR: Invalid direction. Must be 'disable' or 'enable'." >&2
    exit 1
fi

# Start timer
START_TIME=$(date +%s%N)

echo "[$(date -u +%H:%M:%SZ)] Starting Section 31 rollback (direction=$DIRECTION)..."

# Validate settings file
if ! validate_settings_file "$VSCODE_SETTINGS_PATH"; then
    exit 1
fi

# Read current value
OLD_VALUE=$(read_hijack_value "$VSCODE_SETTINGS_PATH")

# Determine new value
if [ "$DIRECTION" = "disable" ]; then
    NEW_VALUE="false"
    STATUS_MSG="Rolling back to Copilot default"
else
    NEW_VALUE="true"
    STATUS_MSG="Enabling crew routing"
fi

echo "[$(date -u +%H:%M:%SZ)] $STATUS_MSG..."
echo "[$(date -u +%H:%M:%SZ)] Settings file: $VSCODE_SETTINGS_PATH"
echo "[$(date -u +%H:%M:%SZ)] Current hijack.enabled: $OLD_VALUE"
echo "[$(date -u +%H:%M:%SZ)] Target hijack.enabled: $NEW_VALUE"

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "[DRY RUN] Would toggle storyAgent.hijack.enabled from $OLD_VALUE to $NEW_VALUE"
    echo "[DRY RUN] Would create backup: $VSCODE_SETTINGS_PATH.backup.\$(date +%s)"
    echo "[DRY RUN] Would signal extension reload"
    echo "[DRY RUN] (No actual changes applied)"
    exit 0
fi

# Create backup
BACKUP_FILE=$(create_backup "$VSCODE_SETTINGS_PATH")
if [ $? -ne 0 ]; then
    ELAPSED_MS=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
    log_action "FAIL" "$DIRECTION" "$OLD_VALUE" "N/A" "$ELAPSED_MS"
    exit 1
fi
echo "[$(date -u +%H:%M:%SZ)] Backup created: $BACKUP_FILE"

# Toggle hijack value
TOGGLE_RESULT=$(toggle_hijack "$VSCODE_SETTINGS_PATH" "$DIRECTION" "$OLD_VALUE")
if [ $? -ne 0 ]; then
    ELAPSED_MS=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
    log_action "FAIL" "$DIRECTION" "$OLD_VALUE" "N/A" "$ELAPSED_MS"
    exit 1
fi

# Verify toggle
if ! verify_toggle "$VSCODE_SETTINGS_PATH" "$NEW_VALUE"; then
    ELAPSED_MS=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
    log_action "FAIL" "$DIRECTION" "$OLD_VALUE" "N/A" "$ELAPSED_MS"
    exit 1
fi

echo "[$(date -u +%H:%M:%SZ)] Toggle applied: storyAgent.hijack.enabled=$NEW_VALUE"

# Signal extension reload
if ! signal_reload "$RELOAD_SIGNAL_FILE"; then
    echo "WARNING: Extension reload signal may be delayed (signal file write failed)"
fi

# Cleanup old backups
cleanup_old_backups "$VSCODE_SETTINGS_PATH"

# Calculate elapsed time
ELAPSED_MS=$(( ($(date +%s%N) - $START_TIME) / 1000000 ))
ELAPSED_SEC=$(printf "%.2f" "$(echo "scale=3; $ELAPSED_MS / 1000" | bc)")

echo "[$(date -u +%H:%M:%SZ)] Rollback complete in ${ELAPSED_SEC}s"
if [ "$DIRECTION" = "disable" ]; then
    echo "[$(date -u +%H:%M:%SZ)] VSCode chat now defaults to Copilot. Extension should reload in 1–2 sec."
else
    echo "[$(date -u +%H:%M:%SZ)] VSCode chat now defaults to OpenRouter crew. Extension should reload in 1–2 sec."
fi

log_action "OK" "$DIRECTION" "$OLD_VALUE" "$NEW_VALUE" "$ELAPSED_MS"

exit 0
