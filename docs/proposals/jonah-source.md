# Client / Team Onboarding — `jonah`

> Instance of [docs/templates/client-onboarding-template.md](../templates/client-onboarding-template.md).
> **Fill §2 (Research & Story) and §3 (team) with Jonah's real material**, then tell me and I'll inject
> it end-to-end (clients table → RAG → Aha → recall). Pre-filled fields below come from the existing
> proposal + skills/tools/tasks catalog; placeholders `<…>` are yours to complete.

## 1. Client definition

- **Slug (id):** `jonah` (also `jonah-corp` = "Jonah Corporation")  ·  **Display name:** `Jonah` `<full name?>`
- **Parent:** `familiarcat`  ·  **Security tier:** `enterprise`  *(matches the seeded definition; handles financial + tenant PII)*
- **Industry / domain:** **two lines of work under one client** —
  1. **Commerce Platform** (existing, on record): commercial enterprise SaaS — multi-tenant, RLS-isolated.
  2. **Real-Estate** (new, expanding): real-estate development.
- **Primary contact:** `<Jonah — email/role>`
- **Mandate:** continue the **Jonah Commerce Platform** AND stand up the **real-estate** line — search opportunities, build the digital systems, maintain them.
- **Goals:** Commerce — multi-tenant enterprise apps (ToDo, PM) with strict RLS. Real-estate — faster opportunity evaluation · cheaper per-development build-out · lower maintenance TCO.

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

## 4. Projects (Aha hierarchy) — two lines under client `jonah`

### LINE A — Jonah Commerce Platform *(EXISTING, on record — Aha `JONAH-S-1`)*
Already seeded in [scripts/seed-multi-client-projects.ts](../../scripts/seed-multi-client-projects.ts):
- **Jonah ToDo Application** (`proj-jonah-todo`, repo `jonah-corp/sovereign-todo`) — stories `JTC-001` (tasks schema), `JTC-002` (multi-tenant RLS). Enterprise data isolation.
- **Jonah Project Management** (`proj-jonah-pm`, repo `jonah-corp/sovereign-pm`) — stories `JPM-001` (projects schema), `JPM-002` (RLS).
- **Prompt engineering:** enterprise SaaS rigor; org_id isolation is non-negotiable; tone = precise/technical.

### LINE B — Jonah Real Estate *(NEW — additional projects under the same client)*

#### Project: `Deal Intelligence`  (`JONAH-RE-1`)
- **Objective:** ingest a deal packet (OM + rent roll + T12) → populated underwriting model + market/site brief.
- **Epics → Stories (seed):** Epic `Underwriting` → doc-intelligence parse → model · market/site brief · deal scoring.
- **Prompt engineering:** institutional-grade rigor; numbers-first; glossary = OM, T12, NOI, cap rate, IRR, DSCR.

#### Project: `Portals`  (`JONAH-RE-2`)  *(high-value, later)*
- **Objective:** investor portal + leasing/listing portal.
- **Prompt engineering:** PII-aware; gated writes; investor-facing tone.

> The dedicated roaming **Underwriter** officer (§5) serves LINE B. LINE A continues on the core crew.

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

- [ ] `onboard_client({ id: 'jonah', name, parentClientId: 'familiarcat', securityTier: 'enterprise' })` *(already seeded — confirm/idempotent)*
- [ ] Store §2 Research & Story to RAG (`clientId: 'jonah'`, tags `client`, `jonah`, `onboarding`, `commerce`, `real-estate`)
- [ ] **LINE A** (Commerce Platform) already seeded (`proj-jonah-todo`, `proj-jonah-pm`) — leave as-is
- [ ] **LINE B** (Real Estate): create Aha projects `JONAH-RE-1` (Deal Intelligence), `JONAH-RE-2` (Portals) → epics → stories (WorfGate-gated)
- [ ] *(if §5 confirmed)* Register the `underwriter` roaming officer + seed personal RAG (serves LINE B)
- [ ] *(if §3)* Apply human entitlements in WorfGate policy
- [ ] Verify: `rag_recall` / `crew:get-relevant-memories(domain: 'finance', projectId: 'jonah')` returns BOTH lines + the story
