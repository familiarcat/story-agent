# Git push resilience — scaled timeout + the iCloud `.git` hazard

## TL;DR

Pushes from this repo hung repeatedly. The cause was **not the network** — it was the local
`.git` store being unhealthy because the workspace lives inside an **iCloud-synced `~/Documents`**.
Use [`scripts/git-push-scaled.ts`](../scripts/git-push-scaled.ts) (timeout scales with diff size +
delta-search-disabled retries), and ideally **move the repo out of iCloud**.

## Root cause: `.git` inside iCloud "Desktop & Documents" sync

`~/Documents` here carries `com.apple.fileprovider.*` xattrs — macOS is syncing it to iCloud Drive.
A git object store does not survive cloud sync:

- **Slow / hanging object reads** — iCloud evicts cold objects to the cloud; the next read
  re-downloads them. `git fsck`/`git gc`/`git repack` and push "Counting objects" (delta-base
  search) touch *every* object → many multi-second stalls (observed as `git cat-file` timeouts).
- **Conflict duplicates** — sync races leave ` 2` files: `.git/refs/heads/main 2` (a null-sha ref
  that makes `fsck`/`repack` abort), `.git/index 2`, `.git/MERGE_RR 2`.
- **Corrupt packs** — a sync write interrupted mid-flight leaves a sparse `pack-*.pack` (e.g. a
  nominal 174 MB file in a 4.9 MB `.git`) with a tiny `.idx`; git hangs trying to read it.

### Recommended fix (environment)

Move the working copy out of the synced tree — e.g. `~/Developer/story-agent` or `~/code/` — which
macOS does **not** sync. If it must stay under `~/Documents`, exclude `.git` from iCloud. This makes
`git gc`/`fsck`/normal pushes reliable again (auto-gc currently hangs).

## Immediate repair (when symptoms appear)

```bash
# 1. Remove cloud-conflict duplicate git files (null-sha ref breaks fsck/repack):
rm -f ".git/refs/heads/"*" 2" ".git/index 2" ".git/MERGE_RR 2"
# 2. Remove a corrupt sparse pack (rm = unlink, no read; do NOT `mv` it cross-filesystem — the
#    corrupt read hangs). Spot it: huge .pack + tiny .idx, or `du .git` << sum of pack sizes.
rm -f .git/objects/pack/pack-<corrupt-sha>.pack .git/objects/pack/pack-<corrupt-sha>.idx
# 3. Push with delta-search disabled (skips scanning corrupt delta-base candidates):
git -c pack.window=0 -c pack.depth=0 -c pack.threads=1 push origin main
```

**Never `kill -9` a `git push`** — a SIGKILL mid-pack is what corrupts the object store. The helper
SIGTERMs and lets git unwind.

## The scaled-timeout helper

`scripts/git-push-scaled.ts` (`npx tsx scripts/git-push-scaled.ts [remote] [branch]`):

- **Timeout scales with the change**: `45s + 1.5s/file + 0.05s/line`, clamped `[45s, 600s]`,
  measured over `origin/<branch>..HEAD`. A 2-line fix waits ~45s; a 200-file/9k-line sweep waits the
  full 600s instead of dying early.
- **Resilient retries**: attempt 1 normal (best compression); attempts 2–3 add
  `pack.window=0 pack.depth=0 pack.threads=1` (corrupt-object-safe) with 1.5× backoff.
