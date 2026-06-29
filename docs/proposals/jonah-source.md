# Client / Team Onboarding — `jonah`

> Instance of [docs/templates/client-onboarding-template.md](../templates/client-onboarding-template.md).
> **Fill §2 (Research & Story) and §3 (team) with Jonah's real material**, then tell me and I'll inject
> it end-to-end (clients table → RAG → Aha → recall). Pre-filled fields below come from the existing
> proposal + skills/tools/tasks catalog; placeholders `<…>` are yours to complete.

## 1. Client definition

- **Slug (id):** `jonah`  ·  **Display name:** `Jonah` `<full name / company?>`
- **Parent:** `familiarcat`  ·  **Security tier:** `client`  *(handles financial + tenant PII)*
- **Industry / domain:** real-estate development
- **Primary contact:** `<Jonah — email/role>`
- **Mandate:** help Jonah **search** for opportunities, **build** their digital systems, and **maintain** them on the crew platform.
- **Goals:** faster opportunity evaluation · cheaper per-development digital build-out · lower ongoing maintenance TCO.

## 2. Research & Story  *(RAG seed — PASTE JONAH'S MATERIAL HERE)*

**Story** *(who Jonah is, their portfolio/market, why familiarcat):*
`<paste Jonah's story / background>`

**Research** *(deals, submarkets, comps, data Jonah has, prior tools, RFP/PDF contents):*
`<paste Jonah's research>`

**Known constraints / sensitivities:**
`<compliance (financial/tenant PII), deadlines, budget, existing systems>`

## 3. Human team & entitlements  *(complete with real people)*

| Person | Side | Role | Entitlement scope | Access | WorfGate tier | Surfaces |
|---|---|---|---|---|---|---|
| `<Jonah>` | client | principal / developer | client `jonah` | read-write (approval) | client | web |
| `<teammate>` | client | `<analyst/PM>` | client `jonah` | read | client | web |
| `<familiarcat operator>` | firm | delivery lead | **ALL clients & projects** | read-write | internal | web / vscode |

## 4. Projects (Aha hierarchy)  *(seed from the catalog; confirm with Jonah)*

### Project: `Deal Intelligence`  (`JONAH-DI`)
- **Objective:** ingest a deal packet (OM + rent roll + T12) → populated underwriting model + market/site brief.
- **Epics → Stories (seed):**
  - Epic `Underwriting`: doc-intelligence parse → model · market/site brief · deal scoring
- **Prompt engineering:** assume institutional-grade rigor; tone = concise + numbers-first; glossary = OM, T12, NOI, cap rate, IRR, DSCR.

### Project: `Portals`  (`JONAH-PT`)  *(high-value, later)*
- **Objective:** investor portal + leasing/listing portal.
- **Prompt engineering:** PII-aware; gated writes; investor-facing tone.

## 5. Dedicated crew member *(candidate — confirm if wanted)*

A standing **Real-Estate Underwriter** officer, **roaming** (reusable across every property client, not just Jonah):
- **Id:** `underwriter`  ·  **Full name:** `<e.g. "Solok, CRE Underwriter">`  ·  **Domain:** underwriting/finance
- **Base seed:** numbers-first CRE analyst; ingests OM/rent-roll/T12, builds defensible pro-formas, flags risk.
- **Specializations:** AVMs, sensitivity analysis, debt sizing (DSCR), comp selection.
- **Memory scope:** **roaming** across all real-estate clients (shared identity + personal RAG) — so each deal compounds the next, across clients.
- **Relationship to core crew:** reports to Quark (cost) + Data (architecture); Worf still gates writes; Riker owns branch→PR.

## 6. Prompt-engineering relationship to the MCP crew

Jonah's client context (§1–2) + project context (§4) + the optional Underwriter officer (§5) compose
into each crew member's system prompt alongside their canonical persona — so the whole crew acts
Jonah-aware (real-estate vocabulary, PII-careful, numbers-first) without any code fork.

## 7. Injection checklist (run once §2–3 are filled)

- [ ] `onboard_client({ id: 'jonah', name, parentClientId: 'familiarcat', securityTier: 'client' })`
- [ ] Store §2 Research & Story to RAG (`clientId: 'jonah'`, tags `client`, `jonah`, `onboarding`, `real-estate`)
- [ ] Create Aha hierarchy: projects `JONAH-DI`, `JONAH-PT` → epics → stories (WorfGate-gated)
- [ ] *(if §5 confirmed)* Register the `underwriter` roaming officer + seed personal RAG
- [ ] *(if §3)* Apply human entitlements in WorfGate policy
- [ ] Verify: `rag_recall` / `crew:get-relevant-memories(domain: 'finance', projectId: 'jonah')` returns the story + structure
