# Conceptual Hierarchy & Human Entitlements (revised)

> Crew-designed (Observation Lounge via `run_crew_mission_pipeline`, stored to RAG). This is the
> **design**, not yet implemented. Cost figures are illustrative until benchmarked.

## 1. The revised hierarchy

```
familiarcat (firm / root)
└─ TIER            ← NEW top grouping:  Commercial | Enterprise
   └─ Client       (many clients per tier)
      └─ Project   (many per client; runs the full crew + human-in-the-loop members)
         └─ Epic → Story → Task          (Sprint = time axis)
```

- **TIER is the top conceptual grouping.** **Enterprise** carries the highest WorfGate posture
  (DoD-grade controlled-data + encryption); **Commercial** is the lighter floor.
- **Implementation (crew recommendation — pragmatic, non-breaking):** promote tier to the top
  *conceptually* while implementing it as a **first-class `tier` attribute on `clients`** (+ an
  optional tier grouping row), so the existing `familiarcat → client → project` model and the
  `clients` table are **preserved**; phased, backward-compatible migration.
- **Open decision for you:** tier as a real **parent node** (a row clients point at) vs. an
  **attribute + grouping** (crew's recommended default). Same conceptual hierarchy either way; the
  attribute path is lower-risk. Say the word if you want the hard parent-node version.

## 2. Tier → security posture (Worf) — reuse what exists

Map tiers onto the existing `SECURITY_POSTURES` in
[client-security-policy.ts](../../packages/shared/src/client-security-policy.ts) (no new posture engine):

| Tier | Posture | WorfGate floor |
|---|---|---|
| **Commercial** | `commercial` | login + basic entitlements; lighter controlled-data handling |
| **Enterprise (DoD-grade)** | `regulated-defense` | `controlledDataHardBlock` · `requireSsmSecrets` (no env secrets) · **KMS encryption at rest + in transit** · full audit trail · **no controlled-data outbound** · `recursiveSecurity` |

- **WorfGate pre-authorization hook:** every action (AWS API call, data access, crew write) is
  validated against **both** the tier posture **and** least-privilege project entitlements before it
  runs; violations are logged as a breach attempt.

## 3. Human-in-the-loop crew members (Troi / Riker)

- A **human** can join a project's crew as a "human-in-the-loop" member — they **see crew decisions
  and can approve or override** gated actions (the WorfGate yellow/red path routes to them).
- This is the **human variant of the dedicated crew member** in the
  [onboarding template](../templates/client-onboarding-template.md) §5: instead of a new AI persona,
  a human identity is injected into the project's crew with an entitlement scope.

## 4. Human entitlement system — AWS IAM (O'Brien / Geordi / Data)

Humans are **employees** with selective, **top-down** access across `Tier → Client → Project → Sprint`:

- **Model with AWS IAM Identity Center** (SSO) **groups that mirror the hierarchy** — a group per
  tier/client/project; membership grants the level **and everything below it** (top-down inheritance).
- **Approve once, inherit down:** a top-level manager approving a human at, say, a *client* level
  auto-grants every project/sprint beneath it. Approve at *tier* → all clients below, etc.
- **WorfGate checks the human's IAM entitlement before they act in-loop** (and before showing them
  controlled data), enforcing least privilege; denials are audited.
- Today's WorfGate brokers *machine* credentials (Vault → AWS Secrets Manager → env); this adds the
  **human** entitlement layer on top, via IAM Identity Center.

## 5. Manager approval (Picard)

- **Tier elevation and entitlement grants require a top-level manager attestation** — e.g. a checkbox
  "This client handles ITAR/EAR / controlled data ☑" on elevation to Enterprise, and explicit
  approval to add a human at a level. Tiered onboarding UX makes the Commercial↔Enterprise trade-offs
  (cost, controls, autonomy) visible.

## 6. Cost (Quark)

- The **Enterprise (DoD) tier carries materially higher overhead** than Commercial — KMS, SSM,
  continuous audit / threat monitoring. *Flag Enterprise-tier spend for manual sign-off.* (Quark's
  "~3.2×" delta is an **illustrative estimate** pending a real benchmark.)

## 7. First step (Picard's ruling)

1. **Migration:** add a `tier` (`commercial` | `enterprise`) column/grouping to `clients`,
   defaulting existing clients to their current posture; map **Enterprise → `regulated-defense`**.
2. **Manager-attestation** gate on elevation to Enterprise.
3. **IAM Identity Center group scaffold** mirroring `tier → client → project`, with a WorfGate
   entitlement check stubbed at the in-loop action boundary.

> Mapping note: `client-security-policy.ts` already encodes the postures and an `entitlementTier`
> concept — this reorg promotes **tier** to the top conceptual level and adds the **human IAM
> entitlement** layer (the genuinely new piece).
