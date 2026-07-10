# RFC-0000: Schema Extension Template

> Crew phased plan Phase 1 — Innovation team (Troi). No undocumented extension enters the codebase.
> Copy this file to `docs/rfc/NNNN-short-title.md`, fill every section, and open a PR. WorfGate
> (Worf) is the mitigation owner for schema drift: the WGIM suite
> (`packages/shared/src/schemas/aha-events.schema.test.ts`) must be updated in the same PR as any
> contract change.

## Status

`draft | review | approved | rejected | superseded-by-NNNN`

## Summary

One paragraph: what is being added/changed in the schema contract
(`packages/shared/src/schemas/aha-events.schema.ts`) and why.

## Motivation

Which team/goal needs this (link the RAG memory or Aha story). What breaks or stays impossible
without it.

## Contract change

- **Version impact**: `minor` (additive: new enum value, new optional meta key) or `major`
  (breaking: removed/renamed field, changed type, new required field). State the new
  `AHA_EVENTS_SCHEMA_VERSION`.
- **Exact diff**: list every array/interface touched, e.g. `AHA_META_KEYS += 'epic_id'`.
- **Emitters affected**: which write paths start emitting the new shape
  (dashboard API routes / MCP tools / extension).
- **Consumers affected**: which pollers/validators must tolerate it (UI `useAhaEvents`, WGIM,
  T.R.E. harness).

## Validation plan (WGIM)

New/updated test cases in `aha-events.schema.test.ts` — the enum-inventory pin test WILL fail on
any contract change; updating it is the explicit act of acknowledging the version bump.

## Rollout

Order of operations across surfaces (emit-tolerant consumers first, emitters last), and the
fallback behavior for mixed-version windows (`isCompatibleSchemaVersion` gate).

## Decision

Picard's ruling with date, plus dissents worth recording. Store the outcome to crew RAG
(tags: `rfc`, `schema-contract`).
