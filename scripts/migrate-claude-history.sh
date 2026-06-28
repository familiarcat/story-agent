#!/usr/bin/env zsh
# Migrate Claude Code project state (session transcripts, auto-memory, prompt history) from one repo
# path to another — needed because Claude Code keys everything by absolute directory path, so moving
# the repo (e.g. off iCloud → ~/Developer) leaves history behind. Idempotent + additive (never clobbers
# newer files). Backs up ~/.claude.json before merging.
#
# Usage: scripts/migrate-claude-history.sh [OLD_PATH] [NEW_PATH]
set -e
emulate -L zsh
OLD="${1:-$HOME/Documents/workspace/story-agent}"
NEW="${2:-$HOME/Developer/story-agent}"
enc() { echo "${1//\//-}"; }                       # /a/b → -a-b (Claude Code's project-dir encoding)
OLD_DIR="$HOME/.claude/projects/$(enc "$OLD")"
NEW_DIR="$HOME/.claude/projects/$(enc "$NEW")"

[[ -d "$OLD_DIR" ]] || { echo "✗ no Claude Code history at $OLD_DIR"; exit 1; }
mkdir -p "$NEW_DIR"

echo "▶ Transcripts + memory  $OLD → $NEW"
# Session transcripts (.jsonl) — copy if absent (don't overwrite a newer same-id session).
cp -nv "$OLD_DIR"/*.jsonl "$NEW_DIR"/ 2>/dev/null || true
# Auto-memory (MEMORY.md + entries) — merge the whole dir, no clobber.
[[ -d "$OLD_DIR/memory" ]] && { mkdir -p "$NEW_DIR/memory"; cp -nv "$OLD_DIR"/memory/*.md "$NEW_DIR"/memory/ 2>/dev/null || true; }
echo "  ✓ $(ls "$NEW_DIR"/*.jsonl 2>/dev/null | wc -l | tr -d ' ') transcripts, $(ls "$NEW_DIR"/memory/*.md 2>/dev/null | wc -l | tr -d ' ') memory files in new dir"

echo "▶ Merge prompt history in ~/.claude.json (backup first)"
cp "$HOME/.claude.json" "$HOME/.claude.json.bak-migrate"
python3 - "$OLD" "$NEW" <<'PY'
import json,os,sys
old,new=sys.argv[1],sys.argv[2]
p=os.path.expanduser('~/.claude.json'); d=json.load(open(p))
proj=d.setdefault('projects',{})
o=proj.get(old,{}); n=proj.setdefault(new,{})
# Prepend the old prompt history (dedup, preserve order); keep all of the NEW entry's other fields
# (enabledMcpjsonServers, etc.) untouched.
oh=o.get('history',[]); nh=n.get('history',[])
seen=set(); merged=[]
for h in oh+nh:
    key=json.dumps(h,sort_keys=True)
    if key in seen: continue
    seen.add(key); merged.append(h)
if merged: n['history']=merged
json.dump(d,open(p,'w'),indent=2)
print(f"  ✓ history: {len(oh)} old + {len(nh)} new → {len(n.get('history',[]))} merged")
PY
echo "▶ Done. Reload the new window (Cmd+Shift+P → Developer: Reload Window) to pick it up."
