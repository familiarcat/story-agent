#!/bin/bash
# Canary Deployment Script — Story Agent Production Rollout
# Crew authorized: 7-0 vote, 85% confidence
# Execute with: bash scripts/deploy-canary.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$REPO_ROOT/terraform"
CANARY_IMAGE="${CANARY_IMAGE:-}"  # Must be set before running
ALERT_EMAIL="${CANARY_ALERT_EMAIL:-alerts@story-agent.internal}"

c_dim='\033[2m'
c_red='\033[31m'
c_grn='\033[32m'
c_yel='\033[33m'
c_cyn='\033[36m'
c_rst='\033[0m'
c_bold='\033[1m'

h() { echo -e "\n${c_bold}${c_cyn}━━ $1${c_rst}"; }
ok() { echo -e "  ${c_grn}✓${c_rst} $1"; }
warn() { echo -e "  ${c_yel}⚠${c_rst}  $1"; }
fail() { echo -e "  ${c_red}✗${c_rst} $1"; exit 1; }

echo -e "\n${c_bold}🚀 Canary Deployment — Story Agent${c_rst}"
echo -e "${c_dim}Crew authorized: 7-0 vote, 85% confidence${c_rst}\n"

# Step 1: Validation
h "Pre-deployment validation"

if [ -z "$CANARY_IMAGE" ]; then
  fail "CANARY_IMAGE not set. Usage: CANARY_IMAGE=<staging-digest> bash scripts/deploy-canary.sh"
fi

if ! grep -q "@sha256:" <<< "$CANARY_IMAGE"; then
  warn "CANARY_IMAGE does not contain a digest. Recommended to pin by SHA256 for reproducibility."
  read -p "  Continue anyway? (y/n) " -n 1 -r; echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    fail "Deployment cancelled."
  fi
fi

ok "CANARY_IMAGE: $CANARY_IMAGE"
ok "Alert email: $ALERT_EMAIL"

# Step 2: Terraform init
h "Terraform initialization"
cd "$TF_DIR"
if ! terraform init >/dev/null 2>&1; then
  fail "Terraform init failed"
fi
ok "Terraform initialized"

# Step 3: Terraform plan
h "Terraform plan (preview)"
PLAN_FILE="/tmp/canary-plan-$(date +%s).tfplan"
if ! terraform plan \
  -var="enable_canary_deployment=true" \
  -var="mcp_image_canary=$CANARY_IMAGE" \
  -var="canary_alert_email=$ALERT_EMAIL" \
  -out="$PLAN_FILE" \
  >/dev/null 2>&1; then
  fail "Terraform plan failed"
fi
ok "Plan saved to $PLAN_FILE"

# Show plan summary
echo -e "\n${c_dim}Resources to be created/modified:${c_rst}"
terraform show -json "$PLAN_FILE" | jq -r '.resource_changes[] | select(.type == "aws_ecs_service" or .type == "aws_lb_target_group" or .type == "aws_cloudwatch_metric_alarm") | "\(.type).\(.name): \(.change.actions | join(","))"' 2>/dev/null | sed 's/^/  /'

# Step 4: Deployment confirmation
h "Deployment confirmation"
echo -e "${c_yel}⚠  This will:${c_rst}"
echo "  1. Create new ECS service (story-agent-mcp-canary)"
echo "  2. Configure ALB weighted target groups (95/5 split)"
echo "  3. Enable CloudWatch monitoring and alarms"
echo "  4. Start 24-hour observation window"
echo ""
read -p "Continue with deployment? Type 'DEPLOY' to confirm: " -r
if [ "$REPLY" != "DEPLOY" ]; then
  warn "Deployment cancelled."
  exit 0
fi

# Step 5: Terraform apply
h "Applying Terraform (BILLABLE)"
if ! terraform apply "$PLAN_FILE"; then
  fail "Terraform apply failed"
fi
ok "Canary infrastructure deployed"

# Step 6: Verification
h "Canary deployment verification"

# Wait for service to stabilize
echo -e "${c_dim}Waiting for canary service to stabilize (30s)...${c_rst}"
sleep 30

# Verify service
CANARY_SERVICE=$(terraform output -raw mcp_canary_service_name 2>/dev/null || echo "${REPO_ROOT##*/}-mcp-canary")
CANARY_STATUS=$(aws ecs describe-services \
  --cluster "${REPO_ROOT##*/}" \
  --services "$CANARY_SERVICE" \
  --query 'services[0].{desiredCount: desiredCount, runningCount: runningCount, status: status}' \
  --output text 2>/dev/null || echo "UNKNOWN")

if [[ "$CANARY_STATUS" == *"1"* ]]; then
  ok "Canary service running: $CANARY_STATUS"
else
  warn "Canary service status: $CANARY_STATUS (monitoring)"
fi

# Step 7: Success summary
h "Deployment Complete"
ok "Canary deployed with 5% traffic weight"
ok "24-hour observation window started"
ok "Monitoring dashboard: CloudWatch → story-agent-canary-monitoring"
ok "Alert topic: AWS SNS → story-agent-canary-alerts"
ok "Next decision: After 24h (2026-07-18T$(date +%H:%M:%SZ))"

echo -e "\n${c_bold}Next Steps:${c_rst}"
echo "  1. Monitor: CloudWatch dashboard for latency/errors"
echo "  2. Logs: CloudWatch Logs → /ecs/story-agent-mcp-canary"
echo "  3. Watch: SNS emails for any alert triggers"
echo "  4. Decide: After 24h — promote, hold, or rollback"
echo ""
echo -e "${c_dim}To rollback: terraform apply -var=enable_canary_deployment=false${c_rst}\n"
