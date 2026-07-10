# MCP Crew Member Identities & Authority Hierarchy

**Date:** 2026-06-08  
**Status:** Production Configuration  
**Context:** Complete operational hierarchy for all 11 autonomous crew members with Redis memory isolation, Supabase RLS scopes, and sequential decision dependencies.

---

## Executive Summary

All 11 MCP crew members are configured with:
- **Redis memory isolation** — Each crew member has dedicated namespace for observation memories
- **Authority hierarchy** — Clear decision weight + approval chains
- **Supabase RLS scopes** — Fine-grained data access control per crew member
- **Decision domains** — Specific business areas each crew member monitors
- **Cross-crew dependencies** — Sequential ordering ensures valid decisions (e.g., Riker waits for Picard + Data + Worf)

**Authority Structure:**
```
Tier 1: Picard (Executive, weight: 3) — Sets strategic direction
         ↓
Tier 2: Riker (First Officer/Coordinator, weight: 2) — Takes direction, organizes crew
         ↑ (waits for approval from Data + Worf veto authorities)
         ↓
Tier 3: All specialized crew (weight: 1) — Execute Riker's coordinated plan
         ↓
Tier 4: Advisory crew (weight: 0) — Inform Riker's decisions
```

---

## Configuration Details

Add the following to `~/.zshrc`:

### 1. Redis Memory Isolation (11 crew members)

Each crew member has a dedicated Redis namespace for storing learned decisions and observation memories.

```bash
# ── Crew Member Redis Memory Prefixes ──────────────────────────────────────────
export MCP_CREW_PICARD_REDIS_KEY_PREFIX="crew:picard:memories"
export MCP_CREW_DATA_REDIS_KEY_PREFIX="crew:data:memories"
export MCP_CREW_RIKER_REDIS_KEY_PREFIX="crew:riker:memories"
export MCP_CREW_GEORDI_REDIS_KEY_PREFIX="crew:geordi:memories"
export MCP_CREW_OBRIEN_REDIS_KEY_PREFIX="crew:obrien:memories"
export MCP_CREW_WORF_REDIS_KEY_PREFIX="crew:worf:memories"
export MCP_CREW_YAR_REDIS_KEY_PREFIX="crew:yar:memories"
export MCP_CREW_TROI_REDIS_KEY_PREFIX="crew:troi:memories"
export MCP_CREW_CRUSHER_REDIS_KEY_PREFIX="crew:crusher:memories"
export MCP_CREW_UHURA_REDIS_KEY_PREFIX="crew:uhura:memories"
export MCP_CREW_QUARK_REDIS_KEY_PREFIX="crew:quark:memories"
```

**Format:** `crew:<name>:memories:*`  
**Usage:** All crew observation memories isolated to their own Redis namespace  
**TTL:** Configurable per crew member (default: 7 days)

---

### 2. Authority Boundaries

Authority hierarchy with decision weights:
- **Weight 3:** Final authority (sets direction)
- **Weight 2.5:** Veto authority (approves/blocks others' decisions)
- **Weight 2:** Coordinator (orchestrates others)
- **Weight 1:** Autonomous (self-decided, reports to coordinator)
- **Weight 0:** Advisory (informs decisions, non-blocking)

```bash
# ── Crew Member Authority Boundaries ───────────────────────────────────────────
# Authority hierarchy: Picard (strategic) → Riker (operational coordinator) → Crew (specialized roles)
export MCP_CREW_PICARD_AUTHORITY="executive"           # Strategic decisions (weight: 3 = final authority, sets direction)
export MCP_CREW_RIKER_AUTHORITY="operational_coordinator"  # First Officer: takes Picard's direction, organizes crew (weight: 2 = orchestrates)
export MCP_CREW_DATA_AUTHORITY="architectural_veto"    # Architecture validation (weight: 2.5 = veto authority, approves Riker plans)
export MCP_CREW_WORF_AUTHORITY="security_veto"         # Security audits (weight: 2.5 = veto/block, approves Riker plans)
export MCP_CREW_GEORDI_AUTHORITY="infrastructure"      # Infrastructure decisions (weight: 1 = autonomous, reports to Riker)
export MCP_CREW_OBRIEN_AUTHORITY="deployment"          # DevOps/deployment (weight: 1 = autonomous, reports to Riker)
export MCP_CREW_YAR_AUTHORITY="quality"                # Test coverage (weight: 1 = autonomous, reports to Riker)
export MCP_CREW_CRUSHER_AUTHORITY="health"             # System health (weight: 1 = autonomous, reports to Riker)
export MCP_CREW_QUARK_AUTHORITY="finance"              # Cost optimization (weight: 1 = autonomous, reports to Riker)
export MCP_CREW_TROI_AUTHORITY="stakeholder"           # Stakeholder impact (weight: 0 = advisory, informs Riker)
export MCP_CREW_UHURA_AUTHORITY="communications"       # Status updates (weight: 0 = advisory, broadcasts Riker decisions)
```

**Key Change:** Riker is now the **operational coordinator** who:
1. Takes Picard's strategic direction
2. Validates with Data (architecture) + Worf (security)
3. Organizes all specialized crew members
4. All crew members report to Riker (not directly to Picard)

---

### 3. Decision Domains

Each crew member monitors specific business areas for autonomous decisions within their domain.

```bash
# ── Crew Member Decision Domains ───────────────────────────────────────────────
export MCP_CREW_PICARD_DOMAIN="strategic-readiness,project-scope,release-gates,vision-alignment"
export MCP_CREW_RIKER_DOMAIN="crew-coordination,mission-execution,resource-orchestration,priority-sequencing,cross-team-dependencies"
export MCP_CREW_DATA_DOMAIN="architecture-validation,code-quality,design-patterns,technical-debt"
export MCP_CREW_GEORDI_DOMAIN="infrastructure-capacity,performance-optimization,deployment-readiness,latency-slas"
export MCP_CREW_OBRIEN_DOMAIN="ci-cd-pipelines,release-management,infrastructure-provisioning,deployment-verification"
export MCP_CREW_WORF_DOMAIN="security-audits,vulnerability-detection,access-control,compliance-validation"
export MCP_CREW_YAR_DOMAIN="test-coverage,smoke-tests,regression-detection,quality-gates"
export MCP_CREW_TROI_DOMAIN="stakeholder-sentiment,communication-health,impact-assessment,team-alignment"
export MCP_CREW_CRUSHER_DOMAIN="system-health,performance-metrics,error-monitoring,incident-response"
export MCP_CREW_UHURA_DOMAIN="status-broadcasting,team-communication,decision-documentation,knowledge-sharing"
export MCP_CREW_QUARK_DOMAIN="cost-optimization,token-efficiency,resource-usage,budget-tracking"
```

**Usage:** Crew tools filter stories/projects/decisions by domain. Example: `crew:query-stories(domain=architecture-validation)` only returns stories in Data's domain.

---

### 4. Supabase RLS Scopes

Fine-grained data access control. Each crew member can only query/modify tables specified in their RLS scope.

```bash
# ── Crew Member Supabase RLS Scopes ────────────────────────────────────────────
export MCP_CREW_PICARD_RLS_SCOPE="sa_stories:read,sa_projects:read,sa_sprints:read,sa_crew_personas:read,sa_observation_memories:read|write"
export MCP_CREW_RIKER_RLS_SCOPE="sa_stories:read|write,sa_projects:read|write,sa_sprints:read|write,sa_crew_personas:read,sa_observation_memories:read|write"
export MCP_CREW_DATA_RLS_SCOPE="sa_stories:read,sa_projects:read,sa_observation_memories:read|write"
export MCP_CREW_GEORDI_RLS_SCOPE="sa_projects:read,sa_observation_memories:read|write"
export MCP_CREW_OBRIEN_RLS_SCOPE="sa_projects:read,sa_observation_memories:read|write"
export MCP_CREW_WORF_RLS_SCOPE="sa_stories:read,sa_projects:read,sa_observation_memories:read|write"
export MCP_CREW_YAR_RLS_SCOPE="sa_stories:read,sa_observation_memories:read|write"
export MCP_CREW_TROI_RLS_SCOPE="sa_stories:read,sa_projects:read,sa_observation_memories:read|write"
export MCP_CREW_CRUSHER_RLS_SCOPE="sa_observation_memories:read|write"
export MCP_CREW_UHURA_RLS_SCOPE="sa_stories:read,sa_observation_memories:read|write"
export MCP_CREW_QUARK_RLS_SCOPE="sa_stories:read,sa_projects:read,sa_observation_memories:read|write"
```

**Format:** `table_name:read|write|read-write`

**Key Changes:**
- **Riker upgraded:** Now has `read|write` on projects + sprints (tracks crew coordination)
- All crew can `read|write` to `sa_observation_memories` (their learning namespace)

---

### 5. Autonomous Decision Thresholds

Control how crew members make autonomous decisions.

```bash
# ── Crew Member Autonomous Decision Thresholds ─────────────────────────────────
export MCP_CREW_DECISION_CONFIDENCE_THRESHOLD=0.75    # 75% confidence required for autonomous action
export MCP_CREW_DECISION_BUDGET_PER_HOUR=100          # Max 100 crew decisions/hour (Quark rate limit)
export MCP_CREW_LEARN_FREQUENCY=5                     # Store learning observation every 5 decisions
```

**Meaning:**
- If crew member is <75% confident, requires human review
- Max 100 total crew decisions per hour (Quark enforces cost control)
- Learning observations persist every 5 decisions (reduce Redis writes)

---

### 6. Crew Profile Caching

Cache crew member profiles in Redis for fast identity lookup.

```bash
# ── Crew Member Profile Caching ────────────────────────────────────────────────
export MCP_CREW_PROFILE_CACHE_TTL=3600                # Cache crew profiles for 1 hour
export MCP_CREW_PROFILE_REDIS_PREFIX="crew:profiles"  # crew:profiles:picard, crew:profiles:data, etc.
```

---

### 7. Cross-Crew Decision Dependencies

Sequential ordering ensures valid decisions. Example: Riker must wait for Picard's strategic direction before coordinating crew.

```bash
# ── Crew Cross-Coordination (Operational Hierarchy Under Riker) ────────────────
# Coordination flow: Picard (strategic) → Riker (orchestration) → Crew (execution)
# Format: CREW_MEMBER_REQUIRES_APPROVAL_FROM specifies blocking dependencies

# Riker (First Officer/Coordinator) waits for Picard's strategic direction + Data/Worf approval
export MCP_CREW_RIKER_REQUIRES_APPROVAL_FROM="picard,data,worf"

# All specialized crew wait for Riker's coordinated plan (not Picard directly)
export MCP_CREW_GEORDI_REQUIRES_APPROVAL_FROM="riker"
export MCP_CREW_OBRIEN_REQUIRES_APPROVAL_FROM="riker,worf"
export MCP_CREW_YAR_REQUIRES_APPROVAL_FROM="riker"
export MCP_CREW_CRUSHER_REQUIRES_APPROVAL_FROM="riker"
export MCP_CREW_QUARK_REQUIRES_APPROVAL_FROM="riker"

# Advisory crew (Troi, Uhura) inform Riker + don't block (weight: 0)
export MCP_CREW_TROI_REQUIRES_APPROVAL_FROM="riker"
export MCP_CREW_UHURA_REQUIRES_APPROVAL_FROM="riker"
```

**Decision Flow:**
1. Picard sets strategic direction → stored in `crew:picard:memories`
2. Riker (waits for picard + data + worf) → generates operational plan → stored in `crew:riker:memories`
3. Geordi/O'Brien/Yar/Crusher/Quark (wait for riker) → execute their specialized tasks
4. Troi/Uhura (wait for riker) → provide feedback + broadcast decisions

---

### 8. Observation Lounge Webhook

When crew members need to collaborate (veto check, multi-factor decision):

```bash
# ── Crew Member Observation Lounge Webhooks ───────────────────────────────────
export MCP_OBSERVATION_LOUNGE_WEBHOOK="$N8N_OBSERVATION_LOUNGE_WEBHOOK"
```

---

## Integration Points

### MCP Tools → Environment Variables

**`crew:query-stories()`**
```
Uses: MCP_CREW_*_DOMAIN to filter stories
Uses: MCP_CREW_*_RLS_SCOPE to validate Supabase access
Stores results in: MCP_CREW_*_REDIS_KEY_PREFIX
```

**`crew:store-learning()`**
```
Writes to: crew:*:memories Redis namespace
Validates authority: MCP_CREW_*_AUTHORITY (Worf veto?)
Checks: MCP_CREW_DECISION_CONFIDENCE_THRESHOLD before storing
```

**`crew:list-active-projects()`**
```
Uses: MCP_CREW_*_RLS_SCOPE to filter accessible projects
Returns: Projects matching crew member's domain scope
```

**Decision Flow (Example: Picard → Riker → Geordi)**
```
1. Picard makes strategic decision (strategic-readiness domain)
   └─ Stores in crew:picard:memories with decision record

2. Riker queries picard:memories (waits for picard approval)
   └─ Takes direction + validates with data:memories + worf:memories
   └─ Generates coordinated plan
   └─ Stores in crew:riker:memories with orchestration record

3. Geordi queries riker:memories (waits for riker approval)
   └─ Sees coordinated plan affecting infrastructure-capacity domain
   └─ Executes autonomous decision
   └─ Stores in crew:geordi:memories with execution record
```

---

## Deployment Checklist

- [ ] Add all environment variables to `~/.zshrc`
- [ ] Run `source ~/.zshrc` to verify syntax
- [ ] Verify Redis connection: `redis-cli PING`
- [ ] Verify Supabase connection: Check `sa_observation_memories` table exists
- [ ] Create Supabase RLS policies for each crew member (based on authority scope)
- [ ] Create Redis key prefixes for each crew member (crew:picard:memories, etc.)
- [ ] Test crew:query-stories() with each domain filter
- [ ] Test decision approval chain (Picard → Riker → Geordi sequence)
- [ ] Enable WorfGate security checks on all crew LLM calls

---

## Validation Commands

```bash
# Verify all environment variables are loaded
source ~/.zshrc
echo "Picard authority: $MCP_CREW_PICARD_AUTHORITY"
echo "Riker coordinator: $MCP_CREW_RIKER_AUTHORITY"
echo "Decision threshold: $MCP_CREW_DECISION_CONFIDENCE_THRESHOLD"

# Verify Redis prefixes
echo "Picard memories: $MCP_CREW_PICARD_REDIS_KEY_PREFIX"
echo "Riker memories: $MCP_CREW_RIKER_REDIS_KEY_PREFIX"

# Verify approval chains
echo "Riker waits for: $MCP_CREW_RIKER_REQUIRES_APPROVAL_FROM"
echo "Geordi waits for: $MCP_CREW_GEORDI_REQUIRES_APPROVAL_FROM"
```

---

## References

- **Quark Cost Optimization:** `packages/mcp-server/src/lib/prompt-engine.ts:selectModelForCall()`
- **WorfGate Security:** `packages/mcp-server/src/lib/worfgate.ts`
- **Crew Autonomy Tools:** `packages/mcp-server/src/tools/crew-autonomy-tools.ts`
- **Observation Lounge:** `packages/ui/src/app/observation-lounge/page.tsx`
- **Database Schema:** `supabase/migration.sql` (sa_observation_memories table)

---

## Next Steps

1. **Database Integration** — Verify `sa_observation_memories` table with all fields
2. **Query Helpers** — Implement database query builders for each crew domain
3. **Memory Persistence** — Store crew learning observations to Redis + Supabase
4. **Test Suite** — 50+ autonomy tests for crew decision flows
5. **WorfGate Integration** — Security audit trail for all crew LLM calls
6. **Observation Lounge** — Multi-crew decision coordination via n8n webhooks
