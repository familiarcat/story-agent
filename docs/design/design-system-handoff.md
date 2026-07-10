# Design-system handoff — one system across all current + future projects

> The single reference for anyone (designer, developer, crew, or another AI client) touching UI in this
> repo. The design system is **LCARS DTCG tokens → CSS variables → components**, themeable and
> Figma-synced. Nothing hardcodes color; everything derives from one source of truth.

## The pieces
| Layer | Where | What |
|---|---|---|
| **Tokens (source of truth)** | [design/tokens/lcars.tokens.json](../design/tokens/lcars.tokens.json) | DTCG tokens for **3 themes** (lcars default · dark · light) + shared scale (space, radius.pill, type sizes, elevation) |
| **Generator** | [scripts/build-tokens.ts](../scripts/build-tokens.ts) | `pnpm tokens:build` regenerates each theme's `:root` block in globals.css (per-theme markers); `pnpm tokens:check` is the CI drift guard |
| **CSS contract** | [globals.css](../packages/ui/src/app/globals.css) | semantic `var(--*)` — components consume these, never hex |
| **Helpers** | [lib/tokens.ts](../packages/ui/src/lib/tokens.ts) | `color`, `space(n)`, `font`, `tier` — typed accessors that resolve to `var(--*)` |
| **Components** | [components/](../packages/ui/src/components/) | `ChatMessage` (chat standard), `ProjectStatusPanel`, LCARS primitives |
| **Figma bridge** | Tokens Studio git-sync + Figma MCPs | design ↔ code round-trip (see [figma-supply-spec.md](figma-supply-spec.md), [figma-design-pipeline.md](figma-design-pipeline.md)) |

## Token glossary (the `var(--*)` contract)
| Variable | Meaning | Helper |
|---|---|---|
| `--bg` | app background | `color.surface` |
| `--surface` / `--surface-2` | card surface / raised surface | `color.card` / — |
| `--text` / `--text-dim` | primary / muted text | `color.text` / `color.muted` |
| `--border` | borders, dividers | `color.border` |
| `--accent1` | primary action (LCARS neon carrot) | — |
| `--accent2` `--accent3` `--accent4` | gold / lilac (tool) / anakiwa (links, user) | `color.accent` / `color.primary` |
| `--ok` `--warn` `--danger` | success / warning / error (also WorfGate green/yellow/red) | `tier.green/yellow/red` |
| `--on-accent` | text on an accent fill | `color.onAccent` |
| `--radius` / `--radius-elbow` | corner radius / LCARS elbow corner | — |
| `--font` | theme font family | `font.sans` |
| `--uppercase` | header text-transform (LCARS=uppercase, dark/light=none) | — |
| spacing | 4px scale (`space(2)`=8px…) | `space(n)` |

## Workflows
**Designer (Figma → code):** edit tokens/frames in Figma → **Tokens Studio → Push** opens a PR here →
CI drift check → merge → `pnpm tokens:build` regenerates globals.css → components re-theme, zero code
edits. Rich layout data flows to scaffolding via the Figma MCPs (official local + GLips `figma-context`).

**Developer (building UI):**
1. Consume `var(--*)` / the `lib/tokens` helpers — **never hardcode hex** (CI `tokens:check` + reviewers enforce).
2. Reuse components (`ChatMessage` for any chat, `ProjectStatusPanel`, LCARS primitives) — don't restyle inline.
3. New theme = a new token set + `[data-theme="x"]` block (copy the pattern); no component edits.
4. New client project = consume the component set; the client's brand is just a `[data-theme]` token map.

## Adding a chat UI
Use [`ChatMessage`](../packages/ui/src/components/ChatMessage.tsx) — never re-style messages inline.
It gives the standard: uppercase accent **sender headline** → **indented, de-emphasized body**, on a
**rounded per-role surface** (You vs Crew). See [chat-ui-standard.md](chat-ui-standard.md).

## Embedded 3rd-party UI (Swagger, future widgets)
Third-party UI ships its **own hardcoded colors** — it does **not** inherit our `var(--*)` tokens, so
our theme contrast can't fix it (Swagger's dark-gray text was invisible on the dark themes). **Rule:**
give embedded 3rd-party UI a **controlled surface in the context it was designed for** — for Swagger, a
light panel with `color-scheme: light` ([docs/page.tsx](../packages/ui/src/app/docs/page.tsx)). Parent
theme tokens must **not** propagate past the wrapper. Don't rely on our tokens reaching inside a 3rd-party
widget; wrap it.

## Credential rotation policy (Worf) — design-system tokens
The design workflow uses two credentials, both **fine-grained**, **out-of-repo** (`~/.alexai-secrets`),
**WorfGate-brokered**, **never committed**:
- **`TOKENS_STUDIO_GITHUB_PAT`** — this repo only, `Contents R/W` + `Pull requests R/W`, nothing else.
- **`FIGMA_API_KEY`** — Figma personal access token for the `figma-context` (GLips) MCP.

**Rotation:** ≤ **90-day** expiry; rotate on expiry (or immediately on suspected exposure) by minting a
new fine-grained token, updating `~/.alexai-secrets`, and re-pasting into the tool (Tokens Studio /
`/mcp` reconnect). WorfGate audits every use and never logs the value; presence is checked via
`worfgate_credential_status`. Prefer the shortest expiry that doesn't create toil.
