# Chat-UI standard — one design-system component for every project

> Crew-debated in the Observation Lounge (frugal, ~$0.0028). The rule: **any UI depicting a "chat"**
> renders messages through ONE reusable component built on our existing **LCARS design-token system**
> (no new design system) — so web, the VS Code extension, and every current/future client project
> look identical and stay themeable.

## The standard (what every chat must do)
1. **Typographic hierarchy** — an uppercase, accent-colored **sender headline** above **indented,
   de-emphasized body copy** (body sits at `space(3)` indent, smaller, `--text` not accent).
2. **Rounded, per-role message background** — each message on a slightly rounded surface
   (`var(--radius)`) with a per-role left rail so **"You" vs "Crew"** are visually distinct:
   - `You` → accent `var(--accent4)`, surface `var(--surface-2)`
   - `Crew` (and `assistant`) → accent `var(--ok)`, surface `var(--surface)`
3. **Tokens, never hex** — all color binds to the LCARS `var(--*)` contract; changing a token
   (via the Tokens Studio git-sync loop) re-themes every chat everywhere, zero component edits.

## The component (the single source)
[packages/ui/src/components/ChatMessage.tsx](../packages/ui/src/components/ChatMessage.tsx) +
[ChatMessage.tokens.ts](../packages/ui/src/components/ChatMessage.tokens.ts) (pure role→token map,
node-testable). API:
```tsx
<ChatMessage role="user" | "crew" | "assistant" sender?={string} meta?={ReactNode}>
  {bodyContent}
</ChatMessage>
```
`chatRoleStyle(role)` is the pure binding (tested: every role → `var(--*)`, never hex; You≠Crew).

## Implementation path (crew-ordered)
1. **✅ Component + role tokens** — `ChatMessage` built on `@/lib/tokens` (`space`, `font`, `var(--*)`). *(First step — done.)*
2. **✅ Pilot: `/chat`** — adopted; flat message divs replaced with `<ChatMessage>` (rounded bg, role rail, headline→indented-body hierarchy, meta line). Test 2/2, UI typecheck clean, zero hex.
3. **✅ `/agent`** — the transcript's `user` + `text` events now render via `<ChatMessage>` (You / Agent); the dead local `Block` was removed. Only chat bubbles were converted — tool/gate/status lines stay as-is. Typecheck clean, `/agent` → 200.
4. **⊘ VS Code extension — N/A by design.** The extension chat uses VS Code's **native chat participant** (`stream.markdown`, [agentClient.ts](../packages/vscode-extension/src/agentClient.ts)) — VS Code owns that panel's styling, so the bubble standard can't/shouldn't be applied. The extension's webviews (sidebar, story panel) aren't chat surfaces. **When** a future extension adds a *custom* chat webview, it must mirror `ChatMessage` as HTML/CSS (same tokens).
5. **Future client projects** — consume `ChatMessage` from the UI component set; any client theme is just a `[data-theme]` token map (LCARS/dark/light already exist).
6. **Optional token promotion (Data)** — if chat needs its own knobs later, add a `chat/*` namespace to `lcars.tokens.json` *derived from existing space/radius/accent tokens* (avoid sprawl) and wire through `build-tokens.ts`. Not needed for the standard above.

## Guardrail
Single source of truth stays the LCARS tokens; `ChatMessage` is the single chat renderer. New chat
surfaces MUST use it rather than re-styling messages inline (that's the drift this standard prevents).
*(Discarded tier-3 debate noise: cryptographic sender verification, a `@lcars/ui-core` package we don't
have, `tokens-studio-cli`, and Starfleet "command/ops/science" roles — our roles are You vs Crew.)*
