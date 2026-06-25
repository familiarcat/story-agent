#!/usr/bin/env bash
# One-time OIDC bootstrap (crew deploy plan, Phase 1) — resolves the chicken-egg:
# CI authenticates via the GitHub OIDC deploy role, but that role is CREATED by terraform.
# So we apply ONLY the OIDC provider + deploy role here, with WorfGate-brokered AWS creds
# (scripts/worfgate-terraform.ts). These IAM resources are NON-billable. After this, set the
# printed ARN as repo var AWS_DEPLOY_ROLE_ARN and CI runs fully automated via OIDC.
#
# Usage: bash scripts/bootstrap-oidc.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# The OIDC provider + deploy role live in terraform/bootstrap with their OWN local state
# (Observation Lounge architecture: admin-only, never touched by CI). Full apply of that dir.
BOOT="--dir terraform/bootstrap"
echo "🛡️  Bootstrapping GitHub OIDC provider + deploy role (terraform/bootstrap, non-billable)…"
npx tsx scripts/worfgate-terraform.ts $BOOT init -input=false
npx tsx scripts/worfgate-terraform.ts $BOOT apply -auto-approve

echo ""
# Extract ONLY the arn:... token, so a stray diagnostic line can never pollute the repo var.
ARN="$(npx tsx scripts/worfgate-terraform.ts $BOOT output -raw github_actions_role_arn 2>/dev/null | grep -oE 'arn:aws:iam::[0-9]+:role/[A-Za-z0-9_+=,.@/-]+' | head -1 || true)"
REPO="${GITHUB_REPO:-familiarcat/story-agent}"
if [ -n "$ARN" ]; then
  echo "✅ Deploy role created: $ARN"
  # Auto-set the remaining repo vars so CI runs via OIDC (AWS_REGION + ECR_REGISTRY may already be set).
  ACCT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
  gh variable set AWS_DEPLOY_ROLE_ARN --repo "$REPO" --body "$ARN" 2>/dev/null && echo "   set repo var AWS_DEPLOY_ROLE_ARN" || echo "   (set manually: gh variable set AWS_DEPLOY_ROLE_ARN --body $ARN)"
  gh variable set AWS_REGION --repo "$REPO" --body "us-east-2" 2>/dev/null && echo "   set repo var AWS_REGION=us-east-2" || true
  [ -n "$ACCT" ] && gh variable set ECR_REGISTRY --repo "$REPO" --body "${ACCT}.dkr.ecr.us-east-2.amazonaws.com" 2>/dev/null && echo "   set repo var ECR_REGISTRY" || true
  echo ""
  echo "🎉 CI deploy is now wired. Next: bootstrap secrets (pnpm run aws-secrets:put) then dispatch"
  echo "   the deploy-fargate workflow with apply=true (billable) to create the Fargate stack."
else
  echo "⚠️ Could not read github_actions_role_arn output. Run: npx tsx scripts/worfgate-terraform.ts output github_actions_role_arn"
fi
echo ""
