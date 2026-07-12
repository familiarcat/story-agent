# Unified Development & Hot-Reload Pipeline

## Overview

The **dev-pipeline.sh** orchestrates end-to-end development across the Story Agent monorepo, providing:

✅ **Single command** to start all services  
✅ **Hot-reload** for dashboard (Next.js HMR)  
✅ **Watch mode** for VSCode extension  
✅ **Automatic rebuilds** when shared code changes  
✅ **Health checks** for all services  

---

## Quick Start

### Full Stack (MCP + Dashboard + VSCode Extension)
```bash
./dev-pipeline.sh
```

Services start at:
- **MCP Server**: http://localhost:3103
- **Dashboard**: http://localhost:3000
- **VSCode Extension**: Ready for F5 debug in VS Code

### Dashboard Only
```bash
./dev-pipeline.sh --ui-only
```

### VSCode Extension Only
```bash
./dev-pipeline.sh --ext-only
```

### Build Once (No Watch)
```bash
./dev-pipeline.sh --build-only
```

### With MCP Hot-Reload (Experimental)
```bash
./dev-pipeline.sh --hot-mcp
```

---

## What Happens On Each Change

### Scenario 1: Change Shared Code (`packages/shared/src/*.ts`)
```
1. File changes detected by watcher
2. pnpm rebuilds @story-agent/shared
3. MCP server auto-imports new shared code
4. Dashboard hot-reloads (Next.js HMR)
5. Changes visible in browser instantly ✓
```

### Scenario 2: Change UI Component (`packages/ui/src/components/*.tsx`)
```
1. File changes detected by Next.js dev server
2. Next.js HMR triggers hot-reload
3. Component updates in browser
4. Page state preserved (if using HMR-safe patterns)
5. Changes visible instantly ✓
```

### Scenario 3: Change VSCode Extension (`packages/vscode-extension/src/*.ts`)
```
1. File changes detected by TypeScript watcher
2. Code rebuilds to ./out directory
3. Debug session refreshes (or press F5 to restart)
4. Extension updates in VS Code ✓
```

### Scenario 4: Change MCP Server (`packages/mcp-server/src/*.ts`)
```
1. File changes detected by watcher (if --hot-mcp)
2. Server code rebuilds
3. Manual restart required (F5 in VS Code, or Ctrl+C + re-run)
```

---

## Setup Instructions

### Prerequisites

```bash
# Install Node.js 18+
node --version

# Install pnpm
npm install -g pnpm
pnpm --version

# Optional: Redis for multi-task approval gates
# Start Redis locally
redis-server
```

### First Time Setup

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Install dependencies
pnpm install

# Make dev script executable
chmod +x dev-pipeline.sh

# Start development
./dev-pipeline.sh
```

### Environment Variables

Create `.env.local` in project root:

```bash
# MCP Server port
STORY_AGENT_AGENT_PORT=3103

# Redis (optional, for integration tests)
REDIS_URL=redis://127.0.0.1:6379

# Supabase (if using cloud database)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...

# OpenRouter (for crew LLM)
OPENROUTER_API_KEY=...
```

---

## Workflow Examples

### Scenario: Fix UI Bug

```bash
# 1. Start pipeline
./dev-pipeline.sh

# 2. Browser opens to http://localhost:3000
# 3. Edit file: packages/ui/src/components/ObservationDetailView.tsx
# 4. Next.js HMR detects change
# 5. Component re-renders in browser (seconds)
# 6. Bug fixed, test immediately ✓
```

### Scenario: Implement Shared Library Function

```bash
# 1. Start pipeline
./dev-pipeline.sh

# 2. Edit: packages/shared/src/db.ts (add new function)
# 3. pnpm rebuilds shared package automatically
# 4. MCP server imports new code
# 5. Dashboard can use new function immediately ✓
```

### Scenario: Debug VSCode Extension

```bash
# 1. Start pipeline
./dev-pipeline.sh

# 2. VSCode opens with extension in watch mode
# 3. Set breakpoint in packages/vscode-extension/src/extension.ts
# 4. Press F5 to start debug session
# 5. Extension reloads with breakpoint
# 6. Trigger action in VS Code to hit breakpoint ✓
```

### Scenario: Test Multi-Task Approval Gates

```bash
# 1. Ensure Redis is running
redis-server

# 2. Start pipeline
./dev-pipeline.sh

# 3. In separate terminal, run integration tests
pnpm run test:integration

# 4. Tests now have Redis available
# 5. Approval gates tested end-to-end ✓
```

---

## Commands Reference

| Command | Effect |
|---------|--------|
| `./dev-pipeline.sh` | Start full stack (MCP + UI + VSCode) |
| `./dev-pipeline.sh --ui-only` | Dashboard only |
| `./dev-pipeline.sh --ext-only` | VSCode extension only |
| `./dev-pipeline.sh --build-only` | Build once, no watch |
| `./dev-pipeline.sh --hot-mcp` | Enable MCP server hot-reload |
| `pnpm run test` | Run all tests |
| `pnpm run test:unit` | Unit tests only |
| `pnpm run test:integration` | Integration tests (requires Redis) |
| `pnpm run check` | Typecheck + lint + build |
| `pnpm run build` | Build all packages |

---

## Troubleshooting

### Port Already in Use

```bash
# MCP on 3103
lsof -i :3103
kill -9 <PID>

# Dashboard on 3000
lsof -i :3000
kill -9 <PID>
```

### Next.js Cache Issues

```bash
# Clear Next.js build cache
rm -rf packages/ui/.next

# Restart pipeline
./dev-pipeline.sh
```

### Shared Package Not Updating

```bash
# Force rebuild shared package
cd packages/shared
pnpm run build

# Restart MCP/UI
Ctrl+C
./dev-pipeline.sh
```

### VSCode Extension Not Reloading

```bash
# Option 1: Restart debug session (F5)
# Option 2: Disable/enable extension in VS Code
# Option 3: Close and reopen VS Code
```

### Redis Not Working

```bash
# Check if Redis is running
redis-cli PING

# Start Redis
redis-server

# Or use Docker
docker run -p 6379:6379 redis:latest
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Story Agent Monorepo — Unified Development Pipeline             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ dev-pipeline.sh                                                  │
│  ├─ Check prerequisites (pnpm, node, redis)                     │
│  ├─ Build @story-agent/shared                                   │
│  ├─ Build @story-agent/mcp-server                               │
│  ├─ Build @story-agent/ui                                       │
│  ├─ Build story-agent-vscode                                    │
│  │                                                               │
│  └─ Start Services (Parallel)                                   │
│     ├─ MCP Server (port 3103)                                   │
│     │  └─ Watch mode (rebuilds on change)                       │
│     ├─ Dashboard (port 3000)                                    │
│     │  └─ Hot-reload (Next.js HMR)                              │
│     └─ VSCode Extension                                         │
│        └─ Watch mode (rebuilds on change)                       │
│                                                                   │
│ Shared Code Changes                                              │
│  ├─ Detected by watcher                                         │
│  ├─ Rebuilds shared package                                     │
│  ├─ MCP imports new code                                        │
│  └─ UI hot-reloads with changes ✓                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Tips

### Reduce Build Time
```bash
# Skip type checking during development
export SKIP_TYPECHECK=true
./dev-pipeline.sh
```

### Monitor Resources
```bash
# In separate terminal, watch Node processes
watch -n 1 'ps aux | grep node'
```

### Parallel Testing
```bash
# Run tests in parallel with changes
pnpm run test -- --watch
```

---

## Next Steps

1. **First time**: Run `./dev-pipeline.sh` and visit http://localhost:3000
2. **Make a change**: Edit `packages/ui/src/app/page.tsx`, watch it reload
3. **Open VSCode**: Press F5 to debug the extension
4. **Run tests**: `pnpm run test` to validate changes

---

**Status**: Ready for development  
**Last Updated**: 2026-07-12  
**Maintenance**: Keep in sync with package.json changes
