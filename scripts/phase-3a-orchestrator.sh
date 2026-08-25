#!/bin/zsh
# Phase 3a: Orchestrator Script
# Coordinates parallel execution of Worf (Step 1) + Data (Step 2)
# Timeline: 48 hours (Days 1-2)
# Decision: If BOTH gates pass → Proceed to Phase 3b (Days 3-4)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

REPO_ROOT="/Users/bradygeorgen/Developer/story-agent"
SCRIPTS_DIR="$REPO_ROOT/scripts"

echo -e "${MAGENTA}🖖 PHASE 3A ORCHESTRATOR: WORF + DATA PARALLEL EXECUTION${NC}"
echo "Timeline: 48 hours (Days 1-2)"
echo "Start Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ============================================================================
# VALIDATION
# ============================================================================

echo -e "${BLUE}→ Pre-flight checks${NC}"

# Verify build is passing
echo -e "${YELLOW}  Verifying Phase 3 build status...${NC}"
cd "$REPO_ROOT"
if ! pnpm run check &> /tmp/preflight-check.log; then
    echo -e "${RED}✗ Build check failed. See /tmp/preflight-check.log${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build passing (0 errors)${NC}"

# Verify scripts exist
for SCRIPT in "phase-3a-step-1-deploy-iam.sh" "phase-3a-step-2-deploy-analytics.sh"; do
    if [[ ! -f "$SCRIPTS_DIR/$SCRIPT" ]]; then
        echo -e "${RED}✗ Missing script: $SCRIPT${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Deployment scripts ready${NC}"

# Verify AWS credentials
echo -e "${YELLOW}  Verifying AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS credentials valid${NC}"

echo ""

# ============================================================================
# ORCHESTRATION
# ============================================================================

echo -e "${MAGENTA}→ PHASE 3A PARALLEL EXECUTION BEGINS${NC}"
echo ""

# Start Step 1 (Worf) in background
echo -e "${BLUE}[1/2] Launching Worf Station (Step 1: IAM Scoping)${NC}"
bash "$SCRIPTS_DIR/phase-3a-step-1-deploy-iam.sh" > /tmp/phase-3a-step-1.log 2>&1 &
STEP_1_PID=$!
echo -e "${GREEN}✓ Worf process started (PID: $STEP_1_PID)${NC}"
echo -e "${YELLOW}  Log: /tmp/phase-3a-step-1.log${NC}"
echo ""

# Start Step 2 (Data) in background
echo -e "${BLUE}[2/2] Launching Data Station (Step 2: Analytics)${NC}"
bash "$SCRIPTS_DIR/phase-3a-step-2-deploy-analytics.sh" > /tmp/phase-3a-step-2.log 2>&1 &
STEP_2_PID=$!
echo -e "${GREEN}✓ Data process started (PID: $STEP_2_PID)${NC}"
echo -e "${YELLOW}  Log: /tmp/phase-3a-step-2.log${NC}"
echo ""

# Wait for both to complete
echo -e "${MAGENTA}→ Monitoring parallel execution...${NC}"
echo ""

STEP_1_COMPLETE=0
STEP_2_COMPLETE=0

while [[ $STEP_1_COMPLETE -eq 0 ]] || [[ $STEP_2_COMPLETE -eq 0 ]]; do
    if [[ $STEP_1_COMPLETE -eq 0 ]] && ! kill -0 $STEP_1_PID 2>/dev/null; then
        STEP_1_COMPLETE=1
        echo -e "${GREEN}✓ Worf (Step 1) completed${NC}"
        if ! wait $STEP_1_PID; then
            echo -e "${RED}✗ Worf (Step 1) failed${NC}"
            exit 1
        fi
    fi
    
    if [[ $STEP_2_COMPLETE -eq 0 ]] && ! kill -0 $STEP_2_PID 2>/dev/null; then
        STEP_2_COMPLETE=1
        echo -e "${GREEN}✓ Data (Step 2) completed${NC}"
        if ! wait $STEP_2_PID; then
            echo -e "${RED}✗ Data (Step 2) failed${NC}"
            exit 1
        fi
    fi
    
    sleep 2
done

echo ""

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

echo -e "${MAGENTA}→ PHASE 3A DEPLOYMENT SUMMARY${NC}"
echo ""

echo -e "${GREEN}✓ WORF STATION (Step 1): IAM SCOPING${NC}"
echo "  Deployed:"
echo "    • 3 IAM roles (cache-manager, breadcrumb-reader, dashboard-reader)"
echo "    • Supabase credential management via env vars"
echo "    • CloudTrail event selectors for audit"
echo ""
echo "  Validation Gate (48h audit):"
echo "    → Query CloudTrail: 0 unauthorized write attempts"
echo "    → Confirm: cache-manager role is only writer"
echo "    → Status: GATE VALIDATION IN PROGRESS (check back at 48h)"
echo ""

echo -e "${GREEN}✓ DATA STATION (Step 2): ANALYTICS BASELINE${NC}"
echo "  Deployed:"
echo "    • CloudWatch namespace: story-agent/breadcrumb-cache"
echo "    • 8 custom metrics (latency, capacity, IAM checks, hit rate, depth, DynamoDB, invalidation, accuracy)"
echo "    • CloudWatch dashboard: breadcrumb-performance-baseline"
echo "    • CloudWatch log group: /aws/lambda/breadcrumb-cache-ops"
echo ""
echo "  Baseline Collection (48h):"
echo "    Start: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "    End: $(date -u -v +48H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+48 hours' +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "  Validation Gate (48h baseline):"
echo "    → 24h check: Query X-Ray service map (identify bottleneck % from IAM)"
echo "    → 48h check: Export p50/p95/p99 latency (expected: p95 ≈ 127ms)"
echo "    → Status: BASELINE COLLECTION IN PROGRESS"
echo ""

# ============================================================================
# GATE VALIDATION SCHEDULE
# ============================================================================

echo -e "${MAGENTA}→ GATE VALIDATION SCHEDULE${NC}"
echo ""

GATE_24H=$(date -u -v +24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+24 hours' +%Y-%m-%dT%H:%M:%SZ)
GATE_48H=$(date -u -v +48H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+48 hours' +%Y-%m-%dT%H:%M:%SZ)

echo -e "${YELLOW}At $GATE_24H (24h):${NC}"
echo "  [ ] Worf: Review CloudTrail logs (0 unauthorized writes so far?)"
echo "  [ ] Data: Query X-Ray service map"
echo "    → Identify % latency from IAM authorization (expected: 60%)"
echo "    → Confirm bottleneck distribution"
echo ""

echo -e "${YELLOW}At $GATE_48H (48h):${NC}"
echo "  [ ] Worf: Final audit — validateIAMScopingGate() → PASS/FAIL"
echo "  [ ] Data: Final baseline — validateAnalyticsGate() → PASS/FAIL"
echo ""

echo -e "${YELLOW}Decision Gate (After 48h):${NC}"
echo "  IF BOTH gates PASS:"
echo "    → Proceed to Phase 3b (Days 3-4)"
echo "    → Troi deploys cache invalidation Lambda"
echo "    → Geordi deploys cache optimization layer"
echo ""
echo "  IF either gate FAILS:"
echo "    → Escalate findings to Admiral"
echo "    → Decide: retry, adjust criteria, or rollback"
echo ""

# ============================================================================
# NEXT ACTIONS
# ============================================================================

echo -e "${MAGENTA}→ IMMEDIATE NEXT ACTIONS${NC}"
echo ""

echo -e "${BLUE}For Admiral/Crew:${NC}"
echo "1. Verify IAM roles created in AWS Console:"
echo "   → story-agent-cache-manager"
echo "   → story-agent-breadcrumb-reader"
echo "   → story-agent-dashboard-reader"
echo ""
echo "2. Monitor CloudWatch Dashboard:"
echo "   → https://console.aws.amazon.com/cloudwatch/home#dashboards:"
echo "   → Look for: breadcrumb-performance-baseline"
echo ""
echo "3. After 24h: Check X-Ray service map"
echo "   → Identify which subsegment is slowest"
echo "   → Expected bottleneck: IAMAuthorization ≈ 60% of latency"
echo ""
echo "4. After 48h: Validate both gates"
echo "   → Run: pnpm --filter @story-agent/mcp-server run validate-phase-3a-gates"
echo ""

echo ""
echo -e "${GREEN}✓ PHASE 3A ORCHESTRATION COMPLETE${NC}"
echo "Status: FOUNDATION VALIDATION IN PROGRESS (48 hours)"
echo ""
echo "Crew Standby:"
echo "  🖖 Worf: Monitoring IAM compliance"
echo "  🖖 Data: Collecting performance baseline"
echo "  🖖 Troi: Ready to deploy cache invalidation (after gate PASS)"
echo "  🖖 Geordi: Ready to deploy cache optimization (after gate PASS)"
echo ""
echo "Admiral Command: Check back at $GATE_48H for gate validation results"
