<!--
CLIENT / TEAM ONBOARDING TEMPLATE
Copy this file to docs/proposals/<client>-source.md and fill it in. It is the single source from which
we INJECT a new client, their human team, their projects, and (optionally) a dedicated crew member
into the MCP crew system end-to-end. Leave a field blank if unknown; the crew will flag gaps.
-->

# Client / Team Onboarding — `<client-slug>`

> One spec → injected end-to-end into the crew: **clients table + WorfGate policy → cloud RAG
> (research + story) → Aha hierarchy → (optional) a dedicated crew member with personal RAG →
> human entitlements → verified recall.** This file is the durable record; the crew reads it to act.

## 0. How each section maps to the system (what "inject" does)

| Template section | System artifact | Mechanism |
|---|---|---|
| 1. Client | `clients` table row (+ sync cache) | `onboard_client` / `onboardClient` — WorfGate floor + `parent_client_id` = `familiarcat` |
| 2. Research & Story | cloud RAG (observation + per-client memory) | `crew:store-memory` / `storeObservationMemory`, `clientId: <slug>` — recalled before any client work |
| 3. Human team & entitlements | WorfGate access policy | per-person scope (this client / specific projects / ALL) + read/write + security tier |
| 4. Projects | Aha hierarchy (project → epic → story → task) | crew Aha tools, WorfGate-gated writes; Riker owns branch→PR |
| 5. Dedicated crew member | `crew-personas.ts` persona + `crew_personal_memory` | new identity + personal RAG, scope shared across chosen clients/projects |
| 6. Prompt engineering | composed system prompt | client/project context block composed with `buildPersonaSystemPrompt` so every officer acts client-aware |

---

## 1. Client definition

- **Slug (id):** `<client-slug>`  ·  **Display name:** `<Name>`
- **Parent:** `familiarcat` (firm/root)  ·  **Security tier:** `<client | internal | …>`
- **Industry / domain:** `<e.g. real-estate development>`
- **Primary contact:** `<name, email/role>`
- **Mandate (one line):** `<what we are here to do for them>`
- **Goals:** `<bullet the outcomes — e.g. search / build / maintain, or client-specific>`

## 2. Research & Story  *(the RAG seed — the narrative + facts that ground the crew)*

<!-- This is the heart. Paste the client's real research + story here. Stored to RAG, clientId-scoped,
recalled before the crew does anything for this client. Be generous — it compounds. -->

**Story** *(who they are, their world, why they're working with us):*
`<paste>`

**Research** *(domain facts, market, constraints, prior art, data they have):*
`<paste>`

**Known constraints / sensitivities** *(compliance, data, deadlines, budget):*
`<paste>`

## 3. Human team & entitlements

> Defines WHO (client-side stakeholders + familiarcat-side operators) can touch WHAT. A person can be
> scoped to this client, to specific projects, or — the "new human to the whole crew" case — to **ALL
> clients & projects** (an operator/root-style entitlement, e.g. familiarcat staff).

| Person | Side | Role | Entitlement scope | Access | WorfGate tier | Surfaces |
|---|---|---|---|---|---|---|
| `<name>` | client / firm | `<role>` | this client / project:`<ref>` / **ALL** | read / read-write | `<tier>` | web / vscode |

## 4. Projects (Aha hierarchy)

For each development/project under this client:

### Project: `<Project name>`  (`<REF-PREFIX>`)
- **Objective:** `<one line>`
- **Epics → Stories (seed):**
  - Epic `<E>`: `<…>`
    - Story `<S>`: `<…>` → tasks `<…>`
- **Project-focused prompt engineering** *(the context block injected into the crew for THIS
  project — what every officer should assume/know):*
  - **Assumptions:** `<…>`  ·  **Tone:** `<…>`  ·  **Constraints:** `<…>`
  - **Glossary:** `<domain terms the crew must use correctly>`

## 5. Dedicated crew member *(optional — a new AI officer for this client/project)*

> Add a NEW crew member beyond the canonical 11 when a client/project needs a standing specialist. It
> gets its own **identity** and **personal RAG memory**, whose **scope** you choose: **project-bound**
> (only this project), **client-bound** (all of this client's projects), or **roaming** (a shared
> identity + memory across multiple clients/projects — e.g. a "Real-Estate Underwriter" officer reused
> by every property client).

- **Id (slug):** `<officer-slug>`  ·  **Full name:** `<Name>`  ·  **Role/domain:** `<e.g. underwriting>`
- **Base system prompt seed:** `<the persona's voice + mandate, Memory-Alpha-style if applicable>`
- **Specializations:** `<bullets>`
- **Memory scope:** project-bound `<ref>` / client-bound `<slug>` / **roaming across** `<slugs>`
- **Relationship to the core crew:** `<who they defer to; Worf still gates writes, Riker owns branch→PR>`

## 6. Prompt-engineering relationship to the MCP crew

The client (§1–2) + project (§4) + any dedicated officer (§5) compose into each crew member's system
prompt: canonical persona (`buildPersonaSystemPrompt`) **+** this client/project context **+** the
Aha-role section. Net effect: every officer acts **client-aware and project-aware** without forking
the codebase — the same 11 (plus any dedicated officer) behave correctly for this client because the
context is injected, not hardcoded.

## 7. Injection checklist (end-to-end — the crew runs this)

- [ ] `onboard_client({ id: '<slug>', name, parentClientId: 'familiarcat', securityTier })`
- [ ] Store **Research & Story** to RAG (`clientId: <slug>`, tags `client`, `<slug>`, `onboarding`)
- [ ] Create the **Aha hierarchy** (projects → epics → stories), WorfGate-gated/confirmed
- [ ] *(if §5)* Register the **dedicated crew member** persona + seed its personal RAG (scope per §5)
- [ ] *(if §3)* Apply **human entitlements** in the WorfGate policy
- [ ] **Verify recall:** `rag_recall` / `crew:get-relevant-memories` returns the story + structure
