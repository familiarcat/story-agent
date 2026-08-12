#!/usr/bin/env zsh
# apply-story-agent-fixes.sh — apply ANY Claude-web-chat-produced fix package to a real story-agent
# working copy: verify it (typecheck + tests), commit it on a dedicated branch, optionally push +
# open a PR, and record the milestone into the crew's durable RAG memory — so rag_recall surfaces
# it automatically on future runs, no manual chat step required.
#
# GENERALIZED (2026-08-11): earlier versions of this script hardcoded the branch prefix, commit
# message, and PR title to the specific max-iterations fix, and expected a bespoke
# store-<fixname>-memory.ts script bundled in every zip. That worked once; it does not scale to
# "every future Claude chat session produces a new fix package." This version reads a MANIFEST.json
# from the zip root (slug/title/tags) to drive branch naming, the commit message, and the PR title,
# and calls the generic scripts/record-claude-chat-milestone.ts for the RAG step instead of a
# one-off script name. Falls back to sane generic defaults if MANIFEST.json is absent, so
# already-issued zips without one still work.
#
# Defaults are pinned to Brady's actual setup:
#   local checkout:  ~/Developer/story-agent
#   GitHub repo:     https://github.com/familiarcat/story-agent
# Override with --repo / --zip if you're running this against a different checkout.
#
# Usage:
#   zsh -ic 'scripts/apply-story-agent-fixes.sh [--zip PATH] [--repo PATH] [--skip-tests] [--push] [--open-pr] [--dry-run]'
#
#   --zip PATH        Path to the downloaded fix zip (default: ~/Downloads/story-agent-fixes.zip)
#   --repo PATH        Path to your story-agent working copy (default: ~/Developer/story-agent)
#   --skip-tests       Skip pnpm typecheck/test:unit verification (not recommended)
#   --push              git push the fix branch to origin after committing (default: off)
#   --open-pr           Push (implies --push) and open a PR via `gh pr create`, using PR_DESCRIPTION.md
#                        as the body. Falls back to printing the compare-URL + body path if the gh CLI
#                        isn't installed/authenticated, rather than failing the whole run.
#   --dry-run          Show what would happen without touching any files
#
# MANIFEST.json (optional, zip root) — drives naming instead of hardcoded text:
#   { "slug": "max-iterations-fix", "title": "fix: max-iterations root cause + ...",
#     "tags": ["milestone", "agent-loop", "rag-self-learning"] }
# Missing fields (or the whole file) fall back to generic defaults — nothing breaks on an older zip.
#
# What it does, in order:
#   1. Validates the zip and the target repo (must be the story-agent monorepo, must be a git repo,
#      and origin should point at familiarcat/story-agent — warns rather than blocks if it doesn't).
#   2. Creates a dedicated branch (fix/<slug>-YYYYMMDD-HHMMSS) so this is isolated + reversible.
#   3. Unzips and copies every file from the package into the matching repo-relative path.
#   4. Runs pnpm install / typecheck / test:unit to verify nothing broke (unless --skip-tests).
#   5. Shows git diff --stat and asks for confirmation before committing.
#   6. Commits on the fix branch (does NOT touch main/origin unless --push or --open-pr is given).
#   7. Runs scripts/record-claude-chat-milestone.ts via tsx (generic — see above) — writes the
#      milestone into observation memory + a personal decision_note for every crew member.
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
# Normalize to an https:// browser URL up front — REMOTE_URL may be SSH-form (ssh://git@host/path
# or the scp-like git@host:path), neither of which a browser can open.
HTTPS_REMOTE="$(printf '%s' "${REMOTE_URL%.git}" | sed -E 's#^ssh://git@#https://#; s#^git@([^:]+):#https://\1/#')"
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

# ── 2. Unzip to a scratch dir FIRST (before creating the branch) so MANIFEST.json can drive naming ──
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
unzip -q "$ZIP_PATH" -d "$WORKDIR"

MANIFEST_FILE="$WORKDIR/MANIFEST.json"
if [[ -f "$MANIFEST_FILE" ]] && command -v node >/dev/null 2>&1; then
  SLUG="$(node -e "try{const m=require('$MANIFEST_FILE');process.stdout.write(String(m.slug||''))}catch{}")"
  PR_TITLE="$(node -e "try{const m=require('$MANIFEST_FILE');process.stdout.write(String(m.title||''))}catch{}")"
  TAGS="$(node -e "try{const m=require('$MANIFEST_FILE');process.stdout.write((m.tags||[]).join(','))}catch{}")"
else
  SLUG=""
  PR_TITLE=""
  TAGS=""
fi
# Generic fallbacks — an older zip with no MANIFEST.json (or a partial one) still works.
[[ -n "$SLUG" ]] || SLUG="claude-chat-fix"
[[ -n "$PR_TITLE" ]] || PR_TITLE="fix: changes from Claude web chat session"
[[ -n "$TAGS" ]] || TAGS="milestone,claude-chat"
say "manifest: slug=$SLUG title=\"$PR_TITLE\" tags=$TAGS$([[ -f "$MANIFEST_FILE" ]] || echo ' (no MANIFEST.json found — using generic defaults)')"

BRANCH="fix/${SLUG}-$(date +%Y%m%d-%H%M%S)"

if $DRY_RUN; then
  say "[dry-run] would create branch $BRANCH off $CURRENT_BRANCH"
  say "[dry-run] would unzip $ZIP_PATH and copy its files into $REPO_PATH"
  $SKIP_TESTS || say "[dry-run] would run: pnpm install / typecheck / test:unit"
  say "[dry-run] would run: npx tsx scripts/record-claude-chat-milestone.ts --story-id $SLUG-$(date +%Y%m%d) --title \"$PR_TITLE\" --summary-file SUMMARY.md --tags $TAGS"
  $DO_PUSH && say "[dry-run] would git push -u origin $BRANCH"
  $DO_OPEN_PR && say "[dry-run] would open a PR via 'gh pr create' (base=$CURRENT_BRANCH) using PR_DESCRIPTION.md"
  say "[dry-run] no files were touched — re-run without --dry-run to apply."
  exit 0
fi

# ── 3. Dedicated branch, then apply the package ───────────────────────────────
git checkout -b "$BRANCH"
say "created + checked out $BRANCH"

# SUMMARY.md, PR_DESCRIPTION.md, and MANIFEST.json document the change set but aren't repo source
# files — used later straight out of $WORKDIR, never committed into the tree.
COPIED=0
while IFS= read -r -d '' f; do
  rel="${f#$WORKDIR/}"
  case "$rel" in
    SUMMARY.md|PR_DESCRIPTION.md|MANIFEST.json) continue ;;
  esac
  mkdir -p "$REPO_PATH/$(dirname "$rel")"
  cp "$f" "$REPO_PATH/$rel"
  echo "  + $rel"
  COPIED=$((COPIED + 1))
done < <(find "$WORKDIR" -type f -print0)
# Re-apply exec bits for any shell scripts the zip carried — cp doesn't always preserve them.
find "$REPO_PATH/scripts" -maxdepth 1 -name '*.sh' -newer "$WORKDIR" -exec chmod +x {} \; 2>/dev/null || true
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
# Commit body: PR_DESCRIPTION.md's full content if present, else just the title.
COMMIT_MSG="$PR_TITLE"
if [[ -f "$WORKDIR/PR_DESCRIPTION.md" ]]; then
  COMMIT_MSG="$(printf '%s\n\n%s' "$PR_TITLE" "$(cat "$WORKDIR/PR_DESCRIPTION.md")")"
fi
git commit -q -m "$COMMIT_MSG"
say "committed on $BRANCH"

if $DO_PUSH; then
  git push -u origin "$BRANCH"
  say "pushed $BRANCH to origin"
fi

if $DO_OPEN_PR; then
  PR_BODY_FILE="$WORKDIR/PR_DESCRIPTION.md"
  COMPARE_URL="${HTTPS_REMOTE}/compare/${CURRENT_BRANCH}...${BRANCH}?expand=1"
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

# ── 7. Record the milestone into RAG (generic script — works for any future zip) ──────────────
if [[ -f "scripts/record-claude-chat-milestone.ts" && -f "$WORKDIR/SUMMARY.md" ]]; then
  say "recording milestone into crew RAG memory…"
  if npx tsx scripts/record-claude-chat-milestone.ts \
      --story-id "${SLUG}-$(date +%Y%m%d)" \
      --title "$PR_TITLE" \
      --summary-file "$WORKDIR/SUMMARY.md" \
      --tags "$TAGS"; then
    say "RAG memory updated — rag_recall will now surface this fix for related future tasks"
  else
    echo "⚠️  memory recording failed (often just missing Supabase env in this shell) — the code fix" >&2
    echo "   is still applied and committed. Re-run: npx tsx scripts/record-claude-chat-milestone.ts --story-id ${SLUG}-$(date +%Y%m%d) --title \"$PR_TITLE\" --summary-file <path-to-SUMMARY.md> --tags $TAGS" >&2
  fi
elif [[ ! -f "scripts/record-claude-chat-milestone.ts" ]]; then
  echo "⚠️  scripts/record-claude-chat-milestone.ts not found in this repo yet — skipping RAG memory step" >&2
  echo "   (it ships in this same zip; it'll be present for the NEXT run once this one is committed)" >&2
else
  echo "⚠️  no SUMMARY.md in this zip — skipping RAG memory step" >&2
fi

echo ""
say "done. Branch: $BRANCH"
if $DO_OPEN_PR; then
  : # PR status already printed above
elif $DO_PUSH; then
  say "pushed but no PR opened — run again with --open-pr, or open one manually: ${HTTPS_REMOTE}/compare/${CURRENT_BRANCH}...${BRANCH}?expand=1"
else
  say "not pushed — run 'git push -u origin $BRANCH' when you're ready, or re-run with --push or --open-pr"
fi
