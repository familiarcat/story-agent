# Phase E: Comprehensive Test Harness

**Date:** 2026-08-30  
**Goal:** Build a reliable, maintainable test suite with full system coverage  
**Status:** In Progress

## 📊 Current Test Status

| Category | Files | Tests | Passing | Failing | Status |
|----------|-------|-------|---------|---------|--------|
| **shared** | 28 | 375 | 340 | 35 | ⚠️ Needs fixes |
| **mcp-server** | 32 | TBD | TBD | TBD | ⏳ Running |
| **ui** | - | - | - | - | 🔲 Not configured |
| **markdown-renderer** | 2 | 9 | 9 | 0 | ✅ Pass |
| **vscode-extension** | - | - | - | - | 🔲 Not configured |
| **TOTAL** | 62+ | 384+ | 349+ | 35 | ⚠️ Needs triage |

---

## 🔴 Failing Tests (Priority Fixes)

### 1. Missing Test Fixtures
- `pm-contracts/__tests__/conflict-resolution.test.ts` — Missing fixture file
- `pm-contracts/__tests__/schemas.test.ts` — Missing fixture file
- **Fix:** Create `pm-contracts/fixtures/pm-contracts/test-fixtures.ts`

### 2. Import/Export Errors
- `src/embedding.test.ts` — `embed` function not exported
- **Fix:** Verify export in embedding.ts

### 3. RBAC Permission Tests (11 failures)
- RBAC tests are all failing
- **Fix:** Review and fix RBAC implementation or test setup

### 4. File Input/Output Tests (17 failures)
- `file-input.test.ts` — 17 test failures
- `pdf-processor.test.ts` — 2 test failures
- **Issue:** Likely PDF library/environment setup (Node.js legacy warning)

### 5. Unhandled Error
- `process.exit` called in delegation-hook.js during test run
- **Fix:** Prevent process.exit in test environment

---

## 🎯 Phase E Objectives

### A. Fix All Failing Tests (High Priority)
- [ ] Create missing test fixtures
- [ ] Fix export issues in embedding.ts
- [ ] Fix RBAC permission validation logic
- [ ] Fix PDF processor environment setup
- [ ] Prevent process.exit during tests (mock or guard)
- **Target:** 0 failures, 100% pass rate

### B. Crew System Integration Tests (High Priority)
- [ ] Crew collaboration end-to-end test
- [ ] All 11 crew members can be instantiated and respond
- [ ] Prompt template variable substitution
- [ ] LLM provider selection (Quark cost optimization)
- [ ] Crew memory recall and storage
- [ ] Crew integrity check
- **Target:** Full crew system tested

### C. MCP Tool Integration Tests (High Priority)
- [ ] Story ingestion from Aha
- [ ] Branch creation and PR operations
- [ ] Database CRUD operations
- [ ] WorfGate credential resolution
- [ ] MCP discovery and tool registration
- **Target:** All MCP tools validated

### D. Database Schema Tests (Medium Priority)
- [ ] All 18 migrations apply correctly
- [ ] RLS policies are properly enforced
- [ ] Indexes are created as expected
- [ ] Supabase-to-TypeScript type parity
- **Target:** Schema integrity verified

### E. End-to-End Workflow Tests (Medium Priority)
- [ ] Complete story execution flow (story → branch → PR → merge)
- [ ] PR revision workflow (comments → fixes → re-push)
- [ ] Crew autonomous execution (no prompts)
- [ ] Cost tracking and budget enforcement
- **Target:** Real-world scenarios validated

### F. Performance & Bundle Tests (Medium Priority)
- [ ] Build artifact sizes measured
- [ ] Critical path execution time < 5s
- [ ] Memory usage under load
- [ ] No memory leaks in agent-core loop
- **Target:** Performance baseline established

### G. UI/Integration Tests (Lower Priority)
- [ ] Next.js API endpoints respond correctly
- [ ] Observation Lounge populates data
- [ ] Story dashboard renders
- [ ] Real-time updates via WebSocket
- **Target:** UI confidence increase

---

## 📝 Test Structure (Phase E)

### Unit Tests (Fast, Deterministic)
```
packages/shared/src/**/*.test.ts
packages/mcp-server/src/**/*.test.ts
✅ No I/O
✅ No network
✅ Fast (<5s total)
✅ 100% deterministic
```

### Integration Tests (Local Mocks)
```
packages/shared/src/**/*.integration.test.ts
packages/mcp-server/src/**/*.integration.test.ts
✅ Mocked Supabase/LLM/HTTP
✅ Fast (<10s total)
✅ Deterministic
✅ Realistic workflows
```

### Integration Tests (Real Services — CI/CD Only)
```
TEST_ENV=integration CI/CD pipeline
✅ Real Supabase project
✅ Real approved LLM API
✅ Real provider APIs (Aha, GitHub)
✅ Slow (2-5 min), external deps
```

---

## 🔧 Commands for Phase E

### Run All Tests
```bash
pnpm run test                    # Unit + integration (local mocks)
pnpm run test:unit              # Unit tests only (fast)
pnpm run test:integration       # Integration with mocks (fast)
pnpm run test:watch             # Automatic rerun on changes
pnpm run test:ci                # CI/CD with real services
```

### Run Specific Package Tests
```bash
pnpm --filter @story-agent/shared test
pnpm --filter @story-agent/mcp-server test
pnpm --filter @story-agent/ui test
```

### Coverage Report
```bash
RUN_MODE=unit vitest run --coverage
```

---

## 📋 Test File Organization

### Fixed (No Changes Needed)
```
✅ packages/mcp-server/src/agent-core/*.test.ts (25+ files)
✅ packages/mcp-server/src/lib/*.test.ts (30+ files)
✅ packages/mcp-server/src/tools/*.test.ts (3+ files)
✅ packages/markdown-renderer/__tests__/*.test.ts (2 files, passing)
```

### To Fix
```
🔧 packages/shared/src/embedding.test.ts (export issue)
🔧 packages/shared/src/pm-contracts/__tests__/*.test.ts (missing fixtures)
🔧 packages/shared/src/__tests__/file-input.test.ts (PDF env setup)
🔧 packages/shared/src/__tests__/pdf-processor.test.ts (PDF env setup)
🔧 packages/shared/src/__tests__/rbac.test.ts (RBAC logic)
```

### To Create (New Coverage)
```
📝 packages/mcp-server/src/lib/crew-system.comprehensive.test.ts
📝 packages/mcp-server/src/tools/story-execution-end-to-end.test.ts
📝 packages/shared/src/db.comprehensive.test.ts
📝 packages/ui/src/__tests__/api-routes.test.ts
```

---

## ✅ Definition of Done (Phase E)

- [ ] All 35 failing tests fixed → 100% pass rate
- [ ] No unhandled errors or process.exit calls
- [ ] Crew system comprehensive test coverage (all 11 personas)
- [ ] MCP tools all tested (create_story_branch, open_pull_request, etc.)
- [ ] Database schema validation tests
- [ ] End-to-end workflow tests (story → PR → merge)
- [ ] Performance baseline established
- [ ] Coverage report generated (target >80% line coverage)
- [ ] CI/CD test integration working (TEST_ENV=integration)
- [ ] Build verification: `pnpm run build && pnpm run test` succeeds

---

## 🎬 Next Steps (Session Tasks)

### Task 1: Fix Failing Tests (30 min)
- [ ] Create missing test fixtures
- [ ] Fix embedding export
- [ ] Fix RBAC logic
- [ ] Mock process.exit

### Task 2: Crew System Tests (45 min)
- [ ] Create comprehensive crew collaboration test
- [ ] Test all 11 personas (Picard, Riker, Data, Worf, etc.)
- [ ] Verify prompt template substitution
- [ ] Test LLM provider selection

### Task 3: MCP Tools Tests (30 min)
- [ ] Test story ingestion (Aha)
- [ ] Test branch/PR operations (GitHub)
- [ ] Test database operations
- [ ] Test WorfGate credential resolution

### Task 4: End-to-End Tests (30 min)
- [ ] Full story execution workflow
- [ ] PR revision workflow
- [ ] Autonomous execution validation

### Task 5: Performance & Reporting (20 min)
- [ ] Generate coverage report
- [ ] Measure build artifact sizes
- [ ] Measure critical path execution time
- [ ] Create Phase E summary

---

## 🎓 Lessons Learned (So Far)

✅ **Existing Test Infrastructure:** Solid foundation with Vitest + mocks  
✅ **Test Patterns:** Clear separation of unit vs. integration  
✅ **Environment Modes:** TEST_ENV properly controls mock vs. real services  
⚠️ **Coverage Gaps:** Some newer features lack comprehensive tests  
⚠️ **Fixture Management:** Missing fixture files need to be created  
⚠️ **Process Isolation:** process.exit needs to be guarded in tests  

---

**Phase E Driver:** Build a world-class, production-ready test harness that validates all crew operations, MCP tools, and end-to-end workflows with zero failures and high confidence.

**Readiness Gate:** All tests passing + 80%+ line coverage + CI/CD integration = ✅ GO for deployment
