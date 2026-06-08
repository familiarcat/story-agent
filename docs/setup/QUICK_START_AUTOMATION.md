# Quick Start: Automated Supabase Integration

## 🚀 2-Minute Setup for New Projects

```bash
# 1. Load environment variables
source ~/.zshrc

# 2. Run one command (everything else is automatic)
npm run db:auto-migrate

# ✅ Done! Your Supabase is fully configured
```

**What happened**:
- ✅ RPC function created (if needed)
- ✅ All 6 migrations executed
- ✅ Database schema updated
- ✅ All tables ready
- ✅ Crew system ready

---

## 👥 3-Minute Setup for New Clients

```bash
# 1. Load environment variables
source ~/.zshrc

# 2. Run interactive onboarding
npm run client:onboard

# 3. Answer prompts:
# - Client ID (e.g., acme-corp)
# - Client Name (e.g., ACME Corporation)
# - Mode (standard/regulated/air_gapped/customer_managed)

# ✅ Done! Client is isolated and secure
```

**What happened**:
- ✅ Client record created
- ✅ Client-specific tables created
- ✅ Row-Level Security (RLS) configured
- ✅ Migrations executed
- ✅ Client isolation verified

---

## 🤖 Automatic CI/CD (GitHub)

Your migrations **run automatically** on every push:

```bash
git commit -m "Add new migration"
git push origin main

# Automatically:
# ✅ GitHub Actions detects changes
# ✅ Runs npm run db:auto-migrate
# ✅ Seeds crew baseline memories
# ✅ Posts Slack notification
# 🎉 No manual steps!
```

---

## 🔍 Health Check (Monitoring)

Check database health anytime:

```bash
npm run db:health-check

# Output:
# ✅ Supabase REST API: Online
# ✅ Database accessible: ✓
# ✅ Table: sa_projects: Found
# ✅ RPC: execute_migration: Available
# ✅ Crew setup: All 11 crew members loaded
# ✅ Crew baseline memories: All 11 loaded
# ✅ All systems healthy!
```

---

## 📚 Full Documentation

| Guide | Time | Use When |
|-------|------|----------|
| **This file** | 2 min | Quick setup |
| [MIGRATION_AUTOMATION.md](MIGRATION_AUTOMATION.md) | 10 min | Need details |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | 15 min | Troubleshooting |
| [CREW_MEMORIES_GUIDE.md](CREW_MEMORIES_GUIDE.md) | 10 min | Crew system |

---

## 🛠️ All Available Commands

```bash
# Database
npm run db:migrate              # Old version (still works)
npm run db:migrate:test         # Test connectivity
npm run db:auto-migrate         # Auto-detect and run migrations
npm run db:auto-migrate:dry     # Preview without changes
npm run db:health-check         # Monitor database health

# Clients
npm run client:onboard          # Interactive client setup

# Crew
npm run crew:seed               # Seed crew members
npm run crew:seed-memories      # Seed crew baseline knowledge
npm run crew:check              # Verify crew integrity
```

---

## ⚡ Pro Tips

### Dry-Run Before Deploying
```bash
npm run db:auto-migrate:dry
# See what would run without making changes
```

### Non-Interactive Client Setup
```bash
npm run client:onboard \
  --client=acme-corp \
  --name="ACME Corporation" \
  --mode=regulated
```

### Schedule Health Checks
```bash
# Add to crontab to run every hour
0 * * * * cd /path/to/story-agent && npm run db:health-check
```

---

## ❓ Common Questions

**Q: Is it safe to run multiple times?**
A: Yes! The system is idempotent - safe to run as many times as needed.

**Q: Does it work with corporate proxies?**
A: Yes! Uses HTTPS REST API only (no TCP/5432).

**Q: What if migrations fail?**
A: Check output for specific error, fix the issue, run again - it auto-recovers.

**Q: Can I preview changes before running?**
A: Yes! Use `npm run db:auto-migrate:dry`

**Q: How do I set up CI/CD?**
A: See [MIGRATION_AUTOMATION.md](MIGRATION_AUTOMATION.md) → Workflow 3 section

**Q: Where do credentials come from?**
A: From `~/.zshrc` (loaded via `source ~/.zshrc`)

---

## 🎯 Checklist

- [ ] Credentials loaded: `source ~/.zshrc`
- [ ] Connectivity verified: `npm run db:migrate:test`
- [ ] Migrations run: `npm run db:auto-migrate`
- [ ] Health check passed: `npm run db:health-check`
- [ ] Ready for crew setup: `npm run crew:seed`

---

## 📞 Troubleshooting

### "Invalid API key"
```bash
source ~/.zshrc
echo $SUPABASE_KEY  # Should print your key
```

### "RPC not found"
```bash
npm run db:auto-migrate  # Will auto-bootstrap
```

### "Connection timeout"
```bash
npm run db:migrate:test  # Test connectivity first
```

### "Table already exists"
This is fine! Just means it's idempotent.

For more help, see: [MIGRATION_AUTOMATION.md → Troubleshooting](MIGRATION_AUTOMATION.md#troubleshooting)

---

## 🚀 What's Next?

1. **Seed the crew** (if first time):
   ```bash
   npm run crew:seed
   npm run crew:seed-memories
   ```

2. **Verify everything**:
   ```bash
   npm run db:health-check
   npm run crew:check
   ```

3. **Start building** with crew assistance! 🎉

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| New project setup | ~2 minutes |
| New client onboarding | ~3 minutes |
| Health check | ~10 seconds |
| CI/CD migration | ~1-2 minutes |
| Dry-run preview | ~10 seconds |

---

## 🎓 Learn More

- [Full Automation Guide](MIGRATION_AUTOMATION.md)
- [Setup Details](SUPABASE_SETUP.md)
- [Crew Baseline Memories](CREW_MEMORIES_GUIDE.md)

---

**Questions? See the full documentation above or run:**
```bash
npm run db:health-check
```
