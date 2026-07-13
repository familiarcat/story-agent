#!/usr/bin/env bash
set -euo pipefail

echo "[bottom-line] Starting parallel execution lanes"

pnpm exec concurrently \
  --names UI,BACKEND \
  --prefix-colors blue,magenta \
  "bash -lc 'echo [ui-lane] typecheck && pnpm --filter @story-agent/ui run typecheck && echo [ui-lane] build && pnpm --filter @story-agent/ui run build'" \
  "bash -lc 'echo [backend-lane] worfgate audit gate && bash .github/scripts/run-worfgate-audit-check.sh \"npx tsx scripts/check-recent-audits.ts\" && if [[ -n \"\${CREW_LLM_APPROVED_KEY:-}\" || -n \"\${OPENROUTER_API_KEY:-}\" ]]; then echo [backend-lane] openrouter guard && pnpm run ops:openrouter:guard; else echo [backend-lane] OPENROUTER keys not set, skipping ops:openrouter:guard; fi'"

echo "[bottom-line] Parallel execution lanes complete"
