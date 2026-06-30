# Figma supply spec — what we hand Figma to create a bidirectional-interoperable document

> Crew-defined (Observation Lounge, `run_crew_mission_pipeline`, ~$0.0024, stored to RAG). The point:
> create a Figma document that **round-trips** with our LCARS build system. The free bidirectional
> bridge is **Tokens Studio for Figma** (it git-syncs W3C/DTCG token JSON ↔ Figma variables) — *not*
> the Dev Mode MCP (that read-back path needs a paid Dev seat; see "Upgrade path").
>
> Tier-3 crew inventions filtered: no per-token SHA-256/AES, no Git LFS, no "scan JSON for executable
> code." LCARS UI tokens are **public design constants**, not controlled data — the only real rule is
> "no `sa_*`/client data in the file," which a token file trivially satisfies.

## The supply set (in order)
What we literally hand Figma to build the interoperable doc:

1. **The token file** — [design/tokens/lcars.tokens.json](../design/tokens/lcars.tokens.json) (real values from `globals.css` + `tokens.ts`). Import via **Tokens Studio → Import → DTCG**. Establishes Figma variables `lcars/color/*`, `lcars/space/*`, `lcars/radius/*`, `lcars/type/*`, `lcars/elevation/*`.
2. **The Figma Make prompt** (below) — paste into "Describe your idea."
3. **A guide attachment** — a screenshot of an existing LCARS screen (e.g. `ProjectManagerDashboard`) or the palette, dropped into Make's "Attach a design to guide the result."
4. **The interoperability contract** (below) — the naming/structure the resulting doc MUST follow to scaffold back out cleanly.

## Interoperability contract (Data — one source of truth)
The Figma doc round-trips only if it obeys these:

- **Variables, not hardcodes.** Every fill/space/radius binds to a `lcars/*` variable (from step 1). No raw hex. This is what makes it bidirectional — change the token, both Figma and code update.
- **Pages:** `01 Dashboards` (Next.js web) · `02 VS Code Extension`. One design, two surfaces.
- **Frame names = our component names** so the scaffold maps 1:1:
  - `dashboard/ProjectManagerDashboard`, `dashboard/SprintBoard`, `dashboard/HierarchyTree`
  - `extension/DeveloperStoryWorkspace`, `extension/WorkflowStatus`
- **Components + variants** for repeated UI: `Badge` (variant=status: pending|implementing|pr_open|merged|blocked), `Button` (variant=primary|secondary), `Card`.
- **Variable paths mirror the token paths** exactly: `lcars/color/accent1`, `lcars/space/4`, `lcars/radius/elbow`.
- **`figma-lock.json`** pins the token version so CI can flag Figma↔code drift.

## The Figma Make prompt (Riker — paste verbatim)
```
Design an LCARS (Star Trek TNG) admin interface, dark theme, using ONLY this palette:
background #000000, card surface #0a0a0a, raised #11121a, primary text amber #ffcc99,
muted text #9999cc, borders #664466. Accents: carrot #ff9933 (primary actions), gold #ffcc66,
lilac #cc99cc, anakiwa #99ccff (links). Status: green #99cc99, amber #ffcc66, red #cc6666.
Monospace/condensed type. Rounded corners 8px; large 18px "elbow" corners on side rails.
4px spacing grid (4/8/12/16/24/32). Flat, border-driven — no drop shadows.

Make two screens:
1) "ProjectManagerDashboard" — left LCARS elbow nav rail, a portfolio rollup of
   clients → projects → epics, a sprint board, and status badges
   (pending / implementing / pr_open / merged / blocked).
2) "DeveloperStoryWorkspace" — a VS Code-style panel: a story list, a workflow-status
   strip, and an active-story detail card.

Name every frame and layer semantically (e.g. ProjectManagerDashboard, Badge/status=merged,
Button/primary, Card). Use auto-layout everywhere. No images, no Lorem placeholder logos,
no real company or personal data.
```

## Security & round-trip checks (Worf / Yar)
- **Nothing controlled in the doc:** no `sa_*`, client names, real project/person data, secrets, or screenshots of controlled UI. Generic placeholders only ("Client A", "PROJ-1").
- **Round-trip check (Yar):** after generation, confirm every color/space/radius is **variable-bound** (not raw hex) and frame names match the contract before it's eligible for scaffold.

## Cost & the Free-tier reality (Quark)
- **Works on Free today:** Tokens Studio (free tier) handles the token import/sync; Figma Make generates the layout; all crew reasoning stays on cheap OpenRouter tiers.
- **Upgrade path (later, optional):** the approved **figma-mcp-local** (Dev Mode MCP read-back, [.mcp.json](../.mcp.json)) needs a **paid Dev seat** — that's what lets the crew *read frames directly* to auto-scaffold. Until then the loop is: Tokens Studio (variables) + Make (layout) + manual export → crew scaffold.

## Round-trip summary
```
in-repo lcars.tokens.json ──(Tokens Studio import)──▶ Figma variables ──▶ Figma Make builds screens
        ▲                                                                          │
        └──(Tokens Studio Git sync: edits in Figma → PR back to repo)◀────────────┘
                       (code → Figma) and (Figma → code) share ONE token set
```
