# Changelog

## 2026-06 — Autonomous crew system + Symphonic MCP

A sustained arc turning Story Agent into a self-hosted, self-learning autonomous coding assistant
driven by the OpenRouter crew (Anthropic a pool member, not the default). Highlights:

### Agent-core — unified autonomous assistant
- One agentic tool-calling loop powering **CLI (`story-agent`), `/agent` SSE API, and VS Code** —
  thin adapters over a single core. Quark cost-optimized per-turn model selection.
- Local hands: read/write/edit/`apply_patch` (atomic multi-file), search, shell, git.
- Hardening: retry/backoff (PROD-11), auto-escalation to the crew on hard tasks (PROD-15),
  cost observatory + soft spend cap (PROD-13), per-invocation `/agent` audit (PROD-12).

### WorfGate — security spine (Worf owns it)
- green/yellow/red local-ops governor with autonomous remediation (path-clamp, `--force` downgrade).
- **Credential Broker** with a provider chain: env → Vault → AWS Secrets Manager → Ocelot(stub).
  Governed by crew identity, audited, secret values never logged.
- **Unconditional controlled-data hard block** for regulated/defense clients (not overridable).

### Clients — dynamic, hierarchical, never hardcoded
- Clients live in the Supabase `clients` table (+ RAG), hydrated to a sync cache.
- Model: **familiarcat (firm) → clients → projects**. Onboarded live: Jonah (commercial),
  Bayer (regulated/defense). "Bayer" removed as a hardcoded sample — now just data.
- Named **security postures** (defense / regulated / industry-secret / commercial) — config-over-code.

### Skills — every tool is self-describing
- **5W1H Skill Theory** (who/what/when/where/why/how) for all 72 MCP tools, crew-authored on the
  cheapest model; emitted to MCP clients as `ToolAnnotations`.

### Symphonic MCP (crew-derived in the Observation Lounge) — all 5 layers realized
1. Security spine (WorfGate pre-flight gate) · 2. Cost-aware routing (Quark, **frugal by default**) ·
3. Self-composing tool **lens** · 4. Self-learning RAG **feedback cards** · 5. Claude Code UI surface
(Symphony card + lens event + `/symphony` posture panel).

### RAG — real embeddings (cheapest viable)
- Pluggable `embed()` → OpenAI `text-embedding-3-small` (64-dim Matryoshka, no DB change) with a
  graceful SHA-hash fallback. Crew-evaluated as cheapest viable; local/regulated path documented.

### Aha! PM + deployment
- Aha nomenclature aligned to firm → client(product) → project(initiative); live restructure applied.
- **Automated daemon-free Docker deploy**: CI buildx → ECR → Terraform plan pinned to the built
  digest; one-command OIDC bootstrap (`pnpm deploy:bootstrap-oidc`) that wires the repo vars.
- `pnpm activation:status` reports what's set/missing via WorfGate (presence-only).

### Dogfooding & cost
- Substantive reasoning runs through the OpenRouter crew (mission pipeline / Observation Lounge),
  frugal by default; Claude Code orchestrates. Codified in [CLAUDE.md](CLAUDE.md).

_All changes verified (builds clean; 62/63 mcp unit tests — 1 pre-existing). Live external actions
(cloud DDL, deploy, secrets) remain explicitly user-authorized by design._
