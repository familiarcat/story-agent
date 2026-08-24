# @crew/validate-system — Deployment Checklist

Use this checklist when deploying `@crew/validate-system` into CI/CD, crew workflows, and MCP operations.

## Pre-Deployment Verification

- [x] Package structure verified
  - [x] `src/main.zsh` (orchestrator)
  - [x] `src/validate_path.zsh` (core logic)
  - [x] `bin/validate-system.zsh` (CLI)
  - [x] `tests/` (full test suite)
  - [x] `docs/` (documentation)
  - [x] `package.json` (npm metadata)

- [x] All test suites created and documented
  - [x] Boundary tests
  - [x] Traversal attack tests
  - [x] Symlink escape tests
  - [x] Adversarial attack tests

- [x] Documentation complete
  - [x] README.md
  - [x] RAG_REFERENCE.md (threat model + architecture)
  - [x] INTEGRATION.md (how to use)
  - [x] CHANGELOG.md
  - [x] This checklist

- [x] CI/CD pipeline configured
  - [x] GitHub Actions workflow: `validate-system.yml`
  - [x] Test stages: boundary, traversal, symlink, adversarial
  - [x] Security audit stage
  - [x] Package integrity verification

## Local Testing (Before Merging)

Run these commands to validate the package locally:

```bash
cd ~/Developer/story-agent

# 1. Test core functionality
zsh packages/validate-system/tests/boundaries.zsh
zsh packages/validate-system/tests/traversal.zsh
zsh packages/validate-system/tests/symlink.zsh
zsh packages/validate-system/tests/adversarial.zsh

# 2. Run full suite via pnpm
pnpm --filter @crew/validate-system test

# 3. Verify CLI works
zsh packages/validate-system/bin/validate-system.zsh --help
zsh packages/validate-system/bin/validate-system.zsh /tmp/test-file.txt

# 4. Test sourcing the module
zsh -c 'source packages/validate-system/src/main.zsh && validate_path /tmp/test'
```

## GitHub Actions Integration

- [x] Workflow file created: `.github/workflows/validate-system.yml`
- [x] Triggers: `push` to main/dev, `pull_request`, path-based filtering
- [x] Jobs:
  - [x] `test` — Run all test suites
  - [x] `security-audit` — Check for hardcoded secrets, boundary violations
  - [x] `package-integrity` — Verify required files exist

**To activate in GitHub:**
1. Push this branch to GitHub
2. PR automatically triggers workflow
3. All checks must pass before merge
4. Merge CI-gates the deployment

## Monorepo Integration

- [x] Package registered: `@crew/validate-system`
- [x] Workspace: `packages/validate-system/`
- [x] npm scripts:
  - [x] `pnpm --filter @crew/validate-system test`
  - [x] `pnpm --filter @crew/validate-system run build`
  - [x] `pnpm --filter @crew/validate-system run lint`

**Verify monorepo sees it:**
```bash
pnpm ls -r @crew/validate-system
```

Should output the package path.

## MCP Integration

### Story Agent MCP Server

- [ ] Reference `@crew/validate-system` in `packages/mcp-server/package.json` dependencies
- [ ] Import `validatePath` in filesystem operation tools
- [ ] Wrap all user-provided paths with `validate_path()`
- [ ] Add integration test for each tool

### Example tool registration

```typescript
// packages/mcp-server/src/tools/file-operations.ts
import { tool } from '@modelcontextprotocol/sdk';
import { z } from 'zod';

// Add to server.tool() registration:
server.tool(
  'read_file_safe',
  'Read file with security validation',
  z.object({ path: z.string() }),
  async ({ path }) => {
    const safePath = validatePath(path);  // Validates before access
    // ... proceed safely
  }
);
```

## Crew Integration

### Update crew-mission-pipeline

- [ ] Reference `@crew/validate-system` in crew initialization
- [ ] All crew members with filesystem access use `validate_path()`
- [ ] Document in crew handbook

### Example crew task

```bash
crew_safe_operation() {
  local user_input="$1"
  
  # Load validator
  source "${CREW_VALIDATE_SYSTEM_ROOT}/src/main.zsh"
  
  # Validate before proceeding
  SAFE_PATH="$(validate_path_or_die "$user_input")"
  
  # Now safe to operate
  cat "$SAFE_PATH"
}
```

## VS Code Story Agent Extension

- [ ] Update `fileSystem.ts` to use `validatePath()`
- [ ] Set `CREW_VALIDATE_SYSTEM_ROOT` env var in extension launcher
- [ ] Test file read/write operations
- [ ] Add unit tests for path validation integration

## Documentation & RAG

- [ ] RAG ingestion: `docs/RAG_REFERENCE.md` added to crew memory
- [ ] Crew can recall: "validate-system security policy"
- [ ] Worf (Security lead) briefed on threat model
- [ ] O'Brien (Infrastructure lead) owns maintenance

## Rollback Plan

If issues arise post-deployment:

1. **Revert package** (if not yet widely used):
   ```bash
   git revert HEAD~1  # Revert the package commit
   git push
   ```

2. **Disable validation** (if already integrated):
   ```bash
   export VALIDATE_SYSTEM_ENABLED=0
   ```

3. **Contact on-call** (Worf/O'Brien) for security assessment

## Post-Deployment Validation

After the first merge to `main`:

- [ ] CI/CD pipeline passed all checks
- [ ] MCP tools reference the package (or scheduled for next sprint)
- [ ] Crew can access the validator
- [ ] RAG documentation ingested
- [ ] No regression in existing functionality
- [ ] Team briefed on new security boundary

## Monitoring & Maintenance

### Quarterly Security Audit
- Review threat model against new attack vectors
- Test adversarial suite
- Update documentation

### On-Call Escalation
- Security violation detected by validator → log to Worf
- Symlink attack attempt → investigate and update tests
- New encoding trick discovered → add to adversarial suite

### Version Updates
- Patch releases: Bug fixes, test improvements
- Minor releases: New policy/defense mechanism
- Major releases: API changes

---

**Deployment Owner:** O'Brien (Infrastructure)  
**Security Owner:** Worf (Security)  
**Documentation Owner:** RAG / Crew Handbook  
**Review Cycle:** Post-deployment (1 week), then quarterly
