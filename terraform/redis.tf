# ElastiCache Redis — ephemeral cache + RAG sync queue. Managed (not a container), per the crew
# ruling. A standard single-node cache.t4g.micro (Quark: ~$11/mo, ~8x cheaper than the serverless
# floor, and avoids serverless's opaque async create-failures). The endpoint → tasks as REDIS_URL.

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${local.name}-redis"
  description                = "Story Agent crew ephemeral cache + RAG sync queue"
  engine                     = "redis"
  node_type                  = "cache.t4g.micro"
  num_cache_clusters         = 1
  parameter_group_name       = "default.redis7"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  # Plaintext within the private redis SG (only ECS tasks reach it) → simple redis:// for the client.
  transit_encryption_enabled = false
  automatic_failover_enabled = false
}

# NOTE: after apply, put redis://<endpoint>:6379 into the story-agent/runtime secret (REDIS_URL):
#   redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379
