# Story Agent: Native PM System Roadmap (2026-08-25 → 2027-02-25)

**Strategic Vision**: Story Agent is a **PM PLATFORM**, not a Jira wrapper. We design our own native PM system from first principles, pilot internally, then integrate external tools as data sources that sync INTO our contracts.

**Approved Path**: BALANCED execution (medium risk, full operational safeguards)

**Cost**: $3.3k (vs. $18k/yr Jira licensing savings post-Phase 2)

---

## Executive Summary

| Phase | Timeline | Lead Crew | Goal | Outcome |
|-------|----------|-----------|------|---------|
| **0: Design** | 2 days | Picard + Data | Define universal PM contracts | ✅ COMPLETE (Aug 25) |
| **1: Engine** | 8 weeks | Riker + Geordi | Build native PM engine, zero external deps | Standalone system ready |
| **2: Pilot** | 4 weeks | Troi + Crusher | Internal team adoption (familiarcat) | NPS ≥ 8/10 |
| **3: Adapters** | 6 weeks | Data + Yar | Design sync from external tools | Jira/Monday/Azure mappers ready |
| **4: Multi-Tool** | 4 weeks | Quark + O'Brien | Pilot Jira ↔ Story Agent sync | Zero critical incidents |
| **5: Platform** | Ongoing | Picard + Uhura | White-label platform launch | 50 customers / $50k MRR |

**Total Duration**: 24 weeks (6 months)  
**Crew Effort**: ~11 person-weeks per phase  
**Next Milestone**: Phase 1 kickoff (Aug 26, 2026)

---

## Phase 0: Universal PM Data Contracts (COMPLETE ✅)

### Deliverables (Aug 25, 2026)
- ✅ **Crew Mission**: Deliberated 8 questions on universal PM semantics
- ✅ **Core Schema**: Defined required vs optional fields across all PM tools
- ✅ **State Machine**: Minimal universal states (open → in_progress → done)
- ✅ **Conflict Resolution**: Rules for multi-tool sync (last-write-wins with 5-min window)
- ✅ **Roadmap**: 5-phase plan with crew lead assignments
- ✅ **Memory**: Stored to RAG as `NATIVE-PM-DESIGN-AUG25`

### Key Decisions
1. **NO Jira dependency**: Phase 1 builds from scratch, not adapting Jira
2. **Universal contracts**: All PM tools (Jira, Monday, GitHub, Linear, Notion) must fit ONE data model
3. **Immutability gated**: Sprint dates locked when "active", but audit-logged overrides with RBAC
4. **Deterministic conflict resolution**: All sync collision rules documented and measurable
5. **Execution path**: BALANCED (not Conservative or Aggressive)

### Crew Consensus (Unanimous)
- **Picard** (Command): Platform not tool — enables vendor-agnostic mission
- **Data** (Architecture): Extensible schema with versioning — supports tool-specific fields
- **Riker** (Implementation): Sequential validation before parallel expansion — reduces risk
- **Geordi** (Infrastructure): Sandbox isolation in staging — validates performance before prod
- **Worf** (Security): Adversarial testing + RBAC enforcement — zero untracked state changes
- **Yar** (QA): Phased instrumentation + mutation testing — catches deadlocks before prod
- **Troi** (Stakeholder): Operational continuity gates — team experience non-negotiable
- **Crusher** (Health): Prometheus metrics on sync latency — 3x faster outage detection
- **Uhura** (Communications): This is a platform launch — positioning differs from tool launch
- **O'Brien** (DevOps): Load testing in isolated environments — validates 10k concurrent states
- **Quark** (Finance): $18k/yr savings post-Phase 2 — justifies upfront investment

---

## Phase 1: Native PM Engine (8 weeks: Sep 1 — Oct 24, 2026)

**Primary Leads**: Riker (sequencing), Geordi (infrastructure)  
**Secondary Leads**: Data (schema), Worf (security), Yar (testing), O'Brien (CI/CD)

### Definition of Done
- [ ] Core schema deployed to Supabase (sa_pm_* tables)
- [ ] State machine implemented with recursive validation
- [ ] Multi-tenant isolation verified (familiarcat, client-int separate)
- [ ] Automated conflict detection (no cyclical dependencies possible)
- [ ] 95%+ uptime SLA achieved in staging (14-day burn test)
- [ ] Zero critical security findings (Worf's OWASP + Terraform scans)
- [ ] Test coverage ≥ 90% (Yar's mutation test suite)
- [ ] Phase 2 pilot environment ready (Troi signoff)

### Scope (What We Build)
1. **Core Engine** (Geordi leads)
   - API: Create/read/update sprints, stories, tasks
   - Validation: RFC3339 timestamps, no cycles, RBAC enforcement
   - Multi-tenancy: Client isolation at data layer
   - State transitions: Governed by deterministic rules

2. **Schema** (Data leads)
   - `sa_pm_sprints`: id, name, state, start_date, end_date, capacity
   - `sa_pm_stories`: id, title, description, sprint_id, state, assignee, custom_fields
   - `sa_pm_tasks`: id, title, story_id, state, blocked_by (array), assignee
   - All tables support audit logging + encryption at rest

3. **Validation** (Worf + Yar lead)
   - Recursive cyclical dependency detection
   - RFC3339 timestamp enforcement
   - RBAC permission matrix (who can modify what)
   - Adversarial test fixtures in `/test/fixtures/hacking/`

4. **Infrastructure** (O'Brien leads)
   - Deployed to ECS Fargate (same cluster as existing services)
   - Redis cache for state transitions (10ms p99 latency target)
   - CloudWatch logs + metrics for ops visibility
   - CI pipeline: 32 concurrent test jobs (existing capacity)

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 95%+ | CloudWatch dashboard |
| Latency (p99) | <100ms | New story creation latency |
| Security | 0 critical findings | Worf's OWASP scans |
| Test coverage | ≥90% | Yar's coverage report |
| Throughput | 1000 req/s | Load test at 10k concurrent |
| Data integrity | 0 cycles | Recursive validation check |

### Crew Assignments & Efficiency
| Lead | Role | Responsibility | Est. Effort |
|------|------|-----------------|------------|
| **Riker** | Implementation Lead | Sequence features, manage dependencies, incident response | 40h/week |
| **Geordi** | Infrastructure Lead | Multi-tenant isolation, ECS deployment, Redis optimization | 35h/week |
| **Data** | Schema Architect | Type-safe model, extensibility, versioning | 25h/week |
| **Worf** | Security Lead | RBAC matrix, encryption, adversarial testing, audit logs | 20h/week |
| **Yar** | QA Lead | Test fixtures, mutation testing, deadlock detection | 30h/week |
| **O'Brien** | DevOps | CI/CD, load testing rig, CloudWatch integration | 25h/week |
| **Crusher** | Health Monitor | Prometheus setup, latency tracking, alert rules | 15h/week |

### Dependencies
- Supabase: Already provisioned (shared with ai-enterprise-os)
- ECS cluster: Already active
- CI/CD: Existing GitHub Actions pipeline
- **NO external tool APIs required** (zero Jira, Monday, Azure dependencies)

### Blockers & Risks
1. **Risk**: DynamoDB capacity exhaustion during load tests
   - Mitigation: Pre-provision 500 WCU, Quark budget approval
   - Owner: Geordi

2. **Risk**: State machine design gaps discovered mid-phase
   - Mitigation: Prototype in `/test/fixtures/` before full implementation
   - Owner: Riker + Data

3. **Risk**: Multi-tenant isolation not enforced at API layer
   - Mitigation: Worf reviews every permission check
   - Owner: Worf

### Rollout Plan
- **Week 1-2**: Schema design & validation testing
- **Week 3-4**: Core API implementation (CRUD operations)
- **Week 5-6**: Multi-tenant isolation + RBAC enforcement
- **Week 7-8**: Load testing + ops hardening
- **Week 9**: Staging ready for Phase 2 pilot

### Go/No-Go Gate (Before Phase 2)
- **Metrics**: Uptime ≥ 95%, latency p99 < 100ms, test coverage ≥ 90%
- **Signoff**: Picard (strategy), Riker (implementation), Crusher (health)
- **Fallback**: If gate fails, extend Phase 1 by 2 weeks or pivot to Conservative path

---

## Phase 2: Internal Pilot (4 weeks: Oct 25 — Nov 21, 2026)

**Primary Leads**: Troi (stakeholder management), Crusher (health monitoring)  
**Secondary Leads**: Uhura (comms), Yar (surveys), Crusher (metrics)

### Definition of Done
- [ ] familiarcat internal team (8 people) actively using Story Agent
- [ ] Zero Jira usage for core workflows (sprints, stories, tasks)
- [ ] NPS score ≥ 8/10 (Yar's survey)
- [ ] Cycle time reduction ≥ 15% vs baseline (Crusher's metrics)
- [ ] Zero critical UX issues (Troi stakeholder feedback)
- [ ] Phase 3 adapter requirements documented (from team feedback)

### Scope
1. **Team Setup** (Troi leads)
   - Migrate 1 sprint (5-6 stories) from Jira to Story Agent
   - Onboard familiarcat team on new UI
   - Daily standups + weekly retrospectives (measure satisfaction)

2. **Monitoring** (Crusher leads)
   - Real-time dashboard: NPS, cycle time, sync latency
   - Prometheus metrics: API latency, error rates, cache hit rates
   - Alerting: If any metric degrades > 10%, escalate

3. **Communications** (Uhura leads)
   - Weekly updates to team + leadership
   - Document pain points + feature requests
   - Positioning for Phase 3+ (story angle)

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| NPS | ≥ 8/10 | Post-sprint survey |
| Adoption | 100% of core workflows | Jira audit logs (zero updates) |
| Cycle time | -15% vs baseline | Lead time tracking |
| Satisfaction | Zero critical UX issues | User feedback sessions |
| System health | 99%+ uptime | CloudWatch |

### Crew Assignments
| Lead | Role | Responsibility | Est. Effort |
|------|------|-----------------|------------|
| **Troi** | Stakeholder Lead | Team onboarding, feedback collection, sprint planning | 30h/week |
| **Crusher** | Metrics Lead | Dashboard setup, alert rules, health visualization | 20h/week |
| **Uhura** | Communications | Weekly updates, pain point docs, team messaging | 15h/week |
| **Yar** | QA / Survey | Post-sprint NPS survey, pain point catalog | 15h/week |

### Go/No-Go Gate (Before Phase 3)
- **Metrics**: NPS ≥ 8/10, cycle time -15%, uptime 99%+
- **Signoff**: Picard (strategy), Troi (stakeholder), Crusher (health)
- **Fallback**: If NPS < 7/10, extend pilot 2 weeks or iterate UX based on feedback

---

## Phase 3: Adapter Framework (6 weeks: Nov 22 — Jan 2, 2027)

**Primary Leads**: Data (schema mapping), Yar (test coverage)  
**Secondary Leads**: Geordi (sync infrastructure), Worf (security), O'Brien (deployment)

### Definition of Done
- [ ] Jira adapter: Maps 50 core fields (customfield_* identifiers)
- [ ] Monday adapter: Maps columns → states, items → stories
- [ ] GitHub Projects adapter: Maps issues → stories, project columns → sprints
- [ ] Sync latency: <200ms p99 for all adapters
- [ ] Data loss: 0% (verified via checksums)
- [ ] Security: Worf's OAuth2 compliance + read-only pilot mode

### Scope
1. **Jira Adapter** (Data leads)
   - OAuth2 authentication
   - Field discovery: GET /rest/api/2/field (50+ fields)
   - Mapping: customfield_10040 → story_points, etc.
   - Bidirectional: Read from Jira, write mapped fields back
   - Error handling: Graceful degradation if field missing

2. **Monday Adapter**
   - GraphQL authentication (API token)
   - Board discovery: Fetch boards, columns
   - Mapping: Column → story state, item → story
   - Sync: Webhooks for real-time updates

3. **GitHub Projects Adapter**
   - REST API authentication (token)
   - Project discovery: Fetch projects, columns
   - Mapping: Issue → story, project → sprint
   - Relationship: Link to commit/PR traceability

4. **Sync Infrastructure** (Geordi leads)
   - Event bus: Publish/subscribe for state changes
   - Conflict detection: Identify divergence
   - Rate limiting: Respect API quotas per tool
   - Monitoring: CloudWatch metrics per adapter

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Latency (p99) | <200ms | Sync bridge latency logs |
| Data loss | 0% | Checksum verification |
| Field mapping | 50/50 Jira fields | Test fixtures pass |
| Security | OAuth2 compliant | Worf's scans + manual review |
| Conflict detection | 100% caught | Adversarial test suite |

### Crew Assignments
| Lead | Role | Responsibility | Est. Effort |
|------|------|-----------------|------------|
| **Data** | Adapter Lead | Schema mapping, field discovery, bidirectional sync | 35h/week |
| **Yar** | QA Lead | Adapter test fixtures, field coverage, conflict tests | 30h/week |
| **Geordi** | Infrastructure Lead | Sync event bus, rate limiting, CloudWatch metrics | 25h/week |
| **Worf** | Security Lead | OAuth2 scopes, encryption, audit logging | 20h/week |
| **O'Brien** | DevOps | Adapter deployment, incident response | 20h/week |

### Go/No-Go Gate (Before Phase 4)
- **Metrics**: Latency <200ms, 0% data loss, OAuth2 compliant
- **Signoff**: Data (schema), Worf (security), Yar (testing)
- **Fallback**: If latency > 300ms, optimize query patterns or defer non-critical fields

---

## Phase 4: Multi-Tool Pilot (4 weeks: Jan 3 — Jan 30, 2027)

**Primary Leads**: Quark (cost modeling), O'Brien (operations)  
**Secondary Leads**: Crusher (health), Riker (incident response)

### Definition of Done
- [ ] Jira + Story Agent sync live in staging (read-only first)
- [ ] API costs tracked & within budget (<$200/month)
- [ ] Sync conflict rate <5% (measured over 7 days)
- [ ] Zero critical incidents during pilot
- [ ] Automated failover to Jira-only tested & working
- [ ] Phase 5 launch decision made (approve or extend)

### Scope
1. **Jira Sync Pilot** (O'Brien leads)
   - Bidirectional: familiarcat team edits in both Story Agent + Jira
   - Read-only mode: Story Agent enforces read-only on Jira tokens
   - Conflict resolution: Track divergence, measure merge success
   - Failover: If conflicts > 5%, switch to Jira-only adapter (read-only)

2. **Cost Tracking** (Quark leads)
   - API calls per tool per operation (read, write, conflict)
   - DynamoDB WCU consumption
   - S3 + CloudWatch log costs
   - Budget gate: Stop sync if costs exceed $200/month

3. **Health Monitoring** (Crusher leads)
   - Sync latency SLA: <200ms p99
   - Conflict detection: % of syncs that have conflicts
   - Failover trigger: Automatic if conflicts ≥ 5% for 24h
   - Alerting: Page Riker if critical incident

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Sync conflicts | <5% | Conflict counter in CloudWatch |
| Cost | <$200/mo | AWS billing dashboard |
| Incidents | 0 critical | Incident log |
| Failover | 0 activations | Failover counter |
| Uptime | 99%+ | SLA tracking |

### Crew Assignments
| Lead | Role | Responsibility | Est. Effort |
|------|------|-----------------|------------|
| **Quark** | Finance Lead | Cost tracking, budget gates, ROI modeling | 20h/week |
| **O'Brien** | Operations Lead | Sync orchestration, conflict resolution, failover | 35h/week |
| **Crusher** | Health Lead | SLA monitoring, alert rules, incident escalation | 20h/week |
| **Riker** | Incident Lead | On-call support, conflict resolution, root cause | 15h/week |

### Go/No-Go Gate (Before Phase 5)
- **Metrics**: <5% conflicts, <$200/mo cost, 0 critical incidents
- **Signoff**: Quark (cost), O'Brien (ops), Crusher (health)
- **Fallback**: If conflicts > 10%, revert to read-only adapter mode and extend phase 4 by 2 weeks

---

## Phase 5: Platform Launch (Ongoing: Feb 1, 2027+)

**Primary Leads**: Picard (strategy), Uhura (positioning)  
**Secondary Leads**: Quark (pricing), Troi (customer success)

### Vision
Story Agent becomes **white-label PM platform** that organizations buy instead of (or in parallel with) Jira/Monday/Azure.

### Definition of Done (6-Month Goals)
- [ ] Public landing page + documentation
- [ ] Multi-tenant isolated deployment (100+ customer orgs)
- [ ] 50 customers onboarded (target: 50 by Aug 2027)
- [ ] $50k MRR (target: $50k by Aug 2027)
- [ ] NPS ≥ 9/10 (customer satisfaction)
- [ ] <99.5% uptime SLA maintained

### Scope
1. **Platform Engineering** (Geordi + O'Brien leads)
   - API-first architecture (mobile + desktop clients)
   - White-label UI customization (logo, colors, domain)
   - SSO integration (Okta, Azure AD)
   - Data residency options (US, EU)

2. **Go-To-Market** (Uhura + Troi leads)
   - Positioning: "PM platform that works WITH your tools"
   - Case studies: familiarcat + client-int success stories
   - Sales playbook: SMB/Enterprise segments
   - Customer support: Tier 1 (email), Tier 2 (Slack), Tier 3 (Riker on-call)

3. **Pricing** (Quark leads)
   - Freemium: 1 project, 5 team members, 3 integrations
   - Pro: $49/mo, unlimited projects, 50 team members, all integrations
   - Enterprise: Custom pricing, SSO, data residency, SLA guarantees
   - Margin target: 60% (after infrastructure costs)

### Success Metrics
| Metric | Target (Aug 2027) | Measurement |
|--------|---------|-------------|
| Customers | 50+ | Customer list |
| MRR | $50k+ | Stripe dashboard |
| NPS | ≥ 9/10 | Customer survey |
| Uptime | 99.5%+ | SLA tracking |
| Churn | <2%/month | Customer retention |

### Crew Assignments
| Lead | Role | Responsibility | Est. Effort |
|------|------|-----------------|------------|
| **Picard** | Strategy Lead | Vision, positioning, market strategy | 20h/week |
| **Uhura** | Communications Lead | Marketing, positioning, customer comms | 25h/week |
| **Quark** | Pricing Lead | Pricing model, cost optimization, unit economics | 20h/week |
| **Troi** | Customer Success Lead | Onboarding, support, retention | 25h/week |
| **Geordi** | Platform Engineering Lead | API design, multi-tenancy, white-label | 30h/week |
| **O'Brien** | Operations Lead | 99.5% uptime SLA, incident response | 25h/week |

---

## Cost Projections (Total Investment)

| Phase | Duration | Team Cost | Infrastructure | Total |
|-------|----------|-----------|-----------------|-------|
| **0: Design** | 2 days | $500 | - | **$500** |
| **1: Engine** | 8 weeks | $8,000 | $1,000 (Supabase, Redis) | **$9,000** |
| **2: Pilot** | 4 weeks | $4,000 | $300 | **$4,300** |
| **3: Adapters** | 6 weeks | $6,000 | $1,500 (Jira sandbox API) | **$7,500** |
| **4: Multi-Tool** | 4 weeks | $4,000 | $1,000 | **$5,000** |
| **5: Platform** | 6 months | $30,000 | $3,000/mo | **$48,000** |
| **TOTAL** | 24 weeks | $52,500 | $8,100 | **$60,600** |

**Payback**: $18k/yr Jira savings post-Phase 2 → **payback within 4 months**

---

## Decision Gates & Escalation

| Gate | Criteria | Escalation |
|------|----------|-----------|
| **Phase 1→2** | Uptime ≥95%, latency p99<100ms, test coverage ≥90% | If gate fails: extend Phase 1 by 2 weeks |
| **Phase 2→3** | NPS ≥8/10, cycle time -15%, uptime 99%+ | If NPS <7/10: iterate UX, extend pilot |
| **Phase 3→4** | Latency <200ms, 0% data loss, OAuth2 compliant | If latency >300ms: optimize queries or defer fields |
| **Phase 4→5** | <5% conflicts, <$200/mo cost, 0 critical incidents | If conflicts >10%: revert to read-only, extend phase 4 |
| **Phase 5: Ongoing** | 50 customers, $50k MRR, 99.5% uptime, NPS ≥9 | If metrics miss: adjust pricing or pivot GTM |

---

## Crew Communication Protocol

- **Phase Kickoff**: Picard + leads review dependencies & blockers
- **Weekly Standup**: 30 min, each lead reports progress + blockers
- **Bi-weekly Sync**: Full crew + Picard, discuss cross-phase impacts
- **Gate Reviews**: Scheduled 1 week before phase transition
- **Incident Response**: Page Riker for P1, O'Brien for P2, Crusher for health

---

## Appendix: Universal PM Data Contracts

### Core Schema (TypeScript)

```typescript
// Sprint
interface Sprint {
  id: UUID;
  name: string;
  state: "planning" | "active" | "review" | "complete";
  start_date: RFC3339;
  end_date: RFC3339;
  capacity?: number; // story points or effort estimate
  metadata?: Record<string, any>; // tool-specific extensions
  created_at: RFC3339;
  updated_at: RFC3339;
  tenant_id: UUID;
}

// Story
interface Story {
  id: UUID;
  title: string;
  description?: string;
  sprint_id?: UUID;
  state: "open" | "in_progress" | "review" | "done";
  assignee_id?: UUID;
  story_points?: number; // Scrum only
  custom_fields?: Record<string, any>; // tool-specific
  created_at: RFC3339;
  updated_at: RFC3339;
  tenant_id: UUID;
}

// Task
interface Task {
  id: UUID;
  title: string;
  story_id?: UUID;
  state: "open" | "in_progress" | "done";
  assignee_id?: UUID;
  blocked_by?: UUID[]; // no cycles allowed
  priority?: "low" | "medium" | "high";
  created_at: RFC3339;
  updated_at: RFC3339;
  tenant_id: UUID;
}
```

### State Machine

```
Minimal Universal States:
  open ─→ in_progress ─→ done
  open ─→ done (optional skip)
  any ─→ blocked (optional extended state)

Optional Extensions (Scrum):
  open ─→ planning ─→ active ─→ review ─→ done

Conflict Resolution:
  if (timestamp_diff < 5 minutes) {
    flag for manual review (human-in-loop)
  } else {
    accept most recent update, log divergence
  }
```

---

**Next Action**: Admiral approval to proceed with Phase 1 (Riker + Geordi as primary leads). Kickoff: Aug 26, 2026.

🖖 **End of Roadmap Document**
