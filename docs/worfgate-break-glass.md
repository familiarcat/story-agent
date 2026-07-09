# WorfGate break-glass — O'Brien's governed override + crew monitoring

> Crew-designed in the Observation Lounge. Gives O'Brien (devops) the capacity to automate by
> **overriding the WorfGate operation allowlist with a justification** — a transparent **break-glass**,
> never a silent backdoor. Every override is monitored by the whole crew in the Observation Lounge.
> Implemented in [worfgate-credentials.ts](../packages/shared/src/worfgate-credentials.ts).

Related security audit: [crew/security/2026-06-07-worfgate-security-audit.md](crew/security/2026-06-07-worfgate-security-audit.md).

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

## Crew review tool — ✅ wired
`worfgate_override_monitor` (MCP tool, [worfgate-tools.ts](../packages/mcp-server/src/tools/worfgate-tools.ts),
SkillTheory owner=worf) surfaces the override digest + anomaly flags + recent entries (no secret values)
for the crew to review in the Observation Lounge:
```
worfgate_override_monitor({ sinceHours? })   // default 24h
→ { headline: "✅ N granted / M denied — nominal" | "⚠️ … K anomaly flag(s)", digest, recentAll }
```
Call it during/after an Observation Lounge session to monitor O'Brien's break-glass use. (Requires an
`/mcp` reconnect / `pnpm mcp` restart to load the new tool.)

## Post-change verification protocol (WorfGate-governed)

Use this when safety/ordering guards are added to MCP tools or agent-core logic.

### Scope
- Confirms runtime reload is active for MCP tools.
- Confirms transcript preflight normalization paths do not crash on partial legacy rows.
- Confirms order-of-operations controls are active and auditable.

### Procedure
1. Reload runtime surfaces:
  - Restart MCP runtime (`pnpm mcp`) and reconnect clients (`/mcp`).
2. Run memory smoke checks (must return JSON, no runtime throw):
  - `summarize_crew_memory_trends({ lookbackDays: 30, limit: 10 })`
  - `crew_observation_lounge_status({ scenario: "post-restart verification", perCrewMemoryLimit: 1 })`
3. Run a WorfGate-lane shell sanity check:
  - `run_shell("node -e \"console.log('noop sanity')\"")`
4. Review output for:
  - No `unresolvedRisks is not iterable` failures.
  - No `Cannot read properties of undefined (reading 'slice'/'trim')` failures.
  - Tier/remediation envelope present for governed calls.

### Expected acceptance
- Tool responses are structured JSON (or declared payload artifacts) without transcript-shape exceptions.
- WorfGate governance metadata appears on governed execution paths.
- New order/audit metadata is persisted in feedback cards (`order-gate` tags and token lines).

### Verification log
- `2026-07-09`: Transcript preflight + order gate rollout verified live.
  - `summarize_crew_memory_trends` returned successfully.
  - `crew_observation_lounge_status` returned successfully.
  - WorfGate-governed `run_shell` sanity check succeeded (`exitCode: 0`, `tier: yellow`).

## Worf-Yar joint security protocol (adversarial alignment)

This protocol formalizes the productive tension between Worf (policy rigor) and Yar (failure-mode realism).
Both roles are security authorities from different angles, and both are required for final adjudication.

### Role contract
- Worf: defines hard constraints, veto boundaries, and non-negotiable security policy.
- Yar: challenges assumptions with ambiguity, edge-case, and sequencing stress tests.
- Picard/Data/Troi: arbitrate deadlocks using evidence quality, architecture coherence, and stakeholder clarity.

### Required review sequence
1. WorfGate policy check:
  - Validate secrets handling, scope boundaries, path disclosure posture, and governance tags.
2. Yar adversarial challenge:
  - Probe malformed input handling, ordering assumptions, partial/legacy data behavior, and operator bypass pressure.
3. Reconciliation brief:
  - Document where Worf is too rigid and where Yar is too permissive.
  - Resolve with explicit acceptance criteria and measurable follow-up checks.
4. Shared memory writeback:
  - Store verdict plus argument trail to observation memory so future adjudication reuses proven rulings.

### Pass criteria
- A change is "secure" only when it passes both Worf policy compliance and Yar adversarial stress checks.
- "Blocked" is not "resolved" without a documented remediation path and verification owner.
- Every exception must include a bounded reason, audit token, and rollback-ready procedure.

### Anti-patterns to reject
- Worf-only gate success without adversarial replay.
- Yar-only stress findings without policy boundary mapping.
- Closing security review on narrative confidence instead of reproducible evidence.
