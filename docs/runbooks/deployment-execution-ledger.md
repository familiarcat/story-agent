# Deployment Execution Ledger — Successes, Failures, and Verification

This ledger captures real deployment outcomes so the team can quickly learn from what worked and what failed.
It is written for git history and RAG ingestion.

## Scope

- Workflow: `deploy-fargate`
- Repository: `familiarcat/story-agent`
- Observation window: 2026-07-08 through 2026-07-09 UTC

## Historical outcomes (evidence)

| Run ID | Event | Status | Conclusion | Notes |
|---|---|---|---|---|
| 28985324865 | workflow_dispatch | completed | success | Full deploy success after manual dispatch; all jobs green |
| 28985308062 | push | completed | success | Auto deploy success for commit `5392498` |
| 28984418829 | workflow_dispatch | completed | success | Prior deploy success used as red-alert reference |
| 28979945750 | workflow_dispatch | completed | success | Successful historical baseline |
| 28979913060 | workflow_dispatch | completed | cancelled | Cancelled run; use as explicit failure/cancel taxonomy example |

## Job-level success reference (`28985324865`)

All critical jobs completed successfully:

- `detect` — success
- `security_gate` — success
- `build_mcp` — success
- `build_ui` — success
- `deploy` — success

## Failure and cancel taxonomy

### Type A: Cancelled run

- Example: `28979913060`
- Signal: workflow `conclusion=cancelled`
- Operational meaning: deployment did not fail by health criteria but did not reach completion.

### Type B: Terminal interaction disruption

- Example observed: `gh run watch` / `gh run view` invoked from deploy helper can open alternate buffer and cause operator interruption (`exit 130`).
- Signal: command aborted while deploy run continues remotely.
- Mitigation:
  - Never use interactive watch commands inside automation loops.
  - Use non-interactive API polling only:
    - `TERM=dumb GH_PAGER=cat PAGER=cat gh api ...`

### Type C: Local verification blockers (not cloud deploy failures)

- Build blocker: `pnpm build` guard refuses when dev server is active on `:3000`.
- E2E blocker: missing `@playwright/test` dependency prevents test bootstrap.

## Canonical post-deploy verification workflow

Run these in order.

1. Non-interactive deploy status check:

```bash
TERM=dumb GH_PAGER=cat PAGER=cat gh api repos/familiarcat/story-agent/actions/runs/<RUN_ID> \
  --jq '{status: .status, conclusion: .conclusion, updated_at: .updated_at, html_url: .html_url}'
```

2. Non-interactive job check:

```bash
TERM=dumb GH_PAGER=cat PAGER=cat gh api repos/familiarcat/story-agent/actions/runs/<RUN_ID>/jobs \
  --jq '.jobs[] | {name: .name, status: .status, conclusion: .conclusion}'
```

3. Local build verification when dev server is active:

```bash
FORCE_BUILD=1 pnpm build
```

4. End-to-end dashboard check (deployed ALB):

```bash
BASE_URL=http://story-agent-alb-651393427.us-east-2.elb.amazonaws.com \
  npx playwright test tests/e2e/core/dashboard.spec.ts --reporter=line
```

## Build and E2E findings captured in this cycle

### Build

- `pnpm build` failed intentionally due to guardrail:
  - Cause: dev server listening on `:3000`
  - Expected remediation: stop dev stack or use `FORCE_BUILD=1`

### E2E

- First run prompted package installation and then failed with:
  - `Cannot find module '@playwright/test'`
- Required remediation:
  - Add missing dependency to workspace devDependencies before running Playwright tests.

## Go/No-Go Criteria

Go:

- Deploy workflow `status=completed` and `conclusion=success`
- Jobs `security_gate`, `build_mcp`, `build_ui`, `deploy` each `conclusion=success`
- Post-deploy local validation completed:
  - Build passes (`pnpm build` or `FORCE_BUILD=1 pnpm build` when dev server intentionally running)
  - Dashboard E2E passes against deployed ALB

No-Go:

- Any critical job non-success
- Workflow cancelled without an immediately succeeding replacement run
- E2E fails due to runtime/service accessibility (after dependency/tooling issues are resolved)

## RAG update procedure

After updating this ledger and related runbooks:

```bash
pnpm docs:ingest
```

Then commit documentation updates so git history and RAG are aligned.
