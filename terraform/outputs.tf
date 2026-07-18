output "alb_dns_name" {
  description = "Public ALB DNS — UI at /, MCP at /mcp + /rag, WebSocket at /ws, agent at /agent"
  value       = aws_lb.main.dns_name
}

output "web_url" {
  description = "Public web UI URL — the subdomain over HTTPS when domain_name is set, else the ALB over HTTP."
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "agent_endpoint_url" {
  description = "Set as VS Code setting storyAgent.chat.agentServiceUrl to use the deployed crew"
  value       = var.domain_name != "" ? "https://${var.domain_name}/agent" : "http://${aws_lb.main.dns_name}/agent"
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "redis_endpoint" {
  description = "Put redis://<this>:6379 into the story-agent/runtime secret as REDIS_URL"
  value       = try(aws_elasticache_replication_group.redis.primary_endpoint_address, null)
}

output "mcp_service" {
  value = aws_ecs_service.mcp.name
}

output "ui_service" {
  value = aws_ecs_service.ui.name
}

output "mcp_canary_service" {
  description = "Canary ECS service name (5% traffic variant)"
  value       = try(aws_ecs_service.mcp_canary[0].name, null)
}

output "canary_enabled" {
  description = "Whether canary deployment is active"
  value       = var.enable_canary_deployment
}

output "canary_monitoring_dashboard" {
  description = "CloudWatch dashboard URL for canary monitoring"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${local.name}-canary-monitoring"
}

output "canary_alerts_topic" {
  description = "SNS topic ARN for canary deployment alerts"
  value       = try(aws_sns_topic.canary_alerts[0].arn, null)
}

output "canary_log_group" {
  description = "CloudWatch log group for canary task logs"
  value       = aws_cloudwatch_log_group.mcp_canary.name
}

