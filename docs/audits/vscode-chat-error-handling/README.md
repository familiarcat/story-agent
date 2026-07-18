# VSCode Chat Error Handling Audit — Complete Assessment

**Audit Date:** 2026-07-17
**Assessed by:** Story Agent Crew (Geordi, Yar, Worf, Data, Troi)
**Status:** 52% Production Ready / 48% Risk Exposure
**Recommendation:** 1-2 sprints of focused fixes before staging deployment

---

## EXECUTIVE SUMMARY

The VSCode extension chat layer has **critical architectural and error handling gaps** that block staging deployment on 2026-07-10. While the WebSocket infrastructure (chat-client.ts) is well-designed, the **ChatPanel component bypasses it entirely with an unsafe HTTP implementation**, creating a single point of failure. Additionally, there are 5 blocking security/reliability issues that must be resolved.

### Current Production Readiness Score

| Component | Score | Status |
|-----------|-------|--------|
| WebSocket layer | 70% | Auto-reconnect works, but needs metrics |
| Message batching | 50% | Queue implemented, but silent loss on failure |
| UI error handling | 40% | No timeouts, no sanitization, direct error display |
| Session management | 20% | No 401/403 detection, no session validation |
| Rate limiting | 0% | No 429 handling, no backoff |
| **Overall** | **52%** | **DOES NOT MEET STAGING CRITERIA** |

---

## 3 CRITICAL BLOCKERS FOR STAGING

### Blocker 1: HTTP Fetch Has No Timeout (CRITICAL)
- **File:** `ChatPanel.ts:188-199`
- **Impact:** User sees spinning "thinking" forever if dashboard API hangs
- **Fix Effort:** 15 minutes
- **Priority:** IMMEDIATE

### Blocker 2: ChatPanel Bypasses WebSocket (CRITICAL ARCHITECTURAL)
- **File:** `ChatPanel.ts:172-224` (callCrewChatViaWebSocket)
- **Impact:** Function name claims WebSocket but uses HTTP fetch; defeats entire pooling/batching architecture
- **Fix Effort:** 1-2 hours (refactor to use chat-engine)
- **Priority:** IMMEDIATE

### Blocker 3: Low-Priority Messages Silently Lost (HIGH)
- **File:** `chat-client.ts:191-200` (flushBatch)
- **Impact:** User sends message, it gets lost if connection fails during flush
- **Fix Effort:** 15 minutes (add re-queue on error)
- **Priority:** BLOCKING

---

## AUDIT DOCUMENTS

This audit is organized into three focused documents:

1. **[01-audit-report.md](01-audit-report.md)** — Complete Assessment
   - 4 critical findings
   - 9 error scenario assessments (pass/fail analysis)
   - Production readiness checklist
   - Top 3 production-blocking scenarios
   - Specific code changes needed

2. **[02-test-plan.md](02-test-plan.md)** — Test Strategy
   - 40+ test cases (unit + integration + E2E)
   - Test coverage roadmap
   - 4 manual E2E scenarios
   - Metrics instrumentation guide
   - 14.5 hours estimated effort

3. **[03-implementation-checklist.md](03-implementation-checklist.md)** — Fix Implementation
   - 9 issues ranked by severity
   - Code diffs for all fixes
   - Sprint-by-sprint timeline
   - Files to modify with line numbers
   - Code review checklist

---

## TIMELINE

### Immediate (48 hours) — Blocking for Staging
```
- Add HTTP timeout (15 min)
- Sanitize errors (15 min)
- Fix batch re-queue (15 min)
- Refactor ChatPanel to use chat-engine (2 hours)
- Add 429 handling (1-2 hours)
- Unit tests (2-3 hours)
Total: 8 engineer-hours
```

**Gate:** All fixes complete + tests passing + manual E2E verification

### Sprint 2 (40 hours) — Production Ready
```
- Partial message detection (1 hour + tests)
- Session validation 401/403 (1 hour + tests)
- Integration tests (6-8 hours)
- E2E manual scenarios (2 hours)
- User feedback UI (status badge) (1-2 hours)
- Metrics collection (1-2 hours)
Total: 14 engineer-hours
```

**Estimated Staging Readiness:** 2026-07-24 (2 weeks from audit)

---

## RISK ASSESSMENT BY SCENARIO

### 🔴 High Risk: WebSocket Server Down
- **Duration:** User waits 17 minutes before giving up (max 10 reconnects)
- **Impact:** App appears frozen, users assume crash
- **Mitigation:** Show reconnecting status + offer manual retry button

### 🔴 High Risk: Dashboard API Hangs
- **Duration:** Forever (no timeout)
- **Impact:** Thinking spinner never stops
- **Mitigation:** Add 30s AbortController timeout

### 🟡 Medium Risk: Low-Priority Messages Lost
- **Probability:** Every reconnect cycle
- **Impact:** Suggestions/feedback silently dropped
- **Mitigation:** Add batch acknowledgment + re-queue on failure

### 🟡 Medium Risk: Rate Limited (429)
- **Duration:** Cascading failures
- **Impact:** User hammered with errors
- **Mitigation:** Detect 429, parse Retry-After, exponential backoff

### 🟡 Medium Risk: Session Expired (401/403)
- **Duration:** 17+ minutes (max reconnects)
- **Impact:** Invalid sessions retry forever
- **Mitigation:** Stop reconnecting on 401/403, show clear message

---

## KEY FINDINGS

### ✅ What Works Well
- WebSocket pooling (singleton per extension)
- Exponential backoff math (1s → 2s → 4s ... → 30s capped)
- Token ledger tracking
- Cache hit metrics
- Message response routing
- RAG service graceful fallback (2.5s timeout)

### ❌ What's Broken
1. ChatPanel uses HTTP instead of WebSocket (defeats architecture)
2. HTTP calls have no timeout
3. Low-priority messages silently lost on reconnect
4. No 429 (rate limit) detection or backoff
5. No 401/403 (auth error) detection
6. Error messages not sanitized (secret leakage risk)
7. Partial messages not detected
8. No user feedback during reconnection
9. No structured error logging

---

## SECURITY CONSIDERATIONS

### ⚠️ Potential Secret Leakage
- Error display at `ChatPanel.ts:106` shows raw error messages
- Could expose bearer tokens, API keys, file paths
- **Fix:** Sanitize with regex: remove paths, tokens, URLs before display

### ⚠️ Rate Limit DoS
- No 429 detection means cascading failures
- User hammered with error messages
- **Fix:** Detect 429, respect Retry-After header, backoff exponentially

### ✅ Session Isolation
- Each session gets unique sessionId + userId
- WebSocket state is per-session
- No cross-session contamination detected

---

## METRICS & OBSERVABILITY

### Currently Tracked
- Message latency (milliseconds)
- Token counts (in/out)
- Cost per message
- Cache hits

### Missing (Needed for Production)
- Connection failure count
- Reconnect success rate
- Mean time to recovery (MTTR)
- Message loss count
- Error category distribution (429, 401, timeout, etc.)
- User impact metrics (affected users, duration)

---

## NEXT STEPS

### For Project Manager
1. Allocate 8 engineer-hours for blocking fixes (Sprint 1)
2. Allocate 14 engineer-hours for full coverage (Sprint 2)
3. Schedule code review of error handling before staging deployment
4. Set gate: "All tests must pass, 0 manual test failures"

### For Engineering Team
1. Start with 3 blocking fixes (HTTP timeout, batch re-queue, sanitization)
2. Refactor ChatPanel to use chat-engine (critical architectural fix)
3. Implement 429 rate limit handling
4. Add unit test suite for chat-client
5. Execute 4 manual E2E scenarios before staging

### For QA
1. Review test plan in [02-test-plan.md](02-test-plan.md)
2. Implement unit + integration tests
3. Execute manual E2E scenarios:
   - WebSocket server down recovery
   - Dashboard API timeout
   - Rate limiting (429)
   - Low-priority message loss

---

## DEPENDENCIES & ASSUMPTIONS

- Assumes WebSocket server runs at `http://localhost:3103` (configurable)
- Assumes dashboard API at `http://localhost:3000/api/chat` (configurable)
- Assumes RAG service at `http://localhost:3102` (already working)
- Node.js 22.19+ with AbortController support
- VS Code API stable (webview messaging)

---

## SUCCESS CRITERIA

**Staging Ready When:**
- [ ] All 5 blocking issues fixed + tested
- [ ] HTTP timeout working (manual verify: 30s max)
- [ ] ChatPanel delegates to chat-engine (profiler shows WebSocket)
- [ ] No silent message loss (test 3.3 passes)
- [ ] Error messages sanitized (test verifies no secrets)
- [ ] 429 rate limit backoff working
- [ ] All 4 manual E2E scenarios pass

**Production Ready When:**
- [ ] All above completed
- [ ] 80%+ test coverage on error paths
- [ ] Metrics collection live
- [ ] User feedback UI (reconnecting status) implemented
- [ ] Structured logging in place
- [ ] No P1 issues in backlog

---

## CONTACT & ESCALATION

**Audit Lead:** Story Agent Crew (Data + Worf lead)
**Review Date:** 2026-07-18
**Escalation:** If blockers not started by 2026-07-18, staging deployment will slip 2 weeks

---

**Status:** Ready for Implementation
**Last Updated:** 2026-07-17 15:34 UTC

