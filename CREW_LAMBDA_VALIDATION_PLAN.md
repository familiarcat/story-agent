# Crew Review: Lambda Handler Validation & Automation (HUMAN IN THE LOOP)

**Status**: Pending crew validation  
**Owner**: Data (lead) + Geordi, Worf, Picard  
**Target**: Complete validation within 24 hours, automation within 1 week

---

## Current Situation

The stress testing infrastructure is deployed and running. All AWS resources + Supabase tables are live and ready. However, the Lambda handler needs crew validation before the system is fully autonomous.

**What's Deployed:**
- Lambda function: ✅ `story-agent-stress-test-orchestrator`
- EventBridge rule: ✅ Triggers every 14 days automatically
- Supabase schema: ✅ 8 tables ready to receive test results
- IAM roles: ✅ Permissions configured

**What Needs Crew Validation:**
- Handler execution in AWS Lambda runtime
- Environment variables properly injected
- Supabase connectivity from Lambda
- AWS SDK calls (CloudWatch, Cost Explorer, SNS) working correctly

---

## 🎯 Phase 1: Manual Validation (24 hours)

### Step 1: Check Lambda Function Status
**Crew Member**: Geordi (Infrastructure)

```bash
# Verify function exists and is configured correctly
aws lambda get-function \
  --function-name story-agent-stress-test-orchestrator \
  --query 'Configuration.{Runtime,MemorySize,Timeout,Role}' \
  --output table

# Expected output:
# | Runtime   | MemorySize | Timeout | Role                                    |
# |-----------|------------|---------|----------------------------------------|
# | nodejs20.x| 512        | 900     | story-agent-stress-test-lambda-role   |
```

### Step 2: Verify Environment Variables
**Crew Member**: Data (Architecture)

```bash
# Check environment variables are properly loaded
aws lambda get-function-configuration \
  --function-name story-agent-stress-test-orchestrator \
  --query 'Environment.Variables' \
  --output json | jq .

# Should show:
# {
#   "SUPABASE_URL": "https://...",
#   "SUPABASE_KEY": "sbp_...",
#   "GITHUB_TOKEN": "gh_...",
#   "SNS_TOPIC_ARN": "arn:aws:sns:...",
#   "COST_THRESHOLD_USD": "0.90",
#   ... (crew assignments, etc.)
# }

# ⚠️ IF VALUES MISSING:
# Run: cd terraform && TF_VAR_supabase_url=$SUPABASE_URL ... terraform apply -auto-approve
```

### Step 3: Dry-Run Lambda Invocation
**Crew Member**: Data (Architecture)

```bash
# Create test payload file
cat > /tmp/test-payload.json << 'EOF'
{
  "action": "run_full_suite",
  "mode": "test"
}
EOF

# Invoke Lambda with test payload (async, no blocking)
aws lambda invoke \
  --function-name story-agent-stress-test-orchestrator \
  --cli-binary-format raw-in-base64-out \
  --invoke-type RequestResponse \
  --payload file:///tmp/test-payload.json \
  /tmp/lambda-result.json \
  --log-type Tail \
  --query 'LogResult' \
  --output text | base64 -d

# Should see:
# [INFO] Starting stress test suite
# [INFO] Test 1: 7Q Reproducibility - PASS
# [INFO] Test 2: Cost Control Drift - PASS
# ... (all 7 tests)
# [INFO] Stress test completed: 7P 0W 0F
```

### Step 4: Check CloudWatch Logs
**Crew Member**: Geordi (Infrastructure)

```bash
# Tail Lambda logs (live)
aws logs tail /aws/lambda/story-agent-stress-test-orchestrator \
  --follow \
  --since 5m

# Or query specific run
aws logs filter-log-events \
  --log-group-name /aws/lambda/story-agent-stress-test-orchestrator \
  --query 'events[*].[message]' \
  --output text

# Check for any errors or warnings
```

### Step 5: Verify Supabase Results
**Crew Member**: Data (Architecture)

```bash
# Query stress test results table
supabase query << 'EOF'
SELECT 
  run_id,
  duration_ms,
  tests_passed,
  tests_failed,
  total_cost_usd,
  created_at
FROM sa_stress_test_results
ORDER BY created_at DESC
LIMIT 1;
EOF

# Should show successful test run record
```

### Step 6: Verify SNS Alerts
**Crew Member**: Uhura (Communications)

```bash
# Subscribe to SNS topic for alerts (if email not already subscribed)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:860268930466:story-agent-stress-test-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Check SNS topic exists and is active
aws sns get-topic-attributes \
  --topic-arn arn:aws:sns:us-east-2:860268930466:story-agent-stress-test-alerts \
  --query 'Attributes.{DisplayName,Subscription}' \
  --output table
```

### Step 7: Validate Alarm Configuration
**Crew Member**: Worf (Security)

```bash
# Check all three alarms are configured correctly
aws cloudwatch describe-alarms \
  --alarm-names \
    story-agent-stress-test-lambda-errors \
    story-agent-stress-test-lambda-duration \
    story-agent-stress-test-lambda-concurrency \
  --output table

# Verify alarm actions point to SNS topic
aws cloudwatch describe-alarms \
  --query 'MetricAlarms[*].[AlarmName,AlarmActions]' \
  --output table
```

---

## 🚀 Phase 2: Automation Design (1 week)

Once validation passes, the crew should design automation to avoid manual steps in future deployments.

### 2.1: Post-Deploy Validation Hook
**Owner**: Picard (Orchestration)  
**File to Create**: `scripts/validate-lambda-deployment.sh`

```bash
#!/bin/bash
# Post-deployment validation for stress testing Lambda

set -e

FUNCTION_NAME="story-agent-stress-test-orchestrator"
MAX_RETRIES=5
RETRY_DELAY=2

echo "[*] Validating Lambda handler deployment..."

# 1. Check function exists
for attempt in $(seq 1 $MAX_RETRIES); do
  if aws lambda get-function --function-name "$FUNCTION_NAME" &>/dev/null; then
    echo "[✓] Lambda function exists"
    break
  fi
  if [ $attempt -eq $MAX_RETRIES ]; then
    echo "[✗] Lambda function not found after $MAX_RETRIES attempts"
    exit 1
  fi
  sleep $RETRY_DELAY
done

# 2. Verify environment variables
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --query 'Environment.Variables' \
  --output json)

for var in SUPABASE_URL SUPABASE_KEY SNS_TOPIC_ARN COST_THRESHOLD_USD; do
  if echo "$ENV_VARS" | jq -e ".$var" &>/dev/null; then
    echo "[✓] Environment variable $var is set"
  else
    echo "[✗] Missing environment variable: $var"
    exit 1
  fi
done

# 3. Dry-run test invocation
echo "[*] Running handler test invocation..."
cat > /tmp/test-payload.json << 'PAYLOAD'
{"action":"run_full_suite","mode":"test"}
PAYLOAD

aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out \
  --invoke-type RequestResponse \
  --payload file:///tmp/test-payload.json \
  /tmp/test-result.json \
  --log-type Tail \
  --query 'LogResult' \
  --output text | base64 -d | head -20

# 4. Check CloudWatch logs
echo "[*] Checking CloudWatch logs..."
RECENT_LOGS=$(aws logs tail /aws/lambda/story-agent-stress-test-orchestrator \
  --since 2m \
  --format short)

if echo "$RECENT_LOGS" | grep -q "Starting stress test"; then
  echo "[✓] Handler executed successfully"
else
  echo "[✗] No execution logs found"
  exit 1
fi

echo "[✓] All validation checks passed!"
```

**Integration**: Run after `terraform apply` in CI/CD pipeline

### 2.2: Lambda Health Check MCP Tool
**Owner**: O'Brien (DevOps) + Geordi (Infrastructure)  
**File to Create**: `packages/mcp-server/src/lib/lambda-health-check.ts`

```typescript
/**
 * Lambda Deployment Health Check Tool
 * 
 * Validates stress testing Lambda is operational:
 * 1. Function accessible
 * 2. Environment variables correct
 * 3. Handler executes without errors
 * 4. Supabase connectivity verified
 * 5. SNS alerts configured
 * 6. CloudWatch metrics flowing
 */

interface HealthCheckResult {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  checks: {
    functionAccessible: boolean;
    environmentVariables: boolean;
    handlerExecutes: boolean;
    supabaseConnectivity: boolean;
    snsAlerts: boolean;
    cloudwatchMetrics: boolean;
  };
  details: Record<string, string>;
  recommendations: string[];
}

export async function checkLambdaHealth(): Promise<HealthCheckResult> {
  const checks = {
    functionAccessible: false,
    environmentVariables: false,
    handlerExecutes: false,
    supabaseConnectivity: false,
    snsAlerts: false,
    cloudwatchMetrics: false
  };
  const details: Record<string, string> = {};
  const recommendations: string[] = [];

  // 1. Check function exists
  try {
    const func = await lambda.getFunction({
      FunctionName: 'story-agent-stress-test-orchestrator'
    }).promise();
    checks.functionAccessible = true;
    details.functionArn = func.Configuration!.FunctionArn!;
  } catch (e) {
    details.functionAccessible = String(e);
    recommendations.push('Redeploy Lambda via Terraform');
  }

  // 2. Check environment variables
  try {
    const config = await lambda.getFunctionConfiguration({
      FunctionName: 'story-agent-stress-test-orchestrator'
    }).promise();
    
    const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'SNS_TOPIC_ARN'];
    const missing = required.filter(v => !config.Environment?.Variables?.[v]);
    
    if (missing.length === 0) {
      checks.environmentVariables = true;
    } else {
      details.environmentVariables = `Missing: ${missing.join(', ')}`;
      recommendations.push('Update Terraform variables and reapply');
    }
  } catch (e) {
    details.environmentVariables = String(e);
  }

  // 3. Test handler execution
  try {
    const result = await lambda.invoke({
      FunctionName: 'story-agent-stress-test-orchestrator',
      Payload: JSON.stringify({ action: 'health_check', mode: 'test' }),
      InvocationType: 'RequestResponse'
    }).promise();
    
    const statusCode = result.StatusCode;
    if (statusCode === 200 || statusCode === 202) {
      checks.handlerExecutes = true;
    } else {
      details.handlerExecutes = `Status code: ${statusCode}`;
      recommendations.push('Check Lambda handler code for errors');
    }
  } catch (e) {
    details.handlerExecutes = String(e);
    recommendations.push('Verify IAM permissions for Lambda invocation');
  }

  // 4. Check Supabase connectivity (via test query)
  try {
    const result = await supabase
      .from('sa_stress_test_results')
      .select('count()', { count: 'exact' })
      .limit(1);
    
    if (!result.error) {
      checks.supabaseConnectivity = true;
    } else {
      details.supabaseConnectivity = result.error.message;
      recommendations.push('Verify Supabase credentials in Lambda environment');
    }
  } catch (e) {
    details.supabaseConnectivity = String(e);
  }

  // 5. Check SNS topic configuration
  try {
    const attrs = await sns.getTopicAttributes({
      TopicArn: process.env.SNS_TOPIC_ARN!
    }).promise();
    
    if (attrs.Attributes?.TopicArn) {
      checks.snsAlerts = true;
    }
  } catch (e) {
    details.snsAlerts = String(e);
    recommendations.push('Verify SNS topic exists and permissions');
  }

  // 6. Check CloudWatch metrics (should have data from last 24h)
  try {
    const metrics = await cloudwatch.listMetrics({
      Namespace: 'AWS/Lambda',
      Dimensions: [
        { Name: 'FunctionName', Value: 'story-agent-stress-test-orchestrator' }
      ]
    }).promise();
    
    if (metrics.Metrics && metrics.Metrics.length > 0) {
      checks.cloudwatchMetrics = true;
    } else {
      details.cloudwatchMetrics = 'No metrics found (may be normal if no execution)';
      recommendations.push('Wait for first EventBridge trigger or manual invocation');
    }
  } catch (e) {
    details.cloudwatchMetrics = String(e);
  }

  // Determine overall status
  const healthyCount = Object.values(checks).filter(v => v).length;
  const status = healthyCount === 6 ? 'HEALTHY' : healthyCount >= 4 ? 'DEGRADED' : 'UNHEALTHY';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
    details,
    recommendations
  };
}

// Register as MCP tool
defineSkillTheory({
  name: 'lambda-health-check',
  who: 'O\'Brien (DevOps) + Geordi (Infrastructure)',
  what: 'Validates stress testing Lambda health post-deployment',
  when: 'After Terraform apply, before EventBridge activates',
  where: 'AWS Lambda + Supabase + SNS (cross-system)',
  why: 'Catch deployment issues early, automate troubleshooting',
  how: {
    steps: [
      'Check Lambda function accessible',
      'Verify environment variables',
      'Test handler execution',
      'Validate Supabase connectivity',
      'Check SNS topic configuration',
      'Verify CloudWatch metrics flowing'
    ],
    estimates: '30 seconds total',
    fallback: 'Manual troubleshooting (see DEPLOYMENT_STRESS_TESTING_2WEEK.md)'
  }
});
```

**MCP Tool Registration:**
- Add to `lib/skill-theories.ts`
- Call from `run_crew_mission_pipeline` post-deploy hooks

### 2.3: Lambda Packaging in CI/CD
**Owner**: Geordi (Infrastructure)  
**File to Create**: `packages/mcp-server/src/lambda/build.ts`

```typescript
/**
 * Lambda Handler Build & Packaging
 * 
 * Steps:
 * 1. Compile handler.ts to handler.js
 * 2. Bundle with Supabase + AWS SDK
 * 3. Create stress-test-lambda.zip
 * 4. Upload to S3 (for Terraform to reference)
 */

import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function buildLambdaHandler() {
  console.log('[*] Building Lambda handler...');

  // 1. Bundle handler with dependencies
  await esbuild.build({
    entryPoints: ['lambda/stress-test-handler.js'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'lambda/dist/index.js',
    external: ['@aws-sdk/client-lambda'], // AWS SDK provided by Lambda runtime
    minify: true
  });

  console.log('[✓] Handler bundled');

  // 2. Create ZIP file
  execSync('cd lambda/dist && zip -j ../stress-test-lambda.zip index.js', {
    stdio: 'inherit'
  });

  const size = fs.statSync('lambda/stress-test-lambda.zip').size / 1024;
  console.log(`[✓] ZIP created (${size}KB)`);

  // 3. Verify ZIP integrity
  const verify = execSync('unzip -t lambda/stress-test-lambda.zip', {
    encoding: 'utf-8'
  });
  if (verify.includes('1 file')) {
    console.log('[✓] ZIP integrity verified');
  } else {
    throw new Error('ZIP verification failed');
  }

  console.log('[✓] Lambda handler build complete');
}

// Add to package.json scripts:
// "build:lambda": "npx tsx packages/mcp-server/src/lambda/build.ts"
```

**Integration**: Run in CI/CD before `terraform apply`

### 2.4: Handler Versioning Strategy
**Owner**: Data (Architecture)  
**Document**: `docs/lambda-versioning-strategy.md`

```markdown
# Lambda Handler Versioning

## Strategy: Blue/Green Deployments

1. **Current**: v1 (stress-test-orchestrator)
2. **Incoming**: v2 (stress-test-orchestrator:canary)
3. **Rollback**: v0 (stress-test-orchestrator:stable)

## Process

1. Deploy new version as alias `:canary`
2. EventBridge sends 10% traffic to `:canary`
3. Monitor CloudWatch metrics vs. `:stable`
4. If metrics green for 1 hour: Promote `:canary` → `:stable`
5. If metrics red: Rollback to `:stable`, notify crew

## Implementation

```bash
# Deploy new version
aws lambda publish-version --function-name story-agent-stress-test-orchestrator

# Create canary alias (10% traffic)
aws lambda update-alias \
  --function-name story-agent-stress-test-orchestrator \
  --name canary \
  --function-version $NEW_VERSION \
  --routing-config AdditionalVersionWeightConfig={v:0.1}

# Monitor for 1 hour

# Promote to stable
aws lambda update-alias \
  --function-name story-agent-stress-test-orchestrator \
  --name stable \
  --function-version $NEW_VERSION
```
```

---

## 📋 Validation Checklist

**For Admiral (Human):**
- [ ] Review crew validation results
- [ ] Approve Lambda activation
- [ ] Authorize EventBridge trigger

**For Data (Lead):**
- [ ] Run Steps 1-3 validation (function, env vars, invocation)
- [ ] Review CloudWatch logs
- [ ] Query Supabase for results
- [ ] Sign off on handler readiness

**For Geordi (Infrastructure):**
- [ ] Verify alarm configuration
- [ ] Check EventBridge rule active
- [ ] Monitor first 24-hour baseline

**For Worf (Security):**
- [ ] Audit IAM policies (no over-scoping)
- [ ] Verify no secrets in logs
- [ ] Check credential isolation

**For Uhura (Communications):**
- [ ] SNS alerts subscribed
- [ ] Test alert delivery (<2sec SLA)
- [ ] Document escalation path

---

## ✅ Success Criteria

| Criterion | Validation | Target |
|-----------|-----------|---------|
| Handler executes | Step 3 invocation | No errors in logs |
| Supabase writes | Step 5 query | Results table populated |
| Alerts deliver | Step 6 SNS test | <2 seconds per Uhura |
| Cost tracking | Check sa_cost_tracking | <$0.90 per run |
| Automation designed | Phases 2.1-2.4 | 4 automation files created |

---

## 🎯 Next Actions

**Immediate (Today):**
1. Data runs Steps 1-7 validation
2. Crew documents any issues in crew-observations
3. Picard aggregates crew feedback

**Within 24 hours:**
1. Data signs off on handler readiness
2. Geordi confirms EventBridge baseline
3. Uhura verifies SNS <2sec SLA

**Within 1 week:**
1. Picard finalizes post-deploy validation hook
2. O'Brien designs health check MCP tool
3. Geordi creates CI/CD Lambda packaging
4. Data documents versioning strategy

**Week 2:**
1. Integrate automation into deployment workflow
2. Test automation with MEDIUM-priority improvements
3. Crew review + iterate

---

**Prepared by**: Copilot (orchestrator)  
**For Crew**: Picard, Data, Geordi, Worf, Uhura, O'Brien  
**Timeline**: 24-hour validation → 1-week automation design → 2-week integration
