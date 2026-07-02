# WorfGate break-glass — O'Brien's governed override + crew monitoring

> Crew-designed in the Observation Lounge. Gives O'Brien (devops) the capacity to automate by
> **overriding the WorfGate operation allowlist with a justification** — a transparent **break-glass**,
> never a silent backdoor. Every override is monitored by the whole crew in the Observation Lounge.
> Implemented in [worfgate-credentials.ts](../packages/shared/src/worfgate-credentials.ts).

## What it is
WorfGate normally authorizes a credential by crew identity + a per-credential **operation allowlist**
(`CredentialSpec.operations`). The break-glass lets O'Brien use a **registered** credential for an
operation *outside* that allowlist when automating — bounded and logged.

`resolveWorfGateOverride(name, { operation, crewId, reason })` → `{ ...CredentialAccessResult, override, monitored }`.

## The bounds (Worf's ruling — what keeps it break-glass, not backdoor)
| Bound | Rule |
|---|---|
| **Who** | `OVERRIDE_CREW` = O'Brien (primary) + Worf (gate owner) + Picard (command). No one else. |
| **Reason** | REQUIRED, ≥ `MIN_OVERRIDE_REASON_LEN` (20) chars — a real justification, not a placeholder. |
| **Scope** | Overrides the **operation allowlist ONLY**. Never the registry allowlist — it can't invent a secret outside `CREW_CREDENTIAL_REGISTRY`. |
| **Rate** | `OVERRIDE_LIMIT_PER_DAY` (3) per crew, rolling 24h. Beyond that → refused, escalate to the crew. |
| **Secrecy** | The secret **value is never logged** — override or not (same redaction as normal WorfGate). |
| **Permissions** | Bounded by what `~/.zshrc`/`~/.alexai-secrets` actually provides — override can't conjure an absent credential (returns `available:false`). |

## Monitoring — the crew reviews it together (Observation Lounge)
Every override attempt — **granted OR denied** — is written to a **separate monitored stream**
(`OverrideEntry` = `{timestamp, name, operation, crewId, reason, granted, available, denialReason?}` —
no values). The Observation Lounge surfaces it via:

- `getOverrideAuditLog()` — the full monitored stream (no secrets).
- `summarizeOverridesForLounge(sinceHours = 24)` — a digest for crew review: totals, `byCrew`,
  `byCredentialOp`, and **anomaly flags**: at/over the rate limit, a credential+operation overridden
  repeatedly (a real allowlist gap to fix), and any denials (probing/misconfig).

This is the safeguard you asked for: O'Brien *can* override with a good reason, and because he can, the
whole crew *sees every override* — transparent break-glass builds trust where a silent bypass would not.

## Example
```ts
const r = resolveWorfGateOverride('GITHUB_TOKEN', {
  operation: 'llm:call',                 // outside GITHUB_TOKEN's normal allowlist
  crewId: 'obrien',
  reason: 'automating the nightly deploy token rotation', // ≥ 20 chars
});
// r.override === true, r.value present only to the caller; the override is now in the monitored stream.
```

## Follow-up (not yet wired)
Expose `summarizeOverridesForLounge()` as an MCP tool (with a SkillTheory) so `run_crew_mission_pipeline`
auto-surfaces recent overrides for live crew review each Observation Lounge session.
