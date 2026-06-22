# Automated Docker Deployment — Runbook

Fully-automated, daemon-free deploy to AWS Fargate: every `git push` (with deploy enabled) builds
ARM64 images in CI, pushes to ECR, and applies Terraform with the **exact built image digest** — no
local Docker, no `:latest` drift. Derived by the crew (RAG: `automated-docker-deploy`).

## Phase 1 — OIDC bootstrap (one-time, USER-GATED, non-billable)

The CI deploy role is created *by* Terraform, but CI needs it to authenticate — so bootstrap it
once with WorfGate-brokered AWS creds (creates only the OIDC provider + IAM role, no billable infra):

```bash
bash scripts/bootstrap-oidc.sh        # or: pnpm deploy:bootstrap-oidc
```

It prints `AWS_DEPLOY_ROLE_ARN`. Then set the GitHub repo **variables**:
- `AWS_DEPLOY_ROLE_ARN` = (printed)
- `AWS_REGION` = `us-east-2`
- `ECR_REGISTRY` = `<account>.dkr.ecr.us-east-2.amazonaws.com`

(Until these are set, the deploy job skips cleanly — no red CI.)

## Phase 2 — Automated pipeline (CI, hands-free thereafter)

`.github/workflows/deploy.yml` then runs on push (paths: packages/docker/terraform) and on
`workflow_dispatch`:
1. OIDC auth (assumes `AWS_DEPLOY_ROLE_ARN`) → ECR login
2. `docker buildx` ARM64 build + push (mcp + ui), GHA layer cache
3. Terraform plan **pinned to the freshly-built digests** (`-var mcp_image=…@sha256:…`)
4. `terraform apply` — **gated on `workflow_dispatch` input `apply=true`** (push runs only build+plan)

So routine pushes build+plan automatically; the billable apply stays an explicit dispatch.

## Phase 3 — First full deploy + post-apply

1. Dispatch `deploy-fargate` with `apply=true` (billable — creates the 32-resource stack).
2. After apply: put the ElastiCache endpoint into Secrets Manager `story-agent/runtime` as `REDIS_URL`.
3. Bootstrap `story-agent/aha` + `story-agent/runtime` secrets first (`pnpm run aws-secrets:put`).

## Local alternative (if you prefer building locally)

Start Docker Desktop, then `pnpm tf apply` (WorfGate-brokered) after a local `docker buildx … --push`.
The CI path is preferred — no daemon needed.
