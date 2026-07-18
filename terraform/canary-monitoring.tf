# Canary deployment monitoring and automatic rollback triggers
# Managed by: Geordi La Forge (Infrastructure) + Crusher (System Health)

locals {
  canary_enabled = var.enable_canary_deployment
}

# ── Latency baseline (production service) ─────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "canary_latency_baseline" {
  count               = local.canary_enabled ? 1 : 0
  alarm_name          = "${local.name}-canary-latency-baseline"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0.5 # 500ms baseline for production
  alarm_description   = "Production baseline latency for canary comparison"
  dimensions = {
    TargetGroup  = aws_lb_target_group.mcp_http.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── Canary latency trigger (>10% above baseline) ──────────────────────────────
resource "aws_cloudwatch_metric_alarm" "canary_latency_high" {
  count               = local.canary_enabled ? 1 : 0
  alarm_name          = "${local.name}-canary-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0.55 # 550ms = 10% above 500ms baseline
  alarm_description   = "Canary latency exceeds baseline +10%; escalate to manual review"
  alarm_actions       = [aws_sns_topic.canary_alerts[0].arn]
  dimensions = {
    TargetGroup  = aws_lb_target_group.mcp_http_canary[0].arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── Canary error rate per category (>0.5%) ────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "canary_http_5xx" {
  count               = local.canary_enabled ? 1 : 0
  alarm_name          = "${local.name}-canary-http-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 3 # ~0.5% for typical traffic
  alarm_description   = "Canary 5xx error rate exceeds 0.5%; escalate for rollback decision"
  alarm_actions       = [aws_sns_topic.canary_alerts[0].arn]
  treat_missing_data  = "notBreaching"
  dimensions = {
    TargetGroup  = aws_lb_target_group.mcp_http_canary[0].arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── Canary 4xx client errors (monitoring only) ────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "canary_http_4xx" {
  count               = local.canary_enabled ? 1 : 0
  alarm_name          = "${local.name}-canary-http-4xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Canary 4xx client errors elevated; monitor for anomalies"
  alarm_actions       = [aws_sns_topic.canary_alerts[0].arn]
  treat_missing_data  = "notBreaching"
  dimensions = {
    TargetGroup  = aws_lb_target_group.mcp_http_canary[0].arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── Canary task health (must remain 1/1 running) ───────────────────────────────
resource "aws_cloudwatch_metric_alarm" "canary_task_health" {
  count               = local.canary_enabled ? 1 : 0
  alarm_name          = "${local.name}-canary-task-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Canary task is not running; immediate alert for manual intervention"
  alarm_actions       = [aws_sns_topic.canary_alerts[0].arn]
  treat_missing_data  = "breaching" # Missing data = failed health check
  dimensions = {
    ServiceName = aws_ecs_service.mcp_canary[0].name
    ClusterName = aws_ecs_cluster.main.name
  }
}

# ── SNS topic for canary alerts ────────────────────────────────────────────────
resource "aws_sns_topic" "canary_alerts" {
  count = local.canary_enabled ? 1 : 0
  name  = "${local.name}-canary-alerts"
}

resource "aws_sns_topic_subscription" "canary_alerts_crew" {
  count     = local.canary_enabled && var.canary_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.canary_alerts[0].arn
  protocol  = "email"
  endpoint  = var.canary_alert_email
}

# ── CloudWatch Dashboard for canary monitoring ────────────────────────────────
resource "aws_cloudwatch_dashboard" "canary" {
  count          = local.canary_enabled ? 1 : 0
  dashboard_name = "${local.name}-canary-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average", label = "Production Latency" }],
            [".", ".", { stat = "Average", label = "Canary Latency" }],
          ]
          period = 60
          stat   = "Average"
          region = var.region
          title  = "Latency Comparison: Production vs Canary"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum", label = "Production 5xx" }],
            [".", ".", { stat = "Sum", label = "Canary 5xx" }],
          ]
          period = 60
          stat   = "Sum"
          region = var.region
          title  = "Error Rate: Production vs Canary"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "RunningCount", { stat = "Average", label = "Canary Tasks" }],
          ]
          period = 60
          stat   = "Average"
          region = var.region
          title  = "Canary Task Health"
        }
      },
    ]
  })
}
