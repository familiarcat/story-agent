#!/bin/bash
# Bootstrap AWS Secrets Manager with the Aha! credentials from the local environment
# (~/.alexai-secrets via ~/.zshrc). Idempotent: creates the secret or adds a new version.
# The key value is never printed. After this, set AWS_AHA_SECRET_ID on the task + grant
# the task role secretsmanager:GetSecretValue, and resolveAhaCredentials() uses AWS as SSOT.
#
# Usage:  zsh -ic 'bash scripts/aws-secrets-put.sh [secret-name]'   (default: story-agent/aha)
set -euo pipefail

SECRET_NAME="${1:-story-agent/aha}"
: "${AHA_DOMAIN:?AHA_DOMAIN not set — source ~/.zshrc first}"
: "${AHA_API_KEY:?AHA_API_KEY not set — source ~/.zshrc first}"

command -v aws >/dev/null 2>&1 || { echo "❌ aws CLI not found. Install + 'aws configure' first."; exit 1; }
command -v jq  >/dev/null 2>&1 || { echo "❌ jq not found."; exit 1; }

# Build the secret payload (matches resolveAhaCredentials: AHA_DOMAIN + AHA_API_KEY).
PAYLOAD=$(jq -n --arg d "$AHA_DOMAIN" --arg k "$AHA_API_KEY" '{AHA_DOMAIN:$d, AHA_API_KEY:$k}')

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ AWS credentials not configured/authorized (aws sts get-caller-identity failed)."; exit 1
fi

if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value --secret-id "$SECRET_NAME" --secret-string "$PAYLOAD" >/dev/null
  echo "✅ Updated secret '$SECRET_NAME' (new version) in region ${AWS_REGION:-$(aws configure get region)}"
else
  aws secretsmanager create-secret --name "$SECRET_NAME" \
    --description "Story Agent — Aha! API credentials (single source of truth)" \
    --secret-string "$PAYLOAD" >/dev/null
  echo "✅ Created secret '$SECRET_NAME' in region ${AWS_REGION:-$(aws configure get region)}"
fi

echo ""
echo "Next steps to make AWS the source of truth:"
echo "  1) On the runtime image:  pnpm add @aws-sdk/client-secrets-manager"
echo "  2) Task env:              AWS_AHA_SECRET_ID=$SECRET_NAME  (+ AWS_REGION)"
echo "  3) Task IAM role:         secretsmanager:GetSecretValue on this secret's ARN"
echo "  → resolveAhaCredentials() will then report source=aws-secrets-manager."
