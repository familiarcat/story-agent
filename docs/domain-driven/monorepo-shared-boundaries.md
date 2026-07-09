# Monorepo DDD Boundaries — Shared Package Policy

This document codifies the current DDD boundary policy for the monorepo and the immediate guardrails.

## Monorepo contexts

- `packages/mcp-server`: application/domain orchestration and backend adapters.
- `packages/ui`: presentation layer and API facade for web surface.
- `packages/vscode-extension`: editor adapter.
- `packages/shared`: cross-context contracts and carefully scoped shared modules.

## Shared export classification

### 1) Domain contracts (broadly allowed)

- `@story-agent/shared` (types, interfaces, value contracts)
- `@story-agent/shared/skill-theory`

### 2) Integration contracts (allowed with explicit use)

- `@story-agent/shared/aha-client`

### 3) Infrastructure/persistence/security (restricted)

These are backend-oriented and should not spread into presentation/adapter surfaces without review:

- `@story-agent/shared/db`
- `@story-agent/shared/client-security-policy`
- `@story-agent/shared/client-registry`
- `@story-agent/shared/worfgate-credentials`
- `@story-agent/shared/worfgate-credential-providers`
- `@story-agent/shared/iam-identity-center`
- `@story-agent/shared/aha-credentials`

## Immediate guardrail (Now phase)

`pnpm ddd:check` enforces restricted imports for:

- `packages/ui/src/**`
- `packages/vscode-extension/src/**`

CI enforcement is wired in `integration-tests.yml`.

## Temporary exception register

Current known exceptions are intentionally explicit in:

- `scripts/check-ddd-boundaries.ts`

Policy:

- Do not add exceptions unless there is no short-term architectural alternative.
- Every exception needs a reason.
- Exceptions should be reduced over time (Next phase: split shared concerns into narrower subpaths/packages).

## Acceptance criteria (Now)

- No new unapproved imports of restricted `@story-agent/shared/*` subpaths in UI/extension.
- CI fails if a new forbidden import is added.
- Exception list remains small and auditable.
