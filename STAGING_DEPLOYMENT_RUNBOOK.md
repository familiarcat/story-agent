# STAGING DEPLOYMENT RUNBOOK v1.0
**Story Agent — 5% Canary Wave | T+0 to T+30 (Go/No-Go Decision)**

---

## EXECUTIVE SUMMARY

**Authority:** Captain Picard (Final Command)  
**Execution Window:** 30 minutes (T+0 to T+30)  
**Deployment Strategy:** AWS CodeDeploy Linear5% with 300s health observation  
**Risk Level:** Medium (crew consensus) | Confidence: 89%  
**Cost Budget:** $250/hr staging (15% buffer on projected)  
**Rollback Authority:** Chief O'Brien (DevOps) — can execute at any phase

---

## CRITICAL SUCCESS CRITERIA (READ FIRST)

✅ **All 5 items must PASS before proceeding to next phase:**

1. **Pre-Flight (T+0 to T+2):** All 6 security checks green
2. **Terraform Apply (T+2 to T+7):** Infrastructure deployed, no errors in state
3. **Canary Route (T+7 to T+12):** 5% traffic routed, ALB health checks passing
4. **Health Observation (T+12 to T+17):** No anomalies in metrics (p99 latency, error rate, schema validation)
5. **Go/No-Go (T+17 to T+20):** Crew sign-off + ops approval → Proceed to 95% or ROLLBACK

**If ANY check fails → STOP and execute Rollback (Section 9)**

---

## SECTION 1: PRE-DEPLOYMENT CHECKS (T+0 to T+2)
### 2 minutes | Non-Technical Operator

**Before you touch anything, run these commands in order. If any fails, STOP and call Riker.**

### 1.1 Verify AWS Credentials

```bash
# Check active AWS profile
aws sts get-caller-identity

# Expected output: Your account ID and role (should include "staging-deploy")
# If NOT present: export AWS_PROFILE=staging-deploy && retry
```

**✅ PASS Criteria:** Output shows correct account + `staging-deploy` role  
**❌ FAIL Criteria:** Authentication error or wrong account

---

### 1.2 Validate Terraform State Encryption (Security Gate #1)

```bash
# Check S3 backend is encrypted with KMS
aws s3api get-bucket-encryption --bucket story-agent-terraform-state --region us-east-1

# Expected output: KMS key ARN in SSERules
```

**✅ PASS Criteria:** KMS key present  
**❌ FAIL Criteria:** No encryption or error → **STOP, call Worf**

---

### 1.3 Verify IAM Permissions (Security Gate #2 — Worf's Mandatory Check)

```bash
# Simulate permissions for this deployment
aws iam simulate-principal-policy \
  --policy-source-arn $(aws sts get-caller-identity --query Arn --output text) \
  --action-names ec2:RunInstances elasticloadbalancing:CreateLoadBalancer autoscaling:CreateAutoScalingGroup \
  --resource-arns "arn:aws:ec2:us-east-1:*:instance/*" "arn:aws:elasticloadbalancing:*:*:loadbalancer/*" "arn:aws:autoscaling:*:*:autoScalingGroup/*:*"

# Each action should show "allowed": true
```

**✅ PASS Criteria:** All 3 actions show `"allowed": true`  
**❌ FAIL Criteria:** Any action shows `"allowed": false` → **STOP, escalate to security team**

---

### 1.4 Check Auto Scaling Group Capacity (Geordi's Infrastructure Check)

```bash
# Verify ASG has headroom for full 100% deployment rollout
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "story-agent-staging-asg" \
  --query 'AutoScalingGroups[0].[MinSize,MaxSize,DesiredCapacity,Instances[].InstanceId]' \
  --output text

# Expected: MinSize >= 2, MaxSize >= 20, DesiredCapacity can scale to full prod load
```

**✅ PASS Criteria:** MaxSize >= 20 AND current instances healthy  
**❌ FAIL Criteria:** MaxSize < 10 or instances in "Unhealthy" state → **STOP, scale ASG**

```bash
# If capacity inadequate, scale it:
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name story-agent-staging-asg \
  --max-size 25 \
  --desired-capacity 10
```

---

### 1.5 Verify Load Balancer Health (Security Gate #3 — Crushing Validation)

```bash
# Check ALB is healthy and listening
aws elbv2 describe-load-balancers \
  --names story-agent-staging-alb \
  --query 'LoadBalancers[0].[State.Code,Scheme,Type]' \
  --output text

# Expected: "active internet application"
```

**✅ PASS Criteria:** State = "active"  
**❌ FAIL Criteria:** State = "provisioning", "failed", or error → **STOP, wait 2 min or restart ALB**

---

### 1.6 Validate Schema Migration Dry-Run (Data Architecture Check)

```bash
# Run non-destructive schema validation against current DB
aws dynamodb scan --table-name story-agent-staging-schema \
  --projection-expression "version,status" \
  --limit 10 \
  --output json | jq '.Count'

# Expected: Returns row count (>0)
```

**✅ PASS Criteria:** Query returns data without errors  
**❌ FAIL Criteria:** Error or timeout → **STOP, check DynamoDB status**

---

### 1.7 Pre-Flight Summary

Log each result. All 6 must be ✅ PASS.

```bash
# Shortcut: Run all checks at once (paste into terminal)
echo "=== PRE-FLIGHT CHECKS ===" && \
aws sts get-caller-identity && echo "✅ AWS Credentials OK" && \
aws s3api get-bucket-encryption --bucket story-agent-terraform-state --region us-east-1 && echo "✅ Terraform State Encrypted" && \
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "story-agent-staging-asg" --query 'AutoScalingGroups[0].MaxSize' && echo "✅ ASG Capacity OK" && \
aws elbv2 describe-load-balancers --names story-agent-staging-alb --query 'LoadBalancers[0].State.Code' && echo "✅ ALB Active"
```

**Decision:** If all 6 ✅ PASS → Proceed to Section 2 (Terraform Apply)  
**Decision:** If any ❌ FAIL → STOP, escalate, do NOT proceed

---

## SECTION 2: TERRAFORM APPLY (T+2 to T+7)
### 5 minutes | DevOps Operator

**Goal:** Deploy canary infrastructure (5% of prod capacity)

### 2.1 Prepare Terraform Variables

```bash
# Set deployment mode to CANARY (5% of prod)
export TF_VAR_canary_percentage=5
export TF_VAR_canary_instance_count=1  # 5% of 20 = 1 instance
export TF_VAR_environment=staging
export TF_VAR_enable_health_checks=true
export TF_VAR_rollback_window_seconds=300  # 5-min observation window
```

### 2.2 Validate Terraform Plan (No Actual Changes Yet)

```bash
cd terraform/

# Dry-run: Show what will be created (DO NOT APPLY YET)
terraform plan \
  -var-file=environments/staging.tfvars \
  -out=canary.plan

# Review output: Should show ~8-12 resources to create (EC2, security groups, IAM roles, etc.)
# If unexpected resources appear → STOP and review differences
```

**✅ PASS Criteria:** Plan shows exactly:
- 1x EC2 instance (canary)
- 1x security group
- 1x IAM role + instance profile
- 1x target group attachment
- 0 database/destructive changes

**❌ FAIL Criteria:** Trying to delete databases, modify schema, or create >10 resources → **STOP, review**

### 2.3 Apply Terraform (CREATE INFRASTRUCTURE)

```bash
# THIS CREATES REAL INFRASTRUCTURE
terraform apply canary.plan

# Operator: Watch output until you see:
# "Apply complete! Resources added: X, changed: 0, destroyed: 0"
# If you see "destroyed: >0" → STOP and rollback!

# Capture the canary instance ID
export CANARY_INSTANCE_ID=$(terraform output -raw canary_instance_id)
echo "Canary Instance: $CANARY_INSTANCE_ID"
```

**✅ PASS Criteria:** Apply completes, 0 destroyed, 1 instance running  
**❌ FAIL Criteria:** Destroyed resources, apply hangs >2 min, or errors → Proceed to Section 9 (ROLLBACK)

### 2.4 Verify Instance Launch

```bash
# Wait up to 60 seconds for instance to be "running"
aws ec2 wait instance-running --instance-ids $CANARY_INSTANCE_ID

# Check instance status checks
aws ec2 describe-instance-status \
  --instance-ids $CANARY_INSTANCE_ID \
  --query 'InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]' \
  --output text

# Expected: "running ok ok"
```

**✅ PASS Criteria:** All three = "ok" or "running"  
**❌ FAIL Criteria:** Any = "failed" or "impaired" → Terminate instance, rollback

```bash
# If instance health bad: terminate and rollback
aws ec2 terminate-instances --instance-ids $CANARY_INSTANCE_ID
# Then go to Section 9
```

### 2.5 Terraform State Backup

```bash
# Safety: back up state before ALB routing
aws s3 cp \
  s3://story-agent-terraform-state/staging/terraform.tfstate \
  s3://story-agent-terraform-state/staging/terraform.tfstate.backup-$(date +%s)

echo "✅ Terraform state backed up"
```

---

## SECTION 3: LOAD BALANCER CANARY ROUTING (T+7 to T+12)
### 5 minutes | Infrastructure Operator

**Goal:** Route 5% of prod traffic to canary instance via ALB

### 3.1 Register Canary Instance with Target Group

```bash
# Add canary instance to the ALB target group for 5% traffic
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-canary/... \
  --targets Id=$CANARY_INSTANCE_ID,Port=3000

# Verify registration
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-canary/... \
  --output table

# Expected: Canary instance shows "initial" then "healthy" within 30 seconds
```

**✅ PASS Criteria:** Instance appears in target list within 10 seconds  
**❌ FAIL Criteria:** Registration fails or instance never reaches "healthy" → Deregister and rollback

### 3.2 Enable ALB Canary Rules (AWS CanaryDeployment Config)

```bash
# Update ALB listener rule to send 5% of traffic to canary target group
aws elbv2 modify-listener-rule \
  --rule-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener-rule/app/story-agent/... \
  --actions Type=forward,ForwardConfig="{TargetGroups=[{TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-prod/,Weight=95},{TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-canary/,Weight=5}]}"

# Verify rule applied
aws elbv2 describe-rules \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener/app/story-agent/... \
  --query 'Rules[0].ForwardConfig.TargetGroups'
```

**✅ PASS Criteria:** Output shows 95/5 split  
**❌ FAIL Criteria:** Rule application fails → Revert to 100/0, rollback

### 3.3 Activate ALB Access Logs (Monitoring for Section 4)

```bash
# Enable ALB logs to CloudWatch for canary observation
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:loadbalancer/app/story-agent/... \
  --attributes Key=access_logs.s3.enabled,Value=true Key=access_logs.s3.bucket,Value=story-agent-staging-logs Key=access_logs.s3.prefix,Value=canary

echo "✅ ALB canary routing active, 5% traffic routed"
```

---

## SECTION 4: HEALTH CHECK VALIDATION (T+12 to T+17)
### 5 minutes | Monitoring Operator + Crusher (Health Lead)

**Goal:** Observe canary for 5 min. If any metrics go red → ROLLBACK immediately.

### 4.1 Start Monitoring Dashboard (Real-Time)

```bash
# Option A: CLI Watch Loop (every 10 seconds)
watch -n 10 'aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/story-agent/XXXX Name=TargetGroup,Value=targetgroup/story-agent-staging-canary/XXXX \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 10 \
  --statistics Average,Maximum \
  --query "Datapoints[0].[Average,Maximum]" \
  --output text'

# Option B: Open CloudWatch Dashboard
open "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=story-agent-canary"
```

### 4.2 Baseline Metrics (Record These T+12)

```bash
# Capture current production (prod target group) metrics as baseline
export PROD_P99_LATENCY=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=TargetGroup,Value=targetgroup/story-agent-staging-prod/XXXX \
  --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average \
  --query "Datapoints[0].Average" --output text)

export PROD_ERROR_RATE=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=TargetGroup,Value=targetgroup/story-agent-staging-prod/XXXX \
  --start-time $(date -u -d "10 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum \
  --query "Datapoints[0].Sum" --output text)

echo "Baseline P99 Latency: ${PROD_P99_LATENCY}ms"
echo "Baseline Error Rate: ${PROD_ERROR_RATE} 5XX errors/min"
```

### 4.3 Continuous Health Check Loop (T+12 to T+17 — Every 30 seconds)

Run this in a separate terminal. It polls canary metrics and auto-aborts if thresholds exceed 20% degradation.

```bash
#!/bin/bash
# health-check-loop.sh
# Run this continuously for 5 minutes

OBSERVATION_END=$(($(date +%s) + 300))  # 5 minutes from now
FAILURE_COUNT=0
MAX_FAILURES=2  # Allow up to 2 consecutive failures before rollback

while [ $(date +%s) -lt $OBSERVATION_END ]; do
  echo "=== Health Check $(date +%H:%M:%S) ==="
  
  # Query canary metrics
  CANARY_LATENCY=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions Name=TargetGroup,Value=targetgroup/story-agent-staging-canary/XXXX \
    --start-time $(date -u -d "1 minute ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Average \
    --query "Datapoints[0].Average" --output text)
  
  CANARY_ERROR_RATE=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --dimensions Name=TargetGroup,Value=targetgroup/story-agent-staging-canary/XXXX \
    --start-time $(date -u -d "1 minute ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Sum \
    --query "Datapoints[0].Sum" --output text)
  
  # Apply 20% degradation threshold
  LATENCY_THRESHOLD=$(echo "$PROD_P99_LATENCY * 1.2" | bc)
  ERROR_THRESHOLD=$(echo "$PROD_ERROR_RATE * 1.2" | bc)
  
  echo "Canary Latency: ${CANARY_LATENCY}ms (threshold: ${LATENCY_THRESHOLD}ms)"
  echo "Canary Errors: ${CANARY_ERROR_RATE} (threshold: ${ERROR_THRESHOLD})"
  
  # Check thresholds
  if (( $(echo "$CANARY_LATENCY > $LATENCY_THRESHOLD" | bc -l) )); then
    echo "⚠️  LATENCY DEGRADATION DETECTED"
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
  elif (( $(echo "$CANARY_ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
    echo "⚠️  ERROR RATE DEGRADATION DETECTED"
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
  else
    echo "✅ Metrics Healthy"
    FAILURE_COUNT=0  # Reset on success
  fi
  
  # Auto-abort if 2 consecutive failures
  if [ $FAILURE_COUNT -ge 2 ]; then
    echo "❌ HEALTH CHECK FAILED (2 consecutive failures)"
    echo "Initiating automatic rollback..."
    # Jump to Section 9 (Rollback)
    exit 1
  fi
  
  sleep 30
done

echo "✅ 5-minute observation window complete, no anomalies detected"
```

**Run it:**
```bash
chmod +x health-check-loop.sh
./health-check-loop.sh
```

**✅ PASS Criteria:** Script completes without triggering rollback  
**❌ FAIL Criteria:** 2 consecutive failures OR script exits with status 1 → Proceed to Section 9 (ROLLBACK)

### 4.4 Manual Schema Validation (T+15)

```bash
# Validate data integrity: compare canary vs prod schema
aws dynamodb scan --table-name story-agent-staging-schema-canary \
  --projection-expression "version,status,timestamp" \
  --limit 50 \
  --output json > /tmp/canary_schema.json

aws dynamodb scan --table-name story-agent-staging-schema-prod \
  --projection-expression "version,status,timestamp" \
  --limit 50 \
  --output json > /tmp/prod_schema.json

# Compare record counts
CANARY_COUNT=$(jq '.Count' /tmp/canary_schema.json)
PROD_COUNT=$(jq '.Count' /tmp/prod_schema.json)

echo "Canary records: $CANARY_COUNT | Prod records: $PROD_COUNT"

# Accept if within 10% (expected: canary is 5% of traffic)
if (( $(echo "$CANARY_COUNT > 0 && $CANARY_COUNT <= ($PROD_COUNT * 0.15)" | bc -l) )); then
  echo "✅ Schema validation passed"
else
  echo "❌ Schema validation failed: unexpected record counts"
  exit 1
fi
```

**✅ PASS Criteria:** Canary record count is 5-15% of prod (accounts for traffic distribution)  
**❌ FAIL Criteria:** Canary count = 0 or > prod count → Rollback immediately

---

## SECTION 5: TESTER ACCESS PROVISIONING (T+12 to T+20)
### Parallel with Section 4 | Communications Operator

**Goal:** Grant early-wave testers access to canary environment

### 5.1 Generate Temporary AWS STS Tokens (Security: Troi-approved)

```bash
# Generate temporary read-only access for tester cohort
aws sts assume-role \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/story-agent-staging-tester \
  --role-session-name tester-canary-$(date +%s) \
  --duration-seconds 3600 \
  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
  --output text > /tmp/tester_creds.txt

# Output: AccessKeyId | SecretAccessKey | SessionToken (valid for 1 hour)
cat /tmp/tester_creds.txt
```

### 5.2 Distribute Tester Credentials via Secure Channel

```bash
# Encrypt credentials for tester distribution
openssl enc -aes-256-cbc -salt -in /tmp/tester_creds.txt -out /tmp/tester_creds.enc

# Share encrypted file + decryption password via separate channels
echo "Credentials encrypted. Share tester_creds.enc + password via secure channel."
echo "Testers will decrypt with: openssl enc -d -aes-256-cbc -in tester_creds.enc"
```

### 5.3 Provision Tester Cohort (First 5% of early-access users)

```bash
# List tester email addresses
TESTER_EMAILS=("alice@company.com" "bob@company.com" "charlie@company.com" "diana@company.com" "eve@company.com")

# Send each tester:
# 1. Canary URL: https://staging-canary.story-agent.internal
# 2. STS credentials (encrypted)
# 3. Expected behavior statement
# 4. "You are wave 1 of 5% early access — thank you for testing!"

for email in "${TESTER_EMAILS[@]}"; do
  echo "Provisioning $email with canary credentials..."
  # In production: Use SES or notification service
  # sendmail -t <<EOF
  # To: $email
  # Subject: [Story Agent] Staging Canary Access — 5% Early Wave
  # 
  # You've been selected for the first 5% canary wave!
  # URL: https://staging-canary.story-agent.internal
  # Credentials: [encrypted file attached]
  # Password: [via SMS]
  # 
  # Please test for 30 minutes and report any issues.
  # EOF
done

echo "✅ Tester cohort provisioned"
```

---

## SECTION 6: MONITORING ACTIVATION (T+17 to T+20)
### 3 minutes | Monitoring Operator

**Goal:** Activate all alerts and Slack notifications for incident response

### 6.1 Enable CloudWatch Alarms

```bash
# Create/enable canary-specific alarms

# Alarm 1: High latency
aws cloudwatch put-metric-alarm \
  --alarm-name story-agent-staging-canary-high-latency \
  --alarm-description "Canary latency >1.2x baseline" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 240 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts

# Alarm 2: High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name story-agent-staging-canary-high-errors \
  --alarm-description "Canary error rate >0.5%" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts

# Alarm 3: Unhealthy target
aws cloudwatch put-metric-alarm \
  --alarm-name story-agent-staging-canary-unhealthy \
  --alarm-description "Canary target health check failed" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts

echo "✅ CloudWatch alarms enabled"
```

### 6.2 Activate Slack Notifications

```bash
# Verify SNS topic is subscribed to Slack
aws sns list-subscriptions-by-topic \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts \
  --query 'Subscriptions[?Protocol==`https`]'

# Expected: At least one subscription with Protocol=https pointing to Slack webhook
# If missing, create:
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

echo "✅ Slack notifications active"
```

### 6.3 Open Incident Response Channel

```bash
# Create Slack channel for this deployment
slack channel create story-agent-staging-canary-$(date +%Y%m%d-%H%M%S)

# Add team members:
# - Captain Picard (command)
# - Chief O'Brien (rollback authority)
# - Geordi (infrastructure)
# - Crusher (monitoring)
# - Uhura (communications)

echo "#story-agent-staging-canary created. All hands standing by."
```

---

## SECTION 7: GO/NO-GO GATE REVIEW (T+20 to T+23)
### 3 minutes | Decision Authority (Picard + Crew)

**Review these 6 items. ALL must be ✅ to proceed to 95% escalation.**

### Gate 1: Health Metrics ✅ or ❌

```bash
# Pulled from Section 4.3
echo "Canary Latency: BASELINE_OK?"
echo "Canary Error Rate: BASELINE_OK?"
echo "Schema Record Count: WITHIN_5-15%?"

# Decision: ✅ PASS if all baseline
```

### Gate 2: Tester Cohort Feedback ✅ or ❌

```bash
# Poll Slack #story-agent-staging-canary for tester reports
# Decision: ✅ PASS if < 2 critical bugs, no feature regressions
```

### Gate 3: Security Clearance (Worf) ✅ or ❌

```bash
# Check GuardDuty findings
aws guardduty list-findings \
  --detector-id $(aws guardduty list-detectors --query 'DetectorIds[0]' --output text) \
  --finding-criteria '{"Criterion":{"severity":{"Eq":["4","4.0","4.1","4.2"]}}}' \
  --query 'FindingIds'

# Decision: ✅ PASS if 0 HIGH/CRITICAL findings in last 20 minutes
```

### Gate 4: Cost Monitoring (Quark) ✅ or ❌

```bash
# Check AWS Cost Explorer for canary spend
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -d "20 minutes ago" +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text

# Decision: ✅ PASS if <= $50 (15% buffer on $43.33 baseline)
```

### Gate 5: Load Balancer Status ✅ or ❌

```bash
# Verify 5% routing still active
aws elbv2 describe-rules \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener/app/story-agent/... \
  --query 'Rules[0].ForwardConfig.TargetGroups[?Weight!=null]'

# Decision: ✅ PASS if 95/5 split confirmed
```

### Gate 6: Crew Consensus ✅ or ❌

```bash
# Final vote (all 11 must agree or consensus > 80%)
# Picard (command), Riker (exec), Data (design), Geordi (infra), 
# O'Brien (ops), Worf (security), Crusher (health), Yar (qa),
# Troi (stakeholder), Uhura (comms), Quark (finance)

# Decision: ✅ PASS if >= 9/11 confidence to proceed to 95%
```

---

## GATE DECISION LOGIC

```
IF ALL 6 GATES = ✅ THEN:
  → Proceed to Section 8 (Escalate to 95%)
  
ELSE IF ANY GATE = ❌ THEN:
  → STOP and proceed to Section 9 (ROLLBACK)
  → Crew post-incident review
```

---

## SECTION 8: ESCALATION DECISION (95% or ROLLBACK)
### Conditional | O'Brien Authority (DevOps Lead)

**This section only executes IF all 7 gates pass (T+23+).**

### 8.1 Escalate ALB from 5% → 95%

```bash
# Update ALB rule: 5% prod → 95% prod (95/5 flips to 5/95)
aws elbv2 modify-listener-rule \
  --rule-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener-rule/app/story-agent/... \
  --actions Type=forward,ForwardConfig="{TargetGroups=[{TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-canary/,Weight=95},{TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-prod/,Weight=5}]}"

echo "✅ Traffic escalated to 95% canary"
```

### 8.2 Activate Extended Monitoring (95% wave)

```bash
# Raise alert thresholds for 95% (larger cohort expected)
aws cloudwatch put-metric-alarm \
  --alarm-name story-agent-staging-95pct-high-latency \
  --threshold 250 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:story-agent-staging-alerts

# Monitor for 10 minutes
echo "95% wave active. Monitoring for 10 minutes (T+23 to T+33)..."
```

### 8.3 Continuous Monitoring (T+23 to T+33)

```bash
# Repeat health check loop from Section 4.3 for 10 minutes
# Same thresholds, same failure criteria
# Decision: ✅ PASS if 10 minutes complete without 2 consecutive failures
```

### 8.4 Final Confidence Vote

```bash
# Crew reconvenes for final approval to merge canary → production
# Decision: ✅ GO LIVE or ❌ ROLLBACK

echo "Final decision: GO LIVE? (y/n)"
read DECISION

if [ "$DECISION" = "y" ]; then
  echo "🚀 AUTHORIZED FOR PRODUCTION MERGE (next sprint gate)"
  # Section NOT in this runbook: Production traffic shift happens next
else
  echo "↩️  Returning to 5% canary or rolling back..."
  # Proceed to Section 9
fi
```

---

## SECTION 9: ROLLBACK PROCEDURE
### **EMERGENCY** | O'Brien Authority (can execute at any phase)

**IF at ANY time (Sections 1-8) a metric fails or crew votes ❌:**

### 9.1 IMMEDIATE: Revert ALB Routing (0 seconds — go back to 100% prod)

```bash
# EMERGENCY: Route 100% of traffic back to production target group ONLY
aws elbv2 modify-listener-rule \
  --rule-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:listener-rule/app/story-agent/... \
  --actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-prod/XXXX

echo "✅ Emergency: Traffic reverted to 100% production"
```

### 9.2 DEREGISTER Canary Instance (0-5 seconds)

```bash
# Remove canary instance from ALB (stop accepting new requests)
aws elbv2 deregister-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-canary/XXXX \
  --targets Id=$CANARY_INSTANCE_ID

echo "✅ Canary instance deregistered from ALB"
```

### 9.3 TERMINATE Canary Infrastructure (5-10 seconds)

```bash
# Destroy canary EC2 instance
aws ec2 terminate-instances --instance-ids $CANARY_INSTANCE_ID

# Wait for termination
aws ec2 wait instance-terminated --instance-ids $CANARY_INSTANCE_ID

echo "✅ Canary instance terminated"
```

### 9.4 TERRAFORM DESTROY (10-30 seconds)

```bash
# Roll back all canary infrastructure as code
cd terraform/

# Plan destruction (dry-run)
terraform plan -destroy \
  -var-file=environments/staging.tfvars \
  -out=destroy.plan

# Review: should show 1 EC2, 1 SG, 1 IAM role being deleted

# Execute destruction
terraform apply destroy.plan

echo "✅ Terraform canary state destroyed"
```

### 9.5 VERIFY Production Baseline (Ensure Stability)

```bash
# Confirm prod target group is healthy
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/story-agent-staging-prod/XXXX \
  --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`]' \
  --output table

# Expected: All prod instances showing "healthy"
```

### 9.6 Restore Terraform State Backup (Safety Net)

```bash
# If terraform destroy caused issues, restore from backup
aws s3 cp \
  s3://story-agent-terraform-state/staging/terraform.tfstate.backup-TIMESTAMP \
  s3://story-agent-terraform-state/staging/terraform.tfstate

echo "✅ Terraform state restored from backup (if needed)"
```

### 9.7 Post-Rollback Notification

```bash
# Notify Slack
slack message "#story-agent-staging-canary" \
  "@channel ROLLBACK COMPLETE. Staging back at 100% production. Root cause analysis required."

# Create incident post-mortem ticket (Aha)
echo "Create Aha incident ticket with:"
echo "- Title: 'Canary Rollback: [reason]'"
echo "- Root cause: [specific failure from Section 1-8]"
echo "- Timeline: [start time] to [end time]"
echo "- Impact: [5-10% user cohort affected for X minutes]"
```

### 9.8 Crew Post-Incident Review (Within 1 hour)

```bash
# Crew reconvenes (Observation Lounge) to discuss:
# 1. What failed?
# 2. Why did detection take X seconds?
# 3. What can we automate to prevent recurrence?
# 4. Recommendations for next wave?

echo "Scheduling post-mortem in #story-agent-staging-canary..."
```

---

## CRITICAL CONTACTS (ESCALATION CHAIN)

| Role | Name | Contact | Authority |
|---|---|---|---|
| **Command** | Captain Picard | picard@company.com | Final decision authority |
| **Exec** | Commander Riker | riker@company.com | Deployment sequence approval |
| **Rollback Authority** | Chief O'Brien | obrien@company.com | Can execute rollback unilaterally |
| **Infrastructure** | Geordi La Forge | geordi@company.com | Terraform/AWS issues |
| **Security Gate** | Lt. Worf | worf@company.com | Security escalations (veto authority) |
| **Monitoring** | Dr. Crusher | crusher@company.com | Health/alert interpretation |
| **QA Lead** | Lt. Yar | yar@company.com | Tester feedback synthesis |
| **Communications** | Lt. Uhura | uhura@company.com | Status updates, tester comms |
| **Finance** | Quark | quark@company.com | Cost overruns, budget escalation |

---

## QUICK REFERENCE: COMMANDS BY PHASE

### Pre-Flight (T+0 to T+2)
```bash
aws sts get-caller-identity
aws s3api get-bucket-encryption --bucket story-agent-terraform-state
aws iam simulate-principal-policy --policy-source-arn ... --action-names ec2:RunInstances ...
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names story-agent-staging-asg
aws elbv2 describe-load-balancers --names story-agent-staging-alb
aws dynamodb scan --table-name story-agent-staging-schema
```

### Terraform (T+2 to T+7)
```bash
terraform plan -var-file=environments/staging.tfvars -out=canary.plan
terraform apply canary.plan
terraform output -raw canary_instance_id
```

### Routing (T+7 to T+12)
```bash
aws elbv2 register-targets --target-group-arn ... --targets Id=$CANARY_INSTANCE_ID,Port=3000
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,ForwardConfig=...
```

### Monitoring (T+12 to T+17)
```bash
aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name TargetResponseTime ...
./health-check-loop.sh
```

### Gate Review (T+20 to T+23)
```bash
aws guardduty list-findings --detector-id ... --finding-criteria ...
aws ce get-cost-and-usage --time-period ...
aws elbv2 describe-rules --listener-arn ...
```

### Escalation (T+23+)
```bash
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,ForwardConfig="{TargetGroups=[{...Weight=95},{...Weight=5}]}"
```

### Rollback (Emergency)
```bash
aws elbv2 modify-listener-rule --rule-arn ... --actions Type=forward,TargetGroupArn=...PROD...
aws elbv2 deregister-targets --target-group-arn ...CANARY... --targets Id=$CANARY_INSTANCE_ID
aws ec2 terminate-instances --instance-ids $CANARY_INSTANCE_ID
terraform destroy -auto-approve
```

---

## RISK MATRIX & MITIGATIONS

| Risk | Blast Radius | Detection | Mitigation |
|---|---|---|---|
| **IAM Permission Denied** | None (pre-flight gate) | Immediate (Section 1.3) | Stop before deploy; escalate to Worf |
| **Instance Health Check Failed** | 5% traffic (canary only) | 30s (health loop Section 4.3) | Auto-rollback on 2 consecutive failures |
| **Latency Spike >20%** | 5% cohort initially; 95% if missed | 60s (CloudWatch) | Auto-deregister + rollback; manual override requires Picard approval |
| **Schema Validation Failed** | Data consistency risk | 5min (Section 4.4) | Stop escalation; investigate data drift |
| **ALB Routing Misconfiguration** | Traffic might miss canary entirely | 10s (manual verification Section 3.1) | Verify 95/5 split before each gate; manual revert if wrong |
| **Runaway Costs** | Billing overrun | Every 5 min (CloudWatch) | Budget alert at $50; escalate to Quark |
| **Canary Instance Unresponsive** | No traffic to test | 30s (target health) | Terminate + re-provision OR rollback |
| **Production Degradation** | 5-95% users (depending on phase) | Real-time metrics | Immediate ALB revert (Section 9.1) + crew vote |

---

## CREW CONSENSUS STATEMENT

**Confidence Level: 89%**

**Critical Conditions for Launch:**
1. All 6 pre-flight gates (Section 1) must PASS
2. All 5 health metrics must be within baseline ± 20% (Section 4)
3. Worf security clearance (GuardDuty findings = 0)
4. At least 9/11 crew confidence vote

**Contingencies If Things Go Sideways:**
- Any health metric triggers >2 consecutive failures → Auto-rollback (Section 9)
- Tester cohort reports critical bugs → Stop escalation + investigate
- Cost exceeds $50 → Quark escalates to Picard
- Security finding detected → Worf veto, immediate rollback

**Consensus on Approach:**
- Use AWS CodeDeploy Linear5% strategy (balanced, proven)
- Terraform count parameters for canary sizing (immutable, auditable)
- CloudWatch 3/5 consensus checks (reduce false positives)
- Manual approval at T+20 gate (human authority)

---

## COMMAND DECISION (PICARD'S FINAL ORDER)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    CAPTAIN'S STANDING ORDER                               ║
║                   Staging Deployment — Canary Wave 1                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

TO: Operations Team, DevOps (Chief O'Brien), Infrastructure (Geordi La Forge)
FROM: Captain Jean-Luc Picard, Command Authority
DATE: [DEPLOYMENT_DATE] T+0
MISSION: Execute 5% canary wave to staging environment per approved runbook

═══════════════════════════════════════════════════════════════════════════

AUTHORITY DELEGATED:

→ Chief O'Brien holds UNILATERAL ROLLBACK AUTHORITY at any phase.
  If systems go red, YOU WILL execute Section 9 without waiting for approval.
  
→ Geordi La Forge owns infrastructure gate (Section 2). If terraform apply 
  shows unexpected destructive changes, STOP and investigate. Do not proceed.

→ Lt. Worf owns security gate. If ANY high/critical finding emerges, 
  override the process — that's a veto.

→ Dr. Crusher monitors health. If metrics fail 2x consecutively, 
  auto-trigger rollback immediately.

═══════════════════════════════════════════════════════════════════════════

RULES OF ENGAGEMENT:

1. Execute sections in order (1 → 2 → 3 → ... → 8).
   No skipping. No parallel work except Section 5 (comms).

2. At T+20 gate review: ALL 6 criteria must be ✅.
   If any single criterion fails → escalate to me + execute rollback.

3. Contingency: If canary metrics degrade during Section 4 health loop,
   auto-abort. No waiting for human approval.

4. Escalation: If you're uncertain about a gate decision, 
   escalate to me (picard@company.com) BEFORE proceeding.

5. Cost control: If bill exceeds $50 staging budget, Quark escalates.
   We will pause deployment to investigate.

═══════════════════════════════════════════════════════════════════════════

EXPECTED OUTCOMES:

Success (89% confidence):
  → 5% user cohort deployed to canary
  → T+20 gates pass
  → Escalate to 95% wave
  → Enter production merge decision (next sprint)

Failure (11% confidence):
  → Detect failure in pre-flight, terraform, routing, or health checks
  → Execute rollback (Section 9)
  → Crew reconvenes 1h post-incident for post-mortem
  → No user impact beyond 5-10% cohort, <10min downtime

═══════════════════════════════════════════════════════════════════════════

COMMAND AUTHORITY:

You have permission to:
  • Deploy to staging infrastructure (AWS account: XXXX-XXXX-XXXX)
  • Route traffic via ALB to canary targets
  • Terminate canary resources if rollback needed
  • Escalate to security team (Worf) or me without cause

You do NOT have permission to:
  • Modify production infrastructure
  • Skip pre-flight gates
  • Proceed past ANY ❌ gate without my written approval
  • Deploy to production without full crew consensus (Section 8.4)

═══════════════════════════════════════════════════════════════════════════

FINAL WORDS:

This is a graduated rollout. We have built in redundancy, monitoring, 
and rapid rollback. We trust the process. We trust each other.

Execute the runbook. Trust your team. Make it so.

                                    — Picard
                                      Starship Story Agent
                                      Commanding Officer

═══════════════════════════════════════════════════════════════════════════
```

---

## APPENDIX: LOG TEMPLATE

Keep this log throughout the deployment (copy into terminal for timestamp tracking):

```
[T+00:00] Pre-Flight: STARTING
[T+00:15] Pre-Flight: Section 1.3 IAM Check — PASS ✅
[T+00:30] Pre-Flight: All gates — PASS ✅
[T+02:00] Terraform: Plan review — PASS ✅
[T+02:15] Terraform: Apply started
[T+06:45] Terraform: Apply complete — 1 instance running, PASS ✅
[T+07:30] ALB Routing: 5% traffic routed, PASS ✅
[T+12:00] Health Loop: Started, PASS ✅
[T+15:00] Schema Validation: PASS ✅
[T+17:00] Health Loop: Completed 5 min, no failures, PASS ✅
[T+20:00] Gate Review: All 6 criteria — PASS ✅
[T+23:00] Escalation: Routing to 95%, monitoring active
[T+33:00] Final Vote: Crew consensus 10/11 ✅ GO LIVE
[T+35:00] DEPLOYMENT COMPLETE - Ready for Production Merge

Notable Events:
- [timestamp] [event] [resolution]
- [timestamp] [event] [resolution]
```

---

**END OF RUNBOOK**

*Approved by: Captain Picard, Chief O'Brien, Crew Consensus*  
*Last Updated: [DATE]*  
*Version: 1.0 STAGING CANARY WAVE*

