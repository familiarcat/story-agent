# Phase 7: Quick Start Guide

## What is Phase 7?

Phase 7 is a **modernization initiative** for the MCP (Model Context Protocol) integration in story-agent. It introduces 10 key improvements to reliability, observability, and performance of the VSCode extension connecting to both local and cloud MCP endpoints.

**Goal:** Enable developers to work seamlessly with story-agent regardless of whether they're using local MCP (fastest for dev) or cloud MCP (scalable for production), with automatic fallback and transparent diagnostics.

## The 10 Phase 7 Improvements at a Glance

1. **5-Second Timeout Mechanism** — Prevent MCP hangs by auto-terminating requests that take >5 seconds
2. **PREFER_LOCAL Environment Flag** — Choose local-first (dev) or cloud-first (prod) endpoint ordering
3. **Server-ID Headers** — Identify which server (local vs cloud) handled your request
4. **Latency Metrics** — Measure round-trip time for each MCP call
5. **Pre-Flight Health Checks** — Verify MCP server is ready with `/ready` endpoint
6. **Graceful Fallback** — Auto-retry on cloud timeout with clear error messaging
7. **Append-Only Diagnostics Logging** — Track all MCP activity in `~/.claude/mcp-diagnostics.jsonl`
8. **Zero-Secret Logging** — All logs filtered to prevent accidental credential leaks
9. **Integration Test Coverage** — 9 passing Jest tests covering all scenarios (timeout, fallback, headers)
10. **Comprehensive Documentation** — Quick start, architecture deep dive, cost model, troubleshooting

## How Do I Know Phase 7 is Working?

### Test 1: Check the /ready Endpoint

```bash
curl http://localhost:3103/ready | jq .
```

**Expected output:**
```json
{
  "ready": true,
  "server": "local",
  "uptime_ms": 12345,
  "timestamp": "2026-08-30T17:45:00.000Z",
  "version": "7.0.0"
}
```

### Test 2: Watch Latency Metrics in Console

When you use the VSCode extension, you should see logs like:
```
[MCP Phase 7] Server: local, Latency: 42ms, Endpoint: http://localhost:3103/agent
[MCP Phase 7] Server: cloud, Latency: 128ms, Endpoint: https://api.example.com/agent
```

### Test 3: Check Diagnostic Logs

View the last 10 diagnostic entries:
```bash
tail -10 ~/.claude/mcp-diagnostics.jsonl | jq .
```

**Example entry:**
```json
{
  "timestamp": "2026-08-30T17:45:02.123Z",
  "endpoint": "local",
  "latency_ms": 42,
  "crew_member": "Data",
  "status": "success"
}
```

## Troubleshooting: "My MCP is Hanging"

**3-Step Recovery:**

**Step 1:** Check if the MCP server is running
```bash
curl -s http://localhost:3103/ready || echo "❌ MCP server not responding"
```

**Step 2:** If local MCP is down, kill any stuck processes
```bash
pkill -f "node.*mcp" || pkill -f "pnpm run mcp"
sleep 2
```

**Step 3:** Restart MCP server
```bash
cd /Users/bradygeorgen/Developer/story-agent
pnpm run mcp &
```

**Verify recovery:**
```bash
curl -s http://localhost:3103/ready | jq '.ready'
# Should output: true
```

## Next Steps

1. **Run the VSCode Extension** — Open story-agent in VSCode with Phase 7 active
2. **Watch the /ready Heartbeat** — The extension pre-flight checks `/ready` every request
3. **Observe Latency Metrics** — See which endpoint is faster for your network
4. **Check Diagnostics** — Review `~/.claude/mcp-diagnostics.jsonl` to understand your MCP behavior
5. **Report Issues** — If timeouts persist, see the Troubleshooting guide

## Phase 7 Impact Summary

| Before Phase 7 | After Phase 7 |
|---|---|
| MCP requests hang indefinitely if server is slow | 5-second timeout prevents hangs |
| No way to choose local vs cloud | PREFER_LOCAL flag gives you control |
| No visibility into which server handled request | Server-ID headers show endpoint routing |
| No latency tracking | Latency metrics reveal performance bottlenecks |
| No health checks | /ready endpoint verifies server status |
| Timeout = hard failure | Graceful fallback to alternate endpoint |
| No logs for debugging | Append-only diagnostics for audit trail |
| Potential secret leaks in logs | All logs filtered (no SUPABASE_KEY, etc.) |
| Untested | 9 passing integration tests |
| Confusion on how to use Phase 7 | Clear guides for all roles |

---

**Questions?** See [Architecture Deep Dive](./architecture.md) for technical details or [Troubleshooting](./troubleshooting.md) for common issues.
