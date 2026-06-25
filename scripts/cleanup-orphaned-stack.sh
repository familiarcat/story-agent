#!/usr/bin/env bash
# Clean up the orphaned Story Agent stack resources left by the pre-backend CI applies
# (Observation Lounge: Quark scripts cleanup, Riker requires dry-run first). These resources exist
# in AWS but in NO terraform state, so a clean apply into the new S3 backend would hit "already
# exists". They carry no traffic/data yet, so we delete them; terraform then recreates them tracked.
#
# DRY-RUN by default (lists what would be deleted). Pass --apply to actually delete.
# Does NOT touch the bootstrap OIDC provider / deploy role or the Secrets Manager secrets.
#
# Usage:
#   zsh -ic 'bash scripts/cleanup-orphaned-stack.sh'            # dry-run
#   zsh -ic 'bash scripts/cleanup-orphaned-stack.sh --apply'    # delete
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true
PROJECT="story-agent"

run() { if $APPLY; then echo "  ▶ $*"; eval "$@"; else echo "  [dry-run] $*"; fi; }
echo "🧹 Orphan cleanup ($([ "$APPLY" = true ] && echo APPLY || echo DRY-RUN)) region=${REGION}"

# ── ECS services + cluster ────────────────────────────────────────────────────
if aws ecs describe-clusters --clusters "$PROJECT" --region "$REGION" --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
  for svc in $(aws ecs list-services --cluster "$PROJECT" --region "$REGION" --query 'serviceArns[]' --output text 2>/dev/null); do
    run "aws ecs delete-service --cluster $PROJECT --service $svc --force --region $REGION >/dev/null"
  done
  run "aws ecs delete-cluster --cluster $PROJECT --region $REGION >/dev/null"
else
  echo "  • no ECS cluster"
fi

# ── ALB (listeners delete with the LB) ───────────────────────────────────────
ALB_ARN=$(aws elbv2 describe-load-balancers --names "${PROJECT}-alb" --region "$REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || true)
if [ -n "${ALB_ARN:-}" ] && [ "$ALB_ARN" != "None" ]; then
  run "aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $REGION"
  $APPLY && aws elbv2 wait load-balancers-deleted --load-balancer-arns "$ALB_ARN" --region "$REGION" 2>/dev/null || true
else
  echo "  • no ALB"
fi

# ── Target groups ─────────────────────────────────────────────────────────────
for tg in "${PROJECT}-mcp-http" "${PROJECT}-mcp-ws" "${PROJECT}-ui"; do
  TG_ARN=$(aws elbv2 describe-target-groups --names "$tg" --region "$REGION" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
  if [ -n "${TG_ARN:-}" ] && [ "$TG_ARN" != "None" ]; then run "aws elbv2 delete-target-group --target-group-arn $TG_ARN --region $REGION"; fi
done

# ── Service Discovery namespace ───────────────────────────────────────────────
NS_ID=$(aws servicediscovery list-namespaces --region "$REGION" --query "Namespaces[?Name=='${PROJECT}.internal'].Id | [0]" --output text 2>/dev/null || true)
if [ -n "${NS_ID:-}" ] && [ "$NS_ID" != "None" ]; then run "aws servicediscovery delete-namespace --id $NS_ID --region $REGION >/dev/null"; else echo "  • no service-discovery namespace"; fi

# ── CloudWatch log groups ─────────────────────────────────────────────────────
for lg in "/ecs/${PROJECT}-mcp" "/ecs/${PROJECT}-ui"; do
  if aws logs describe-log-groups --log-group-name-prefix "$lg" --region "$REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$lg"; then
    run "aws logs delete-log-group --log-group-name $lg --region $REGION"
  fi
done

# ── IAM roles (detach/delete inline policies first) — task + execution only ───
for role in "${PROJECT}-task" "${PROJECT}-ecs-execution"; do
  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    for p in $(aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
      run "aws iam detach-role-policy --role-name $role --policy-arn $p"
    done
    for ip in $(aws iam list-role-policies --role-name "$role" --query 'PolicyNames[]' --output text 2>/dev/null); do
      run "aws iam delete-role-policy --role-name $role --policy-name $ip"
    done
    run "aws iam delete-role --role-name $role"
  else
    echo "  • no IAM role $role"
  fi
done

echo ""
$APPLY && echo "✅ Orphan cleanup complete." || echo "ℹ️  Dry-run only. Re-run with --apply to delete."
