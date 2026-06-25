#!/usr/bin/env bash
# Provision the Terraform remote-state backend (Observation Lounge architecture, Geordi/Worf).
# Creates the S3 state bucket (SSE-S3, versioning, public-access blocked, TLS-only policy) and the
# DynamoDB lock table. Idempotent: safe to re-run. These back the main terraform state, so they
# CANNOT be terraform-managed (chicken-and-egg) — created here once with admin creds.
#
# Usage:  zsh -ic 'bash scripts/setup-tf-backend.sh'
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
ACCT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="tf-state-${ACCT}-${REGION}"
TABLE="tf-locks"

echo "🛠️  Terraform backend — bucket=${BUCKET} table=${TABLE} region=${REGION}"

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
# Worf: deny any non-TLS access to state.
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<JSON
{"Version":"2012-10-17","Statement":[{
  "Sid":"DenyInsecureTransport","Effect":"Deny","Principal":"*",
  "Action":"s3:*","Resource":["arn:aws:s3:::${BUCKET}","arn:aws:s3:::${BUCKET}/*"],
  "Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}
JSON
)" >/dev/null
echo "  ✅ versioning + SSE-S3 + public-access-block + TLS-only policy"

# ── DynamoDB lock table ──────────────────────────────────────────────────────
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "  ✅ lock table exists"
else
  aws dynamodb create-table --table-name "$TABLE" --region "$REGION" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  echo "  ✅ lock table created (PAY_PER_REQUEST, LockID hash key)"
fi

echo ""
echo "🎉 Backend ready. Next:"
echo "   terraform/bootstrap: npx tsx scripts/worfgate-terraform.ts --dir terraform/bootstrap init"
echo "   main config:         npx tsx scripts/worfgate-terraform.ts init"
