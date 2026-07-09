# LCARS Color Theory Style Guide

This guide standardizes LCARS color usage across the Story Agent project.

## Source of truth

- Token file: `design/tokens/lcars.tokens.json`
- Generated app variables: `packages/ui/src/app/globals.css`
- Token build/check commands:
  - `pnpm tokens:build`
  - `pnpm tokens:check`

Do not hardcode off-palette hex values in LCARS surfaces.

## LCARS palette (authoritative)

- `bg`: `#000000`
- `surface`: `#16161f`
- `surface-2`: `#22222f`
- `text`: `#ffd9b3`
- `text-dim`: `#bcbce8`
- `border`: `#8a6a8a`
- `accent1`: `#ff9933` (primary action)
- `accent2`: `#ffcc66`
- `accent3`: `#cc99cc`
- `accent4`: `#99ccff`
- `danger`: `#cc6666`
- `ok`: `#99cc99`
- `warn`: `#ffcc66`
- `on-accent`: `#000000`

## Visual hierarchy

1. Background and surfaces
- Use `bg` for page ground.
- Use `surface` for primary cards/panels.
- Use `surface-2` for elevated rows, headers, and table heads.

2. Typography
- Primary body/callouts: `text`.
- Metadata/subtitles: `text-dim`.
- Keep uppercase emphasis for LCARS section labels where needed.

3. Actions and status
- Primary action/important emphasis: `accent1`.
- Secondary emphasis: `accent2` or `accent3`.
- Links and navigational signal: `accent4`.
- Success/warning/error must use `ok`/`warn`/`danger` only.

4. Borders and framing
- Use `border` for all panel and table separators.
- Prefer border-driven structure over heavy shadows.

## Accessibility and WorfGate view safety

- Maintain readable contrast for all foreground/background pairs.
- Avoid exposing sensitive operational metadata in rendered views.
- Never display local absolute host file paths in user-facing visualizations.

## Implementation rules

- Prefer CSS custom properties mapped to tokens.
- Keep theme logic token-driven; avoid per-page ad hoc color systems.
- For temporary reports, apply the same LCARS token set and do not introduce new palette values.

## Functional naming system (art within method)

Use operationally explicit headlines over poetic ambiguity.

- Prefer `Observed State` over `Current Baseline`.
- Prefer `Efficiency Step-Up` over `Operational Lift`.
- Prefer `Operating Target` over `Target Band` when a target is explicit.
- Prefer `Stress-Test Envelope` over `Stretch (Guarded)` for risk-aware planning.

Apply this system to:

- Panel titles
- Stat labels
- Scenario rows
- Section headers

## Troi arbitration model (persona synthesis)

When labels conflict across personas (Picard strategy, Quark finance, Worf security, Data architecture):

1. Gather candidate labels from the contributing personas.
2. Evaluate each for operational clarity, stakeholder empathy, and security ambiguity.
3. Final wording authority sits with **Troi**.
4. Persist accepted wording in the shared headline taxonomy module:
  - `packages/ui/src/lib/headline-system.ts`

This keeps the interface expressive, consistent, and comprehensible across the entire UI.
