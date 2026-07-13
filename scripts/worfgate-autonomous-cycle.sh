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
OPS_ENFORCE_CREW_ONLY="${OPS_ENFORCE_CREW_ONLY:-false}"
OPS_MIN_CREW_DELEGATION_PCT="${OPS_MIN_CREW_DELEGATION_PCT:-50}"
OPS_REQUIRE_OPENROUTER_PROVIDER="${OPS_REQUIRE_OPENROUTER_PROVIDER:-true}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== WorfGate autonomous ops cycle =="
echo "Mode: $MODE"
echo "Repo: $TARGET_REPO"
echo "Secret: $SECRET_ID"

export CREW_LLM_PROVIDER="${CREW_LLM_PROVIDER:-approved}"
export CREW_FRUGAL="${CREW_FRUGAL:-true}"

if [[ "$OPS_REQUIRE_OPENROUTER_PROVIDER" == "true" && "$CREW_LLM_PROVIDER" != "approved" ]]; then
  echo "❌ OpenRouter-first policy violation: CREW_LLM_PROVIDER='$CREW_LLM_PROVIDER' (expected 'approved')."
  exit 1
fi

echo
echo "0) OpenRouter-first guard"
pnpm run ops:openrouter:guard

echo
echo "1) Activation baseline"
npm_config_yes=true pnpm run activation:status

echo
echo "1b) Control-lane gate"
LANES_JSON="$(npx tsx scripts/control-lanes.ts --json)"
CURRENT_LANE="$(printf '%s' "$LANES_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(j.currentLane||""));});')"
DELEGATION_PCT="$(printf '%s' "$LANES_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);process.stdout.write(String(j.delegationRatePct??0));});')"
echo "   lane=$CURRENT_LANE delegation=${DELEGATION_PCT}%"
if [[ "$OPS_ENFORCE_CREW_ONLY" == "true" ]]; then
  if [[ "$CURRENT_LANE" != "crew" ]]; then
    echo "❌ OpenRouter-first policy violation: current lane is '$CURRENT_LANE' (expected 'crew')."
    echo "   Run more work through crew tools (run_crew_mission_pipeline / plan_then_execute) before release."
    exit 1
  fi
  if [[ "$OPS_MIN_CREW_DELEGATION_PCT" -gt 0 && "$DELEGATION_PCT" -lt "$OPS_MIN_CREW_DELEGATION_PCT" ]]; then
    echo "❌ OpenRouter-first policy violation: delegation ${DELEGATION_PCT}% < required ${OPS_MIN_CREW_DELEGATION_PCT}%."
    exit 1
  fi
else
  echo "   strict crew-lane gating disabled (set OPS_ENFORCE_CREW_ONLY=true to enforce)."
fi

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
