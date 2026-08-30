# Phase 7: Troubleshooting & Rollback

## Table of Contents

1. [Diagnosis Protocol](#diagnosis-protocol)
2. [Common Issues](#common-issues)
3. [Recovery Procedures](#recovery-procedures)
4. [Rollback Guide](#rollback-guide)
5. [Post-Incident](#post-incident)

---

## Diagnosis Protocol

### Step 1: Check Server Status

**Is the MCP server running?**

```bash
curl -s http://localhost:3103/ready | jq '.ready'
# Expected output: true

# If no output or error:
echo "❌ MCP server not responding on port 3103"
```

**Is it listening on the right port?**

```bash
netstat -an | grep 3103
# Expected: tcp4 0 0 127.0.0.1.3103 * LISTEN

# If nothing:
echo "❌ No process listening on port 3103"
```

**Is Node process running?**

```bash
ps aux | grep "node.*dist/src/index.js"
# Expected: one running process

# If nothing:
echo "❌ Node MCP process is not running"
```

### Step 2: Check Diagnostics Log

**Read the last 20 diagnostic entries:**

```bash
tail -20 ~/.claude/mcp-diagnostics.jsonl | jq .
```

**Look for patterns:**
- All entries ending in `"status": "timeout"` → Server is slow or dead
- Mix of `"endpoint": "local"` and `"cloud"` → Fallback is working
- No entries after timestamp X → Requests stopped flowing

### Step 3: Check VSCode Extension Logs

**In VSCode, open the Output panel:**

```
Ctrl+Shift+U (Windows/Linux)
Cmd+Shift+U (Mac)
```

**Select "Story Agent" from the dropdown**

**Look for:**
- `[MCP Phase 7]` messages (latency, server, endpoint)
- `Error:` messages (connection refused, timeout)
- `WARN:` messages (health check failed)

### Step 4: Check Environment Variables

**Verify PREFER_LOCAL setting:**

```bash
echo "STORY_AGENT_PREFER_LOCAL=$STORY_AGENT_PREFER_LOCAL"
# Expected: (blank for cloud-first, or "true" for local-first)

# If not set and you want local:
export STORY_AGENT_PREFER_LOCAL=true
```

---

## Common Issues

### Issue 1: "MCP is Hanging" (Request never returns)

**Symptom:**
- VSCode extension makes request to MCP
- Request never completes (stuck for >5 seconds)
- No error message appears

**Root Cause:**
- MCP server crashed but process still running
- Server out of memory or CPU-bound
- Network connectivity issue

**Resolution:**

**Step 1: Check if /ready times out**

```bash
timeout 2 curl -s http://localhost:3103/ready
# If timeout or no response: server is hung

echo "❌ MCP server hung, restarting..."
```

**Step 2: Kill and restart MCP**

```bash
# Kill all node processes (careful in shared machine!)
pkill -f "node.*dist/src/index.js" || pkill -f "pnpm run mcp"

# Wait for cleanup
sleep 2

# Restart
cd /Users/bradygeorgen/Developer/story-agent
pnpm run mcp &
sleep 3

# Verify
curl -s http://localhost:3103/ready | jq '.ready'
```

**Step 3: If problem persists**

```bash
# Check for memory leaks
ps aux | grep "node" | grep -v grep
# Look for high %MEM or %CPU

# If high: check recent diagnostics
tail -50 ~/.claude/mcp-diagnostics.jsonl | jq '.[] | select(.latency_ms > 3000)'
# If many slow requests: server may be overloaded

# Check disk space
df -h ~/.claude
# If <10% free: clear old diagnostics
rm ~/.claude/mcp-diagnostics.jsonl.bak*
```

**Prevention:**
- Monitor process memory: `watch -n 1 'ps aux | grep node'`
- Restart daily in high-volume environments: `crontab -e` → add hourly restart

---

### Issue 2: "Timeout Mechanism Isn't Firing"

**Symptom:**
- Request hangs for 30+ seconds (should timeout at 5 seconds)
- Timeout logic doesn't seem to be working

**Root Cause:**
- AbortSignal.timeout() polyfill missing (requires Node 17+)
- Older Node version doesn't support timeout syntax
- Custom timeout handler not installed

**Resolution:**

**Step 1: Check Node version**

```bash
node --version
# Expected: v18.0.0 or higher (Phase 7 requires 17+)

# If < 17:
nvm install 18
nvm use 18
```

**Step 2: Verify AbortSignal polyfill in agentClient.ts**

```bash
grep -n "AbortSignal.timeout\|AbortController" \
  packages/vscode-extension/src/agentClient.ts | head -10
```

**Expected output:**
```
42: const controller = new AbortController();
43: const timeoutId = setTimeout(() => controller.abort(), 5000);
```

**If not found:** Timeout logic is missing; rebuild VSCode extension:

```bash
cd packages/vscode-extension
npm run build
```

**Step 3: Check for custom timeout wrapper (fetchWithTimeout)**

```bash
grep -A 10 "function fetchWithTimeout\|export.*fetchWithTimeout" \
  packages/vscode-extension/src/agentClient.ts | head -20
```

**If not found:** You're using a stale build; rebuild:

```bash
pnpm --filter @story-agent/vscode-extension run build
```

**Verification:**
- Make request to hanging endpoint (e.g., tcpdump to slow server)
- Verify request aborts after 5 seconds (check VSCode output)
- Check .claude/mcp-diagnostics.jsonl for timeout entry

---

### Issue 3: "PREFER_LOCAL Flag Ignored"

**Symptom:**
- Set `STORY_AGENT_PREFER_LOCAL=true` but requests still go to cloud
- Environment variable not taking effect

**Root Cause:**
- Variable not exported (only set in shell)
- VSCode not restarted after env change
- Variable set in wrong shell profile (.bashrc vs .zshrc)

**Resolution:**

**Step 1: Verify env var is set**

```bash
echo "STORY_AGENT_PREFER_LOCAL=$STORY_AGENT_PREFER_LOCAL"
# Should output: STORY_AGENT_PREFER_LOCAL=true

# If blank, export it:
export STORY_AGENT_PREFER_LOCAL=true

# Verify:
echo $STORY_AGENT_PREFER_LOCAL
```

**Step 2: Check shell profile**

```bash
# If using zsh:
grep "STORY_AGENT_PREFER_LOCAL" ~/.zshrc
# If not found, add it:
echo 'export STORY_AGENT_PREFER_LOCAL=true' >> ~/.zshrc

# If using bash:
grep "STORY_AGENT_PREFER_LOCAL" ~/.bash_profile
# If not found, add it:
echo 'export STORY_AGENT_PREFER_LOCAL=true' >> ~/.bash_profile

# Reload:
source ~/.zshrc  # or source ~/.bash_profile
```

**Step 3: Restart VSCode**

```bash
# Close VSCode completely
# Kill any lingering processes:
pkill -f "Code\|code"

# Reopen VSCode from terminal (so it inherits env):
code /Users/bradygeorgen/Developer/story-agent &
```

**Verification:**
- Check VSCode output for endpoint selection
- Make request and watch diagnostics log:
  ```bash
  tail -f ~/.claude/mcp-diagnostics.jsonl | grep endpoint
  ```
- Should see `"endpoint": "local"` first if flag is true

---

### Issue 4: "Latency Metrics Are Missing"

**Symptom:**
- No `[MCP Phase 7]` console logs showing latency
- X-Request-Latency-MS headers not appearing

**Root Cause:**
- VSCode console output not visible (Output panel closed)
- Latency logging disabled by configuration
- fetchWithMetrics() not called (using old fetchWithTimeout directly)

**Resolution:**

**Step 1: Open VSCode Output panel**

```
Cmd+Shift+U (Mac) or Ctrl+Shift+U (Windows)
Select "Story Agent" from dropdown
```

**Step 2: Make a request and watch for logs**

```
Expected:
[MCP Phase 7] Server: local, Latency: 42ms, Endpoint: http://localhost:3103/agent
```

**If no logs appear:**

**Step 3: Check if fetchWithMetrics is being called**

```bash
grep -n "fetchWithMetrics" packages/vscode-extension/src/agentClient.ts | head -5
```

**If few results:** Metrics wrapper not widely used; check:

```bash
# Find all fetch calls:
grep -n "fetch(" packages/vscode-extension/src/agentClient.ts | head -10

# Should see fetchWithMetrics or fetchWithTimeout calls
# If direct fetch() calls: those won't log metrics
```

**Step 4: Verify diagnostics log is being written**

```bash
tail -10 ~/.claude/mcp-diagnostics.jsonl
# Should see recent entries with latency_ms values

# If empty:
ls -la ~/.claude/mcp-diagnostics.jsonl
# If file doesn't exist: diagnostics not initialized yet

# If file exists but old timestamps:
date
# vs timestamp in log
# If gap > 1 hour: logging has stalled
```

**Step 5: Enable debug logging in agentClient.ts**

```typescript
// In fetchWithMetrics:
console.log(`[MCP Phase 7] Server: ${server}, Latency: ${latencyMs}ms, Endpoint: ${endpoint}`);
```

**If still no logs:**

```bash
# Rebuild VSCode extension:
pnpm --filter @story-agent/vscode-extension run build

# Restart VSCode:
pkill -f "Code\|code"
code /Users/bradygeorgen/Developer/story-agent &
```

---

## Recovery Procedures

### Procedure A: Restart MCP Server (Quickest)

**Duration:** 10 seconds

```bash
# Kill old server
pkill -f "node.*mcp" || pkill -f "pnpm run mcp"

# Start fresh
cd /Users/bradygeorgen/Developer/story-agent
pnpm run mcp &

# Verify
sleep 2
curl -s http://localhost:3103/ready | jq '.ready'
# Should output: true
```

### Procedure B: Reset VSCode Extension Cache

**Duration:** 30 seconds

```bash
# Close VSCode
pkill -f "Code\|code"

# Clear extension cache
rm -rf ~/.vscode/extensions/*/state.*

# Restart VSCode
code /Users/bradygeorgen/Developer/story-agent &
```

### Procedure C: Full Stack Rebuild

**Duration:** 2-3 minutes

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Clean builds
pnpm run clean

# Rebuild
pnpm run build

# Verify no errors
pnpm run check

# Restart MCP
pkill -f "node.*mcp"
pnpm run mcp &

# Restart VSCode
pkill -f "Code"
code . &
```

### Procedure D: Network Connectivity Check

**If cloud endpoint unreachable:**

```bash
# Test DNS
nslookup api.example.com
# Should resolve to IP

# Test connectivity
ping -c 3 api.example.com
# Should get responses

# Test HTTPS
curl -v https://api.example.com/ready
# Should get 200 OK

# If fails: check firewall, VPN, corporate proxy
```

---

## Rollback Guide

### When to Rollback

**Rollback if:**
- Phase 7 breaks MCP entirely (both endpoints timeout)
- VSCode extension crashes on startup
- Crew requests failing 100% (not recoverable via fallback)
- Diagnostics logging causing memory leak (unlikely)

**Do NOT rollback if:**
- Single request timeout (fallback should handle)
- Local MCP slow (cloud fallback should work)
- Occasional error in logs (expected, logged to diag)

### Rollback Steps

**Step 1: Revert to last known-good commit**

```bash
cd /Users/bradygeorgen/Developer/story-agent

# Check git status
git status

# If local changes, stash:
git stash

# Find last Phase 7 pre-commit (before Phase A)
git log --oneline | head -20
# Look for commit before "Phase 7 Phase A execution"

# Revert (example: revert to commit abc1234)
git revert -n abc1234..HEAD

# Or hard reset (destructive):
git reset --hard <commit-before-phase7>
```

**Step 2: Rebuild old version**

```bash
pnpm run clean
pnpm run build
```

**Step 3: Restart services**

```bash
pkill -f "node.*mcp"
pkill -f "Code"

cd /Users/bradygeorgen/Developer/story-agent
pnpm run mcp &
sleep 3

code . &
```

**Step 4: Verify rollback**

```bash
curl -s http://localhost:3103/ready | jq '.ready'
# Should work with pre-Phase7 server

# Try a request in VSCode
# Should succeed without timeouts
```

### Rollback Impact

| What | Before Rollback (Phase 7) | After Rollback | Impact |
|---|---|---|---|
| Timeout protection | ✅ 5-second timeout | ❌ Hangs forever | Requests may hang if server slow |
| Fallback behavior | ✅ Auto-fallback cloud | ❌ Hard fail | Single point of failure |
| Observability | ✅ Diagnostic logs | ❌ No logs | No audit trail |
| Latency metrics | ✅ Visible in console | ❌ Not tracked | Blind to performance |
| Health checks | ✅ `/ready` pre-flight | ❌ No health check | Slow to detect dead server |

---

## Post-Incident

### After Rollback or Recovery

**Step 1: Run 9 Integration Tests**

```bash
pnpm --filter @story-agent/vscode-extension run test:unit -- agentClient.integration.test.ts

# All 9 tests should PASS:
# ✅ A1 ✅ A2 ✅ A3 ✅ B1 ✅ B2 ✅ C1 ✅ C2 ✅ D1 ✅ D2
```

**Step 2: Verify Test Coverage**

```bash
# Coverage should be > 85%
pnpm --filter @story-agent/vscode-extension run test:unit -- --coverage

# Expected output:
# File                | % Stmts | % Branch | % Funcs | % Lines
# agentClient.ts      | 87.3   | 84.2     | 88.1    | 86.5
```

**Step 3: Check No Regressions**

```bash
# Run full test suite
pnpm run test

# No new failures should appear
```

**Step 4: Review Incident Log**

```bash
# What happened during the incident?
tail -100 ~/.claude/mcp-diagnostics.jsonl | jq '.[] | select(.status != "success")'

# Look for patterns:
# - All timeouts? Server was slow
# - Mix of local/cloud failures? Both endpoints down
# - Sequential fallback? Fallback working correctly
```

**Step 5: Create Post-Incident Summary**

**Example:**
```
Incident: MCP hung on 2026-08-30 17:45
Root Cause: Memory leak in crew deliberation loop
Duration: 5 minutes (auto-recovered at timeout)
Impact: 1 blocked user request (recovered via cloud fallback)

Action Items:
1. Add memory monitoring to MCP startup
2. Reduce crew deliberation token budget by 10%
3. Add periodic restart cron job

Lessons Learned:
- Timeout + fallback worked as designed ✅
- Diagnostics log helped identify problem ✅
- User saw "trying cloud endpoint..." message ✅
```

**Step 6: Update Runbooks**

If root cause is new:
```bash
# Add to this troubleshooting guide:
# New issue: [Description]
# Root cause: [What went wrong]
# Quick fix: [3-step procedure]
```

---

## Quick Reference

| Problem | Quick Fix | Time |
|---|---|---|
| MCP hanging | `pkill node; pnpm run mcp &` | 10s |
| Timeout not firing | Rebuild VSCode: `pnpm run build` | 30s |
| PREFER_LOCAL ignored | `export STORY_AGENT_PREFER_LOCAL=true` | 5s |
| No latency metrics | Restart VSCode + check Output panel | 20s |
| Cloud endpoint down | Wait 30s, then manual fallback test | 30s |
| Full recovery needed | `pnpm run clean && pnpm run build` | 2m |
| Rollback to pre-Phase7 | `git reset --hard <commit>` | 2m |

---

**Troubleshooting Guide Owner:** O'Brien (DevOps) | **Last updated:** 2026-08-30

**Escalation Contacts:**
- MCP server issues: O'Brien (DevOps)
- VSCode extension issues: Geordi (Infrastructure)
- Crew deliberation issues: Picard (Captain)
- Security/secrets in logs: Worf (Security)
