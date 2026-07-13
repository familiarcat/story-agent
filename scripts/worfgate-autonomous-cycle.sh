#!/usr/bin/env bash
set -euo pipefail

# WorfGate-governed autonomous ops cycle.
#
# Modes:
#   dry     -> validate parity and secret mirror path without writes
#   apply   -> apply AWS(source)->GitHub mirror locally after validation
#   release -> apply + dispatch remote AWS-source sync workflow with apply=true

MODE="${1:-dry}"
SECRET_ID="${SECRET_ID:-story-agent/aha}"
TARGET_REPO="${TARGET_REPO:-familiarcat/story-agent}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== WorfGate autonomous ops cycle =="
echo "Mode: $MODE"
echo "Repo: $TARGET_REPO"
echo "Secret: $SECRET_ID"

echo
echo "1) Activation baseline"
npm_config_yes=true pnpm run activation:status

echo
echo "2) Local<->prod parity dry-run"
pnpm run bridge:local-prod:dry -- --secret-id "$SECRET_ID" --repo "$TARGET_REPO"

case "$MODE" in
  dry)
    echo
    echo "Dry-run completed successfully."
    ;;

  apply)
    echo
    echo "3) Apply local mirror (AWS -> GitHub)"
    pnpm run bridge:local-prod:apply -- --secret-id "$SECRET_ID" --repo "$TARGET_REPO"
    echo
    echo "Apply completed successfully."
    ;;

  release)
    echo
    echo "3) Apply local mirror (AWS -> GitHub)"
    pnpm run bridge:local-prod:apply -- --secret-id "$SECRET_ID" --repo "$TARGET_REPO"

    echo
    echo "4) Dispatch remote AWS-source sync workflow (apply=true)"
    gh workflow run aws-source-secret-sync.yml \
      --repo "$TARGET_REPO" \
      -f apply=true \
      -f secret_id="$SECRET_ID" \
      -f repo="$TARGET_REPO"

    echo
    echo "Release mode completed: local apply + remote sync dispatch submitted."
    ;;

  *)
    echo "Unknown mode: $MODE"
    echo "Usage: scripts/worfgate-autonomous-cycle.sh [dry|apply|release]"
    exit 2
    ;;
esac
