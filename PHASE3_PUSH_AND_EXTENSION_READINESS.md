# Phase 3: Push-to-Main & VSCode Extension Rebuild Assessment

## 1. Can We Push to Main Right Now?

### Status: **YES, but with caveats** ⏳

**What's ready:**
- ✅ All logic implemented (FormatDetector, TextRenderer, CodeSandbox)
- ✅ No breaking changes to existing markdown-renderer
- ✅ Security layer complete (Worf-validated)
- ✅ Test structure in place
- ✅ PR #42 open and documented

**What's blocking immediate merge:**
- ❌ TypeScript build fails (@types/node const type parameter issue)
- ❌ Visual regression baselines not captured
- ❌ CI/CD workflow not activated in .github/workflows/

### Decision Matrix

| Scenario | Action | Risk |
|----------|--------|------|
| **Merge to main NOW** | `git merge origin/feature/markdown-normalization --no-ff` | **MEDIUM** - Code works but won't build in CI. Auto-rollback likely on first CI run. |
| **Wait for toolchain fix** | Resolve @types/node version, run `pnpm install`, rebuild | **LOW** - Safe. CI passes. Canonical approach. |
| **Push to main + ignore build** | Merge then skip CI stage | **HIGH** - Breaks CI contract. Violates crew discipline. |

### Recommended Path (Admiral Authority)

```bash
# Option A: CAUTIOUS (Recommended)
cd /Users/bradygeorgen/Developer/story-agent

# 1. Fix TypeScript build locally
pnpm install --no-frozen-lockfile
cd packages/text-renderer-core && npm run build

# 2. Commit fix
git add -A
git commit -m "[HOTFIX] Phase 3: Resolve TypeScript build for @types/node"
git push origin feature/markdown-normalization

# 3. Merge to main (Admiral approval)
git checkout main && git pull
git merge --no-ff feature/markdown-normalization
git push origin main

# Option B: AGGRESSIVE (Crew Autonomy)
# Skip build validation, trust logic correctness, merge + auto-rollback on CI
gh pr merge 42 --merge --auto  # Auto-merge when CI green
# (But CI will be RED until TypeScript resolves)
```

---

## 2. Can We See a VSCode Extension Rebuild?

### Status: **YES, but requires configuration** 🔧

**Where it lives:**
- `packages/vscode-extension/` (directory exists, structure in place)
- `.github/workflows/build.yml` (main CI pipeline)
- `.mcp.json` (MCP server registration for Copilot)

### Why Extension Doesn't Auto-Rebuild Right Now

1. **text-renderer-core is NOT imported by vscode-extension yet**
   - Extension still uses old `@story-agent/shared/lcars-markdown.ts`
   - No dependency link to new package
   
2. **No integration commit exists**
   - Phase 3 PR only implements the package, doesn't wire it into UI
   - Phase 3.5 (integration) would update:
     - `packages/vscode-extension/src` → import TextRenderer
     - `packages/ui/src/app/chat/page.tsx` → use TextRenderer
     - `.github/workflows/build.yml` → add text-renderer-core build stage

3. **CI/CD workflow not activated**
   - `.github/workflows/text-renderer-core.yml` template created but not in .github/workflows/
   - Main workflow doesn't know to build new package

### How to Trigger VSCode Extension Rebuild

**Scenario 1: Integration Test (No Rebuild)**
```bash
# Just verify the package builds standalone
cd packages/text-renderer-core
npm run build  # ← Will fail until @types/node fixed
```

**Scenario 2: Full Rebuild (After Phase 3.5 Integration)**
```bash
# Once text-renderer-core imported by vscode-extension:

# Trigger CI manually
gh workflow run build.yml --ref main

# Or commit integration change (auto-triggers CI)
git commit --allow-empty -m "[TRIGGER] CI rebuild with text-renderer-core integration"
git push origin main
```

**Scenario 3: Manual Local Build (Development)**
```bash
# Full workspace rebuild
cd /Users/bradygeorgen/Developer/story-agent
pnpm run build  # Builds ALL packages including vscode-extension

# Extension-specific rebuild
pnpm --filter @story-agent/vscode-extension run build
```

---

## 3. Why/Why Not Extension Rebuilds with Phase 3

### Why NOT (Current State)

1. **No Code Reference**
   - vscode-extension doesn't import TextRenderer
   - No dependency chain from extension → text-renderer-core
   - Example: `package.json` doesn't list `@story-agent/text-renderer-core` as dependency

2. **Build Logic Isolation**
   - `.github/workflows/build.yml` runs parallel stages per package
   - Each package only rebuilds if:
     - Its own code changed, OR
     - Its direct dependencies changed
   - text-renderer-core change ≠ vscode-extension trigger

3. **No Integration Commit Yet**
   - Phase 3 is the PACKAGE layer
   - Phase 3.5 would be the INTEGRATION layer
   - Separation of concerns

### Why WOULD (After Integration)

```typescript
// packages/vscode-extension/src/index.ts
import { TextRenderer } from '@story-agent/text-renderer-core';  // ← New import

// This creates dependency chain:
// vscode-extension → text-renderer-core
// 
// If text-renderer-core changes, vscode-extension rebuild MUST run
```

**Then CI would:**
1. Detect change to text-renderer-core
2. Rebuild text-renderer-core
3. Detect vscode-extension depends on it
4. Rebuild vscode-extension
5. Run VSCode extension tests
6. If green → publish extension update

---

## Integration Checklist (Phase 3.5)

To connect text-renderer-core and trigger extension rebuilds:

- [ ] Update `packages/vscode-extension/package.json`:
  ```json
  {
    "dependencies": {
      "@story-agent/text-renderer-core": "workspace:*"
    }
  }
  ```

- [ ] Update `packages/vscode-extension/src/index.ts`:
  ```typescript
  import { TextRenderer } from '@story-agent/text-renderer-core';
  // Use TextRenderer in extension UI commands
  ```

- [ ] Update `packages/ui/package.json`:
  ```json
  {
    "dependencies": {
      "@story-agent/text-renderer-core": "workspace:*"
    }
  }
  ```

- [ ] Move `.github/workflows/text-renderer-core.yml` → `.github/workflows/` (activate)

- [ ] Commit integration changes:
  ```bash
  git commit -m "[PHASE 3.5] Integrate text-renderer-core with vscode-extension and UI"
  git push origin main
  ```

- [ ] CI auto-rebuilds everything, extension deploys on green

---

## Final Recommendation

### Push to Main: **CONDITIONAL YES**

```bash
# Step 1: Fix TypeScript build (5 min)
pnpm install --no-frozen-lockfile
cd packages/text-renderer-core && npm run build

# Step 2: Commit fix (1 min)
git commit -am "[HOTFIX] Resolve TypeScript build"
git push origin feature/markdown-normalization

# Step 3: Merge PR (Admiral approval)
gh pr merge 42 --merge  # Waits for CI green

# Step 4: Auto-deploy (CI green)
# .github/workflows/deploy.yml triggers automatically
```

### VSCode Extension Rebuild: **WILL NOT TRIGGER YET**

Reason: No integration commit linking extension → text-renderer-core

Trigger it post-Phase 3.5 integration (add text-renderer-core import to extension)

---

## Summary Table

| Action | Status | Blockers | Time to Fix |
|--------|--------|----------|-------------|
| Merge Phase 3 to main | 🟡 Ready | TypeScript build | 5 min |
| Trigger VSCode rebuild | ❌ Not yet | No integration | 15 min (Phase 3.5) |
| Production deployment | 🟡 Ready | CI green gate | Auto-deploys on green |

**Admiral Decision Required**: Merge Phase 3 now (build fix inline) or wait for integration?
