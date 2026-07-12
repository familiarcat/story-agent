# Dashboard UI Development Guide

Quick reference for developing the Next.js dashboard locally.

## Start the Dashboard

```bash
# Terminal: Start UI with hot reload
pnpm ui
```

Server runs at http://localhost:3000

**Output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

## File Structure

```
packages/ui/
├── src/
│   ├── app/
│   │   ├── dashboard/          # /dashboard
│   │   ├── agent/              # /agent - live chat
│   │   ├── cost/               # /cost - spending
│   │   ├── learnings/          # /learnings - crew insights
│   │   ├── crew/
│   │   │   ├── memories/       # /crew/memories - RAG
│   │   │   ├── observations/   # /crew/observations - deliberations
│   │   │   └── status/         # /crew/status - real-time
│   │   └── observation-lounge/ # /observation-lounge - full crew debate
│   ├── components/
│   │   ├── domains.ts          # Navigation config (DOMAIN_GROUPS)
│   │   ├── NavBar.tsx          # Top navigation
│   │   ├── LCARS.tsx           # Theming system
│   │   └── [feature]/          # Feature-specific components
│   └── styles/
│       └── globals.css         # Global styles (LCARS theme)
├── next.config.js
└── package.json
```

## Key Pages & Features

### /agent - Live Chat

**File**: `packages/ui/src/app/agent/page.tsx`

**What it does:**
- POST requests to `http://localhost:3103/chat`
- Displays crew preflight (teams, members, goals)
- Shows crew variance (conservative/balanced/aggressive options)
- Live crew status updates during execution

**Testing dynamic teams:**
1. Send: "Deploy auth service to AWS with terraform and database migration"
2. Look for CREW SELF-ORGANIZATION PRELUDE section
3. PARALLEL TEAMS should show N teams (not hardcoded 3)

### /dashboard - Projects & Sprints

**File**: `packages/ui/src/app/dashboard/page.tsx`

**What it does:**
- Fetches from Aha (project management)
- Shows projects, sprints, story status
- Links to stories for editing

### /cost - Cost Observatory

**File**: `packages/ui/src/app/cost/page.tsx`

**What it does:**
- Queries Supabase for crew cost ledger
- Shows spending by provider, crew member, surface
- Calculates ROI vs Copilot baseline

### /observation-lounge - Full Crew Deliberation

**File**: `packages/ui/src/app/observation-lounge/page.tsx`

**What it does:**
- Displays past crew missions and debates
- Shows alternatives (conservative/balanced/aggressive)
- Crew variance detection and reasoning

## Development Workflow

### Making Changes to a Page

1. **Edit the page file** (e.g., `pages/agent/page.tsx`)
2. **Next.js auto-reloads** (Fast Refresh)
3. **Browser updates** (no manual refresh needed)
4. **TypeScript errors** show in terminal and browser overlay

### Example: Add a button to the chat

```typescript
// packages/ui/src/app/agent/page.tsx
export default function AgentPage() {
  return (
    <div>
      <h1>Agent Workspace</h1>
      <button onClick={() => console.log("Clicked!")}>
        New Chat
      </button>
      {/* existing chat code */}
    </div>
  );
}
```

Changes appear instantly in browser.

### Styling

The dashboard uses **LCARS theme** (Star Trek look-and-feel):

```typescript
// In components
import { getLCARSTheme } from '@/components/LCARS';

const theme = getLCARSTheme();

<div style={{ 
  borderLeft: `4px solid ${theme.accent}`,
  backgroundColor: theme.background 
}}>
```

**Main colors:**
- `theme.accent` — orange (left borders)
- `theme.background` — dark (95, 95, 100)
- `theme.text` — light gold (#FFCC00)
- `theme.highlight` — bright green (#00FF00)

### Adding New API Routes

Create files in `packages/ui/src/app/api/`:

```typescript
// packages/ui/src/app/api/crew/my-endpoint/route.ts
export async function GET(request: Request) {
  return Response.json({ data: "hello" });
}
```

Call from component:
```typescript
const res = await fetch('/api/crew/my-endpoint');
const data = await res.json();
```

## Testing & Verification

### Test Crew Preflight Display

1. Open http://localhost:3000/agent
2. Click chat input
3. Type: "Deploy microservice with auth migration"
4. Look for CREW SELF-ORGANIZATION PRELUDE
5. Verify PARALLEL TEAMS shows N teams (dynamic count)

**What to look for:**
```
PARALLEL TEAMS:
- [Domain Name] [team-id]: crew1, crew2, crew3 · X personal memory hits
- ...
```

### Test Real-Time Updates

1. Open http://localhost:3000/agent
2. Type: "make it so"
3. Watch for crew status cards updating
4. Each card shows: crew member, task, iteration, elapsed time

### Test Cost Display

1. Open http://localhost:3000/cost
2. Should show: Today's spend, top members, provider breakdown
3. If no data: check Supabase connection

### Test Observations

1. Open http://localhost:3000/crew/observations
2. Should list past crew missions
3. Click one to see full debate transcript
4. Look for variance flags (crew alternatives)

## Common Issues

| Issue | Fix |
|-------|-----|
| 404 Not Found | Check page exists in `src/app/`, restart with `pnpm ui` |
| Chat not working | Verify MCP running on :3103, check browser console |
| "Cannot find module" | Run `pnpm install`, rebuild cache: `rm -rf .next && pnpm ui` |
| Styling broken | Check LCARS import, verify CSS loaded (DevTools → Styles) |
| Data not loading | Check Supabase credentials in browser console network tab |

## Environment Variables

Create `packages/ui/.env.local`:

```bash
# MCP Server
NEXT_PUBLIC_MCP_URL=http://localhost:3103

# Supabase (optional for local testing)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

## Build for Production

```bash
# Build Next.js
pnpm ui:build

# Start production server
pnpm web:start-local
```

## Debugging

### Browser DevTools

```
Open http://localhost:3000
→ F12 (DevTools)
→ Console tab: see logs
→ Network tab: see API calls
→ Performance tab: profile page load
```

### Next.js Debug Mode

```bash
NODE_OPTIONS='--inspect-brk' pnpm ui
# Open chrome://inspect
```

### View Server Logs

Terminal running `pnpm ui` shows:
- API requests
- Build errors
- Hot reload status

---

**Tip**: Keep browser DevTools open (F12) while developing to catch console errors immediately.
