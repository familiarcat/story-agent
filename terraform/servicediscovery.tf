# Private DNS so the UI reaches the MCP RAG service internally (mcp.story-agent.internal:3102)
# instead of round-tripping the public ALB.
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "${local.name}.internal"
  vpc  = var.vpc_id
}

resource "aws_service_discovery_service" "mcp" {
  name = "mcp"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }
  health_check_custom_config {
    failure_threshold = 1
  }
}
