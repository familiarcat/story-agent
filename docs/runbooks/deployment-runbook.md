# Deployment Runbook

One-command, daemon-free, WorfGate-brokered deploy to AWS Fargate, with the single billable step
gated. Derived by the OpenRouter crew in the Observation Lounge (transcript:
[docs/observation-lounge/](../observation-lounge/)) and recorded to the RAG system
(`automated-docker-deploy`) so future deployments are self-documenting.

Every deploy builds ARM64 images in CI, pushes to ECR, and applies Terraform with the **exact
built image digest** — no local Docker, no `:latest` drift.

Related migration guidance:
- [mcp-tool-compatibility-migration.md](mcp-tool-compatibility-migration.md) — MCP tool-name compatibility rollout, tests, and terminal-verified deploy sequence.
- [deployment-execution-ledger.md](deployment-execution-ledger.md) — historical success/failure outcomes, go/no-go criteria, and post-deploy build/E2E verification workflow.

## TL;DR

```bash
zsh -ic 'pnpm deploy:auto'              # safe: presence check → OIDC → secrets → plan
zsh -ic 'pnpm deploy:auto -- --apply'   # also dispatch the billable CI apply (creates AWS infra)
```

`zsh -ic` ensures `~/.zshrc` sources `~/.alexai-secrets` so WorfGate can broker every credential
from `process.env`. Secrets are never printed, never copied, never committed.

## Phases (idempotent, ordered)

| # | Phase | Owner | Billable | What |
|---|-------|-------|----------|------|
| 0 | Activation status | Worf | no | `activation:status` — presence-only check, no secret values |
| 1 | OIDC bootstrap | Geordi/Data | no | IAM OIDC provider + deploy role; auto-sets repo vars. Skipped if `AWS_DEPLOY_ROLE_ARN` already set |
| 2 | Secrets → AWS | Worf/O'Brien | no | `aws-secrets:put` pushes secrets to AWS Secrets Manager (idempotent) |
| 3 | Terraform plan | Geordi | no | `tf:plan` preview, AWS creds brokered **through WorfGate** |
| 4 | **Apply** | Geordi/Quark | **YES** | only with `--apply`: dispatches `deploy.yml apply=true`; CI builds + **digest-pins** images |
| 5 | Post-apply | O'Brien | no | set `REDIS_URL` to the ElastiCache endpoint |

## Phase details

### Phase 1 — OIDC bootstrap (one-time, USER-GATED, non-billable)

The CI deploy role is created *by* Terraform, but CI needs it to authenticate — so bootstrap it
once with WorfGate-brokered AWS creds (creates only the OIDC provider + IAM role, no billable
infra). `pnpm deploy:auto` runs this automatically; to run it standalone:

```bash
bash scripts/bootstrap-oidc.sh        # or: pnpm deploy:bootstrap-oidc
```

It prints `AWS_DEPLOY_ROLE_ARN` and auto-sets the GitHub repo **variables** (set them manually if
needed):
- `AWS_DEPLOY_ROLE_ARN` = (printed)
- `AWS_REGION` = `us-east-2`
- `ECR_REGISTRY` = `<account>.dkr.ecr.us-east-2.amazonaws.com`

Until these are set, the CI deploy job skips cleanly — no red CI.

### Phase 2 — Secrets

Bootstrap the `story-agent/aha` + `story-agent/runtime` secrets before the first apply
(`pnpm run aws-secrets:put`, idempotent).

### Phase 4 — CI pipeline (hands-free)

`.github/workflows/deploy.yml` runs on push (paths: packages/docker/terraform) and on
`workflow_dispatch`:
1. OIDC auth (assumes `AWS_DEPLOY_ROLE_ARN`) → ECR login
2. `docker buildx` ARM64 build + push (mcp + ui), GHA layer cache
3. Terraform plan **pinned to the freshly-built digests** (`-var mcp_image=…@sha256:…`)
4. `terraform apply` — **gated on `workflow_dispatch` input `apply=true`** (push runs only build+plan)

So routine pushes build+plan automatically; the billable apply stays an explicit dispatch. The
first `apply=true` dispatch is billable — it creates the 32-resource stack.

### Phase 5 — Post-apply

Put the ElastiCache endpoint into Secrets Manager `story-agent/runtime` as `REDIS_URL`, and make
it available locally:

```bash
echo 'export REDIS_URL=redis://<elasticache-endpoint>:6379' >> ~/.alexai-secrets/api-keys.env
gh run watch --repo familiarcat/story-agent     # follow the CI deploy
```

## Principles (from the crew)

- **WorfGate is the sole credential boundary** (Worf, Data): all AWS/ECR/Terraform access flows
  through `~/.alexai-secrets`, scoped per phase, audited, never duplicated into CI plaintext.
- **Three acts** (Riker, Picard): bootstrap (non-billable) → build (CI-owned, never local) →
  promote (billable, explicit gate). You always know which act you're in and what it costs.
- **Plan before apply** (Geordi, Data): each step is idempotent and gates the next; re-runs never
  double-bill or drift. Images pinned by `sha256` digest for reproducibility.
- **Cost discipline** (Quark): the only billable step stays behind `--apply`; CI does the build, not
  your laptop; no idle infra.
- **Verify + fail fast** (Crusher): health checks post-deploy; rollback on breach.

## Local alternative (if you prefer building locally)

Start Docker Desktop, then `pnpm tf apply` (WorfGate-brokered) after a local
`docker buildx … --push`. The CI path is preferred — no daemon needed.

## Re-deliberate / re-record

To re-run the crew deliberation and refresh the RAG runbook memory:

```bash
zsh -ic 'pnpm deploy:mission'
```

## Live cloud endpoints (single source of truth)

The deployed crew (Fargate) serves the agent-core endpoints via the ALB, backed by the same cloud
Supabase RAG — so local and cloud share one crew + memory.

- Base: `http://story-agent-alb-651393427.us-east-2.elb.amazonaws.com`
- `GET /symphony` — posture · `POST /chat` — canonical Quark chat · `POST /agent` — autonomous loop · `/mcp`,`/rag`,`/ws`

Point the surfaces at cloud (both auto-fall-back to local if unreachable):
- **VS Code:** set in `.vscode/settings.json` → `storyAgent.chat.agentServiceUrl` (done for this repo).
- **Web UI:** launch with `STORY_AGENT_AGENT_URL=<ALB base>` so `/api/chat` proxies to the cloud crew.

Ops note (Fargate vCPU quota = 2): MCP/UI use stop-before-start (`min-healthy=0`, AZ-rebalancing off)
+ a 60s WS drain so a rolling deploy fits the quota. After the pending quota increase lands, raise
min-healthy and bump MCP back to 2 vCPU for zero-downtime rollouts.
