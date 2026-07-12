# Deployment & Launch Instructions

## Status
✅ **Commit**: 16f0ecd  
✅ **Build**: Complete (all packages built)  
✅ **Services**: Ready to deploy

---

## Quick Deploy

### Option 1: Local Development (Recommended for Testing)

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Start unified pipeline (all services with hot-reload)
./dev-pipeline.sh
```

**Result**:
- MCP Server: http://localhost:3103 ✓
- Dashboard: http://localhost:3000 ✓
- VSCode Extension: Ready for F5 debug ✓

### Option 2: Production Build

```bash
# Build all packages
pnpm run build

# Start services in production mode
pnpm start
```

### Option 3: Individual Services

**Dashboard Only**:
```bash
./dev-pipeline.sh --ui-only
# http://localhost:3000
```

**VSCode Extension Only**:
```bash
./dev-pipeline.sh --ext-only
# Open VS Code, F5 to debug
```

**MCP Server Only**:
```bash
pnpm --filter @story-agent/mcp-server start
# http://localhost:3103
```

---

## Pre-Flight Checklist

Before deployment, verify:

```bash
# 1. Node.js version
node --version
# Expected: v18+ or v20+

# 2. pnpm installed
pnpm --version
# Expected: v8+

# 3. Dependencies installed
ls node_modules | head -5
# Should show packages

# 4. Environment variables set
echo "REDIS_URL: $REDIS_URL"
echo "OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:0:10}..."
echo "SUPABASE_URL: $SUPABASE_URL"

# 5. Redis available (optional)
redis-cli PING
# Expected: PONG (or skip if not needed)

# 6. Ports available
lsof -i :3000 || echo "3000 free"
lsof -i :3103 || echo "3103 free"
```

---

## Full Deployment Flow

### Step 1: Initial Setup (First Time Only)

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Install dependencies
pnpm install

# Verify build succeeds
pnpm run build

# Run tests
pnpm run check
```

### Step 2: Start Development Pipeline

```bash
# Start with hot-reload enabled
./dev-pipeline.sh

# Output should show:
# ✓ Node.js found
# ✓ pnpm found
# ✓ Redis running (optional)
# Building @story-agent/shared...
# Building @story-agent/mcp-server...
# Building @story-agent/ui...
# Building story-agent-vscode...
# 
# Starting Services
# MCP Server:        http://localhost:3103
# Dashboard:         http://localhost:3000
# VSCode Extension:  Ready for F5 debug
```

### Step 3: Access Services

**Dashboard**:
```bash
open http://localhost:3000
# or
curl http://localhost:3000
```

**MCP Server Health**:
```bash
curl http://localhost:3103/health
# Expected: { "status": "ok", "services": [...] }
```

**Crew Lounge API**:
```bash
curl http://localhost:3103/crew/status
# Expected: Crew roster and status
```

### Step 4: Verify Hot-Reload

**Test Dashboard Hot-Reload**:
```bash
# 1. Open http://localhost:3000 in browser
# 2. Edit: packages/ui/src/app/page.tsx
# 3. Save file
# 4. Browser auto-reloads (within 2-5 seconds)
# Expected: Changes visible instantly ✓
```

**Test Shared Code Changes**:
```bash
# 1. Edit: packages/shared/src/db.ts (add console.log)
# 2. Save file
# 3. Watch for rebuild in terminal
# 4. MCP imports new code
# 5. Dashboard reflects changes
# Expected: All services update ✓
```

---

## Operational Commands

### Monitoring

```bash
# Check service health in real-time
watch -n 5 'curl -s http://localhost:3103/health | jq'

# Monitor Node processes
ps aux | grep node

# Check port usage
lsof -i :3000
lsof -i :3103

# Tail logs (if using Docker)
docker-compose logs -f
```

### Maintenance

```bash
# Clean build cache
pnpm run clean

# Rebuild after cache clean
pnpm run build

# Run full test suite
pnpm run test

# Type check
pnpm run typecheck

# Lint
pnpm run lint
```

### Troubleshooting

**Issue**: Services won't start
```bash
# Check ports
lsof -i :3000
lsof -i :3103

# Kill existing processes
pkill -f "node|pnpm"

# Retry
./dev-pipeline.sh
```

**Issue**: Hot-reload not working
```bash
# Clear Next.js cache
rm -rf packages/ui/.next

# Restart pipeline
./dev-pipeline.sh
```

**Issue**: Shared package not updating
```bash
# Force rebuild
cd packages/shared && pnpm run build

# Restart services
Ctrl+C
./dev-pipeline.sh
```

---

## Architecture: End-to-End Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│ Story Agent — Unified Monorepo Deployment Pipeline               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ INPUT: Code Changes in Any Package                                │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ LAYER 1: Shared Code                                              │
│  packages/shared/src/  ─ pnpm watch ─→ rebuild                   │
│  ├─ db.ts (database)                                             │
│  ├─ client-registry.ts (clients)                                 │
│  └─ worfgate-credentials.ts (secrets)                            │
│                                                                    │
│ PROPAGATION: Shared package imports                               │
│  ├─→ MCP Server imports @story-agent/shared                      │
│  ├─→ UI imports @story-agent/shared                              │
│  └─→ VSCode Extension imports @story-agent/shared                │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ LAYER 2: MCP Server                                               │
│  packages/mcp-server/src/ ─ pnpm watch ─→ rebuild                │
│  ├─ MCP tools (crew/, aha/, worfgate/)                           │
│  ├─ Agent core (tool-calling loop)                               │
│  └─ APIs (REST endpoints)                                        │
│                                                                    │
│ PORTS TO:                                                         │
│  ├─→ Dashboard API calls → http://localhost:3103                 │
│  ├─→ Crew commands execution                                     │
│  └─→ Approval gate decisions                                     │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ LAYER 3: Dashboard UI                                             │
│  packages/ui/src/ ─ Next.js HMR ─→ hot-reload                    │
│  ├─ Pages: /agent, /crew/observations, /cost, etc.               │
│  ├─ Components: modular + LCARS styled                           │
│  └─ API client: fetch from MCP server                            │
│                                                                    │
│ OUTPUTS:                                                          │
│  ├─ http://localhost:3000 (user-facing)                          │
│  ├─ Auto-reload on file save (HMR)                               │
│  └─ Full browser refresh on code changes                         │
│                                                                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ LAYER 4: VSCode Extension                                         │
│  packages/vscode-extension/src/ ─ TypeScript watch ─→ rebuild    │
│  ├─ Chat interface integration                                   │
│  ├─ Commands + keybindings                                       │
│  └─ Webview components                                           │
│                                                                    │
│ OUTPUTS:                                                          │
│  ├─ Extension in VS Code (F5 to debug)                           │
│  ├─ Chat commands in VS Code                                     │
│  └─ Crew integration in editor                                   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

Time from code save → visible:
  • Shared code: 0-3s (rebuild) + 1-2s (hot-reload)
  • UI component: 1-3s (HMR)
  • VSCode extension: ~5s (rebuild + F5 restart)
```

---

## Deployment Profiles

### Development Profile (Recommended for Testing)
```bash
./dev-pipeline.sh
```
- Full hot-reload enabled
- All services in watch mode
- Best for rapid iteration

### Staging Profile
```bash
FORCE_BUILD=1 pnpm build
pnpm start
```
- Static build (no watch)
- Production-like behavior
- Good for final testing before release

### Production Profile
```bash
pnpm run build
pnpm start --production
```
- Optimized build
- No source maps
- Full performance

---

## Monitoring & Health

### Health Check Endpoint
```bash
curl http://localhost:3103/health
```

Response:
```json
{
  "status": "ok",
  "services": {
    "mcp": "running",
    "redis": "connected",
    "supabase": "reachable"
  },
  "uptime": 3600
}
```

### Metrics & Observability
```bash
# Cost tracking
curl http://localhost:3103/cost

# Crew status
curl http://localhost:3103/crew/status

# Agent execution metrics
curl http://localhost:3103/agent/metrics
```

---

## Next Steps

1. **Now**: Run `./dev-pipeline.sh` and verify services start
2. **Dashboard**: Visit http://localhost:3000
3. **Make a change**: Edit any file and watch it auto-update
4. **VSCode**: Press F5 to debug extension
5. **Run tests**: `pnpm run test` to validate

---

**Status**: ✅ Ready for deployment  
**Last Updated**: 2026-07-12  
**Pipeline**: Commit 16f0ecd
