#!/usr/bin/env bash
# scripts/system-refresh.sh
# End-to-end LOCAL refresh + verify gate — run this before pushing to production.
#
# Real, verifiable steps (no confabulation): it checks the repo is wired to the
# correct GitHub remote, syncs refs, installs deps, builds + typechecks + tests the
# packages that back the VSCode Extension and the Dashboard, and prints a summary.
# It NEVER pushes and never force-mutates your working tree — it is a pre-push gate.
#
# Usage:  scripts/system-refresh.sh            # full refresh + verify
#         scripts/system-refresh.sh --quick    # skip install, just build+test
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

EXPECTED_REMOTE="familiarcat/story-agent"
QUICK=false
[[ "${1:-}" == "--quick" ]] && QUICK=true

PASS=0; FAIL=0
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓ %s\033[0m\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31m✗ %s\033[0m\n' "$1"; FAIL=$((FAIL+1)); }

# ── 1. Verify git wiring (local + remote point at familiarcat/story-agent) ──────
step "Git wiring"
REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo '')"
if [[ "$REMOTE_URL" == *"$EXPECTED_REMOTE"* ]]; then
  ok "origin → $REMOTE_URL"
else
  bad "origin is '$REMOTE_URL' (expected to contain $EXPECTED_REMOTE)"
fi
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin 2>/dev/null && ok "fetched origin" || bad "git fetch failed"
LOCAL_SHA="$(git rev-parse --short HEAD)"
REMOTE_SHA="$(git rev-parse --short "origin/${BRANCH}" 2>/dev/null || echo 'n/a')"
AHEAD="$(git rev-list --count "origin/${BRANCH}..HEAD" 2>/dev/null || echo '?')"
BEHIND="$(git rev-list --count "HEAD..origin/${BRANCH}" 2>/dev/null || echo '?')"
printf '  branch=%s local=%s origin=%s (ahead %s, behind %s)\n' "$BRANCH" "$LOCAL_SHA" "$REMOTE_SHA" "$AHEAD" "$BEHIND"

# ── 2. Install dependencies (matches package.json; regenerates lockfile if drifted)
if ! $QUICK; then
  step "Dependencies (pnpm install)"
  if pnpm install >/tmp/sr-install.log 2>&1; then ok "pnpm install"; else bad "pnpm install (see /tmp/sr-install.log)"; fi
fi

# ── 3. Build the packages that back the Extension + Dashboard ───────────────────
step "Build"
if pnpm --filter @story-agent/mcp-server run build >/tmp/sr-mcp-build.log 2>&1; then ok "mcp-server build"; else bad "mcp-server build (see /tmp/sr-mcp-build.log)"; fi
if pnpm --filter story-agent-vscode run build >/tmp/sr-ext-build.log 2>&1; then ok "vscode-extension build"; else bad "vscode-extension build (see /tmp/sr-ext-build.log)"; fi

# ── 4. Typecheck the extension (esbuild bundles without type errors) ────────────
step "Typecheck"
if pnpm --filter story-agent-vscode run typecheck >/tmp/sr-ext-tsc.log 2>&1; then ok "vscode-extension typecheck"; else bad "vscode-extension typecheck (see /tmp/sr-ext-tsc.log)"; fi

# ── 5. Unit tests (the crew-owned + chat surfaces) ──────────────────────────────
step "Unit tests"
if pnpm --filter @story-agent/mcp-server exec vitest run src/agent-core/crew-poller.test.ts src/agent-core/chat-action-intent.test.ts >/tmp/sr-tests.log 2>&1; then
  ok "agent-core unit tests"
else
  bad "agent-core unit tests (see /tmp/sr-tests.log)"
fi

# ── Summary ─────────────────────────────────────────────────────────────────────
step "Summary"
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  printf '\n\033[31mNOT ready to push — resolve failures above before pushing to production.\033[0m\n'
  exit 1
fi
printf '\n\033[32mLocal system is green — safe to push to production.\033[0m\n'
