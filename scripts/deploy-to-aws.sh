#!/bin/bash
# Trigger AWS deployment via GitHub Actions (with WorfGate security gate)
#
# Usage: 
#   ./scripts/deploy-to-aws.sh           # Plan only (default, safe)
#   ./scripts/deploy-to-aws.sh --apply   # Full deploy (plan + apply + WorfGate audit)
#
# Requirements:
#   - gh CLI installed (brew install gh)
#   - GitHub token configured (gh auth login)
#   - AWS credentials in GitHub Secrets (SUPABASE_URL, SUPABASE_KEY, etc.)
#   - WorfGate audit must pass (security gate)

set -euo pipefail

REPO="familiarcat/story-agent"
WORKFLOW="deploy-fargate"
APPLY_FLAG="${1:-}"

echo "🚀 Story Agent AWS Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ ERROR: gh CLI not found. Install with: brew install gh"
    exit 1
fi

# Verify GitHub auth
if ! gh auth status &>/dev/null; then
    echo "❌ ERROR: Not authenticated to GitHub. Run: gh auth login"
    exit 1
fi

# Determine apply flag
APPLY="false"
if [ "$APPLY_FLAG" = "--apply" ]; then
    APPLY="true"
    echo "📋 Deployment Mode: FULL (plan + apply + WorfGate audit)"
else
    echo "📋 Deployment Mode: PLAN ONLY (safe, non-destructive)"
    echo "   → To apply changes, run: ./scripts/deploy-to-aws.sh --apply"
fi

echo ""
echo "📡 Triggering workflow: $WORKFLOW"
echo "   Repository: $REPO"
echo "   Branch: main"
echo "   Apply: $APPLY"
echo "   Security Gate: WorfGate audit (required, non-bypassable)"
echo ""

# Trigger the workflow
DISPATCH_RESULT=$(gh workflow run "$WORKFLOW" \
    --repo "$REPO" \
    --ref main \
    --raw-field "apply=$APPLY" \
    2>&1)

# Extract run ID from output (or fallback)
if echo "$DISPATCH_RESULT" | grep -q "created"; then
    RUN_ID=$(echo "$DISPATCH_RESULT" | grep -oP '(?<=id: )\d+' | head -1 || echo "latest")
    echo "✅ Workflow triggered successfully!"
    echo "   Run ID: $RUN_ID"
else
    echo "✅ Workflow dispatch initiated"
    RUN_ID="latest"
fi

echo ""
echo "📊 Monitoring workflow progress..."
echo "   Open in browser: https://github.com/$REPO/actions/workflows/$WORKFLOW.yml"
echo "   Or watch live with: gh run watch --repo $REPO $RUN_ID"
echo ""

# Wait for workflow to start and stream logs
echo "⏳ Waiting for workflow to start (this may take 10-15 seconds)..."
sleep 5

# Attempt to watch the run
if [ "$RUN_ID" != "latest" ]; then
    echo ""
    echo "🎬 Live workflow output:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    # gh run watch "$RUN_ID" --repo "$REPO" 2>/dev/null || true
    # Note: using gh run watch requires direct TTY. Instead, provide URL
    echo ""
    echo "📋 Workflow steps:"
    echo "  1. detect       — identify changed files (app vs infra)"
    echo "  2. build_mcp    — build MCP server image (parallel)"
    echo "  3. build_ui     — build UI image (parallel)"
    echo "  4. security_gate — WorfGate audit (required, blocks if fails)"
    echo "  5. deploy       — apply Terraform → Fargate"
    echo "  6. health_gate  — verify tasks healthy + ALB /rag/health responds"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo ""
if [ "$APPLY" = "true" ]; then
    echo "  ✅ Full deployment initiated (plan + apply)"
    echo "  ✅ WorfGate security audit running (blocks if credentials missing)"
    echo "  ⏳ Terraform apply will execute on AWS (→ Fargate tasks)"
    echo "  ⏳ Health gate verification (tasks must be healthy + ALB responds)"
    echo ""
    echo "⏱️  Estimated time: 5-10 minutes"
else
    echo "  ✅ Plan-only deployment initiated (non-destructive)"
    echo "  ✅ WorfGate security audit running"
    echo "  ✅ Terraform plan shows what WOULD change"
    echo "  📝 To apply these changes, run:"
    echo "     ./scripts/deploy-to-aws.sh --apply"
    echo ""
    echo "⏱️  Estimated time: 2-3 minutes"
fi

echo ""
echo "📊 View Results:"
echo "  • Workflow runs: https://github.com/$REPO/actions/workflows/$WORKFLOW.yml"
echo "  • Deployed app: https://storyagent.pbradygeorgen.com"
echo "  • AWS Console: https://console.aws.amazon.com/ecs/"
echo "  • Supabase: https://supabase.com/dashboard"
echo ""
echo "🔐 Security:"
echo "  • All secrets resolved via WorfGate (never logged)"
echo "  • GitHub OIDC → AWS role assumption (no long-lived credentials)"
echo "  • WorfGate audit gate is mandatory (cannot bypass)"
echo ""
