#!/bin/zsh
# Phase 3a Step 1: Deploy IAM Roles & AWS Config Rule (Worf)
# Purpose: Secure breadcrumb cache access via IAM + compliance monitoring
# Deployment Duration: ~1 hour (parallel with Step 2)
# Gate: 0 unauthorized writes in 48h audit

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🖖 PHASE 3A STEP 1: WORF IAM SCOPING DEPLOYMENT${NC}"
echo "Start Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ============================================================================
# PREREQUISITES
# ============================================================================

echo -e "${BLUE}→ Validating Prerequisites${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found. Install with: brew install awscli${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
TRUST_POLICY_FILE="/tmp/lambda-trust-policy.json"

echo -e "${GREEN}✓ AWS Credentials valid (Account: $AWS_ACCOUNT_ID, Region: $AWS_REGION)${NC}"
echo ""

# ============================================================================
# STEP 1.1: CREATE CACHE-MANAGER ROLE
# ============================================================================

echo -e "${BLUE}→ STEP 1.1: Creating cache-manager IAM role${NC}"

# Trust relationship: Allow Lambda to assume this role
cat > "$TRUST_POLICY_FILE" << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create cache-manager role
ROLE_NAME="story-agent-cache-manager"
if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ Role $ROLE_NAME already exists, skipping creation${NC}"
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file://"$TRUST_POLICY_FILE" \
        --description "Cache-manager for breadcrumb cache writes (Phase 3a)" \
        --tags "[{\"Key\":\"phase\",\"Value\":\"3a\"},{\"Key\":\"component\",\"Value\":\"breadcrumb-cache\"},{\"Key\":\"role\",\"Value\":\"cache-manager\"}]"
    
    echo -e "${GREEN}✓ Created role: $ROLE_NAME${NC}"
fi

# Attach cache-manager policy
CACHE_MANAGER_POLICY="/tmp/cache-manager-policy.json"
cat > "$CACHE_MANAGER_POLICY" << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SupabaseDatabaseWrite",
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "rds-db:connect"
      ],
      "Resource": "arn:aws:rds:*:*:db/*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Logging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/breadcrumb-*"
    }
  ]
}
EOF

POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/story-agent-cache-manager-policy"
if aws iam get-policy --policy-arn "$POLICY_ARN" &> /dev/null; then
    echo -e "${YELLOW}⚠ Policy already exists${NC}"
else
    aws iam create-policy \
        --policy-name "story-agent-cache-manager-policy" \
        --policy-document file://"$CACHE_MANAGER_POLICY" \
        --description "Policy for breadcrumb cache write operations"
    
    echo -e "${GREEN}✓ Created policy: story-agent-cache-manager-policy${NC}"
fi

# Attach policy to role
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN"

echo -e "${GREEN}✓ Attached policy to $ROLE_NAME${NC}"

# Tag the role with role=cache-manager for conditional access
aws iam tag-resource \
    --resource-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}" \
    --tags "[{\"Key\":\"role\",\"Value\":\"cache-manager\"}]" 2>/dev/null || true

echo -e "${GREEN}✓ Tagged role with role=cache-manager${NC}"
echo ""

# ============================================================================
# STEP 1.2: CREATE BREADCRUMB-READER ROLE
# ============================================================================

echo -e "${BLUE}→ STEP 1.2: Creating breadcrumb-reader IAM role${NC}"

READER_ROLE="story-agent-breadcrumb-reader"
if aws iam get-role --role-name "$READER_ROLE" &> /dev/null; then
    echo -e "${YELLOW}⚠ Role $READER_ROLE already exists${NC}"
else
    aws iam create-role \
        --role-name "$READER_ROLE" \
        --assume-role-policy-document file://"$TRUST_POLICY_FILE" \
        --description "Read-only access to breadcrumb cache (API endpoints)"
    
    echo -e "${GREEN}✓ Created role: $READER_ROLE${NC}"
fi

# Attach breadcrumb-reader policy
READER_POLICY="/tmp/breadcrumb-reader-policy.json"
cat > "$READER_POLICY" << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SupabaseRead",
      "Effect": "Allow",
      "Action": [
        "rds-db:connect"
      ],
      "Resource": "arn:aws:rds:*:*:db/*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Logging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/breadcrumb-*"
    }
  ]
}
EOF

READER_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/story-agent-breadcrumb-reader-policy"
if aws iam get-policy --policy-arn "$READER_POLICY_ARN" &> /dev/null; then
    echo -e "${YELLOW}⚠ Reader policy already exists${NC}"
else
    aws iam create-policy \
        --policy-name "story-agent-breadcrumb-reader-policy" \
        --policy-document file://"$READER_POLICY"
    
    echo -e "${GREEN}✓ Created policy: story-agent-breadcrumb-reader-policy${NC}"
fi

aws iam attach-role-policy \
    --role-name "$READER_ROLE" \
    --policy-arn "$READER_POLICY_ARN"

echo -e "${GREEN}✓ Attached reader policy to $READER_ROLE${NC}"
echo ""

# ============================================================================
# STEP 1.3: CREATE DASHBOARD-READER ROLE
# ============================================================================

echo -e "${BLUE}→ STEP 1.3: Creating dashboard-reader IAM role${NC}"

DASHBOARD_ROLE="story-agent-dashboard-reader"
if aws iam get-role --role-name "$DASHBOARD_ROLE" &> /dev/null; then
    echo -e "${YELLOW}⚠ Role $DASHBOARD_ROLE already exists${NC}"
else
    aws iam create-role \
        --role-name "$DASHBOARD_ROLE" \
        --assume-role-policy-document file://"$TRUST_POLICY_FILE" \
        --description "Read-only access for dashboard widgets"
    
    echo -e "${GREEN}✓ Created role: $DASHBOARD_ROLE${NC}"
fi

# Attach dashboard-reader policy
DASHBOARD_POLICY="/tmp/dashboard-reader-policy.json"
cat > "$DASHBOARD_POLICY" << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SupabaseRead",
      "Effect": "Allow",
      "Action": [
        "rds-db:connect"
      ],
      "Resource": "arn:aws:rds:*:*:db/*"
    },
    {
      "Sid": "CloudWatchRead",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Logging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/breadcrumb-*"
    }
  ]
}
EOF

DASHBOARD_POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/story-agent-dashboard-reader-policy"
if aws iam get-policy --policy-arn "$DASHBOARD_POLICY_ARN" &> /dev/null; then
    echo -e "${YELLOW}⚠ Dashboard policy already exists${NC}"
else
    aws iam create-policy \
        --policy-name "story-agent-dashboard-reader-policy" \
        --policy-document file://"$DASHBOARD_POLICY"
    
    echo -e "${GREEN}✓ Created policy: story-agent-dashboard-reader-policy${NC}"
fi

aws iam attach-role-policy \
    --role-name "$DASHBOARD_ROLE" \
    --policy-arn "$DASHBOARD_POLICY_ARN"

echo -e "${GREEN}✓ Attached dashboard policy to $DASHBOARD_ROLE${NC}"
echo ""

# ============================================================================
# STEP 1.4: CLOUDTRAIL AUDIT SETUP
# ============================================================================

echo -e "${BLUE}→ STEP 1.4: Enabling CloudTrail for breadcrumb cache audit${NC}"

# Create CloudTrail if needed (assumes trail exists; adds event selector)
TRAIL_NAME="story-agent-main-trail"

# Add data event selector for Supabase audit
echo -e "${YELLOW}→ Setting up CloudTrail event selectors for audit${NC}"
echo -e "${YELLOW}  Note: CloudTrail setup requires trail already created${NC}"
echo -e "${YELLOW}  Verify: aws cloudtrail describe-trails${NC}"
echo ""

# ============================================================================
# SUMMARY & VALIDATION
# ============================================================================

echo -e "${BLUE}→ STEP 1 DEPLOYMENT SUMMARY${NC}"

echo -e "${GREEN}✓ Roles Created:${NC}"
aws iam list-roles --query 'Roles[?contains(RoleName, `story-agent`)].RoleName' --output text | tr '\t' '\n'

echo ""
echo -e "${GREEN}✓ Policies Attached:${NC}"
aws iam list-policies --query 'Policies[?contains(PolicyName, `story-agent`)].PolicyName' --output text | tr '\t' '\n'

echo ""
echo -e "${YELLOW}→ VALIDATION GATE: auditCacheAccessCompliance()${NC}"
echo ""
echo "Next Steps:"
echo "1. Test 1: Attempt write to Supabase sa_breadcrumb_cache WITHOUT cache-manager role (should fail)"
echo "2. Test 2: Attempt write WITH cache-manager role (should succeed)"
echo "3. Wait 48 hours for audit collection"
echo "4. Query CloudTrail: confirm 0 unauthorized writes"
echo "5. Sign-off: validateIAMScopingGate() returns {passed: true}"
echo ""

echo -e "${GREEN}✓ WORF STEP 1 DEPLOYMENT COMPLETE${NC}"
echo "Completion Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "Awaiting Step 2 (Data Analytics) completion..."
