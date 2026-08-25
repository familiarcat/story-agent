# AWS Lambda + EventBridge Infrastructure for 2-Week Stress Testing Cadence
# Crew consensus: 90% utilization cap, 512MB memory, 5/10 concurrency limits
# Cost target: <$0.90/run with <5% variance
# Schedule: Every 14 days at 02:00 UTC (off-peak)

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# IAM Role for Lambda execution
resource "aws_iam_role" "stress_test_lambda_role" {
  name = "story-agent-stress-test-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Policy: Logs
resource "aws_iam_role_policy" "stress_test_lambda_logs" {
  name = "stress-test-lambda-logs"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Policy: Supabase access (DynamoDB-style state via Supabase)
resource "aws_iam_role_policy" "stress_test_supabase_access" {
  name = "stress-test-supabase-access"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:supabase/*"
      }
    ]
  })
}

# Policy: GitHub API (via Secrets Manager)
resource "aws_iam_role_policy" "stress_test_github_access" {
  name = "stress-test-github-access"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:github/*"
      }
    ]
  })
}

# Policy: Cost Explorer (for cost verification)
resource "aws_iam_role_policy" "stress_test_cost_explorer" {
  name = "stress-test-cost-explorer"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy: CloudWatch (metrics + alarms)
resource "aws_iam_role_policy" "stress_test_cloudwatch" {
  name = "stress-test-cloudwatch"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy: SNS (for alerts)
resource "aws_iam_role_policy" "stress_test_sns" {
  name = "stress-test-sns"
  role = aws_iam_role.stress_test_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.stress_test_alerts.arn
      }
    ]
  })
}

# SNS Topic for alerts
resource "aws_sns_topic" "stress_test_alerts" {
  name = "story-agent-stress-test-alerts"

  tags = {
    Name      = "story-agent-stress-test-alerts"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "stress_test_lambda_logs" {
  name              = "/aws/lambda/story-agent-stress-test"
  retention_in_days = 30

  tags = {
    Name      = "story-agent-stress-test-logs"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# Lambda Function (placeholder - will be updated with actual code)
resource "aws_lambda_function" "stress_test_orchestrator" {
  filename      = "stress-test-lambda.zip"
  function_name = "story-agent-stress-test-orchestrator"
  role          = aws_iam_role.stress_test_lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 1800  # 30 minutes
  memory_size   = 512   # Worf's security boundary + cost control

  environment {
    variables = {
      SUPABASE_URL           = var.supabase_url
      SUPABASE_KEY           = var.supabase_key
      GITHUB_TOKEN           = var.github_token
      STRESS_TEST_RESULTS_TABLE = "sa_stress_test_results"
      COST_THRESHOLD_USD     = "0.90"
      COST_VARIANCE_PERCENT  = "5"
      SNS_TOPIC_ARN          = aws_sns_topic.stress_test_alerts.arn
      LOG_GROUP_NAME         = aws_cloudwatch_log_group.stress_test_lambda_logs.name
      CREW_TEAM_ASSIGNMENTS  = jsonencode({
        picard   = "orchestration"
        data     = "architecture"
        worf     = "security"
        quark    = "cost"
        geordi   = "infrastructure"
        obrien   = "devops"
        yar      = "quality"
        troi     = "stakeholder"
        crusher  = "health"
        uhura    = "communications"
      })
    }
  }

  tags = {
    Name      = "story-agent-stress-test-orchestrator"
    Project   = "story-agent"
    Component = "stress-testing"
    CreatedBy = "stress-test-bot"
  }

  vpc_config {
    # Optional: Add VPC configuration if needed for Supabase/GitHub access
    # security_group_ids = [...]
    # subnet_ids = [...]
  }

  depends_on = [
    aws_iam_role_policy.stress_test_lambda_logs,
    aws_iam_role_policy.stress_test_supabase_access,
    aws_iam_role_policy.stress_test_github_access,
    aws_iam_role_policy.stress_test_cost_explorer,
    aws_iam_role_policy.stress_test_cloudwatch,
    aws_iam_role_policy.stress_test_sns
  ]
}

# EventBridge Rule: Trigger every 14 days at 02:00 UTC
resource "aws_cloudwatch_event_rule" "stress_test_schedule" {
  name                = "story-agent-stress-test-14d"
  description         = "Trigger stress test suite every 14 days at 02:00 UTC (off-peak)"
  schedule_expression = "cron(0 2 ? * MON)"  # Every 2 weeks on Monday @ 02:00 UTC

  tags = {
    Name      = "story-agent-stress-test-schedule"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# EventBridge Target: Lambda
resource "aws_cloudwatch_event_target" "stress_test_lambda" {
  rule      = aws_cloudwatch_event_rule.stress_test_schedule.name
  target_id = "StressTestLambda"
  arn       = aws_lambda_function.stress_test_orchestrator.arn

  input = jsonencode({
    action   = "run_full_suite"
    mode     = "automated"
    source   = "eventbridge"
    timestamp = "$aws.scheduler.scheduled-time"
  })
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stress_test_orchestrator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stress_test_schedule.arn
}

# CloudWatch Alarm: Lambda execution errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "story-agent-stress-test-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.stress_test_alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.stress_test_orchestrator.function_name
  }

  tags = {
    Name      = "story-agent-stress-test-lambda-errors"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# CloudWatch Alarm: Lambda duration (P99 latency)
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "story-agent-stress-test-lambda-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1200000  # 1200ms in milliseconds (Yar's threshold)
  alarm_actions       = [aws_sns_topic.stress_test_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.stress_test_orchestrator.function_name
  }

  tags = {
    Name      = "story-agent-stress-test-lambda-duration"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# CloudWatch Alarm: Lambda concurrent executions (90% cap per Data's revision)
resource "aws_cloudwatch_metric_alarm" "lambda_concurrency" {
  alarm_name          = "story-agent-stress-test-lambda-concurrency"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ConcurrentExecutions"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Maximum"
  threshold           = 9  # 90% of 10 concurrent executions
  alarm_actions       = [aws_sns_topic.stress_test_alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.stress_test_orchestrator.function_name
  }

  tags = {
    Name      = "story-agent-stress-test-lambda-concurrency"
    Project   = "story-agent"
    Component = "stress-testing"
  }
}

# Outputs
output "lambda_function_arn" {
  value       = aws_lambda_function.stress_test_orchestrator.arn
  description = "ARN of the stress test Lambda function"
}

output "eventbridge_rule_arn" {
  value       = aws_cloudwatch_event_rule.stress_test_schedule.arn
  description = "ARN of the EventBridge rule"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.stress_test_alerts.arn
  description = "ARN of the SNS topic for alerts"
}
