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
  # TLS-in-transit + AUTH (crew infra-integration #2, Worf): the approval pub/sub carries operator
  # decisions, so encrypt the channel even inside the private SG. node-redis auto-negotiates TLS from
  # the rediss:// scheme; the auth_token rides in the URL. Enabling these on an existing cluster forces
  # REPLACEMENT (downtime) — cut over in a maintenance window (stand up the encrypted group, validate
  # the WorfGate handoff with mock approval traffic, then switch REDIS_URL). Worf: rotate the token on
  # enablement; REDIS_URL is never logged (db.ts swallows connection errors, diagnostics expose only a bool).
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token
  automatic_failover_enabled = false
}

# NOTE: after apply, put rediss://:<auth_token>@<endpoint>:6379 into the story-agent/runtime secret (REDIS_URL):
#   rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379
