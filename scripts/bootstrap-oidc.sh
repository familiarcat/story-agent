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

echo "🛡️  Bootstrapping GitHub OIDC provider + deploy role (targeted, non-billable)…"
npx tsx scripts/worfgate-terraform.ts apply -auto-approve \
  -target='aws_iam_openid_connect_provider.github[0]' \
  -target='aws_iam_role.github_actions' \
  -target='aws_iam_role_policy.github_deploy'

echo ""
echo "✅ Done. Set these GitHub repo variables, then deploys run automatically via OIDC:"
echo "   AWS_REGION         = us-east-2"
echo "   ECR_REGISTRY       = <account>.dkr.ecr.us-east-2.amazonaws.com"
echo -n "   AWS_DEPLOY_ROLE_ARN = "
npx tsx scripts/worfgate-terraform.ts output -raw github_actions_role_arn || echo "(run: npx tsx scripts/worfgate-terraform.ts output github_actions_role_arn)"
echo ""
