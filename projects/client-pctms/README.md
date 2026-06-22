# Client Pharmaceutical — Patient-Centric Trial Management System

**Client**: Client Pharmaceutical Systems  
**Tier**: Gold-Standard  
**Compliance**: PHI (Protected Health Information)  
**Status**: Active  

## Project Overview

Multi-tenant clinical trial management platform supporting real-time collaboration between trial coordinators, researchers, and data analysts across multiple pharmaceutical trial sites.

### Key Requirements

- **Multi-Tenant Isolation**: Complete data isolation between different trial organizations
- **PHI Compliance**: HIPAA-compliant secure storage and access control
- **Real-Time Collaboration**: Live dashboard updates for trial coordinators
- **Audit Trail**: Complete audit logging for regulatory compliance
- **Performance**: Sub-100ms query latency for critical operations
- **Reliability**: 99.9% uptime SLA

## Crew Assignments

### Primary Crew (Full Authority)

| Member | Role | Responsibility |
|--------|------|-----------------|
| **Picard** | Captain & Strategy | Strategic decisions, escalation authority |
| **Data** | Architecture | Schema design, data modeling |
| **Riker** | Execution Lead | Project coordination, deployment |
| **Geordi** | Performance | Query optimization, health monitoring |
| **O'Brien** | Operations | Infrastructure, reliability |
| **Worf** | Security | RLS enforcement, compliance |

### Secondary Crew (Supporting)

| Member | Role | Responsibility |
|--------|------|-----------------|
| **Troi** | Communication | Stakeholder communication, clarity |
| **Crusher** | Quality | Testing, edge case validation |
| **Uhura** | Documentation | Decision documentation, clarity |

### Advisory Crew (Consultation)

| Member | Role | Responsibility |
|--------|------|-----------------|
| **Quark** | Finance | Cost optimization |
| **Yar** | Compliance | Risk detection, audit trails |

## Getting Started

### Step 1: Clone Repository

```bash
git clone https://github.com/familiarcat/story-agent.git
cd story-agent
```

### Step 2: Setup Environment

```bash
# Copy configuration template
cp projects/client-pctms/.env.example projects/client-pctms/.env

# Fill in Client-specific credentials
# - SUPABASE_URL
# - SUPABASE_KEY
# - SLACK_WEBHOOK_URL (optional)
```

### Step 3: Select Project

```bash
npm run project:select client-pctms
npm run project:info
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Initialize Database

```bash
npm run db:auto-migrate
npm run db:health-check
```

## Available Commands

### Development

```bash
npm run dev                # Start MCP server + dashboard
npm run mcp                # Start only MCP server
npm run ui                 # Start only dashboard
```

### Database

```bash
npm run db:auto-migrate    # Apply migrations to Client database
npm run db:health-check    # Check Client database health
npm run db:migrate:test    # Test migrations
```

### Crew Management

```bash
npm run crew:seed-memories  # Load crew baseline knowledge
npm run crew:check          # Verify crew system health
npm run project:crew        # Show crew assignments
```

### Documentation

```bash
npm run docs:ingest        # Ingest shared documentation
npm run docs:refresh       # Refresh documentation index
```

## Project Structure

```
projects/client-pctms/
├── .env.example           # Configuration template
├── supabase/              # Database-specific configs
│   └── migrations/        # Client-specific migrations
├── docs/                  # Project documentation
│   ├── TECHNICAL_SPEC.md
│   ├── DATA_MODEL.md
│   └── RLS_POLICIES.md
└── README.md              # This file
```

## Architecture

### Multi-Tenant Isolation

All tables include `org_id = 'client'` column with RLS policies:

```sql
-- Only Client crew can access Client data
SELECT * FROM sa_trial_data
WHERE org_id = 'client'
  AND user_org_id = auth.jwt()->>'org_id';
```

### Crew Personal Memories

Each crew member stores learnings and insights:

```typescript
// Worf stores security insights from this project
await storeCrewPersonalMemory({
  crew_id: 'worf',
  memory_type: 'lesson_learned',
  title: 'Client RLS Implementation',
  content: '...',
  project_id: 'client-pctms',
  tags: ['rls', 'security', 'multi-tenant'],
});
```

Future projects benefit from Client's learnings!

## Compliance

### PHI Protection

- ✅ Encryption at rest (Supabase managed)
- ✅ Encryption in transit (TLS)
- ✅ Row-level security enforcement
- ✅ Complete audit logging
- ✅ Access control via crew authentication

### Audit Trail

Every operation logged:
- Who accessed what data
- When they accessed it
- What changes were made
- Outcome of the operation

Enable audit logging:
```bash
AUDIT_LOGGING=true
```

## Performance Baselines

### Query Latency

- **p50**: < 20ms
- **p95**: < 50ms
- **p99**: < 100ms

Monitor with:
```bash
npm run db:health-check
```

### Database Health

- Index hit ratio: > 95%
- Cache hit ratio: > 90%
- Connection pooling: Active
- Replication lag: < 100ms

## Key Contacts

- **Project Lead**: [Captain Picard]
- **Technical Lead**: [Data]
- **Security Lead**: [Worf]
- **Operations**: [O'Brien]

## Related Documentation

- [MONOREPO_MULTI_CLIENT_ARCHITECTURE.md](../../docs/MONOREPO_MULTI_CLIENT_ARCHITECTURE.md)
- [DOMAIN_DRIVEN_CREW_GUIDE.md](../../docs/domain-driven/DOMAIN_DRIVEN_CREW_GUIDE.md)
- [AUTONOMOUS_CREW_MISSION_TEST.md](../../docs/AUTONOMOUS_CREW_MISSION_TEST.md)

## Support

For issues or questions:
1. Check crew personal memories: `npm run crew:search`
2. Review shared documentation: `npm run docs:ingest`
3. Check system health: `npm run db:health-check`
4. Escalate to crew: `npm run project:crew`

---

**Last Updated**: 2026-06-07  
**Status**: Active  
**Crew**: All 11 team members engaged  
