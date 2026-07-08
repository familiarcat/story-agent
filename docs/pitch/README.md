# Story Agent — Pitch & Presentation System

A complete, self-contained kit for explaining the project in a ~5-minute technical interview.

## Contents

| File | What it is | Best for |
|---|---|---|
| [`presentation/index.html`](./presentation/index.html) | **Interactive slide deck** — real slides, live **zoom/pan** mermaid diagrams, speaker notes, 5-min pacing timer | **Presenting live** |
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
