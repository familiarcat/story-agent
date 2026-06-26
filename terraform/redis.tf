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
  # the rediss:// scheme; the auth_token rides in the URL. GATED behind redis_transit_encryption
  # (default OFF) because enabling it on an existing cluster forces REPLACEMENT (downtime) — so it's a
  # deliberate maintenance-window cutover (docs/runbooks/redis-tls-cutover.md), not a normal-deploy
  # change. Worf: rotate the token on enablement; REDIS_URL is never logged (db.ts swallows connection
  # errors, diagnostics expose only a bool).
  transit_encryption_enabled = var.redis_transit_encryption
  transit_encryption_mode    = var.redis_transit_encryption ? var.redis_transit_mode : null
  # Empty token → null (no AUTH): TLS-in-transit alone closes the interception threat inside the
  # private SG; AUTH is an optional second factor supplied via TF_VAR_redis_auth_token.
  auth_token                 = (var.redis_transit_encryption && var.redis_auth_token != "") ? var.redis_auth_token : null
  automatic_failover_enabled = false
  # Required by ElastiCache to modify transit encryption (and applies other changes now, not in the
  # weekly maintenance window — correct for a single-node cache where deferred changes surprise).
  apply_immediately = true
}

# NOTE: after apply, put rediss://:<auth_token>@<endpoint>:6379 into the story-agent/runtime secret (REDIS_URL):
#   rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379
