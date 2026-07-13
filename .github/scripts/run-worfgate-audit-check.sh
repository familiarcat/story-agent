#!/usr/bin/env bash
set -euo pipefail

# Shared CI guard for WorfGate audit checks.
# Behavior:
# - Prefer SUPABASE_CLOUD_URL/SUPABASE_CLOUD_KEY when available.
# - Skip green when URL/key are incomplete.
# - Skip green when URL points to localhost/127.0.0.1.
# - Execute the provided audit command otherwise.

AUDIT_CMD="${1:-pnpm exec tsx scripts/check-recent-audits.ts}"

if [[ -n "${SUPABASE_CLOUD_URL:-}" && -n "${SUPABASE_CLOUD_KEY:-}" ]]; then
  export SUPABASE_URL="${SUPABASE_CLOUD_URL}"
  export SUPABASE_KEY="${SUPABASE_CLOUD_KEY}"
  echo "::notice::Using SUPABASE_CLOUD_URL/SUPABASE_CLOUD_KEY for WorfGate audit query."
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_KEY:-}" ]]; then
  echo "::notice::SUPABASE_URL/SUPABASE_KEY not fully configured — skipping live WorfGate audit query (CI stays green)."
  exit 0
fi

if [[ "${SUPABASE_URL}" == http://127.0.0.1* || "${SUPABASE_URL}" == http://localhost* ]]; then
  echo "::notice::SUPABASE_URL points to a local endpoint (${SUPABASE_URL}) — skipping live WorfGate audit query in CI (CI stays green)."
  exit 0
fi

eval "${AUDIT_CMD}"
