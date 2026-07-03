#!/usr/bin/env bash
# consolidate-secrets — remove the secret-STORAGE duplication between ~/.zshrc and ~/.alexai-secrets.
#
# WHY: WorfGate is a READ-ONLY broker (it never writes shell files). Secrets drifted across two files
# (~/.zshrc AND ~/.alexai-secrets), so different lanes saw different values (e.g. the stale AWS key).
# This one-shot, human-run utility migrates secret-like `export`s from ~/.zshrc into ~/.alexai-secrets
# (the single source of truth, sourced by ~/.zshenv → every lane) so nothing is duplicated.
#
#   scripts/consolidate-secrets.sh            # DRY RUN — reports names + status, writes NOTHING
#   scripts/consolidate-secrets.sh --apply    # backs up both files, migrates, comments out in ~/.zshrc
#
# Never prints secret VALUES — only variable NAMES + status. Conflicts prefer the ~/.zshrc value
# (interactively-refreshed keys are usually the fresher ones).
set -euo pipefail

ZSHRC="$HOME/.zshrc"
SECRETS="$HOME/.alexai-secrets/api-keys.env"
APPLY=0; [ "${1:-}" = "--apply" ] && APPLY=1

# Which exported names count as secrets/creds we consolidate (not PATH/EDITOR/etc.).
SECRETISH='(KEY|TOKEN|SECRET|PASSWORD|_PAT|CRED|API|SUPABASE|AWS_|FIGMA|AHA_|OPENROUTER|CREW_LLM|VAULT|OCELOT)'

[ -f "$ZSHRC" ]   || { echo "no ~/.zshrc — nothing to consolidate"; exit 0; }
[ -f "$SECRETS" ] || { echo "no $SECRETS — create it first (mkdir -p ~/.alexai-secrets && touch $SECRETS)"; exit 1; }

# Match assignments with OR WITHOUT `export` — a non-exported VAR= never reaches subprocesses
# (the FIGMA_API_KEY bug), so we catch + normalize those too.
valof() { # value of a VAR in a file (last wins), no printing to caller's stdout
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$2" 2>/dev/null | tail -1 | sed -E "s/^[[:space:]]*(export[[:space:]]+)?$1=//; s/^\"//; s/\"$//" || true
}
rhsof() { # raw right-hand side (preserve quoting) of a VAR in a file
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" "$2" 2>/dev/null | tail -1 | sed -E "s/^[[:space:]]*(export[[:space:]]+)?$1=//" || true
}

names=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${SECRETISH}[A-Z0-9_]*=" "$ZSHRC" 2>/dev/null \
  | sed -E 's/^[[:space:]]*(export[[:space:]]+)?([A-Z0-9_]+)=.*/\2/' | sort -u || true)

migrate=(); dup=(); conflict=()
for n in $names; do
  zv="$(valof "$n" "$ZSHRC")"; sv="$(valof "$n" "$SECRETS")"
  if ! grep -qE "^[[:space:]]*export[[:space:]]+$n=" "$SECRETS"; then migrate+=("$n")
  elif [ "$zv" = "$sv" ]; then dup+=("$n")
  else conflict+=("$n"); fi
done

echo "── secret duplication report (~/.zshrc → ~/.alexai-secrets) ──"
echo "MIGRATE  (only in ~/.zshrc → move to secrets): ${migrate[*]:-none}"
echo "DUP      (identical in both → drop from ~/.zshrc): ${dup[*]:-none}"
echo "CONFLICT (differ; ~/.zshrc value wins as fresher): ${conflict[*]:-none}"
echo "(no secret VALUES shown — names + status only)"

if [ "$APPLY" -eq 0 ]; then
  echo; echo "DRY RUN — nothing written. Re-run with --apply to consolidate."; exit 0
fi

ts=$(date +%Y%m%d%H%M%S)
cp -p "$ZSHRC" "$ZSHRC.bak.$ts"; cp -p "$SECRETS" "$SECRETS.bak.$ts"
echo "backed up: $ZSHRC.bak.$ts  +  $SECRETS.bak.$ts"

for n in "${migrate[@]}" "${conflict[@]}"; do
  [ -z "$n" ] && continue
  rhs=$(rhsof "$n" "$ZSHRC")
  # replace any existing entry in secrets, then append NORMALIZED to `export` (fixes non-exported vars)
  grep -vE "^[[:space:]]*(export[[:space:]]+)?$n=" "$SECRETS" > "$SECRETS.tmp" && mv "$SECRETS.tmp" "$SECRETS"
  printf 'export %s=%s\n' "$n" "$rhs" >> "$SECRETS"
  # comment out the ~/.zshrc line (export or plain) — kept for audit, no longer active
  perl -i -pe "s{^(\s*(export\s+)?$n=.*)}{# [consolidated → ~/.alexai-secrets] \$1}" "$ZSHRC"
done
# DUP entries: just comment out in ~/.zshrc (already identical in secrets)
for n in "${dup[@]}"; do
  [ -z "$n" ] && continue
  perl -i -pe "s{^(\s*(export\s+)?$n=.*)}{# [dup, lives in ~/.alexai-secrets] \$1}" "$ZSHRC"
done

chmod 600 "$SECRETS"
echo "✓ consolidated. ~/.alexai-secrets is now the single source; migrated exports commented out in ~/.zshrc."
echo "  open a new shell + verify: worfgate_credential_status (or your app) resolves the same values everywhere."
