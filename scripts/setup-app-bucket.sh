#!/usr/bin/env bash
# Provision (or discover) the Story Agent APPLICATION S3 bucket — the root for client/project/
# sprint content and any static crew-member file that RAG cannot accommodate.
#
# This is DISTINCT from scripts/setup-tf-backend.sh, which provisions the Terraform STATE bucket.
# That script's `tf-state-${ACCT}-${REGION}` naming inspired this one, but application data has no
# business living in the state bucket.
#
# Fix for the "missing bucket name in the recommended scripts" gap: the bucket name is no longer a
# value someone has to remember/hardcode. This script DERIVES it deterministically from the AWS
# account + region via `aws sts get-caller-identity`, creates the bucket if it doesn't exist yet
# (idempotent, safe to re-run), lays down the recommended key-prefix skeleton, and writes the
# resolved name to ~/.alexai-secrets/api-keys.env as STORY_AGENT_S3_BUCKET — the same file every
# other WorfGate-brokered credential in this repo lives in (see worfgate-credentials.ts), so the
# crew, the CLI, and the deployed MCP server all resolve the SAME bucket without any script needing
# a hardcoded name.
#
# Usage:  zsh -ic 'bash scripts/setup-app-bucket.sh'
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
ACCT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${STORY_AGENT_S3_BUCKET:-story-agent-${ACCT}-${REGION}}"
SECRETS_DIR="$HOME/.alexai-secrets"
SECRETS_FILE="$SECRETS_DIR/api-keys.env"

echo "🛰️  Story Agent application bucket — bucket=${BUCKET} region=${REGION}"

# ── S3 bucket ───────────────────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  ✅ bucket exists"
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
  fi
  echo "  ✅ bucket created"
fi

aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled >/dev/null
aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true >/dev/null
aws s3api put-bucket-tagging --bucket "$BUCKET" --tagging \
  'TagSet=[{Key=project,Value=story-agent},{Key=purpose,Value=application-data}]' >/dev/null
echo "  ✅ versioning + SSE-S3 + public-access-block + project tags"

# ── Recommended key-prefix skeleton (see packages/shared/src/s3-structure.ts for the same layout
#    expressed as key-builder helpers the app code imports — this script and that module MUST agree). ──
for PREFIX in \
  "clients/" \
  "static/crew/" \
  "static/design-tokens/" \
  "_skeleton-readme.txt"
do
  if [ "$PREFIX" = "_skeleton-readme.txt" ]; then
    echo "Story Agent S3 layout: clients/{clientId}/projects/{projectId}/sprints/{sprintId}/... ; static/crew/{crewId}/... for files RAG cannot hold." \
      | aws s3 cp - "s3://${BUCKET}/README.txt" >/dev/null
  else
    aws s3api put-object --bucket "$BUCKET" --key "$PREFIX" >/dev/null
  fi
done
echo "  ✅ key-prefix skeleton written (clients/, static/crew/, static/design-tokens/, README.txt)"

# ── Persist the resolved name for every lane (CLI, agent-core, deployed MCP server) to pick up ──
mkdir -p "$SECRETS_DIR"
touch "$SECRETS_FILE"
if grep -q '^export STORY_AGENT_S3_BUCKET=' "$SECRETS_FILE" 2>/dev/null; then
  # Idempotent update — replace the existing line rather than duplicating it.
  perl -i -pe "s{^export STORY_AGENT_S3_BUCKET=.*}{export STORY_AGENT_S3_BUCKET=\"${BUCKET}\"}" "$SECRETS_FILE"
  echo "  ✅ updated existing STORY_AGENT_S3_BUCKET entry in ${SECRETS_FILE}"
else
  {
    echo ""
    echo "# Story Agent application bucket (set by scripts/setup-app-bucket.sh — do not hand-edit the name,"
    echo "# re-run the script if the account/region changes)."
    echo "export STORY_AGENT_S3_BUCKET=\"${BUCKET}\""
  } >> "$SECRETS_FILE"
  echo "  ✅ wrote STORY_AGENT_S3_BUCKET to ${SECRETS_FILE}"
fi

echo ""
echo "🎉 Application bucket ready: s3://${BUCKET}"
echo "   Source ~/.zshrc (or open a new shell) to pick up STORY_AGENT_S3_BUCKET."
echo "   WorfGate resolves it via resolveWorfGateCredential('STORY_AGENT_S3_BUCKET', { operation: 'aws:deploy', ... })."
