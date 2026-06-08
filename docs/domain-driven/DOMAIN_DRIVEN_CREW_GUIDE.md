# Domain-Driven Crew Coordination Guide

## Overview

The story-agent system uses **Domain-Driven Design (DDD)** to map system domains to crew member expertise. This enables:

- ✅ **Intelligent task routing** - Tasks automatically route to relevant SMEs
- ✅ **Multi-perspective collaboration** - Multiple crew members contribute expertise to complex domains
- ✅ **Expertise discovery** - Know who to ask for any technical domain
- ✅ **Balanced workload** - Domains distributed across crew for specialization
- ✅ **Continuous learning** - Crew members deepen expertise in their domains

## 11 Domains + 11 Crew Members = Perfect Coverage

The system identifies **11 primary domains** mapped to **11 crew members**, with many domains having multiple owners for diverse perspectives.

### Domain Categories

#### 1. Database & Schema (3 domains)
- **database:schema** — Table design, migrations, schema evolution
- **database:migration** — Migration scripts, RPC execution, idempotent patterns
- Experts: Data (primary), O'Brien, Crusher

#### 2. Multi-Tenancy (2 domains)
- **tenancy:isolation** — Client isolation, RLS, data segregation
- **tenancy:onboarding** — New client setup, interactive configuration
- Experts: Data, Worf, Riker (primary), Troi

#### 3. Deployment & Operations (4 domains)
- **deployment:cicd** — GitHub Actions, automated execution
- **deployment:strategy** — Staged rollouts, canary deployments
- **infrastructure:automation** — Auto-migrate, client-onboard scripts
- **infrastructure:configuration** — Secrets, environment variables
- Experts: O'Brien (primary), Riker, Worf

#### 4. Monitoring & Health (2 domains)
- **monitoring:health** — Health checks, connectivity, status
- **monitoring:alerts** — Slack notifications, incident response
- Experts: Geordi, O'Brien (primary), Uhura

#### 5. Security (4 domains)
- **security:rls** — Row-Level Security policies
- **security:authentication** — JWT tokens, session management
- **security:secrets** — Credential storage, WorfGate principles
- **security:audit** — Auditing, compliance, vulnerability scanning
- Experts: Worf (primary), Data, Yar

#### 6. Performance & Optimization (3 domains)
- **performance:indexing** — Query optimization, indexes
- **performance:caching** — Cache strategy, invalidation
- **performance:metrics** — Metrics collection, analysis
- Experts: Geordi (primary), Quark

#### 7. Documentation & Knowledge (2 domains)
- **documentation:guides** — Setup guides, runbooks, tutorials
- **documentation:knowledge** — Tribal knowledge, design rationale, baseline memories
- Experts: Troi, Uhura, Picard (primary)

#### 8. Error & Resilience (2 domains)
- **error:handling** — Error classification, retry logic
- **error:resilience** — Idempotent operations, disaster recovery
- Experts: Crusher, O'Brien (primary), Riker

#### 9. Crew Coordination (3 domains)
- **crew:coordination** — Inter-crew decisions, consensus
- **crew:communication** — Message protocols, clarity, accessibility
- **crew:baseline-memories** — Knowledge base, learnings, expertise registry
- Experts: Picard, Riker, Uhura (primary)

## Crew Domain Ownership Map

### Picard (Captain & Strategic Command)
**Primary Domains**:
- crew:coordination — Facilitates crew decisions
- documentation:knowledge — Maintains institutional memory

**Why**: Strategic leader coordinates crew, maintains tribal knowledge

### Data (Architecture & Systems)
**Primary Domains**:
- database:schema — Architect of schema design
- documentation:knowledge — Documents architectural decisions
- tenancy:isolation — Designs domain boundaries for isolation

**Why**: Architect ensures consistency & domain boundaries

### Riker (Execution & Delegation)
**Primary Domains**:
- tenancy:onboarding — Orchestrates client setup
- deployment:strategy — Plans & executes deployments
- crew:coordination — Facilitates crew collaboration

**Why**: Execution lead translates strategy into action

### Geordi (Performance & Optimization)
**Primary Domains**:
- monitoring:health — Detects performance issues
- performance:indexing — Optimizes queries & indexes
- performance:metrics — Analyzes performance data
- performance:caching — Caching strategy

**Why**: Performance expert identifies & removes bottlenecks

### O'Brien (Operations & Reliability)
**Primary Domains**:
- deployment:cicd — Owns CI/CD automation
- error:resilience — Ensures system survives failures
- monitoring:alerts — Manages operational alerts
- infrastructure:automation — Automates operational tasks
- infrastructure:configuration — Manages environment setup

**Why**: Operations expert ensures production reliability

### Worf (Security & Defense)
**Primary Domains**:
- security:rls — Designs RLS policies
- security:secrets — WorfGate credential segregation
- security:audit — Audits security vulnerabilities
- tenancy:isolation — Enforces multi-tenant isolation

**Why**: Security expert enforces defense-in-depth

### Troi (Stakeholder Communication)
**Primary Domains**:
- tenancy:onboarding — Ensures smooth client experience
- documentation:guides — Writes clear guides

**Why**: Stakeholder communication expert provides empathy

### Crusher (Testing & Scientific Method)
**Primary Domains**:
- error:handling — Tests error scenarios thoroughly
- security:audit — Tests security comprehensively
- error:resilience — Tests failure scenarios

**Why**: Testing expert ensures quality & robustness

### Uhura (Communication & Protocols)
**Primary Domains**:
- crew:communication — Designs communication protocols
- monitoring:alerts — Crafts clear alert messages

**Why**: Communication expert ensures clarity

### Quark (Financial Optimization)
**Primary Domains**:
- performance:metrics — Correlates performance with cost
- performance:caching — Reduces costs via caching

**Why**: Financial expert optimizes costs

### Yar (QA & Risk Detection)
**Primary Domains**:
- monitoring:alerts — Detects risks requiring alerts
- security:audit — Systematically finds security issues

**Why**: Risk detection expert finds what others miss

## How to Use Domain-Driven Routing

### Scenario 1: Assigning a Task

When a new task arrives, identify its domains:

```typescript
import { routeTaskToCrew, generateDetailedCollaborationReport } from '@story-agent/mcp-server';

const task = {
  taskId: 'TASK-001',
  title: 'Implement automated client onboarding',
  description: 'Create self-service client setup with RLS policies and isolation',
  domains: ['tenancy:onboarding', 'tenancy:isolation', 'security:rls'],
};

// Get crew assignments
const crew = routeTaskToCrew(task);
// Result: [Riker (primary), Data (primary), Worf (primary), ...]

// Generate detailed briefing
const briefing = generateDetailedCollaborationReport(task);
```

### Scenario 2: Finding Domain Experts

Need expert advice on a specific domain?

```typescript
import { getDomainExperts } from '@story-agent/mcp-server';

// Find all experts for database schema
const schemaExperts = getDomainExperts('database:schema');
// Result: [
//   { crewId: 'data', expertise: 'primary', reason: '...' },
//   { crewId: 'obrien', expertise: 'secondary', reason: '...' },
//   ...
// ]

// Find primary expert only
const primarySchemaExpert = getDomainExperts('database:schema', 'primary');
```

### Scenario 3: Checking Coverage

Verify that assigned crew covers all required domains:

```typescript
import { findCoveragGaps, recommendCrewForGaps } from '@story-agent/mcp-server';

const assignedCrew = ['data', 'riker'];
const requiredDomains = ['database:migration', 'deployment:cicd', 'monitoring:health'];

// Check for gaps
const gaps = findCoveragGaps(assignedCrew, requiredDomains);
// Result: ['monitoring:health']

// Get recommendations
const recommendations = recommendCrewForGaps(gaps);
// Result: [Geordi, O'Brien, Yar (all have monitoring:health)]
```

### Scenario 4: Understanding Task Complexity

Get detailed collaboration plan:

```typescript
import { generateCrewBriefing } from '@story-agent/mcp-server';

const briefing = generateCrewBriefing(task);

// Shows:
// - Primary crew (lead the task)
// - Secondary crew (support with expertise)
// - Advisory crew (available for consultation)
// - Related domains that might be affected
// - Expertise required for each crew member
```

## Domain Dependencies

Domains are interconnected. When working in one domain, be aware of related domains:

**Example**: Working on `database:migration`?
- Related: `database:schema`, `infrastructure:automation`, `error:resilience`
- Consider involving: Data (schema consistency), O'Brien (operational reliability), Crusher (testing)

**Example**: Working on `security:rls`?
- Related: `tenancy:isolation`, `security:authentication`, `security:audit`
- Consider involving: Data (schema boundary design), Worf (threat modeling), Yar (risk detection)

Use `getRelatedDomains(domainId)` to discover dependencies:

```typescript
import { getRelatedDomains } from '@story-agent/mcp-server';

const related = getRelatedDomains('database:migration');
// Result: ['database:schema', 'infrastructure:automation', 'error:resilience']
```

## Crew Domain Distribution

All 11 crew members have balanced domain coverage:

| Crew | Primary Domains | Secondary Domains | Total |
|------|-----------------|-------------------|-------|
| Picard | 2 | 2 | 4 |
| Data | 3 | 5 | 8 |
| Riker | 3 | 5 | 8 |
| Geordi | 4 | 3 | 7 |
| O'Brien | 5 | 6 | 11 |
| Worf | 4 | 3 | 7 |
| Troi | 2 | 3 | 5 |
| Crusher | 3 | 4 | 7 |
| Uhura | 2 | 3 | 5 |
| Quark | 2 | 1 | 3 |
| Yar | 2 | 3 | 5 |

**Key Insights**:
- **O'Brien** has broadest coverage (operations touches everything)
- **Data & Riker** have deep expertise (architecture & execution)
- **Picard & Uhura** have focused expertise (leadership & communication)
- **Domain specialists** can team up for complex tasks

## Automated Domain Inference

Can't identify domains manually? Use automatic inference:

```typescript
import { inferTaskDomains } from '@story-agent/mcp-server';

const description = 'Implement RLS policies to enforce tenant isolation';
const domains = inferTaskDomains(description);
// Result: ['security:rls', 'tenancy:isolation']
```

## Documentation Example

Here's how domain expertise appears in crew baseline memories:

```
Security & Defense Framework (Worf)

Domains:
- Primary: security:rls, security:secrets, security:audit, tenancy:isolation
- Secondary: security:authentication, deployment:cicd, infrastructure:configuration

WorfGate Principles:
- Defense-in-depth: Multiple layers, no single point of failure
- Threat modeling: Anticipate attacks, assume bad intent
- Credential segregation: Keep secrets separated by environment
- Fail secure: When in doubt, deny access
```

## Adding New Domains

To add new domains to the system:

1. **Identify the domain** - What area of the system?
2. **Name it clearly** - Use format: `category:domain`
3. **Assign owners** - Who has primary expertise?
4. **Add relationships** - What domains does this connect to?
5. **Update baseline memories** - Add to crew knowledge

Example:

```typescript
'caching:redis': {
  name: 'Redis Caching Strategy',
  description: 'Cache design, TTL, invalidation, warm-up',
  owners: [
    { crewId: 'geordi', expertise: 'primary' },
    { crewId: 'obrien', expertise: 'secondary' }
  ],
  relatedDomains: ['performance:metrics', 'performance:indexing'],
}
```

## Review Process: "Who Should Review This?"

When submitting a change, ask: "Who owns these domains?"

**Automated review assignment**:

```typescript
import { getDomainExperts } from '@story-agent/mcp-server';

const changeDomains = ['database:migration', 'security:rls'];
for (const domain of changeDomains) {
  const experts = getDomainExperts(domain, 'primary');
  console.log(`${domain}: ${experts.map(e => e.crewId).join(', ')}`);
}
// Output:
// database:migration: data, obrien
// security:rls: worf
```

## Collaboration Best Practices

### 1. Include All Domain Owners
When working in a domain, include primary experts. They'll catch issues early.

### 2. Leverage Secondary Experts
Secondary experts provide valuable perspective. Ask them for feedback.

### 3. Consider Related Domains
Changes in one domain affect related domains. Loop in those experts too.

### 4. Document Domain Decisions
When experts make decisions, document them in baseline memories. Future crew members will appreciate it.

### 5. Cross-Train Crew Members
Have secondary experts grow into primary roles. Distribute knowledge across crew.

## Example Workflows

### Workflow 1: Database Schema Change

**Task**: Add new table for client billing data

**Identified Domains**: 
- database:schema (primary)
- tenancy:isolation (schema must support isolation)
- database:migration (need migration script)

**Assigned Crew**:
1. **Data** (primary, architecture expert)
2. **Worf** (secondary, ensure isolation)
3. **O'Brien** (secondary, ensure migration is reliable)

**Collaboration**:
- Data designs schema with domain boundaries
- Worf reviews for isolation gaps
- O'Brien designs migration & rollback strategy
- All three review before merge

### Workflow 2: Performance Degradation

**Task**: Database queries slowed down 50% last week

**Identified Domains**:
- performance:metrics (analysis)
- performance:indexing (optimization)
- monitoring:health (detection)
- database:schema (design review)

**Assigned Crew**:
1. **Geordi** (primary, performance expert)
2. **O'Brien** (secondary, operations impact)
3. **Data** (secondary, schema review)

**Collaboration**:
- Geordi analyzes metrics, identifies slow queries
- Data reviews schema design for optimization opportunities
- O'Brien assesses operational impact, coordinates rollout
- All three validate fix before deployment

## See Also

- [Domain Registry](domain-registry.ts) — Complete domain definitions
- [Crew Expertise](crew-expertise.ts) — Detailed crew expertise docs
- [Task Routing](crew-task-routing.ts) — Routing implementation

## Next Steps

1. **Review your domain** - What domains own your work?
2. **Find experts** - Use `getDomainExperts()` to find SMEs
3. **Assign crew** - Use `routeTaskToCrew()` for task assignment
4. **Collaborate** - Reach out to assigned crew members
5. **Document** - Update baseline memories with learnings
