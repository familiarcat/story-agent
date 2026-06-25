output "alb_dns_name" {
  description = "Public ALB DNS — UI at /, MCP at /mcp + /rag, WebSocket at /ws, agent at /agent"
  value       = aws_lb.main.dns_name
}

output "agent_endpoint_url" {
  description = "Set as VS Code setting storyAgent.chat.agentServiceUrl to use the deployed crew"
  value       = "http://${aws_lb.main.dns_name}/agent"
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
