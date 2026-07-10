# Aha! Nomenclature — Firm → Tier → Client → Project

> **Revised model** adds a **TIER** grouping (Commercial | Enterprise) above clients, plus a human
> IAM entitlement system — see [architecture/hierarchy-and-entitlements.md](architecture/hierarchy-and-entitlements.md).
> Enterprise = DoD-grade WorfGate (`regulated-defense` posture).

Story Agent is operated by **familiarcat**, a consultancy **firm** that serves multiple **clients**,
each with multiple **projects**. The PM hierarchy (aligned with Aha!) is:

```
familiarcat (FIRM, system operator/root)
└── TIER              (Commercial | Enterprise — Enterprise = DoD-grade WorfGate)
    └── Client            (e.g. Jonah, Bayer — onboarded as data, never hardcoded)
        └── Project        (per client; the unit of delivery)
            ├── Epic
            │   └── Story        (Aha Feature)
            │       └── Task     (Aha Requirement)
            └── Sprint           (Aha Release — the time axis)
```

## Aha! mapping (nested-product-per-project)

| Our term | Aha! primitive |
|---|---|
| **Firm** (familiarcat) | top-level Workspace/Product (account root) |
| **Client** (Jonah, Bayer, …) | Workspace/Product nested under the firm |
| **Project** | **Initiative** within the client product |
| **Epic** | Epic |
| **Story** | Feature |
| **Task** | Requirement |
| **Sprint** | Release (time axis) |

> **Aha constraint (discovered live):** Aha caps product nesting at **2 levels** (Company →
> Client product). A product whose parent is itself a child product is rejected, so a project
> **cannot** be a nested product. Projects are therefore **Initiatives** within the client product
> — which still gives each client multiple projects, each grouping its own epics/stories.

Live structure: `familiarcat (COMPANY) → Jonah, Bayer (client products) → Jonah Commerce Platform
(JONAH-S-1), Bayer Regulated Platform (BAYER-S-1) (project initiatives) → Epics → Features → Requirements`.

## Relationship to the dynamic client registry

This mirrors the security/identity hierarchy already in code: clients live in the Supabase
`clients` table with `parent_client_id` (see [client-registry.ts](../packages/shared/src/client-registry.ts)).
**familiarcat** is the root org; clients (Jonah, Bayer) are rows under it; WorfGate floor applies to
each. The PM (Aha) hierarchy and the security hierarchy are two views of the same Firm → Client →
Project model.

## Aha! restructure — APPLIED (2026-06-22)

Live in Aha: **familiarcat (COMPANY)** firm root → client products **Jonah** + **Bayer** →
project initiatives **Jonah Commerce Platform (JONAH-S-1)** + **Bayer Regulated Platform
(BAYER-S-1)**. Project = Initiative (not nested product) due to Aha's 2-level product cap.
Onboard any further client as a product under familiarcat, then add projects as initiatives.
