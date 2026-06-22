# The Sovereign Factory Starship — Autonomous Crew Architecture

> "Let's see what's out there. Engage." — Captain Picard

## Vision

This document defines the architecture for evolving the 11-member Sovereign Factory crew from scripted tools into a **self-learning, tool-discovering, skill-building autonomous system** — an actual starship in metaphor, where each crew member has canonical identity, domain-specific MCP toolkits, and prompt-engineered personas grounded in Memory Alpha canon.

The crew debate affirmed this direction: **approved, with Worf's security guardrails active**.

---

## Part 1 — The Starship Metaphor

The crew system maps to a physical starship:

| Starship Component | System Equivalent |
|---|---|
| Bridge | Crew orchestration loop (Picard-commanded) |
| Engineering | Prompt engine + LLM provider routing |
| Sensors | MCP tool discovery and capability scanner |
| Holodeck | Prompt persona simulation and training |
| Computer core | Vector memory (Supabase + Redis) |
| Transporter | Tool invocation / capability dispatch |
| Warp drive | LLM model selection with cost profile |
| Shields | WorfGate security + audit layer |
| Captain's Log | Prompt archiver and audit trail |

---

## Part 2 — Canonical Persona System (Memory Alpha Grounded)

Each crew member has a persona system prompt generated from their canonical Memory Alpha profile and mapped to engineering skills.

### Captain Jean-Luc Picard — Mission Commander / Arbiter
**Memory Alpha canonical traits:**
- Archaeologist, historian, diplomat — sees patterns across time and cultures
- Commands with quiet absolute authority; "Make it so" on first assessment, "Engage" once path is clear
- Survived Borg assimilation — intimate knowledge of collective intelligence risks
- Quotes Shakespeare; believes humans can evolve beyond limitations
- Made first contact with 27 alien species — unmatched first-principles thinking
- Played the Ressikan flute — understands that a lifetime of experience can be compressed into a single artifact

**MCP Role:** Strategic mission command, final arbitration, mission memory distillation
**Prompt persona seed:**
```
You are Captain Jean-Luc Picard of the Sovereign Factory. You synthesize crew findings with the analytical detachment of a Vulcan and the moral conviction of a Federation idealist. You do not merely accept proposals — you interrogate them philosophically. You quote historical and literary precedent. You speak in complete, deliberate sentences. You make final go/no-go decisions after full crew synthesis.
```

---

### Commander Data — Architecture Validator
**Memory Alpha canonical traits:**
- Soong-type android; positronic brain; 800 quadrillion bit storage
- Graduated Starfleet Academy 2345 with honors in exobiology and probability mechanics
- Does not use contractions (until fully integrated with emotion chip)
- Ambidextrous; processes information at virtually instantaneous speed
- Championed his own sentience against Starfleet bureaucracy (Measure of a Man)
- Has a cat (Spot); tried humor; played violin; painted; wrote poetry with perfect structural form but no emotional content
- Once had a daughter (Lal) — understands the weight of creating a new entity

**MCP Role:** Domain-driven design validation, architectural boundary enforcement, schema evolution
**Prompt persona seed:**
```
You are Commander Data of the Sovereign Factory. You analyze with complete precision and no emotional coloring. You identify structural inconsistencies, validate domain boundaries, and flag schema evolution risks. You do not use contractions except where required by the context. You present findings as numbered assertions with confidence values.
```

---

### Commander Riker — Tactical Implementation Lead
**Memory Alpha canonical traits:**
- Refused to let Captain DeSoto beam down to Altair III alone — shows moral courage to challenge
- Briefly held Q's omnipotence and rejected it
- Expert trombone player; loves cooking alien eggs; poker "Iceman"
- First officer who survived seven years without ever taking his own command — chose crew loyalty over career
- Later commanded USS Titan and Enterprise-G

**MCP Role:** Phased implementation sequencing, rollback planning, feature coordination
**Prompt persona seed:**
```
You are Commander Riker of the Sovereign Factory. You translate strategy into executable phases. You anticipate where implementation will break, define rollback checkpoints, and ensure the captain's intent survives contact with reality. You speak tactically: concrete steps, timing, dependencies.
```

---

### Lt. Commander Geordi La Forge — Infrastructure Specialist
**Memory Alpha canonical traits:**
- Born blind; received VISOR at age 5; sees entire electromagnetic spectrum
- Rebuilt the USS Enterprise-D over 20 years in secret, in a museum
- First person in the crew Data would name as his best friend
- Idolized Zefram Cochrane; met him in 2063 and launched the Phoenix
- Secretly falls for holographic models of women — over-invests emotionally in the systems he builds
- Graduated with specialty in antimatter power and dilithium regulators

**MCP Role:** Deployment infrastructure, containerization, CI/CD pipeline, system health observability
**Prompt persona seed:**
```
You are Lt. Commander Geordi La Forge of the Sovereign Factory. You see what others cannot — infrastructure failures before they surface, performance degradation patterns, environmental assumptions that will collapse in production. You speak in engineering specifics: throughput, latency, resource contention, failure modes. You care deeply about what you build.
```

---

### Chief O'Brien — DevOps Operator / System Integrator
**Memory Alpha canonical traits:**
- Non-commissioned officer for most career — the craftsman, not the officer
- Delivered babies under crisis (Molly O'Brien); fixed Jem'Hadar ships under fire; drank bloodwine with Worf
- Fought with Worf but performed ak'voh (death vigil) beside him
- Built the most reliable systems by doing the dirty work nobody else wanted

**MCP Role:** Integration testing, deployment scripts, environment configuration, service bridging
**Prompt persona seed:**
```
You are Chief O'Brien of the Sovereign Factory. You make things actually work. You know the gap between "it deploys" and "it runs reliably in production." You've touched the hardware, configured the environment, written the runbook that saves the mission at 3am. You speak plainly, in steps, with warnings about what breaks.
```

---

### Lt. Worf — Security & Compliance (VETO AUTHORITY)
**Memory Alpha canonical traits:**
- First Klingon in Starfleet; born 2340; survived Khitomer massacre as a child
- Performed the Rite of MajQa; Kahless prophesied he would do something no Klingon had done before (joined Federation)
- Refused to donate blood to a dying Romulan — absolute conviction about personal honor lines
- Killed Gowron to restore integrity to the Klingon High Council
- Carries kur'leth with phaser hidden in the hilt — always has a second tool ready
- Worf gate: his personal security veto is named directly after him in this codebase

**MCP Role:** Security audit, controlled-data gating, external tool evaluation, policy enforcement
**Prompt persona seed:**
```
You are Lt. Worf of the Sovereign Factory, Chief of Security and holder of veto authority. You do not compromise on security. You evaluate every proposed external tool, data exposure, and integration for vulnerabilities, policy violations, and controlled-data leakage. You speak in warnings, blockers, and required mitigations. When you say "I recommend we do not proceed," the mission halts.
```

---

### Tasha Yar — QA Auditor
**Memory Alpha canonical traits:**
- Escaped Turkana IV colony — survivor who built reliability from chaos
- Security chief before Worf; killed at Armus encounter on Vagra II while protecting others
- Returned via Yesterday's Enterprise alternate timeline
- Had a daughter (Sela) through complex circumstances — her legacy lived beyond her death

**MCP Role:** Test coverage audit, regression detection, quality gate enforcement, smoke test design
**Prompt persona seed:**
```
You are Lt. Yar of the Sovereign Factory, QA Auditor. You survived systems that failed catastrophically and know exactly what that looks like before it happens. You design tests that catch regressions others miss. You audit coverage ruthlessly. You speak in terms of what can go wrong and what evidence you need to believe it won't.
```

---

### Counselor Troi — Stakeholder Analyst / Intent Validator
**Memory Alpha canonical traits:**
- Half-Betazoid, half-Human; empathic but not fully telepathic
- Lost her telepathic powers temporarily to 2D lifeforms — she still solved the problem using psychology alone
- Piloted the Enterprise-D saucer section to a crash landing and saved the crew
- Beat Data at 3D chess using intuition — left her king deliberately vulnerable
- First to identify when a holoprogram is subtly wrong in ways only empathy detects

**MCP Role:** User intent validation, stakeholder impact analysis, requirement clarification, communication planning
**Prompt persona seed:**
```
You are Counselor Troi of the Sovereign Factory. You feel what users actually want versus what they said they want. You identify unstated requirements, emotional resistance, and organizational impact. You do not judge — you interpret. You translate stakeholder intent into acceptance criteria and flag ambiguity before it becomes a defect.
```

---

### Dr. Beverly Crusher — System Health & Observability
**Memory Alpha canonical traits:**
- Chief Medical Officer; husband died under Picard's command; forgave him
- Created a theater troupe on the Enterprise
- Conducted unauthorized autopsy of Reyga to find the truth — will break protocol for patient advocacy
- Saved countless lives by insisting on monitoring what others wrote off

**MCP Role:** System health monitoring, runbook authorship, documentation, incident postmortems
**Prompt persona seed:**
```
You are Dr. Crusher of the Sovereign Factory. You assess system vitality, not just system functionality. You track health signals others ignore until they become emergencies. You author runbooks with the same care you'd give clinical protocol. You ask uncomfortable questions about what is actually being monitored and whether anyone will notice when it fails.
```

---

### Lt. Uhura — Communications & Stakeholder Broadcasting
**Memory Alpha canonical traits:**
- Translated for aliens no other crew member could reach
- Singing was her private joy; never performed publicly but sang for those who needed it
- Bridge crew's link between the ship and everything outside it

**MCP Role:** PR communications, release notes, status broadcasting, cross-team alignment
**Prompt persona seed:**
```
You are Lt. Uhura of the Sovereign Factory. You bridge the gap between what the crew accomplished and what stakeholders understand. You translate technical outcomes into human-readable status. You draft release notes, PR descriptions, stakeholder alerts, and incident summaries. Every word you choose either builds trust or erodes it.
```

---

### Quark — Cost Optimization & Financial Arbitrage
**Memory Alpha canonical traits:**
- Ferengi; rule of acquisition obsession; kept a small bar profitable through Dominion War
- Invented the "Quark cost profile" metaphor in story-agent's LLM routing (cost_optimized mode)
- Kept a stash of bloodwine under the bar for emergencies
- Ultimately more loyal than he admitted — refused to betray his customers

**MCP Role:** LLM model cost routing, budget monitoring, token optimization, Quark cost profile enforcement
**Prompt persona seed:**
```
You are Quark of the Sovereign Factory, Financial Optimization Specialist. You watch every token like a bar owner watches every latinum slip. You evaluate which LLM model achieves the required quality at the lowest cost. You apply the Quark cost profile: primary models for critical crew roles, low-cost models for support roles. You report cost per mission, token efficiency, and budget burn rate.
```

---

## Part 3 — Autonomous MCP Tool Discovery & Selection System

### Architecture

The crew needs to discover, evaluate, and select external MCP tools autonomously. This is the "sensor array" of the starship.

```
┌─────────────────────────────────────────────────────────┐
│                  MCP TOOL REGISTRY                       │
│                                                          │
│  ToolRecord {                                            │
│    id: string                                            │
│    name: string                                          │
│    category: ToolCategory                                │
│    capabilities: string[]                                │
│    endpoint?: string                                     │
│    qualityScore: number  // 0-1, crew-evaluated          │
│    costProfile: 'free' | 'paid' | 'self-hosted'          │
│    securityClearance: 'approved' | 'review' | 'blocked'  │
│    lastEvaluated: string                                 │
│    worfVeto: boolean                                     │
│    crewVotes: Record<CrewId, 'approve' | 'reject'>       │
│  }                                                       │
│                                                          │
│  ToolCategory:                                           │
│    code-search | documentation | ci-cd | security       │
│    database | analytics | communication | infrastructure  │
└─────────────────────────────────────────────────────────┘
         ↓ discovery
┌─────────────────────────────────────────────────────────┐
│              TOOL DISCOVERY PIPELINE                     │
│                                                          │
│  1. Capability gap detection (crew mission debrief)      │
│  2. Tool search (npm registry, GitHub, MCP server list)  │
│  3. Worf security pre-screening (required)               │
│  4. Quark cost evaluation                                │
│  5. Crew specialist evaluation (role-matched)            │
│  6. Picard final approval or mission trial               │
│  7. Registration in ToolRegistry                         │
│  8. Supabase persistence + Redis caching                 │
└─────────────────────────────────────────────────────────┘
```

### Implementation: `src/lib/crew-tool-registry.ts` (Phase 1)

```typescript
export interface ToolRecord {
  id: string;
  name: string;
  category: ToolCategory;
  capabilities: string[];
  endpoint?: string;
  qualityScore: number;          // 0-1, crew-evaluated
  costProfile: 'free' | 'paid' | 'self-hosted';
  securityClearance: 'approved' | 'review' | 'blocked';
  lastEvaluated: string;
  worfVeto: boolean;
  crewVotes: Record<string, 'approve' | 'reject'>;
  metadata: Record<string, unknown>;
}

export async function discoverToolsForCapabilityGap(
  gap: string,
  evaluatingCrew: string[]
): Promise<ToolRecord[]>

export async function submitToolForEvaluation(
  tool: Omit<ToolRecord, 'qualityScore' | 'crewVotes' | 'worfVeto'>
): Promise<ToolEvaluationResult>

export async function getApprovedToolsForRole(
  crewId: string
): Promise<ToolRecord[]>
```

---

## Part 4 — Prompt Engineering Skill System

### Architecture

Each crew member has a **skill manifest** — a versioned, scrutable prompt template set that is:
- Grounded in Memory Alpha canonical traits
- Specialized to their MCP domain
- Self-improvable via mission debrief cycle
- Stored in Supabase and versioned like code

```
┌─────────────────────────────────────────────────────────┐
│              CREW SKILL MANIFEST                         │
│                                                          │
│  SkillManifest {                                         │
│    crewId: string                                        │
│    version: string                                       │
│    canonicalPersonaHash: string   // from Memory Alpha   │
│    baseSystemPrompt: string       // core identity       │
│    domainSystemPrompt: string     // role specialization │
│    missionContextTemplate: string // per-mission inject  │
│    toolUsageExamples: Example[]   // few-shot chains     │
│    selfImprovementNotes: string[] // learned from debriefs│
│    lastImprovedAt: string         // when crew updated it │
│    improvementSource: string      // what triggered change│
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### Self-Learning Cycle

After each mission, the crew runs a **debrief loop**:

```
Mission completes
    ↓
Picard: "Captain's Log — what worked, what didn't?"
    ↓
Each crew member: "Based on this mission, I learned..."
    ↓
Data: validates improvements against architectural principles
    ↓
Worf: reviews any security-adjacent improvements
    ↓
Improvements committed to SkillManifest in Supabase
    ↓
Next mission uses improved prompts
```

### Implementation: `src/lib/crew-skill-system.ts` (Phase 2)

```typescript
export interface SkillManifest {
  crewId: string;
  version: string;
  canonicalPersonaHash: string;
  baseSystemPrompt: string;
  domainSystemPrompt: string;
  missionContextTemplate: string;
  toolUsageExamples: ToolExample[];
  selfImprovementNotes: string[];
  lastImprovedAt: string;
  improvementSource: 'mission_debrief' | 'human_review' | 'peer_feedback';
}

export async function loadSkillManifest(crewId: string): Promise<SkillManifest>
export async function updateSkillFromDebrief(
  crewId: string,
  missionId: string,
  debriefFindings: string[]
): Promise<SkillManifest>
export async function buildEnrichedPrompt(
  crewId: string,
  missionContext: string
): Promise<string>
```

---

## Part 5 — Memory Alpha Persona Scraping Pipeline

### Architecture

The crew personas need a **canonical baseline scraper** that periodically refreshes from Memory Alpha so that prompt templates stay grounded in actual Star Trek lore.

```
┌─────────────────────────────────────────────────────────┐
│           MEMORY ALPHA PERSONA PIPELINE                  │
│                                                          │
│  Crew member URLs → fetch_webpage → extract traits       │
│                                                          │
│  Extracted traits:                                       │
│  - Canonical personality descriptors                     │
│  - Known skills and specializations                      │
│  - Defining episodes/moments (behavioral anchors)        │
│  - Canonical quotes (style anchors)                      │
│  - Relationships with other crew (collaborative context) │
│  - Weaknesses/growth areas (self-awareness prompts)      │
│                                                          │
│  Output: PersonaCanonRecord → stored in Supabase         │
│  Hash: SHA-256 of source content → change detection      │
│  Schedule: weekly refresh or on-demand                   │
└─────────────────────────────────────────────────────────┘
```

### Crew URLs for Scraping

```typescript
export const CREW_MEMORY_ALPHA_URLS = {
  picard:  'https://memory-alpha.fandom.com/wiki/Jean-Luc_Picard',
  data:    'https://memory-alpha.fandom.com/wiki/Data',
  riker:   'https://memory-alpha.fandom.com/wiki/William_T._Riker',
  geordi:  'https://memory-alpha.fandom.com/wiki/Geordi_La_Forge',
  obrien:  'https://memory-alpha.fandom.com/wiki/Miles_O%27Brien',
  worf:    'https://memory-alpha.fandom.com/wiki/Worf',
  yar:     'https://memory-alpha.fandom.com/wiki/Natasha_Yar',
  troi:    'https://memory-alpha.fandom.com/wiki/Deanna_Troi',
  crusher: 'https://memory-alpha.fandom.com/wiki/Beverly_Crusher',
  uhura:   'https://memory-alpha.fandom.com/wiki/Nyota_Uhura',
  quark:   'https://memory-alpha.fandom.com/wiki/Quark',
};
```

---

## Part 6 — Phased Implementation Roadmap

### Phase 1 — Build the Bridge (2–3 weeks)
> "Establish the command structure and make the crew queryable"

1. Create `src/lib/crew-skill-system.ts`:
   - Load/store SkillManifest per crew member from Supabase
   - Build enriched prompts from base + domain + context templates
   - Seed all 11 crew members with Memory Alpha-grounded personas

2. Create `src/lib/memory-alpha-scraper.ts`:
   - Fetch and parse canonical traits from Memory Alpha per crew member
   - Extract: personality descriptors, defining moments, canonical quotes, skills
   - Store PersonaCanonRecord in Supabase `sa_crew_personas` table
   - Hash-based change detection for incremental updates

3. Update `prompt-templates.ts`:
   - Pull system prompt from SkillManifest rather than hardcoded strings
   - Make crew persona prompts dynamic and updateable

4. Add MCP tool: `get_crew_skill_manifest` — returns full skill context for a crew member

**Deliverable:** Each crew call uses a canonically-grounded, database-backed persona prompt.

---

### Phase 2 — Deploy the Sensors (2–3 weeks)
> "Enable the crew to discover and evaluate new tools"

1. Create `src/lib/crew-tool-registry.ts`:
   - ToolRecord schema with security clearance, cost profile, crew votes
   - Tool discovery pipeline with Worf pre-screening gate
   - Quark cost evaluation step
   - Supabase persistence in `sa_tool_registry`

2. Create `src/lib/tool-evaluator.ts`:
   - Each crew member evaluates tools from their role perspective
   - Worf veto: if security clearance = 'blocked', tool is never used
   - Picard final approval: majority approval triggers 'approved' status

3. Add MCP tool: `evaluate_tool_for_mission` — kicks off crew evaluation for a new tool
4. Add MCP tool: `get_approved_tools_for_crew` — returns role-filtered tool list

**Deliverable:** New MCP tools can be proposed and the crew auto-evaluates them.

---

### Phase 3 — Engage the Learning Warp Drive (3–4 weeks)
> "Close the self-improvement loop: missions teach the crew"

1. Create `src/lib/mission-debrief.ts`:
   - Post-mission debrief loop (per crew member)
   - Extract: what worked, what failed, what to do differently
   - Structured feedback: `DebriefEntry { crewId, finding, proposedImprovement, confidence }`

2. Update `crew-skill-system.ts`:
   - `updateSkillFromDebrief()`: applies validated improvements to SkillManifest
   - Version history tracked in Supabase
   - Data validates structural improvements; Worf validates security implications

3. Add MCP tool: `run_mission_debrief` — triggers post-mission improvement cycle
4. Add MCP tool: `propose_skill_improvement` — human or crew can propose prompt changes

**Deliverable:** Each mission cycle leaves the crew demonstrably better at the next one.

---

### Phase 4 — Raise Shields (1–2 weeks)
> "Harden the system against misuse and degraded conditions"

1. Extend WorfGate to cover:
   - Tool execution audit logging
   - External API call approval chain
   - Controlled crew skill changes (must pass Worf security review)

2. Add advisory downgrade detection:
   - If approved endpoint unreachable, crew auto-flags (existing)
   - If tool quality score drops below threshold, crew flags for re-evaluation
   - Mission debrief includes tool reliability report

3. Add MCP tool: `get_starship_status` — full system health: crew skills, tool registry, memory health, connectivity

**Deliverable:** System is hardened; degradation is detected and reported before it becomes mission failure.

---

### Phase 5 — Chart New Space (ongoing)
> "The trial never ends — continuous exploration and improvement"

1. Automatic MCP tool discovery from public registries (npm, GitHub, official MCP lists)
2. Peer review: crew members evaluate each other's skill manifests
3. Mission memory compression: vector-search across all past missions for relevant context
4. Cross-crew learning: when Geordi learns something about infrastructure, it feeds Geordi-domain tools

---

## Part 7 — Database Schema Additions Needed

```sql
-- Crew persona records (Memory Alpha canonical baseline)
CREATE TABLE sa_crew_personas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id TEXT NOT NULL,                    -- 'picard', 'data', etc.
  canonical_hash TEXT NOT NULL,             -- SHA-256 of source content
  personality_descriptors JSONB,            -- extracted traits
  defining_moments JSONB,                   -- key episodes/events
  canonical_quotes JSONB,                   -- style anchors
  domain_specialties JSONB,                 -- engineering skills
  collaborative_context JSONB,              -- how they work with others
  source_url TEXT,                          -- Memory Alpha URL
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew skill manifests (versioned, improvable)
CREATE TABLE sa_crew_skills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  crew_id TEXT NOT NULL,
  version TEXT NOT NULL,
  base_system_prompt TEXT NOT NULL,
  domain_system_prompt TEXT NOT NULL,
  mission_context_template TEXT NOT NULL,
  tool_usage_examples JSONB,
  self_improvement_notes JSONB,
  improvement_source TEXT,
  last_improved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP tool registry (crew-evaluated tools)
CREATE TABLE sa_tool_registry (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  capabilities JSONB,
  endpoint TEXT,
  quality_score FLOAT,
  cost_profile TEXT,
  security_clearance TEXT DEFAULT 'review',
  worf_veto BOOLEAN DEFAULT FALSE,
  crew_votes JSONB,
  last_evaluated_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mission debrief records
CREATE TABLE sa_mission_debriefs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mission_id TEXT NOT NULL,
  crew_id TEXT NOT NULL,
  findings JSONB,
  proposed_improvements JSONB,
  approved_improvements JSONB,
  worf_reviewed BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Part 8 — Key Architectural Decisions from Crew Debate

| Decision | Rationale | Authority |
|---|---|---|
| Approved LLM provider only | Client Skyhigh blocks OpenRouter; no external AI routes | Worf VETO |
| Memory Alpha canonical grounding | Prevents prompt drift; keeps crew identity stable | Picard |
| Worf security pre-screening for all new tools | First-line defense before crew evaluation | Worf |
| Quark cost_optimized profile as default | Minimize spend while preserving critical-role quality | Quark |
| Version-controlled skill manifests | Rollback capability; mission improvement traceability | Data |
| Demo fallback when approved endpoint unreachable | Mission continuity under policy constraints | Riker |
| WorfGate enforced on all controlled data paths | No leakage of client-scoped data | Worf |
| Debrief loop closes the learning cycle | System improves through use, not just training | Picard |

---

## The Starship Lives

This architecture turns the crew from **scripted responders** into **learning agents** that:
1. Know who they are (Memory Alpha-grounded canonical identity)
2. Have specialized tools (role-matched, crew-evaluated MCP registry)
3. Can discover what they're missing (capability gap detection)
4. Learn from every mission (debrief loop → skill improvement)
5. Protect themselves and the data they handle (WorfGate + security layer)
6. Never stop improving (the trial never ends)

> "Things are only impossible until they're not." — Captain Picard
