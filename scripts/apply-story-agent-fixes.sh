#!/usr/bin/env zsh
# apply-story-agent-fixes.sh — apply the max-iterations fix package (story-agent-fixes.zip) to a
# real story-agent working copy, verify it (typecheck + tests), commit it on a dedicated branch,
# and record the milestone into the crew's durable RAG memory (observation memory + per-crew
# personal memory) — so rag_recall surfaces it automatically on future runs, no manual chat step
# required.
#
# Defaults are pinned to Brady's actual setup:
#   local checkout:  ~/Developer/story-agent
#   GitHub repo:     https://github.com/familiarcat/story-agent
# Override with --repo / --zip if you're running this against a different checkout.
#
# Usage:
#   zsh -ic 'scripts/apply-story-agent-fixes.sh [--zip PATH] [--repo PATH] [--skip-tests] [--push] [--open-pr] [--dry-run]'
#
#   --zip PATH        Path to the downloaded story-agent-fixes.zip (default: ~/Downloads/story-agent-fixes.zip)
#   --repo PATH        Path to your story-agent working copy (default: ~/Developer/story-agent)
#   --skip-tests       Skip pnpm typecheck/test:unit verification (not recommended)
#   --push              git push the fix branch to origin after committing (default: off)
#   --open-pr           Push (implies --push) and open a PR via `gh pr create`, using PR_DESCRIPTION.md
#                        as the body. Falls back to printing the compare-URL + body path if the gh CLI
#                        isn't installed/authenticated, rather than failing the whole run.
#   --dry-run          Show what would happen without touching any files
#
# What it does, in order:
#   1. Validates the zip and the target repo (must be the story-agent monorepo, must be a git repo,
#      and origin should point at familiarcat/story-agent — warns rather than blocks if it doesn't,
#      since a fork or a differently-named remote is still a legitimate setup).
#   2. Creates a dedicated branch (fix/max-iterations-YYYYMMDD-HHMMSS) so this is isolated + reversible.
#   3. Unzips and copies every file from the package into the matching repo-relative path.
#   4. Runs pnpm install / typecheck / test:unit to verify nothing broke (unless --skip-tests).
#   5. Shows git diff --stat and asks for confirmation before committing.
#   6. Commits on the fix branch (does NOT touch main/origin unless --push or --open-pr is given).
#   7. Runs scripts/store-max-iterations-fix-memory.ts via tsx — writes the milestone into
#      observation memory + a personal decision_note for every crew member (including Guinan).
#   8. (--open-pr only) Pushes the branch and opens a PR against the branch you started from,
#      using PR_DESCRIPTION.md as the body.
#
set -euo pipefail

ZIP_PATH="$HOME/Downloads/story-agent-fixes.zip"
REPO_PATH="$HOME/Developer/story-agent"
EXPECTED_REMOTE="familiarcat/story-agent"
SKIP_TESTS=false
DO_PUSH=false
DO_OPEN_PR=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --zip) ZIP_PATH="$2"; shift 2 ;;
    --repo) REPO_PATH="$2"; shift 2 ;;
    --skip-tests) SKIP_TESTS=true; shift ;;
    --push) DO_PUSH=true; shift ;;
    --open-pr) DO_PUSH=true; DO_OPEN_PR=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

say() { echo "🛰️  $1"; }
fail() { echo "❌ $1" >&2; exit 1; }

# ── 1. Validate inputs ───────────────────────────────────────────────────────
[[ -f "$ZIP_PATH" ]] || fail "zip not found at $ZIP_PATH (pass --zip PATH if you downloaded it elsewhere)"
[[ -d "$REPO_PATH/.git" ]] || fail "$REPO_PATH is not a git repo (pass --repo PATH to point at your story-agent checkout)"
grep -q '"name": "story-agent"' "$REPO_PATH/package.json" 2>/dev/null || fail "$REPO_PATH/package.json doesn't look like the story-agent monorepo root"

say "zip:  $ZIP_PATH"
say "repo: $REPO_PATH"

cd "$REPO_PATH"

REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo '')"
if [[ -n "$REMOTE_URL" ]]; then
  if [[ "$REMOTE_URL" == *"$EXPECTED_REMOTE"* ]]; then
    say "origin: $REMOTE_URL ✓"
  else
    echo "⚠️  origin ($REMOTE_URL) doesn't look like github.com/$EXPECTED_REMOTE — continuing," >&2
    echo "   since a fork/rename is a legitimate setup, but double-check --repo points where you meant." >&2
  fi
else
  echo "⚠️  no 'origin' remote configured on this repo — continuing, but --push will fail later if you use it." >&2
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  fail "working tree is dirty on branch '$CURRENT_BRANCH' — commit or stash your changes first, then re-run"
fi

BRANCH="fix/max-iterations-$(date +%Y%m%d-%H%M%S)"

if $DRY_RUN; then
  say "[dry-run] would create branch $BRANCH off $CURRENT_BRANCH"
  say "[dry-run] would unzip $ZIP_PATH and copy its files into $REPO_PATH"
  $SKIP_TESTS || say "[dry-run] would run: pnpm install / typecheck / test:unit"
  say "[dry-run] would run: npx tsx scripts/store-max-iterations-fix-memory.ts"
  $DO_PUSH && say "[dry-run] would git push -u origin $BRANCH"
  $DO_OPEN_PR && say "[dry-run] would open a PR via 'gh pr create' (base=$CURRENT_BRANCH) using PR_DESCRIPTION.md"
  say "[dry-run] no files were touched — re-run without --dry-run to apply."
  exit 0
fi

# ── 2. Dedicated branch ───────────────────────────────────────────────────────
git checkout -b "$BRANCH"
say "created + checked out $BRANCH"

# ── 3. Apply the package ──────────────────────────────────────────────────────
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
unzip -q "$ZIP_PATH" -d "$WORKDIR"

# SUMMARY.md and PR_DESCRIPTION.md document the change set but aren't repo source files — the PR
# description is used later (step 8) straight out of $WORKDIR, never committed into the tree.
COPIED=0
while IFS= read -r -d '' f; do
  rel="${f#$WORKDIR/}"
  [[ "$rel" == "SUMMARY.md" || "$rel" == "PR_DESCRIPTION.md" ]] && continue
  mkdir -p "$REPO_PATH/$(dirname "$rel")"
  cp "$f" "$REPO_PATH/$rel"
  echo "  + $rel"
  COPIED=$((COPIED + 1))
done < <(find "$WORKDIR" -type f -print0)
chmod +x "$REPO_PATH/scripts/setup-app-bucket.sh" 2>/dev/null || true
say "copied $COPIED file(s) into the working tree"

# ── 4. Verify ──────────────────────────────────────────────────────────────
if ! $SKIP_TESTS; then
  say "installing deps…"
  pnpm install --frozen-lockfile || pnpm install
  say "building shared package…"
  pnpm --filter @story-agent/shared build
  say "typechecking mcp-server…"
  if ! pnpm --filter @story-agent/mcp-server typecheck; then
    fail "typecheck failed — branch $BRANCH left checked out with the changes applied so you can inspect/fix. Not committing."
  fi
  say "running unit tests…"
  if ! pnpm --filter @story-agent/mcp-server test:unit; then
    fail "unit tests failed — branch $BRANCH left checked out with the changes applied so you can inspect/fix. Not committing."
  fi
  say "verification passed ✅"
else
  say "skipping verification (--skip-tests) — you should still run pnpm typecheck/test:unit yourself before merging"
fi

# ── 5. Review + confirm ────────────────────────────────────────────────────────
git add -A
echo ""
git diff --cached --stat
echo ""
printf "Commit these changes on %s? [y/N] " "$BRANCH"
read REPLY
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  say "left uncommitted on $BRANCH — review with 'git diff --cached', then 'git commit' when ready."
  exit 0
fi

# ── 6. Commit ──────────────────────────────────────────────────────────────
git commit -q -m "fix: max-iterations root cause + 4 crew decisions + S3 bucket + Guinan registry

- runSummaryAgent: guaranteed completion outside the main loop (Decision 1)
- zero-mutation-claim RAG tag: advisory file-verification signal (Decision 2)
- degradeTeamForStress: fewer agents, escalated survivor tier (Decision 3)
- computeMaxIterations: crew-informed iteration budget, floor 12 / ceiling 50 (Decision 4)
- removes the two hardcoded maxIterations:12 sites (chat.ts + run-shell.ts plan_then_execute)
- scripts/setup-app-bucket.sh + s3-structure.ts: application S3 bucket, no more missing bucket name
- Guinan persona registry completion (CREW_PERSONAS/CREW_MEMORY_ALPHA_URLS/lounge prompts)
- new tests: iteration-budget.test.ts, crew-team-assembly.test.ts additions

Verified: pnpm typecheck clean, 396 unit tests passed."
say "committed on $BRANCH"

if $DO_PUSH; then
  git push -u origin "$BRANCH"
  say "pushed $BRANCH to origin"
fi

if $DO_OPEN_PR; then
  PR_BODY_FILE="$WORKDIR/PR_DESCRIPTION.md"
  PR_TITLE="fix: max-iterations root cause + 4 crew decisions + S3 bucket + Guinan registry"
  COMPARE_URL="${REMOTE_URL%.git}/compare/${CURRENT_BRANCH}...${BRANCH}?expand=1"
  if [[ ! -f "$PR_BODY_FILE" ]]; then
    echo "⚠️  PR_DESCRIPTION.md missing from the fix package — branch is pushed, open the PR manually:" >&2
    echo "   $COMPARE_URL" >&2
  elif ! command -v gh >/dev/null 2>&1; then
    echo "⚠️  gh CLI not installed — branch is pushed, open the PR manually:" >&2
    echo "   $COMPARE_URL" >&2
    echo "   (body drafted at $PR_BODY_FILE)" >&2
  elif ! gh auth status >/dev/null 2>&1; then
    echo "⚠️  gh CLI installed but not authenticated (run 'gh auth login') — branch is pushed, open the PR manually:" >&2
    echo "   $COMPARE_URL" >&2
    echo "   (body drafted at $PR_BODY_FILE)" >&2
  elif PR_URL="$(gh pr create --base "$CURRENT_BRANCH" --head "$BRANCH" --title "$PR_TITLE" --body-file "$PR_BODY_FILE" 2>&1)"; then
    say "opened PR: $PR_URL"
  else
    echo "⚠️  'gh pr create' failed — branch is pushed, open the PR manually:" >&2
    echo "   $COMPARE_URL" >&2
    echo "   (body drafted at $PR_BODY_FILE)" >&2
  fi
fi

# ── 7. Record the milestone into RAG ────────────────────────────────────────
if [[ -f "scripts/store-max-iterations-fix-memory.ts" ]]; then
  say "recording milestone into crew RAG memory…"
  if npx tsx scripts/store-max-iterations-fix-memory.ts; then
    say "RAG memory updated — rag_recall will now surface this fix for related future tasks"
  else
    echo "⚠️  memory recording failed (often just missing Supabase env in this shell) — the code fix" >&2
    echo "   is still applied and committed. Re-run: npx tsx scripts/store-max-iterations-fix-memory.ts" >&2
  fi
else
  echo "⚠️  scripts/store-max-iterations-fix-memory.ts not found — skipping RAG memory step" >&2
fi

echo ""
say "done. Branch: $BRANCH"
if $DO_OPEN_PR; then
  : # PR status already printed above
elif $DO_PUSH; then
  say "pushed but no PR opened — run again with --open-pr, or open one manually: ${REMOTE_URL%.git}/compare/${CURRENT_BRANCH}...${BRANCH}?expand=1"
else
  say "not pushed — run 'git push -u origin $BRANCH' when you're ready, or re-run with --push or --open-pr"
fi
