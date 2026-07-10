# Physically testing the Story Agent VS Code extension (replace Claude Code)

Crew-agreed v1 scope + test plan from the Observation Lounge
([vscode-v1-featureset](observation-lounge/vscode-v1-featureset-2026-06-25015306.md); RAG obs `1a8ff069`,
Geordi memory #9). Goal: make Story Agent your daily VS Code AI assistant instead of Claude Code, to
cut cost (OpenRouter/Quark vs Anthropic) and optimize results.

## Crew-agreed v1 feature set

| # | Feature | Status |
|---|---|---|
| 1 | Chat participant `@story-agent` | ✅ exists |
| 2 | `/agent` autonomous loop (read/edit/apply_patch/shell/search/git) | ✅ exists |
| 3 | Token-optimizing `/ask` (model tiering, caching) | ✅ exists |
| 4 | Cost (Quark) + WorfGate gating | ✅ exists |
| 5 | `/plan` (plan mode) + `/review` (diff review) | ✅ **added this session** |
| 6 | `@file` / `@codebase` context (file-tree + grep symbol search, **no embeddings**) | 🔜 v1 must-have |
| 7 | **Multi-file apply diff review UI** (per-hunk accept/reject) | 🔜 v1 must-have |
| 8 | Inline chat (Ctrl+I), inline completions, Aha story tree, `@story`/`@memory` | ⏸️ deferred post-v1 |

**Definition of done (Yar):** a real bug fix flows `/agent` → multi-file diff review → committed
patch, with output parity vs Claude Code on the same task. **Worf:** no diff applies without a WorfGate
`APPROVED` token, enforced at the tool layer. **Picard:** `@codebase` is grep/file-tree only (no
embedding infra) to avoid scope creep.

## Prerequisites (one-time)

1. **Agent endpoint running** (the OpenRouter loop powering `/agent` `/plan` `/review`):
   ```bash
   STORY_AGENT_AGENT_PORT=3103 pnpm --filter @story-agent/mcp-server start
   ```
   Verify: `curl -s localhost:3103/symphony -o /dev/null -w '%{http_code}\n'` → `200`.
   (The extension defaults to `http://localhost:3103`; override via setting `storyAgent.chat.agentServiceUrl`.)
2. **Extension installed:** `pnpm ext:install-local` (or it's already installed this session).
3. Secrets come from `~/.alexai-secrets` via `~/.zshrc` (OpenRouter key etc.) — WorfGate brokers them.

## Physical test checklist

Open the VS Code **Chat** view (`Ctrl/Cmd+Alt+I`) and type `@story-agent`, then:

1. **Smoke / read-only** — `@story-agent /agent list the top-level files, then stop`
   - Expect: a `model: deepseek/...` line, a `list_dir` tool call, a result, a summary. Confirms OpenRouter (not Anthropic).
2. **Plan mode** — `@story-agent /plan add a --json flag to scripts/list-clients.ts`
   - Expect: an ordered plan, **no file edits**, and a "Execute this plan with /agent" follow-up.
3. **Review mode** — make a small edit, then `@story-agent /review`
   - Expect: it runs `git_status`/`git_diff` and reviews — read-only.
4. **Autonomous edit (the real test)** — `@story-agent /agent add a one-line JSDoc comment to the top of scripts/list-clients.ts and save`
   - Expect: a `write_file`/`edit_file`/`apply_patch` tool call through WorfGate (tier shown), then the file changes on disk.
5. **Cost proof** — each turn ends with a cost line (e.g. `$0.001`). Compare to a Claude Code session on the same task.
6. **Parity stress test (DoD)** — a 3-file refactor via `/agent`, review the diff, confirm it builds.

## What to report back

- Did `/agent` complete the edit correctly? (quality vs Claude Code)
- Was the cost meaningfully lower?
- Where did you *miss* Claude Code? (→ feeds the v1 gaps #6/#7 priority)

The two v1 gaps (`@codebase` context + multi-file diff review UI) are the next build targets; everything
else needed to start dailydriving is live now.
