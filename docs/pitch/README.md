# Story Agent — Pitch & Presentation System

A complete, self-contained kit for explaining the project — plus a **reusable generator** that builds a crew-authored deck for **any scope** (the whole system, a client, a project, or a story).

## Generate a deck for any scope — `pnpm present`

```bash
pnpm present -- --scope system                                  # whole-project summary
pnpm present -- --scope client  --name "Jonah" [--client jonah] # client proposal
pnpm present -- --scope project --name "PM Dashboard" --brief brief.md
pnpm present -- --scope story   --name "Aha branching"  --brief brief.md
#   optional: --title "…"  --audience "…"  --minutes 8  --slug my-deck  --out <dir>  --no-store
```

What it does (all on cost-optimized OpenRouter models, ~$0.002–0.003, live in `pnpm status`):
1. **Resolves the scope** and picks a section preset (system = 11 officer domains; client = value/fit/security/cost/roadmap; project = overview/architecture/plan/quality/infra/cost; story = problem/approach/plan/acceptance/impact).
2. **Gathers grounded facts** — built-in platform capabilities + RAG recall for the scope (`getRelevantObservationMemories`) + an optional `--brief <file>` for scope-specific detail.
3. **The full crew fans out in parallel**, each officer drafting one section.
4. **Assembles a self-contained deck** (`scripts/lib/deck-template.html`) → `docs/pitch/presentations/<slug>/index.html` + `deck.pdf`, reusing the shared vendored libs. Result is stored to RAG.

Generated decks land in `docs/pitch/presentations/<slug>/` (gitignored — regenerate on demand). For a scope with little RAG history, pass `--brief` with a short markdown file describing it.

### The system pitching itself, top down — `pnpm present:book`

```bash
pnpm present:book -- [--minutes 3]
```

Builds an **interlinked pitch book** at [`pitch-book/`](./pitch-book/): a top-level cover/directory deck plus one deck per architectural pillar (Orchestration, Cost & Routing, Security, Memory, Delivery, Infra & Ops). The orchestration is the directed flow: **Riker assembles a team per pillar** (`assembleAndOptimize`), **all teams commit** (a barrier — every pillar's crew is finalized), **then the whole set of pillar×officer drafts splits into parallel execution** (one flat `Promise.all`). Decks are cross-linked in **both HTML and PDF** — the cover links to each pillar (HTML · PDF), each pillar links back to the cover (`../index.html` · `../deck.pdf`). Open [`pitch-book/index.html`](./pitch-book/index.html).

---

## Curated decks (committed)

## Contents

| File | What it is | Best for |
|---|---|---|
| [`presentation/summary.html`](./presentation/summary.html) | **Crew-authored Project Summary deck** — 14 slides, one section per officer (drafted in parallel by all 11 via `scripts/crew-presentation.mjs`), live zoom/pan diagrams, speaker notes, 10-min timer | **Shared-screen walkthrough** |
| [`presentation/index.html`](./presentation/index.html) | **Interactive elevator deck** — real slides, live **zoom/pan** mermaid diagrams, speaker notes, 5-min pacing timer | Fast 5-min pitch |
| [`elevator-pitch.md`](./elevator-pitch.md) / `.pdf` | The 5-minute spoken script + diagrams + feature rationale + client benefit + honest caveats | Reading / handout |
| [`system-analysis.md`](./system-analysis.md) / `.pdf` | Deeper file-cited architecture overview + current-state assessment + next steps | Follow-up / deep dive |

## Presenting (the deck)

Just open `presentation/index.html` in any browser — **no server, no internet needed** (mermaid + svg-pan-zoom are vendored under `presentation/vendor/`).

**Keyboard:**

| Key | Action | Key | Action |
|---|---|---|---|
| `→` / `Space` | Next slide | `←` | Previous |
| `N` | Toggle **speaker notes** (the spoken script) | `T` | Start / pause the **5-min timer** |
| `R` | Reset timer | `F` | Fullscreen |
| `Z` | Reset diagram zoom | `?` | Help |

Diagrams: **scroll / pinch to zoom, drag to pan**, on-canvas `+ / − / RESET` controls. Deep-link a slide with `index.html#4`.

## Rebuilding the PDFs

```bash
node scripts/build-pitch-pdf.mjs docs/pitch/elevator-pitch.md docs/pitch/elevator-pitch.pdf
node scripts/build-pitch-pdf.mjs docs/pitch/system-analysis.md docs/pitch/system-analysis.pdf
```

The build renders each ` ```mermaid ` block to PNG (`mermaid-cli`), embeds them via `pandoc`, and prints to PDF with headless Chrome. Requires `mmdc`, `pandoc`, and Google Chrome. Diagram intermediates land in `diagrams/` (gitignored).

## Editing content

- **Deck slides + speaker notes:** the `SLIDES` array in `presentation/index.html`.
- **Diagrams:** the `DIAGRAMS` object in `presentation/index.html` (mermaid source). The same diagrams live as ` ```mermaid ` blocks in the two markdown docs — keep them in sync, or treat the deck as canonical.
- Content is grounded/fact-checked against the codebase; keep the appendix caveats honest (shadow-test is a criterion, cost figures are per-deliberation, clients are illustrative).
