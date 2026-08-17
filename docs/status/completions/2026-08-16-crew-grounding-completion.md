---
title: "2026-08-16 Crew Grounding Fix — Roster Drift & Verbatim-Numbers Completion"
category: "status"
subcategory: "completions"
tags: ["completion", "crew", "hallucination", "roster", "grounding", "guinan", "lcars-markdown"]
searchable: true
version: "1.0"
last_updated: "2026-08-16"
---

# ✅ SESSION COMPLETION — Crew Roster Grounding Fixed & Deployed

**Date**: 2026-08-16
**Status**: ✅ **DEPLOYED, VERIFIED LIVE (`gitSha: 46d1700`)**
**Commit**: `46d1700` — `fix(crew): single-source roster (3 drifted copies) + verbatim-numbers + unconditional roster block`

---

## 🎯 THE BUG

Plain-chat crew-roster questions (`/chat`, no activation phrase) fabricated and dropped crew
members — a 7-member list, then a "corrected" 12-member list that invented a nonexistent
*Voyager* character ("Kim") and double-counted Geordi/La Forge, while silently dropping the real
Uhura and Guinan. A separate but related failure mode: activation-path ("make it so") mission
reports narrated fabricated test results (189/193, 97.9%) contradicting the real numbers (430/0).

## 🔍 ROOT CAUSE — THREE INDEPENDENTLY DRIFTED ROSTERS

`crew-personas.ts`'s `CREW_MISSION_ORDER` was the intended single source of truth (12 members,
Guinan included). Two other files had silently forked their own hardcoded copies that never got
her added:

1. `chat.ts`'s `ALL_HANDS_CREW` — fed the roster only on an explicit `directive: all-hands` line.
2. `crew-skill-registry.ts`'s `buildCrewInventory()` — **the actual pipeline behind ordinary
   roster questions**, via `assembleTeamsForMission`. This was the real cause of the originally
   reported transcript, not #1.

A structural gap compounded both: skill-matched team assembly answers "who's assigned to this
task," not "who's on the crew" — different questions — so even a synced roster wasn't guaranteed
to appear in full for a generic enumeration question.

## 🛠️ THE FIX — 6 PATCHES, AUTOMATED & IDEMPOTENT

Delivered as `apply-crew-grounding-fixes.zsh` (backs up before writing, verifies each patch
before applying, safe to re-run):

1. `chat.ts` — derive `ALL_HANDS_CREW` from `crew-personas.ts` instead of a second hardcoded list.
2. `chat.ts` — roster-grounding guardrail in the plain-chat system prompt (never invent/imply a
   crew member not explicitly listed in CONTEXT).
3. `loop.ts` — verbatim-numbers guardrail in the activation-path system prompt (any reported
   count/percentage must be copied from an actual tool result, never estimated).
4. `crew-skill-registry.ts` — added the missing Guinan entry to `buildCrewInventory()`.
5. `chat.ts` — unconditional "FULL CANONICAL CREW ROSTER" block injected into the crew prelude
   every turn, independent of skill-matching, so a roster question always has ground truth.

## ✅ VERIFICATION

- `pnpm --filter @story-agent/mcp-server typecheck` — clean against real workspace deps.
- Deployed via `gh workflow run deploy.yml -f apply=true` — ECS rollout `COMPLETED`,
  `running=desired`, Redis TLS/AUTH verified, UI `/dashboard` → 200.
- `curl https://storyagent.pbradygeorgen.com/agent/health` → `gitSha: "46d1700"` (matches HEAD).
- **Live re-test of the original failing prompt** (`"list the crew roster"` via `/chat`) —
  all 12 members returned correctly, Guinan included, zero invented members:
  Picard, Data, Riker, Worf, Geordi La Forge, O'Brien, Yar, Troi, Crusher, Uhura, Quark, Guinan.

## 📎 OPEN THREAD — NOT YET ADDRESSED

The same `/chat` roster response's `crewSelfOrganization.missionPlan` field (the crew's *internal
planning narrative*, not the user-facing answer) still invents flavor text — a fictional
`/var/starfleet/records/Roster.txt` file and an "HRIS-7" system. Lower stakes than the original
bug (never reaches the user as fact), but same underlying pattern. Not yet patched.

## 🎨 LCARS MARKDOWN — ALREADY UNIFIED (verified, not newly built)

Confirmed `packages/shared/src/lcars-markdown.ts` is already the single shared renderer across
every real chat surface — no new work needed here, just verified during this session:
- Web `/chat`, `/agent` → `renderLcarsMarkdown()` (real TS import).
- VS Code `ChatPanel.ts` (custom webview) + `sidebar.ts` (custom webview) →
  `LCARS_MARKDOWN_CLIENT_JS` (hand-mirrored plain-JS twin, since webviews can't do real imports).
- VS Code's *native* chat participant is intentionally exempt — VS Code renders markdown natively
  there via `stream.markdown()`; the custom renderer only applies to Story Agent's own webviews.

---

**Verified By**: Sovereign Factory Crew
**Synthesis**: "It is possible to commit no mistakes and still lose. That is not a weakness;
that is life." — Picard. Three drifted rosters, one ground truth restored.
