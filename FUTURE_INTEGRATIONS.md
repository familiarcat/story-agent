# Future Integrations — Theoretical & Planned

**Status:** Archival reference for future implementation  
**Last Updated:** August 27, 2026  
**Decision:** Removed from active pipeline (AWS-first architecture)

---

## Overview

This document preserves the design and specifications for integrations that are **not currently active** but represent planned or theoretical capabilities. These integrations are kept in RAG (memory) and code documentation for future implementation when needed.

**Why archival?**
- Current architecture is AWS-focused (Cloud Run / Fargate / ECS)
- These integrations represent future optionality, not current requirements
- Keeping them documented avoids reinvention + preserves design decisions

---

## Active Deployments (Current)

| Platform | Status | Purpose | Endpoint |
|----------|--------|---------|----------|
| **AWS Cloud Run** | ✅ ACTIVE | MCP server (crew operations) | Cloud Run (Fargate) |
| **AWS ECS** | ✅ ACTIVE | Web UI backend | ECS cluster |
| **VSCode Marketplace** | ✅ ACTIVE | Extension distribution | Marketplace |
| **GitHub** | ✅ ACTIVE | Source + CI/CD | GitHub Actions |
| **Supabase** | ✅ ACTIVE | Database | PostgreSQL |

---

## Theoretical / Future Integrations

### 1. Vercel Web Deployment

**Status:** 🔧 Theoretical (AWS selected instead)  
**Decision Date:** August 27, 2026  
**Reason for Deferral:** AWS-first architecture; Vercel is nice-to-have for web UI distribution  

**Specification (Preserved for Future):**

```
Platform:       Vercel Edge Network
Deployment:     Next.js 15 (`packages/ui`)
Scale:          Global CDN + edge functions
Purpose:        Web dashboard distribution (optional UI)
Build Command:  pnpm --filter @story-agent/ui run build
Env Vars:       SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY
CI/CD:          GitHub Actions → Vercel deployment
Status Page:    Vercel Analytics dashboard
Cost Model:     ~$20-50/month for typical usage
Fallback:       Cloud Run hosts same Next.js app (no Vercel required)

When to Activate:
├─ Web UI traffic >1000 req/day (currently <100)
├─ Need global CDN caching (currently US-only)
├─ Prefer managed edge functions (currently serverless via Cloud Run)
└─ Budget allows third-party SaaS platform
```

**Implementation Path (When Ready):**
1. Connect GitHub repo to Vercel dashboard
2. Set environment variables in Vercel project settings
3. Deploy via `vercel deploy` or GitHub push trigger
4. Configure custom domain: `https://crew.familiarcat.com` (optional)

**Type Error (Blocked as of Aug 27):**
```
Issue:  Next.js type verification fails: "Cannot find module '../../app/agent/page.js'"
Status: 1-2 hour fix expected
Impact: Non-blocking (Cloud Run hosts UI directly)
Fix:    Incremental TypeScript rebuild + module resolution audit
```

---

### 2. Aha Integration (Extended)

**Status:** 🔧 Theoretical (Basic integration active, full vision pending)  
**Decision Date:** August 27, 2026  
**Current Scope:** Read-only story ingestion  
**Future Scope:** Full PM planning loop  

**Current Implementation (Active):**
```
├─ Read: Aha products, epics, features, releases
├─ Ingest: Story definitions → Supabase (sa_stories table)
├─ Status Update: Push crew completion back to Aha
├─ Link: GitHub PRs ↔ Aha stories (traceability)
└─ Tools: aha_get_record, aha_list_features, etc.
```

**Extended Vision (Theoretical):**
```
Future Capabilities (Phase 7-8):
├─ Write: Create features/releases directly from crew decisions
├─ Workflow: Auto-update Aha workflow status (In Progress → Complete)
├─ Portfolio: Aha integrated roadmap (crew priorities + human review)
├─ Forecasting: Use crew velocity to predict Aha release dates
├─ Sync: Real-time 2-way sync (not just pull)
└─ Custom Fields: Map crew autonomy level to Aha custom field

When to Implement:
├─ Current: Story ingestion + PR linking ✅
├─ Phase 7 (Sep): Write features + workflow automation
├─ Phase 8 (Oct): Portfolio integration + forecasting
└─ Phase 9+ (Nov+): Custom fields + real-time sync
```

**Technical Debt (Preserved):**
- Aha API rate limits (currently 100 req/hour, planning for 1000+)
- Webhook support (currently polling, future: real-time)
- Custom field mapping (currently manual, future: automatic)

---

### 3. Jira Integration

**Status:** 🔧 Theoretical (Not yet implemented)  
**Decision Date:** August 27, 2026  
**Use Case:** Alternative PM system support (for clients using Jira)  

**Specification (Preserved for Future):**

```
Platform:       Atlassian Jira Cloud
Scope:          Story/Issue ingestion + PR linking (like Aha)
Purpose:        Support multi-PM ecosystem (clients choose Aha or Jira)
Features:
├─ Read: Jira projects, issues, sprints
├─ Ingest: Issue definitions → Supabase
├─ Link: GitHub PRs ↔ Jira issues
├─ Status: Update Jira status when crew completes
└─ Estimate: Populate Jira story points from crew gravity model

API:            Jira Cloud REST API
Auth:           OAuth 2.0 or API token (Atlassian Cloud)
Rate Limits:    ~100 req/minute
Cost:           Free (Atlassian Cloud tier)

When to Implement:
├─ Phase 8 (Oct): Parity with Aha integration
├─ Phase 9 (Nov): Full multi-system support
└─ Decision: Only if customer demand (currently Aha-focused)
```

**Design Parallelism with Aha:**
- Same ingest/link patterns (code reuse opportunity)
- Adapter pattern: `AhaAdapter` + `JiraAdapter` implement common interface
- Crew doesn't care which PM system; crew sees unified story interface

---

### 4. Linear (Future Consideration)

**Status:** 🔧 Theoretical (Not yet implemented)  
**Decision Date:** August 27, 2026  
**Rationale:** Lightweight alternative for technical teams  

```
Platform:       Linear.app (Issue tracking for eng teams)
Status:         Lower priority than Aha/Jira (Linear adoption <20%)
Use Case:       Teams wanting minimal PM overhead + fast workflow
Parity:         Would follow same adapter pattern as Aha/Jira
When Needed:    Phase 9+ (only if customer demand)
```

---

### 5. DataDog Observability (Future)

**Status:** 🔧 Theoretical (Currently using stderr logs)  
**Decision Date:** August 27, 2026  
**Current:** Simple logging to stderr  

```
Future Capability:
├─ APM: Application Performance Monitoring (crew execution time)
├─ Logs: Centralized crew decision logs
├─ Metrics: Autonomy level progression, cost trending
├─ Alerts: Auto-escalation when cost exceeds budget
└─ Dashboards: Real-time crew status (alternative to web UI)

When to Implement:
├─ Production scale: >100 missions/day (currently ~40-50)
├─ Need: Distributed tracing across microservices
└─ Budget: ~$100-200/month (currently free with stderr)

Current: Worf-safe audit trail to JSON → sufficient for Phase 6
Future: Full observability stack as scale grows
```

---

## Architecture Decision: AWS-First

**Decision:** Web deployment via **AWS Cloud Run** instead of Vercel  
**Date:** August 27, 2026  
**Rationale:**

| Criterion | AWS (Selected) | Vercel (Deferred) |
|-----------|---|---|
| **Infrastructure** | Unified (Fargate + Cloud Run) | Fragmented (AWS + Vercel) |
| **Cost** | $0 (Cloud Run free tier) | $20-50/month |
| **Latency** | Same region (us-west-2) | Global CDN (overkill) |
| **Complexity** | 1 platform | 2 platforms |
| **Crew Dependency** | N/A (MCP via Cloud Run) | Nice-to-have |
| **Data Residency** | Single cloud (compliant) | Multi-cloud (audit complexity) |

**Recommendation:**
- **Now (Phase 6):** Deploy web UI via Cloud Run (same Fargate stack)
- **Later (Phase 7+):** Reconsider Vercel if traffic justifies CDN
- **Never:** Deploy MCP to Vercel (requires persistent server; Vercel is serverless)

---

## Migration Path (If Activating Future Integration)

### Step 1: Code Review
- Read this file's specification for the integration
- Check `CLAUDE.md` for any caveats or dependencies
- Review implementation patterns in active integrations

### Step 2: Adapter Implementation
```typescript
// Example: Adding Jira adapter
// File: packages/mcp-server/src/integrations/adapters/jira-adapter.ts

export class JiraAdapter implements PMAdapter {
  async getStory(id: string): Promise<Story> { ... }
  async listStories(project: string): Promise<Story[]> { ... }
  async updateStatus(id: string, status: string): Promise<void> { ... }
  // ... see Aha adapter for pattern
}
```

### Step 3: Configuration
```typescript
// File: packages/shared/src/config/integrations.ts
const INTEGRATIONS = {
  aha: { enabled: true, tier: 'active' },
  jira: { enabled: false, tier: 'future' },  // ← Flip to true
  vercel: { enabled: false, tier: 'future' },
  linear: { enabled: false, tier: 'future' },
};
```

### Step 4: Testing
- Unit tests for adapter (mock API calls)
- Integration tests with live API (if available)
- E2E: Create story in PM system → Crew executes → Verify linkage

### Step 5: Documentation
- Update this file's status from 🔧 to ✅
- Add to CLAUDE.md integration list
- Document in deployment runbook

---

## Preservation Strategy (RAG)

**These specifications are preserved in:**
1. **This File:** FUTURE_INTEGRATIONS.md (version control)
2. **RAG Memory:** Tagged with `tier: 'future'`, `integration: 'vercel'|'jira'|etc.`
3. **Code:** Adapter patterns documented in active integrations (study Aha adapter for template)
4. **Copilot Instructions:** .instructions.md references this file for multi-PM strategy

**Access Pattern:**
```
When planning Phase 7-8:
1. Search RAG: "Future integrations Jira"
2. Read: This file's Jira section
3. Review: Aha adapter code (template)
4. Implement: New JiraAdapter following same pattern
```

---

## AWS-Only Deployment (Current)

**Web UI Flow (Cloud Run-based):**
```
Code Commit (main branch)
    ↓
GitHub Actions CI/CD
    ├─ Build: pnpm build
    ├─ Test: pnpm run check
    └─ Package: Docker image
    ↓
AWS Cloud Run (same region as Fargate)
    ├─ Next.js 15 app (packages/ui)
    ├─ Connected to: Supabase, Redis, MCP
    └─ Endpoint: https://api.familiarcat.com/dashboard
    ↓
Terraform (Infrastructure-as-Code)
    ├─ Route53: DNS routing
    ├─ ALB: Load balancing
    ├─ CloudFront: Optional CDN (future)
    └─ IAM: Service accounts
```

**Advantages:**
- ✅ Single infrastructure provider (AWS)
- ✅ No third-party SaaS dependencies
- ✅ Cost predictable (commit reserve capacity)
- ✅ Crew operates via MCP (web UI is optional)
- ✅ Compliance: Single data residency

---

## Summary

| Integration | Status | Tier | When | Why |
|------------|--------|------|------|-----|
| **AWS (Cloud Run)** | ✅ ACTIVE | Production | Now | Primary platform |
| **VSCode Extension** | ✅ ACTIVE | Production | Now | User interface |
| **Aha** | ✅ ACTIVE | Production | Now | PM system (read/write) |
| **Vercel** | 🔧 THEORETICAL | Future | Phase 7+ | CDN (if traffic justifies) |
| **Jira** | 🔧 THEORETICAL | Future | Phase 8+ | Multi-PM support |
| **Linear** | 🔧 THEORETICAL | Future | Phase 9+ | Lightweight PM option |
| **DataDog** | 🔧 THEORETICAL | Future | Phase 7+ | Observability at scale |

🖖 **AWS-first architecture. Optionality preserved for future.**
