# Testing Strategy

This document describes the local, integration, and CI/CD testing approach for story-agent.

## Overview

We use a **three-layer testing approach**:

1. **Unit Tests** — Pure functions, no I/O, fast (< 1s), 100% deterministic
2. **Integration Tests (Local)** — Mocked services (Supabase, approved LLM, HTTP), fast, no external deps
3. **Integration Tests (CI/CD)** — Real services (Supabase in AWS, Bayer-approved LLM API, real provider APIs), slow, external deps

### Design Philosophy

- **Local dev** uses mocks for speed and determinism
- **CI/CD pipeline** uses real services for deployed validation
- Environment variable `TEST_ENV` controls the toggle
- Same test code runs in both modes—only the service implementations change

---

## Running Tests

### Unit Tests Only (Fastest)

```bash
# Run unit tests across all packages
pnpm run test:unit

# Or per-package
pnpm --filter @story-agent/shared test:unit
pnpm --filter @story-agent/mcp-server test:unit
```

**Output**: ~3-5 seconds. No external dependencies.

### Integration Tests (Local Mocks)

```bash
# Run integration tests with mocked services (default TEST_ENV=local)
pnpm run test:integration

# Or per-package
pnpm --filter @story-agent/shared test:integration
pnpm --filter @story-agent/mcp-server test:integration
```

**Output**: ~5-10 seconds. Uses in-memory mocks, no network calls.

### All Tests (Unit + Integration)

```bash
# Run both unit and integration tests (default for local dev)
pnpm run test

# Watch mode (automatic rerun on file changes)
pnpm run test:watch
```

### CI/CD Tests (Real Services)

```bash
# Run all tests against real services (only in CI/CD, not locally)
TEST_ENV=integration pnpm run test
# or
pnpm run test:ci
```

**Note**: This requires live credentials:
- `SUPABASE_URL`, `SUPABASE_KEY` (AWS Supabase project)
- `CREW_LLM_PROVIDER`, `CREW_LLM_APPROVED_URL`, `CREW_LLM_APPROVED_KEY` (or `GITHUB_TOKEN` for copilot provider)
- `AHA_API_KEY`, `AHA_DOMAIN` (or other provider creds)

---

## Test Files Organization

### Unit Tests (Pure Logic)

- `packages/shared/src/embedding.test.ts` — Vector math functions
- `packages/mcp-server/src/lib/prompt-engine.test.ts` — Variable substitution, templating
- `packages/mcp-server/src/providers/providers.test.ts` — Provider selection & lifecycle

**Pattern**: `*.test.ts`

```typescript
describe('My Function', () => {
  it('does something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Tests (With Mocks)

- `packages/shared/src/db.integration.test.ts` — Database CRUD ops (mocked Supabase)
- `packages/mcp-server/src/lib/prompt-engine.integration.test.ts` — LLM calls (mocked approved provider)
- `packages/mcp-server/src/providers/providers.integration.test.ts` — HTTP calls (mocked fetch)

**Pattern**: `*.integration.test.ts`

```typescript
import { createMockSupabaseClient, IS_LOCAL_TEST } from '../test/setup.js';

const skipIfNotTesting = IS_LOCAL_TEST ? describe : describe.skip;

skipIfNotTesting('DB Integration', () => {
  let mockClient;
  
  beforeEach(() => {
    mockClient = createMockSupabaseClient();
  });

  it('upserts a story', async () => {
    await mockClient.from('sa_stories').upsert(story);
    expect(mockClient.__mockData['sa_stories']).toContainEqual(story);
  });
});
```

---

## Mock Infrastructure

All mocks live in `test/setup.ts` in each package:

### `packages/shared/test/setup.ts`

```typescript
createMockSupabaseClient()      // In-memory table storage, chainable query builder
createMockApprovedLlmClient()   // Deterministic LLM responses per crew member
createMockFetch()               // Mock HTTP responses for providers
createMockPromptTemplate()      // Stub prompt templates
testFixtures                    // Pre-populated story & memory objects
```

### `packages/mcp-server/test/setup.ts`

```typescript
createMockPromptTemplate(crewId)   // Stub system/user prompts
setupProviderEnv(provider)         // Set env vars for specific provider
clearProviderEnv()                 // Clean up env vars
IS_LOCAL_TEST                      // Boolean: true if TEST_ENV=local
```

---

## Example: Database Integration Test

**File**: `packages/shared/src/db.integration.test.ts`

```typescript
import { createMockSupabaseClient } from '../test/setup.js';

skipIfNotTesting('Database Integration Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
  });

  it('upserts a story into the mock database', async () => {
    const story = {
      story_id: 'STORY-123',
      title: 'Build auth',
      status: 'pending',
    };

    await mockClient.from('sa_stories').upsert(story);

    // Mock stores in __mockData
    expect(mockClient.__mockData['sa_stories']).toContainEqual(
      expect.objectContaining({ story_id: 'STORY-123' })
    );
  });

  it('retrieves a story by ID', async () => {
    mockClient.__mockData['sa_stories'].push(story);
    const result = await mockClient
      .from('sa_stories')
      .select('*')
      .eq('story_id', 'STORY-123')
      .single();

    expect(result.data).toEqual(story);
  });
});
```

---

## Example: LLM Integration Test

**File**: `packages/mcp-server/src/lib/prompt-engine.integration.test.ts`

```typescript
import { createMockApprovedLlmClient } from '../test/setup.js';

skipIfNotTesting('Prompt Engine Integration Tests', () => {
  let mockApprovedLlm;

  beforeEach(() => {
    mockApprovedLlm = createMockApprovedLlmClient();
  });

  it('returns deterministic response for Captain Picard', async () => {
    const response = await mockApprovedLlm.chat.completions.create({
      model: 'claude-3-opus',
      messages: [
        { role: 'system', content: 'You are Captain Picard.' },
        { role: 'user', content: 'Analyze mission picard.' },
      ],
    });

    const content = response.choices[0].message.content;
    expect(content).toContain('Strategic mission alignment achieved');
    expect(content).toContain('Executive authority affirmed');
  });
});
```

---

## Example: Provider HTTP Integration Test

**File**: `packages/mcp-server/src/providers/providers.integration.test.ts`

```typescript
import { createMockFetch } from '../test/setup.js';

skipIfNotTesting('Provider HTTP Tests', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = createMockFetch();
    global.fetch = mockFetch;
  });

  it('returns mock Aha story response', async () => {
    const response = await fetch('https://test.aha.io/api/v1/stories');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stories[0].reference_num).toBe('STORY-123');
  });
});
```

---

## Vitest Configuration

Both `packages/shared/vitest.config.ts` and `packages/mcp-server/vitest.config.ts` are configured to:

1. Load `test/setup.ts` before running tests (`setupFiles`)
2. Include both unit and integration tests (`include`)
3. Resolve `.js` imports to `.ts` source (ESM pattern, `extensionAlias`)
4. Auto-reset mocks after each test (`mockReset: true`)

```typescript
export default defineConfig({
  resolve: {
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    mockReset: true,
    restoreMocks: true,
  },
});
```

---

## Switching to Real Services (CI/CD Only)

When `TEST_ENV=integration`:

1. **Test setup** reads the env var
2. **Mock factories** check `IS_LOCAL_TEST`
3. **If false**: return real client (requires live credentials)
4. **If true**: return mock client (default for local dev)

```typescript
// In test/setup.ts
export const TEST_ENV = process.env.TEST_ENV || 'local';
export const IS_LOCAL_TEST = TEST_ENV === 'local';

export function createMockSupabaseClient() {
  if (!IS_LOCAL_TEST && process.env.SUPABASE_URL) {
    // Return real Supabase client (import { createClient } from '@supabase/supabase-js')
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  // Return mock client (in-memory)
  return { ... };
}
```

---

## Local Development Workflow

```bash
# 1. Install dependencies
pnpm install

# 2. Start coding, run tests frequently
pnpm run test:watch

# 3. Before committing, run full test suite
pnpm run test

# 4. Run typecheck
pnpm run typecheck

# 5. Push to GitHub → CI/CD runs test:ci with real services
```

---

## CI/CD Integration (AWS ai-enterprise-os)

The GitHub Actions workflow in `ai-enterprise-os` will:

1. Check out story-agent codebase
2. Install dependencies
3. Run `pnpm run test:ci` with `TEST_ENV=integration`
4. Use AWS Supabase project credentials (from Secrets Manager)
5. Call real Aha/Jira/GitHub APIs
6. Report pass/fail to GitHub

See `.github/workflows/story-agent-test.yml` in ai-enterprise-os for details.

---

## Key Points

✅ **Local dev**: `pnpm run test` — Unit + mocked integration, < 10s  
✅ **Unit only**: `pnpm run test:unit` — Pure logic, < 5s  
✅ **Integration only**: `pnpm run test:integration` — Mocked services, < 10s  
✅ **CI/CD**: `TEST_ENV=integration pnpm run test` — Real services, requires credentials  
✅ **Watch mode**: `pnpm run test:watch` — Auto-rerun on changes  

---

## Troubleshooting

**Tests not running?**
```bash
# Check TEST_ENV is set correctly
echo $TEST_ENV  # Should be 'local' or 'integration'

# Re-run with explicit env
TEST_ENV=local pnpm run test:integration
```

**Mock not being used?**
```bash
# Ensure test file uses skipIfNotTesting pattern
const skipIfNotTesting = IS_LOCAL_TEST ? describe : describe.skip;
skipIfNotTesting('My Test', () => { ... });
```

**Integration tests failing?**
```bash
# Check Supabase/LLM credentials if TEST_ENV=integration
echo $SUPABASE_URL
echo $CREW_LLM_PROVIDER $CREW_LLM_APPROVED_URL

# Or use local mocks instead
TEST_ENV=local pnpm run test:integration
```

---

## Future Enhancements

- [ ] Add testcontainers for real Postgres during local integration tests
- [ ] Add mock request recording/playback for provider APIs
- [ ] Add performance benchmarking suite
- [ ] Add E2E tests for MCP server → client communication
- [ ] Add UI component tests with mocked MCP calls
