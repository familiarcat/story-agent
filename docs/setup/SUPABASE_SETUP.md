# Supabase Setup: Automated Migration & Crew Management

This guide explains how to:
1. **Bootstrap** the Supabase RPC function (one-time, manual)
2. **Run all migrations** autonomously via Node.js/REST API
3. **Manage the crew** database tables with MCP agents

---

## Prerequisites

All credentials should be in `~/.zshrc` (sourced automatically):

```bash
export SUPABASE_URL="https://rpkkkbufdwxmjaerbhbn.supabase.co"
export SUPABASE_KEY="sb_secret_wEqrH91tGFOdDTruW4QsnA_Jt9w25V2"
export SUPABASE_ACCESS_TOKEN="sbp_b3adfd8cab79d6fd9b0a5078d8692b9aca8b83c8"
```

Verify: `source ~/.zshrc && echo $SUPABASE_KEY | head -c 20`

---

## Step 1: Bootstrap (One-Time Manual Setup)

The RPC function enables autonomous SQL execution over HTTPS.

### Command

```bash
npm run db:migrate:test
```

This will show you the bootstrap SQL block if the RPC function doesn't exist yet.

### What to do

1. **Copy the entire SQL block** from the output
2. **Go to:** https://supabase.com/dashboard/project/rpkkkbufdwxmjaerbhbn/sql/new
3. **Paste** the SQL
4. **Click RUN**

**Expected result:** No errors, message says "RPC function created: execute_migration"

---

## Step 2: Run Migrations Autonomously

Once the RPC function exists, migrations run automatically:

```bash
npm run db:migrate
```

### What happens

- Script detects the RPC function exists ✅
- Reads all 7 migration files from `supabase/*.sql`
- Executes each via REST API (HTTPS, bypasses corporate TCP blockage)
- Reports success/failure for each migration

### Migrations (in order)

1. `migration.sql` — Core tables (projects, stories, PRs, cycles, memories)
2. `20260605_crew_state_table.sql` — Crew state table
3. `20260605_docs_knowledge_vectors.sql` — Docs/knowledge vector index
4. `20260605_crew_memory_vectors.sql` — Memory vector index
5. `20260606_crew_starship_tables.sql` — Crew personas, skills, tools, debriefs
6. `20260607_client_security_policies.sql` — Security policies, Bayer seed
7. `20260607_client_memory_isolation.sql` — Client isolation, familiarcat seed

---

## Step 3: Seed the Crew (Optional but recommended)

Populate all 11 crew member skill manifests from the demo crew system:

```bash
pnpm run build  # Build MCP server first
npm run crew:seed
```

**Expected:** All 11 crew members inserted into `sa_crew_personas` with v1.0.0 manifests

---

## Step 3b: Seed Crew Baseline Memories (Optional but recommended)

Load baseline knowledge/principles for all 11 crew members into `sa_observation_memories` so they can reference and build upon their own institutional knowledge during missions:

```bash
npm run crew:seed-memories
```

**What this does:**
- Inserts 11 baseline memory records (one per crew member)
- Each contains the crew member's core principles, framework, and lessons learned
- Memories are marked `client_id: null` (global, accessible to all clients)
- Crew agents can now query and extend these memories during missions

**Example:** During a mission, Worf can reference his security doctrine when evaluating new tools. Data can cite architectural principles when validating schema changes.

---

## Step 4: Verify Crew Integrity

Run crew health check to confirm all personalities are loaded:

```bash
npm run crew:check
```

**Expected output:** JSON report showing all 11 crew members with their roles, skills, and integrity status

---

## Architecture: How This Works

### Corporate Network Challenge

Direct TCP/5432 to Supabase is blocked by firewall.

### Solution: REST API + RPC

```
Node.js Script
    ↓
    curl (HTTPS) ← gets through firewall
    ↓
Supabase REST API (@rpkkkbufdwxmjaerbhbn.supabase.co/rest/v1)
    ↓
RPC Function (public.execute_migration) ← created by bootstrap SQL
    ↓
PostgreSQL execute() ← runs your SQL
    ↓
Returns { success, message, rows_affected }
```

### Security

- **RPC function** uses `SECURITY DEFINER` (executes with function owner permissions)
- **Service role key** (`SUPABASE_KEY`) authenticates via `apikey` header
- **Migrations** are read-only SQL files in `supabase/*.sql` (auditable)
- **Crew agents** can call the RPC to extend the schema autonomously

---

## Manual Testing (Debugging)

Test the HTTPS connection with curl:

```bash
source ~/.zshrc

# Test REST API health
curl -s https://rpkkkbufdwxmjaerbhbn.supabase.co/rest/v1/ \
  -H "apikey: $SUPABASE_KEY" | python3 -m json.tool | head -10

# List migrations to be run
npm run db:migrate:test
```

---

## Crew Autonomy: How MCP Agents Use This

Once the RPC function exists, crew agents (via the MCP server) can:

1. **Discover schema changes** via REST API introspection
2. **Execute migrations** by calling `public.execute_migration(sql)` RPC
3. **Audit changes** via the `sa_bootstrap_log` table
4. **Extend capabilities** by adding new crew personas, skills, tools

Example (crew agent calling the RPC):

```typescript
// Inside crew coordinator
const { data, error } = await supabase.rpc('execute_migration', {
  sql: `ALTER TABLE sa_crew_personas ADD COLUMN reliability FLOAT;`
});

if (error) console.error(error);
else console.log('✅ Schema extended:', data);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No RPC found" | Run `npm run db:migrate:test`, paste bootstrap SQL into dashboard |
| "401 Unauthorized" | Check `SUPABASE_KEY` is set: `echo $SUPABASE_KEY` |
| "migration failed" | Check dashboard SQL editor for error details |
| "Cannot connect to Supabase" | Check HTTPS connectivity: `curl -I https://supabase.com` |

---

## Files

- **Bootstrap/migration runner:** `scripts/run-migrations-auto.mjs`
- **Connection tester:** `scripts/test-migrations.mjs`
- **Migration files:** `supabase/*.sql` (7 files)
- **npm scripts:** `package.json` (db:migrate, crew:seed, crew:check)

---

## Next Steps

1. ✅ Credentials set in `~/.zshrc`
2. ⏳ Run `npm run db:migrate` (may need bootstrap first)
3. ⏳ Seed crew: `npm run crew:seed`
4. ⏳ Check integrity: `npm run crew:check`
5. ⏳ Push commits: `git push origin main`
