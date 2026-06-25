# Deployment Runbook — `pnpm deploy:auto` (crew-blessed)

Derived by the OpenRouter crew in the Observation Lounge (transcript:
[docs/observation-lounge/](observation-lounge/)) and recorded to the RAG system so future
deployments are self-documenting. One command, daemon-free, WorfGate-brokered, with the single
billable step gated.

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

## After apply

```bash
echo 'export REDIS_URL=redis://<elasticache-endpoint>:6379' >> ~/.alexai-secrets/api-keys.env
gh run watch --repo familiarcat/story-agent     # follow the CI deploy
```

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
