# Local Development Setup — Story Agent (Dynamic Team Assembly Ready)

This guide walks you through starting the full development stack locally with the newly implemented dynamic team assembly system.

## Architecture Overview

The dev environment consists of 4 services running concurrently:

```
VSCode Extension (CLI: story-agent)
         ↓
    MCP Bridge ← OpenRouter API
         ↓
MCP Server :3103 (agent-core, crew-mission-pipeline)
         ↓
UI Dashboard :3000 ← Supabase + OpenRouter
```

## Prerequisites

1. **Environment credentials** (in `~/.zshrc` or `~/.alexai-secrets`):
   ```bash
   export OPENROUTER_API_KEY="sk-or-..."
   export SUPABASE_URL="https://xxx.supabase.co"
   export SUPABASE_ANON_KEY="eyJhbG..."
   export AHA_API_KEY="..."
   ```

2. **Installed tools**:
   - Node.js 18+
   - pnpm (not npm)
   - VSCode with Extensions: ESLint, Prettier, TypeScript Vue Plugin

## Step 1: Install Dependencies

```bash
cd /Users/bradygeorgen/Developer/story-agent
pnpm install
```

## Step 2: Start the Development Stack

### Option A: Full Stack (Recommended for UI + MCP development)

```bash
pnpm dev
```

This starts **in parallel**:
- **MCP Server** (:3103) — agent-core, crew-mission-pipeline, dynamic team assembly
- **Next.js UI** (:3000) — Dashboard, chat, observations

**Output**:
```
MCP   │ listening on 0.0.0.0:3103
UI    │ ready - started server on 0.0.0.0:3000
```

### Option B: MCP Only (for backend/crew deliberation development)

```bash
pnpm mcp
```

Just the MCP server (:3103) — use this for pure backend testing of:
- Mission analyzer
- Crew skill registry  
- Team assembly engine
- Crew preflight logic

### Option C: UI Only (for Dashboard/React development)

```bash
pnpm ui
```

Just the Next.js dashboard (:3000) with mocked MCP responses.

## Step 3: Verify Services Are Running

### Check MCP Server
```bash
curl -X POST http://localhost:3103/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","history":[],"clientId":"test"}'
```

Should return a chat response with crew self-organization metadata.

### Check UI Dashboard
Open browser to http://localhost:3000

- **Dashboard** (/dashboard) — projects, sprints, stories
- **Agent Workspace** (/agent) — live chat with crew
- **Observations** (/crew/observations) — past deliberations
- **Cost Observatory** (/cost) — crew spending

## Step 4: Connect VSCode Extension (Optional)

The VSCode extension connects to the local MCP server for in-IDE chat.

### Setup

```bash
# Build extension for local testing
pnpm --filter story-agent-vscode build

# Package as .vsix
pnpm ext:package

# Install locally (force reinstall if already present)
pnpm ext:install-local
```

### Activate in VSCode

1. Open VSCode Command Palette (`Cmd+Shift+P`)
2. Run: `> MCP: Enable MCP Server`
3. Select Story Agent MCP
4. Open Chat Sidebar (`Cmd+Shift+L`)
5. Start a conversation — responses come from crew (:3103)

## Step 5: Test Dynamic Team Assembly (New!)

### Via Dashboard Chat

1. Open http://localhost:3000/agent
2. Send a complex prompt:
   ```
   Deploy new authentication service to AWS with terraform,
   migrate the database schema, write integration tests,
   and document for the team.
   ```

3. Watch the crew preflight section show **N teams** (not hardcoded 3):
   - Team composition varies based on mission complexity
   - Each team has assigned subtasks
   - Confidence scores show skill match

### Via MCP Chat Command Line

```bash
curl -X POST http://localhost:3103/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Deploy new auth service with migration and tests",
    "history":[],
    "clientId":"local-dev"
  }' | jq '.crewSelfOrganization.teams'
```

Response shows dynamic team grouping:
```json
[
  {
    "teamId": "team-security-1",
    "label": "Security Team",
    "members": ["worf", "picard"],
    "subtasks": ["security-1"],
    "memoryHits": 0
  },
  {
    "teamId": "team-infrastructure-2",
    "label": "Infrastructure Team",
    "members": ["geordi", "obrien"],
    "subtasks": ["deploy-1", "deploy-2"],
    "memoryHits": 0
  }
]
```

## Development Workflow

### Making Changes to Dynamic Team Assembly

**If you modify:**
- `mission-analyzer.ts` — Mission parsing logic
- `crew-skill-registry.ts` — Crew skills or cost models
- `team-assembly-engine.ts` — Team allocation algorithm

**Then:**
1. MCP server auto-reloads (watch mode)
2. Test via `pnpm mcp` or `pnpm dev`
3. Verify via chat: send a complex prompt, check team output

### Making Changes to UI

**If you modify:**
- Any `.tsx` files in `packages/ui/src`
- Dashboard components
- Chat display

**Then:**
1. Next.js auto-reloads (fast refresh)
2. Browser page refreshes automatically
3. Check console for TypeScript errors

### Making Changes to VSCode Extension

**If you modify:**
- `packages/vscode-extension/src/chatEngine.ts`
- Chat display or MCP communication

**Then:**
1. Rebuild: `pnpm --filter story-agent-vscode build`
2. Reinstall: `pnpm ext:install-local`
3. Reload VSCode (`Cmd+Shift+P` → "Developer: Reload Window")

## Debugging

### Debug MCP Server

```bash
# Start with Node debugger
node --inspect-brk ./node_modules/.bin/tsx src/agent-core/http-server.ts
```

Then open `chrome://inspect` in Chrome to attach debugger.

### Debug UI (Next.js)

```bash
pnpm ui
# VSCode debugger will auto-attach if you set breakpoints
# Or visit chrome://inspect for DevTools
```

### View Live MCP Logs

```bash
# Terminal 1: Start MCP with verbose logging
DEBUG=* pnpm mcp

# Terminal 2: Send test message
curl -X POST http://localhost:3103/chat -d '...'
```

## Troubleshooting

### "Cannot find module" errors

```bash
# Clean and rebuild
pnpm install
FORCE_BUILD=1 pnpm build
```

### "Port already in use" (3103 or 3000)

```bash
# Find what's using the port
lsof -i :3103
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different ports
STORY_AGENT_AGENT_PORT=3104 pnpm mcp
PORT=3001 pnpm ui
```

### VSCode Extension not connecting to MCP

1. Check MCP server is running: `curl http://localhost:3103/health`
2. Reinstall extension: `pnpm ext:install-local`
3. Reload VSCode: `Cmd+Shift+P` → "Developer: Reload Window"
4. Check console: `Cmd+Shift+U` → Output tab → "Story Agent"

### Chat not showing crew preflight or teams

1. Verify MCP endpoint has complexity scoring: `grep calculateComplexityScore packages/mcp-server/src/agent-core/chat.ts`
2. Check crew-mission-pipeline is using dynamic team assembly: `grep buildDynamicParallelTeams packages/mcp-server/src/agent-core/chat.ts`
3. Rebuild: `pnpm --filter @story-agent/mcp-server build`

## Common Tasks

### Test a specific new feature

```bash
# Run unit tests for new modules
pnpm --filter @story-agent/mcp-server run test:unit

# Run integration tests
pnpm --filter @story-agent/mcp-server run test:integration
```

### View TypeScript errors

```bash
pnpm typecheck
```

### Format code

```bash
pnpm exec prettier --write packages/mcp-server/src/lib/mission-analyzer.ts
```

### Check build before pushing

```bash
FORCE_BUILD=1 pnpm build
```

## Next Steps: Section 31 Week 2 Deployment

Once local testing is complete:

1. **Verify dynamic teams work** via dashboard chat (N teams, not hardcoded 3)
2. **Run stress test** with 100+ concurrent chat requests
3. **Monitor crew spending** on `/cost` page (should be optimized)
4. **Deploy to staging**: Follow `DEPLOYMENT.md` in root
5. **Deploy to production**: Section 31 Week 2 canary (6,000 users)

---

**Last Updated**: 2026-07-12 | Dynamic Team Assembly v1.0
