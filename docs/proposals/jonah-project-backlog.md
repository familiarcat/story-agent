# Jonah — St. Louis 4-Story Renovation · derived project + timeline (Aha-ready)

> Crew-derived from `Assessment-enhanced-v3.7.1.html` (RAG 151, dossier docs/proposals/jonah-assessment-v3.7.md).
> Structured for our Aha hierarchy so it can be auto-created: **Firm(familiarcat) → Client(Jonah) →
> PROJECT → EPIC(=phase) → STORY(=feature) → TASK(=requirement); SPRINT(=release) = each month.**
> Total $485–565K → value $680K+. Sequential dependency: demo → engineering → foundation → framing →
> MEP → finishes. (Filtered tier-3 crew fiction: Okta JIT, IP-restricted trade logins, nightly sync.)

## Project
**Jonah — St. Louis 4-Story Renovation** · 6 months / 24 weeks · commercial-tier client (Jonah).

## Timeline — 6 sprints (releases), one per month; each = one epic
| Sprint (release) | Weeks | Epic / phase | Budget line | Trades engaged |
|---|---|---|---|---|
| S1 | 1–4 | E1 Acquisition, Planning & Demolition | demo $35–45K | Owner/Dev, GC, Demolition, PE(start) |
| S2 | 5–8 | E2 Demolition Completion & Engineering | (engineering) | Demolition, PE, Foundation/Masonry(start) |
| S3 | 9–12 | E3 Foundation & Structural | foundation/structural $120–150K | Foundation/Masonry, Framing(start) |
| S4 | 13–16 | E4 Structural Completion & Building Envelope | envelope/roof $65–80K | Framing, MEP(start) |
| S5 | 17–20 | E5 MEP Installation & Insulation | MEP $85–100K + insulation | Electrical, Plumbing, HVAC, Insulation |
| S6 | 21–24 | E6 Interior Finishes & Completion | insulation/interior $140–165K | Finishing trades |

## Epics → Stories → Tasks
**E1 · Acquisition, Planning & Demolition** (S1)
- Story: Property acquisition & closing → tasks: negotiate/close; title & permits intake; city liaison setup.
- Story: Interior gut demolition (all 4 floors) → tasks: remove plaster/flooring; demo compromised structure; basement stair demo; power-wash exterior. *(Labor: 3–4 workers, ~320h.)*
- Story: Debris removal & site cleanup.
- Story: Structural engineering kickoff (PE) → tasks: site assessment; scope engineered repairs.

**E2 · Demolition Completion & Engineering** (S2)
- Story: Complete demolition & site prep.
- Story: Engineered repair plans & structural calcs (PE) → tasks: plans ready for permit by M2; permit drawings.
- Story: Board of Adjustment variance support (roof insulation).
- Story: Foundation condition assessment (Foundation/Masonry).

**E3 · Foundation & Structural** (S3)
- Story: Rear foundation wall rebuild (collapsed 2019) → tasks: cinderblock/framing for collapsed sections.
- Story: Foundation waterproofing & drainage.
- Story: Basement steel joist installation (headroom).
- Story: Exterior wall restoration & tuckpointing (historic brick).
- Story: Front stair restacking + new handrails.

**E4 · Structural Completion & Building Envelope** (S4)
- Story: New floor system (sistering over shimming) → *Framing, ~640h*.
- Story: Wall framing infill; wood infill for rear wall.
- Story: Roof section repair/replacement (maintain existing struts).
- Story: Building envelope & weatherproofing.

**E5 · MEP Installation & Insulation** (S5)
- Story: Complete rewiring + panel/service upgrade (Electrical, ~400h) → tasks: code compliance; LED lighting.
- Story: New supply/waste lines + bath/kitchen rough-in + water heater (Plumbing, ~320h) → basement egress window coord.
- Story: HVAC design + install (4-story, zoned) + ductwork + testing/balancing (HVAC).
- Story: Spray-foam insulation (~$10K specialized) — meets code w/ roof variance.

**E6 · Interior Finishes & Completion** (S6)
- Story: Drywall install & finish (~480h).
- Story: New flooring, all levels (~320h).
- Story: Interior & exterior painting (~400h).
- Story: Trim & millwork.
- Story: Final finish + punch list → project closeout.

## Aha create-order (Picard) — clean creation, respecting the gotchas
1. **Project** (Jonah workspace, if not present) → 2. **6 Releases** (S1–S6, the sprints/months) → 3. **6 Epics** (E1–E6, each linked to its release) → 4. **Features** (stories) under each epic **assigned to that epic's release** *(Aha gotcha: a feature needs a release)* → 5. **Requirements** (tasks) under each feature. Attach the budget line per epic. *(Aha gotcha: epic-link — set the epic on the feature explicitly.)*

## Interconnection (Troi/Uhura)
Once created in Aha + hydrated to the DB, **both the web dashboard (`/dashboard`, `/sprint`) and the VS Code extension read the same Aha/DB** — so the project is interconnected across surfaces automatically; no separate wiring.
