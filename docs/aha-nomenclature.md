# Aha! Nomenclature — Firm → Client → Project

Story Agent is operated by **familiarcat**, a consultancy **firm** that serves multiple **clients**,
each with multiple **projects**. The PM hierarchy (aligned with Aha!) is:

```
familiarcat (FIRM, system operator/root)
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
| **Project** | Workspace/Product nested under the client |
| **Epic** | Epic |
| **Story** | Feature |
| **Task** | Requirement |
| **Sprint** | Release (time axis) |

Each **Project** is its own Aha product, so it carries its own epics / stories / sprints — clean
isolation and "multiple projects per client". `Epic/Story/Task/Sprint` are unchanged from before;
the new levels are **Firm** and **Client** sitting *above* Project.

## Relationship to the dynamic client registry

This mirrors the security/identity hierarchy already in code: clients live in the Supabase
`clients` table with `parent_client_id` (see [client-registry.ts](../packages/shared/src/client-registry.ts)).
**familiarcat** is the root org; clients (Jonah, Bayer) are rows under it; WorfGate floor applies to
each. The PM (Aha) hierarchy and the security hierarchy are two views of the same Firm → Client →
Project model.

## Pending Aha! restructure (requires approval — external writes)

Code/nomenclature is aligned now; the live Aha restructure is NOT yet applied. Proposed steps:
1. Treat the existing **familiarcat** product as the firm root.
2. Ensure each **client** is a workspace nested under familiarcat (Jonah already created; onboard
   **Bayer** as a real client — proving it's just data now).
3. Create **project** workspaces nested under each client; move existing epics/stories into the
   right project.
4. Keep Epic/Feature/Requirement/Release as-is within each project.

Reversible if done in a controlled manner; confirm before creating/moving Aha workspaces.
