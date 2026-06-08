# Supabase Migration Automation Guide

## Overview

The Supabase migration system is fully automated for self-service integration:
- **New projects** can auto-configure their Supabase database in 2 minutes
- **New clients** can onboard with a single command
- **CI/CD pipelines** automatically run migrations on every deployment
- **Health checks** monitor database integrity continuously

## Quick Start

### For Developers (First Time Setup)

```bash
# 1. Load credentials
source ~/.zshrc

# 2. Test connectivity
npm run db:migrate:test

# 3. Auto-migrate (one command does everything)
npm run db:auto-migrate
```

**Result**: Your Supabase database is fully configured with all tables, RPC functions, and crew baseline memories loaded.

### For New Clients (Onboarding)

```bash
# 1. Interactive onboarding
npm run client:onboard

# 2. Answer prompts:
# - Client ID: acme-corp
# - Name: ACME Corporation  
# - Mode: standard

# 3. Done! Client is ready to use
```

**What gets created**:
- ✅ Client record in sa_clients
- ✅ Client-specific tables (projects, stories, etc.)
- ✅ Row-level security policies
- ✅ All migrations executed
- ✅ Crew baseline memories

### For CI/CD (Automated Deployments)

The GitHub Actions workflow automatically runs on every push to main/dev:

```yaml
# File: .github/workflows/supabase-auto-migrate.yml
- Detects changed migration files
- Verifies connectivity
- Runs auto-migrate
- Seeds crew baseline memories
- Notifies Slack on completion
```

**No manual steps required** — migrations happen automatically!

## Architecture

### Migration Pipeline

```
┌─────────────────┐
│ Changed Files   │
│ (supabase/*.sql)│
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ 1. Verify Connectivity          │
│    - HTTPS to REST API          │
│    - Test database access       │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ 2. Check RPC Function           │
│    - Does execute_migration()   │
│      exist?                     │
└────────┬────────────────────────┘
         │
    No ──┴── Yes
    │       │
    ↓       ↓
┌─────┐ ┌──────────────────┐
│Boot-│ │ Skip Bootstrap   │
│strap│ │ (Already exists) │
│ RPC │ └────────┬─────────┘
└──┬──┘          │
   │             │
   └──────┬──────┘
          │
          ↓
┌─────────────────────────────────┐
│ 3. Load Migrations              │
│    - Find all .sql files in     │
│      supabase/ directory        │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ 4. Execute Migrations           │
│    - POST each migration to     │
│      /rpc/execute_migration     │
│    - RPC executes via HTTPS     │
│    - Works with corporate       │
│      proxies (no TCP/5432)      │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ 5. Verify Integrity             │
│    - Check tables exist         │
│    - Verify crew loaded         │
│    - Check baseline memories    │
└──────────────────────────────────┘
```

## Scripts Reference

### Core Database Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run db:migrate:test` | Test connectivity & list migrations | Before first migration |
| `npm run db:auto-migrate` | Auto-detect & run all migrations | During setup or deployment |
| `npm run db:auto-migrate:dry` | Preview what would run (no changes) | To verify before running |
| `npm run db:health-check` | Verify database health & completeness | Monitor production |

### Client Management

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run client:onboard` | Interactive client setup | Onboard new client |
| `npm run client:onboard -- --client=acme --name="ACME Corp"` | Non-interactive (CI/CD) | Automated workflows |

### Crew Setup

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run crew:seed` | Seed all 11 crew members | After first migration |
| `npm run crew:seed-memories` | Load crew baseline memories | After migrations complete |
| `npm run crew:check` | Verify crew integrity | Monitor setup |

## Detailed Workflows

### Workflow 1: New Project (Developer)

**Goal**: Get a new project integrated with Supabase

**Steps**:
```bash
# Step 1: Clone repo and load credentials
git clone <repo>
cd story-agent
source ~/.zshrc

# Step 2: Verify connectivity
npm run db:migrate:test
# Output: Shows 7 migrations ready to run

# Step 3: Auto-migrate (one command!)
npm run db:auto-migrate
# Output: Shows each migration executing, all tables created

# Step 4: Seed crew
npm run crew:seed
# Output: All 11 crew members loaded

# Step 5: Seed crew baseline memories
npm run crew:seed-memories
# Output: Crew baseline knowledge loaded into Supabase

# Step 6: Verify everything works
npm run db:health-check
# Output: All systems green ✅
```

**Time**: ~2 minutes total
**Result**: Fully functional Supabase with crew ready for missions

### Workflow 2: New Client (Operations)

**Goal**: Onboard a new enterprise client

**Steps**:
```bash
# Step 1: Start interactive onboarding
npm run client:onboard

# Step 2: Answer prompts
# ❓ Client ID (slug, e.g., acme-corp)
# > acme-corp

# ❓ Client Name (e.g., ACME Corp)
# > ACME Corporation

# ❓ Mode [standard/regulated/air_gapped/customer_managed] (default: standard)
# > regulated

# Step 3: Automated process runs
# - Creates client record
# - Creates client tables
# - Configures RLS policies
# - Runs migrations
# - Seeds initial data
# - Verifies setup

# Step 4: Verify
npm run db:health-check
```

**Time**: ~1 minute interactive + ~2 minutes auto
**Result**: New client ready with isolated data and security policies

### Workflow 3: CI/CD Pipeline (DevOps)

**Goal**: Automated migrations on every deployment

**File**: `.github/workflows/supabase-auto-migrate.yml`

**Triggers**:
- Push to main/dev (if supabase/*.sql files changed)
- Manual workflow dispatch

**What happens**:
1. Checkout code
2. Setup Node.js 20
3. Validate credentials (from GitHub Secrets)
4. Detect changed migration files
5. Test connectivity
6. Run auto-migrate
7. Verify database integrity
8. Seed crew baseline memories (on main branch)
9. Notify Slack

**Configuration** (in GitHub Secrets):
```
SUPABASE_URL = https://sqachwmzyuuyyyxekdxp.supabase.co
SUPABASE_SERVICE_ROLE_KEY = sb_secret_wEqrH91tGFOdDTruW4QsnA_Jt9w25V2
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/xxx
```

**Result**: Migrations happen automatically, humans just merge PRs!

## Health Monitoring

### Regular Health Checks

```bash
# Run health check
npm run db:health-check

# Output example:
# ✅ Supabase REST API: Online
# ✅ Database accessible: ✓
# ✅ Table: sa_clients: Found
# ✅ Table: sa_projects: Found
# ... (more tables)
# ✅ RPC: execute_migration: Available
# ✅ Crew setup: All 11 crew members loaded
# ✅ Crew baseline memories: All 11 memories loaded
# ✅ Secret keys: Not visible in logs (🔒)
# 
# ✅ Passed: 12
# ✅ All systems healthy!
```

### Automated Monitoring

**Add to your monitoring**:
```bash
# Run health check every hour
0 * * * * cd /path/to/story-agent && npm run db:health-check >> /var/log/supabase-health.log 2>&1
```

**Alert on failures**:
```bash
# Send alert if health check fails
npm run db:health-check || curl -X POST $SLACK_WEBHOOK -d '{"text":"Supabase health check FAILED"}'
```

## Troubleshooting

### "Invalid API key"

**Cause**: Credentials not loaded or corporate proxy stripping headers

**Fix**:
```bash
source ~/.zshrc  # Reload credentials
echo $SUPABASE_KEY  # Verify it's set
npm run db:migrate:test  # Test connectivity
```

### "Table ... does not exist" or "RPC not found"

**Cause**: Migrations haven't run yet

**Fix**:
```bash
# Bootstrap the RPC function first
npm run db:auto-migrate
# This will auto-detect and bootstrap if needed
```

### "Migrations already exist" or idempotent errors

**Cause**: Migration was partially completed or duplicate run

**Fix**:
```bash
# Safe to re-run - system detects and skips
npm run db:auto-migrate
```

### "Connection timeout"

**Cause**: Corporate network firewall or Supabase down

**Fix**:
```bash
# Test basic connectivity
npm run db:migrate:test

# Check Supabase status
curl -I https://sqachwmzyuuyyyxekdxp.supabase.co

# If using corporate VPN, verify you're connected
```

### "Dry run shows migrations but auto-migrate doesn't run them"

**Cause**: This is normal - dry-run previews, actual run executes

**Fix**:
```bash
# Remove --dry-run flag
npm run db:auto-migrate  # (not db:auto-migrate:dry)
```

## Advanced Usage

### Dry-Run Mode (Test Before Deploying)

```bash
# Preview what would run without making changes
npm run db:auto-migrate:dry

# Output shows:
# [DRY RUN] Would execute 156 lines of SQL
# [DRY RUN] Would execute 234 lines of SQL
# ... etc
# No actual changes are made
```

### Skip Migrations (Just Bootstrap)

```bash
# Create RPC but don't run migrations
npm run db:auto-migrate -- --skip-migrations
```

### Manual Client Setup (Non-Interactive)

```bash
# For CI/CD systems that can't do interactive prompts
npm run client:onboard \
  --client=acme-corp \
  --name="ACME Corporation" \
  --mode=regulated \
  --skip-migrations
```

### Targeting Specific Environment

```bash
# Staging (default)
npm run db:auto-migrate

# Production
NODE_ENV=production npm run db:auto-migrate
```

## Integration Points

### With CI/CD (GitHub Actions)

✅ Automatic migration on every push to main/dev
✅ Automatic crew baseline memory seeding
✅ Slack notifications on success/failure
✅ No manual deployment steps needed

### With Monitoring

✅ Schedule `npm run db:health-check` hourly
✅ Alert on health check failures
✅ Track migration execution times
✅ Monitor crew setup completeness

### With Development Teams

✅ Developers just run `npm run db:auto-migrate` locally
✅ Onboarding takes 2 minutes, no manual SQL needed
✅ All credentials from ~/.zshrc (WorfGate secured)
✅ Idempotent - safe to run multiple times

## Best Practices

### ✅ Do's

- ✅ Run `db:migrate:test` before first migration
- ✅ Use `db:auto-migrate:dry` to preview changes
- ✅ Run `db:health-check` weekly in production
- ✅ Store credentials in env vars (never hardcoded)
- ✅ Use CI/CD for automatic migrations on deploy
- ✅ Keep migration files in supabase/ directory
- ✅ Name migrations with timestamps (auto-sorted)

### ❌ Don'ts

- ❌ Don't hardcode credentials in scripts
- ❌ Don't manually execute SQL (use auto-migrate)
- ❌ Don't skip database verification
- ❌ Don't commit .env.local files
- ❌ Don't run migrations from untrusted sources
- ❌ Don't use TCP/5432 (use HTTPS REST API)

## File Structure

```
story-agent/
├── supabase/
│   ├── migration.sql              # Bootstrap SQL (one-time)
│   ├── 20260101_create_tables.sql # Migration 1
│   ├── 20260102_add_rls.sql       # Migration 2
│   └── ...                         # More migrations
│
├── scripts/
│   ├── auto-migrate.mjs           # Unified migration manager
│   ├── client-onboard.mjs         # Client onboarding
│   ├── db-health-check.mjs        # Health monitoring
│   ├── run-migrations-auto.mjs    # Legacy (kept for ref)
│   ├── test-migrations.mjs        # Test connectivity
│   └── seed-crew-memories.mjs     # Seed crew knowledge
│
├── .github/workflows/
│   └── supabase-auto-migrate.yml  # CI/CD automation
│
└── SUPABASE_SETUP.md              # Detailed setup guide
```

## Summary

| Use Case | Command | Time | Result |
|----------|---------|------|--------|
| New developer | `npm run db:auto-migrate` | 2 min | Ready to code |
| New client | `npm run client:onboard` | 3 min | Isolated & secure |
| CI/CD deploy | (automatic) | 1-2 min | Migrations auto-run |
| Health check | `npm run db:health-check` | 10 sec | Know system status |
| Test before deploying | `npm run db:auto-migrate:dry` | 10 sec | Preview changes |

## See Also

- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — Full setup guide
- [CREW_MEMORIES_GUIDE.md](CREW_MEMORIES_GUIDE.md) — Crew baseline knowledge
- [.github/workflows/supabase-auto-migrate.yml](.github/workflows/supabase-auto-migrate.yml) — CI/CD workflow
